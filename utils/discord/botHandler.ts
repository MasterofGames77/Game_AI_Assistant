import { Client, Message, EmbedBuilder, ChannelType } from 'discord.js';
import { botConfig } from '../../config/botConfig';
import { getChatCompletion } from '../aiHelper';
import { checkProAccess } from '../proAccessUtil';
import { logger } from '../logger';
import { connectToWingmanDB } from '../databaseConnections';
import User from '../../models/User';

// Rate limiting configuration
interface RateLimit {
  timestamp: number;
  count: number;
}

export class DiscordBotHandler {
  private client: Client;
  private rateLimits: Map<string, RateLimit>;
  private responseCache: Map<string, { response: string; timestamp: number }>;
  private messageQueue: Map<string, Promise<void>>;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_MESSAGES_PER_WINDOW = 10;
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_RETRIES = 3;

  constructor(client: Client) {
    this.client = client;
    this.rateLimits = new Map();
    this.responseCache = new Map();
    this.messageQueue = new Map();
    this.setupEventHandlers();
    this.startMaintenanceTasks();
  }

  private setupEventHandlers() {
    this.client.on('messageCreate', async (message: Message) => {
      if (message.author.bot) return;
      
      // Determine if message is a DM or in a server channel
      // Check both channel type and guild presence (guild is null for DMs)
      const isDM = message.channel.type === ChannelType.DM || message.guild === null;
      
      // For server channels, only respond if bot is mentioned
      // This is better for security and prevents processing every message
      if (!isDM) {
        if (!this.client.user) {
          // Bot user not available yet, skip
          return;
        }
        
        const botMentioned = message.mentions.has(this.client.user.id) || 
                            message.content.includes(`<@${this.client.user.id}>`) ||
                            message.content.includes(`<@!${this.client.user.id}>`);
        
        if (!botMentioned) {
          // Bot not mentioned in server channel - ignore for security/privacy
          return;
        }
      }
      
      // Log message received for debugging
      logger.info('Discord message received', {
        userId: message.author.id,
        username: message.author.username,
        channelType: message.channel.type,
        isDM,
        hasGuild: !!message.guild,
        botMentioned: !isDM, // In server channels, we only process if mentioned
        content: message.content.substring(0, 100), // First 100 chars
        guildId: message.guild?.id || 'DM'
      });
      
      try {
        // Check rate limits
        if (!this.checkRateLimit(message.author.id)) {
          logger.warn('Rate limit exceeded', { userId: message.author.id });
          await message.reply("You're sending messages too quickly. Please wait a moment.");
          return;
        }

        // Queue message processing
        const processing = this.messageQueue.get(message.author.id) || Promise.resolve();
        const newProcessing = processing.then(() => this.handleMessage(message));
        this.messageQueue.set(message.author.id, newProcessing);

      } catch (error) {
        this.handleError(error, message);
      }
    });
  }

  private async handleMessage(message: Message): Promise<void> {
    try {
      logger.info('Processing Discord message', {
        userId: message.author.id,
        username: message.author.username,
        contentLength: message.content.length
      });
      
      // Map Discord user ID to Video Game Wingman username
      // First, try to find user by Discord user ID (userId field)
      let wingmanUsername: string | null = null;
      try {
        await connectToWingmanDB();
        const user = await User.findOne({ userId: message.author.id });
        if (user) {
          wingmanUsername = user.username;
          logger.info('Found Video Game Wingman user by Discord ID', {
            discordId: message.author.id,
            wingmanUsername: wingmanUsername
          });
        } else {
          // If not found by userId, try by Discord username as fallback for testing
          // This helps with local testing where Discord account might not be linked
          logger.info('User not found by Discord ID, checking by username', {
            discordId: message.author.id,
            discordUsername: message.author.username
          });
        }
      } catch (error) {
        logger.error('Error looking up user by Discord ID', {
          error: error instanceof Error ? error.message : String(error),
          discordId: message.author.id
        });
      }
      
      // Check Pro access using username if found, otherwise fall back to Discord ID
      // For local testing: if Discord username is "thelegendaryrenegade", grant access
      const identifier = wingmanUsername || 
                         (message.author.username.toLowerCase() === 'thelegendaryrenegade' ? 'TestUser1' : message.author.id);
      
      logger.info('Checking Pro access', { 
        discordId: message.author.id,
        identifier,
        usingUsername: !!wingmanUsername
      });
      const hasAccess = await this.retryOperation(() => checkProAccess(identifier));
      
      logger.info('Pro access check result', {
        userId: message.author.id,
        identifier,
        hasAccess
      });
      
      if (!hasAccess) {
        logger.warn('Pro access denied', { userId: message.author.id });
        await message.reply({
          embeds: [this.createProAccessEmbed()]
        });
        return;
      }

      // Check cache first
      const cachedResponse = this.getCachedResponse(message.content);
      if (cachedResponse) {
        await this.sendLongMessage(message, cachedResponse);
        return;
      }

      // Process the message
      logger.info('Generating AI response', { userId: message.author.id });
      const response = await this.processMessage(message);
      if (response) {
        // Cache the response
        this.cacheResponse(message.content, response);
        logger.info('Sending response to user', {
          userId: message.author.id,
          responseLength: response.length
        });
        
        // Split long messages into chunks (Discord has 2000 character limit)
        await this.sendLongMessage(message, response);
        logger.info('Response sent successfully', { userId: message.author.id });
      } else {
        logger.warn('No response generated', { userId: message.author.id });
      }
    } catch (error) {
      logger.error('Error in handleMessage', {
        error,
        userId: message.author.id,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      this.handleError(error, message);
    }
  }

  private async processMessage(message: Message): Promise<string> {
    const question = message.content;
    
    try {
      // Create a system message using botConfig
      const systemMessage = this.createSystemMessage();

      // Get AI response with retry mechanism
      const response = await this.retryOperation(() => 
        getChatCompletion(question, systemMessage)
      );

      return response || this.createFallbackResponse();
    } catch (error) {
      logger.error('Error getting chat completion:', error);
      throw error;
    }
  }

  private createSystemMessage(): string {
    return `You are ${botConfig.name}, ${botConfig.description}. 
Your expertise includes: ${botConfig.knowledge.join(', ')}. 
Character: ${botConfig.bio[0]}`;
  }

  private createFallbackResponse(): string {
    return `I apologize, but I was unable to generate a response. As ${botConfig.name}, I aim to provide helpful gaming advice and information.`;
  }

  /**
   * Split and send long messages that exceed Discord's 2000 character limit
   * Attempts to split at sentence boundaries when possible
   */
  private async sendLongMessage(message: Message, text: string): Promise<void> {
    const MAX_LENGTH = 2000; // Discord's message limit
    
    // If message fits, send it directly
    if (text.length <= MAX_LENGTH) {
      await message.reply(text);
      return;
    }

    // Split into chunks, trying to break at sentence boundaries
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Split by paragraphs first (double newlines)
    const paragraphs = text.split(/\n\n+/);
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed limit, finalize current chunk
      if (currentChunk.length + paragraph.length + 2 > MAX_LENGTH && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // If paragraph itself is too long, split it by sentences
      if (paragraph.length > MAX_LENGTH) {
        // Finalize current chunk if it has content
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // Split paragraph by sentences
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 > MAX_LENGTH && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    // Add remaining chunk
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    // If still too long, force split at character limit (last resort)
    const finalChunks: string[] = [];
    for (const chunk of chunks) {
      if (chunk.length <= MAX_LENGTH) {
        finalChunks.push(chunk);
      } else {
        // Force split at character limit
        for (let i = 0; i < chunk.length; i += MAX_LENGTH) {
          finalChunks.push(chunk.substring(i, i + MAX_LENGTH));
        }
      }
    }
    
    // Send all chunks
    for (let i = 0; i < finalChunks.length; i++) {
      if (i === 0) {
        // First chunk as reply
        await message.reply(finalChunks[i]);
      } else {
        // Subsequent chunks as follow-up messages
        // Check if channel is a text-based channel that supports sending
        const channel = message.channel;
        if (channel.type === ChannelType.DM || 
            channel.type === ChannelType.GuildText || 
            channel.type === ChannelType.GuildNews ||
            channel.type === ChannelType.PublicThread ||
            channel.type === ChannelType.PrivateThread) {
          await (channel as any).send(finalChunks[i]);
        } else {
          // Fallback: send as reply if channel type doesn't support direct send
          await message.reply(finalChunks[i]);
        }
      }
      
      // Small delay between messages to avoid rate limits
      if (i < finalChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    logger.info('Sent long message in chunks', {
      userId: message.author.id,
      totalChunks: finalChunks.length,
      totalLength: text.length
    });
  }

  private createProAccessEmbed(): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle('Pro Access Required')
      .setDescription('This feature is only available to Video Game Wingman Pro users.')
      .setColor('#FF0000')
      .addFields({ name: 'How to Get Pro', value: 'Visit our website to learn more about Pro benefits.' })
      .setTimestamp();
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimits.get(userId);

    if (!userLimit || (now - userLimit.timestamp) > this.RATE_LIMIT_WINDOW) {
      this.rateLimits.set(userId, { timestamp: now, count: 1 });
      return true;
    }

    if (userLimit.count >= this.MAX_MESSAGES_PER_WINDOW) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  private getCachedResponse(question: string): string | null {
    const cached = this.responseCache.get(question);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.response;
    }
    return null;
  }

  private cacheResponse(question: string, response: string): void {
    this.responseCache.set(question, {
      response,
      timestamp: Date.now()
    });
  }

  private async retryOperation<T>(operation: () => Promise<T>, retries = this.MAX_RETRIES): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    throw lastError;
  }

  private handleError(error: any, message: Message): void {
    logger.error('Error in bot handler:', {
      error,
      userId: message.author.id,
      messageId: message.id,
      content: message.content
    });

    message.reply('Sorry, I encountered an error processing your request. Please try again later.')
      .catch(err => logger.error('Error sending error message:', err));
  }

  private startMaintenanceTasks(): void {
    // Clean up rate limits periodically
    setInterval(() => {
      const now = Date.now();
      Array.from(this.rateLimits.entries()).forEach(([userId, limit]) => {
        if (now - limit.timestamp > this.RATE_LIMIT_WINDOW) {
          this.rateLimits.delete(userId);
        }
      });
    }, this.RATE_LIMIT_WINDOW);

    // Clean up response cache periodically
    setInterval(() => {
      const now = Date.now();
      Array.from(this.responseCache.entries()).forEach(([question, cached]) => {
        if (now - cached.timestamp > this.CACHE_TTL) {
          this.responseCache.delete(question);
        }
      });
    }, this.CACHE_TTL);

    // Clean up message queue periodically
    setInterval(() => {
      Array.from(this.messageQueue.entries()).forEach(([userId, promise]) => {
        if (promise.constructor.name === 'Promise') {
          promise.then(() => this.messageQueue.delete(userId));
        }
      });
    }, 60000);
  }
}
