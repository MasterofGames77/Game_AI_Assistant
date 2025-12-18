import tmi from 'tmi.js';
import { botConfig } from '../../config/botConfig';
import { getChatCompletion } from '../aiHelper';
import { checkProAccess } from '../proAccessUtil';
import { logger } from '../logger';
import { connectToWingmanDB } from '../databaseConnections';
import connectToMongoDB from '../mongodb';
import User from '../../models/User';
import TwitchBotChannel from '../../models/TwitchBotChannel';
import { RateLimit } from '../../types';
import { checkMessageContent, checkAIResponse, getSafeFallbackResponse, handleModerationViolation, checkTwitchUserBanStatus } from './twitchModeration';

// Twitch message types from tmi.js
type ChatUserstate = tmi.ChatUserstate;
export type ChatMessage = {
  channel: string;
  userstate: ChatUserstate;
  message: string;
  self: boolean;
};

export class TwitchBotHandler {
  private client: tmi.Client;
  private rateLimits: Map<string, RateLimit>;
  private responseCache: Map<string, { response: string; timestamp: number }>;
  private messageQueue: Map<string, Promise<void>>;
  private processedMessages: Map<string, number>; // Track processed messages to prevent duplicates
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_MESSAGES_PER_WINDOW = 10;
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly MAX_RETRIES = 3;
  private readonly MAX_MESSAGE_LENGTH = 500; // Twitch chat limit
  private readonly BOT_USERNAME: string;
  private readonly MESSAGE_DEDUP_WINDOW = 10000; // 10 seconds - prevent processing same message twice

  constructor(client: tmi.Client) {
    this.client = client;
    this.rateLimits = new Map();
    this.responseCache = new Map();
    this.messageQueue = new Map();
    this.processedMessages = new Map();
    this.BOT_USERNAME = process.env.TWITCH_BOT_USERNAME?.toLowerCase() || 'herogamewingman';
    this.setupEventHandlers();
    this.startMaintenanceTasks();
  }

  private setupEventHandlers() {
    this.client.on('message', async (channel: string, userstate: ChatUserstate, message: string, self: boolean) => {
      // Ignore bot's own messages
      if (self) return;

      // Ignore messages from other bots (if they have the 'bot' badge)
      if (userstate.badges?.bot) return;

      const username = userstate.username || 'unknown';
      const displayName = userstate['display-name'] || username;

      // Check for dedicated commands first (!help, !commands)
      const messageLower = message.toLowerCase().trim();
      
      if (messageLower === '!help' || messageLower.startsWith('!help ')) {
        await this.handleHelpCommand(channel, displayName);
        return;
      }
      
      if (messageLower === '!commands' || messageLower.startsWith('!commands ')) {
        await this.handleCommandsCommand(channel, displayName);
        return;
      }

      // Check if message is directed at the bot
      // Patterns: !wingman <question>, @HeroGameWingman <question>, or just @HeroGameWingman
      const botMentioned = message.toLowerCase().includes(`@${this.BOT_USERNAME}`) ||
                          message.toLowerCase().startsWith('!wingman') ||
                          message.toLowerCase().startsWith('!hgwm');

      if (!botMentioned) {
        // Bot not mentioned - ignore message
        return;
      }

      // Extract the question (remove command/mention)
      let question = message
        .replace(new RegExp(`@${this.BOT_USERNAME}`, 'gi'), '')
        .replace(/^!wingman\s*/i, '')
        .replace(/^!hgwm\s*/i, '')
        .trim();

      // If no question after mention/command, show help
      if (!question || question.length === 0) {
        await this.handleHelpCommand(channel, displayName);
        return;
      }

      // Create a unique message ID to prevent duplicate processing
      // Use channel + username + message content + timestamp (rounded to nearest second)
      // This prevents the same message from being processed twice within the dedup window
      const timestamp = Math.floor(Date.now() / 1000); // Round to nearest second
      const messageId = `${channel}:${username}:${timestamp}:${message.substring(0, 100)}`;
      
      // Check if we've already processed this message recently
      const lastProcessed = this.processedMessages.get(messageId);
      const now = Date.now();
      if (lastProcessed && (now - lastProcessed) < this.MESSAGE_DEDUP_WINDOW) {
        logger.debug('Duplicate message detected, ignoring', {
          username,
          channel,
          messageId: messageId.substring(0, 80)
        });
        return; // Already processed this message recently
      }

      // Mark message as being processed
      this.processedMessages.set(messageId, now);

      // Log message received for debugging
      logger.info('Twitch message received', {
        username: username,
        displayName: displayName,
        channel: channel,
        contentLength: question.length,
        question: question.substring(0, 100) // First 100 chars
      });

      try {
        // Check rate limits
        if (!this.checkRateLimit(username)) {
          logger.warn('Rate limit exceeded', { username });
          await this.sendMessage(channel, `@${displayName} You're sending messages too quickly. Please wait a moment.`);
          return;
        }

        // Queue message processing
        const processing = this.messageQueue.get(username) || Promise.resolve();
        const newProcessing = processing.then(() => this.handleMessage(channel, userstate, question, displayName));
        this.messageQueue.set(username, newProcessing);

      } catch (error) {
        this.handleError(error, channel, displayName);
      }
    });
  }

  /**
   * Handle !help command - Show comprehensive help information
   */
  private async handleHelpCommand(channel: string, displayName: string): Promise<void> {
    const helpMessage = `@${displayName} 📚 ${botConfig.name} Help — I'm an AI assistant for video game discussions! ` +
      `Ask me anything about games, strategies, walkthroughs, or recommendations. ` +
      `Commands: !wingman <question>, !hgwm <question>, or @${this.BOT_USERNAME} <question>. ` +
      `Use !commands to see all commands. ` +
      `Requires Video Game Wingman Pro — link your Twitch account on our website!`;
    
    await this.sendMessage(channel, helpMessage);
    
    logger.info('Help command executed', { channel, displayName });
  }

  /**
   * Handle !commands command - List all available commands
   */
  private async handleCommandsCommand(channel: string, displayName: string): Promise<void> {
    const commandsList = [
      `@${displayName} 📋 Available Commands:`,
      `• !help — Show this help message`,
      `• !commands — List all commands`,
      `• !wingman <question> — Ask a gaming question`,
      `• !hgwm <question> — Alternative command (same as !wingman)`,
      `• @${this.BOT_USERNAME} <question> — Mention me with a question`,
      ``,
      `💡 Tip: Link your Twitch account on our website for Pro access!`
    ];
    
    // Send commands in chunks if needed (respecting 500 char limit)
    let currentMessage = '';
    for (const line of commandsList) {
      const potentialMessage = currentMessage ? `${currentMessage}\n${line}` : line;
      
      if (potentialMessage.length > this.MAX_MESSAGE_LENGTH) {
        // Send current message if it has content
        if (currentMessage) {
          await this.sendMessage(channel, currentMessage);
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between messages
        }
        currentMessage = line;
      } else {
        currentMessage = potentialMessage;
      }
    }
    
    // Send remaining message
    if (currentMessage) {
      await this.sendMessage(channel, currentMessage);
    }
    
    logger.info('Commands command executed', { channel, displayName });
  }

  private async handleMessage(
    channel: string,
    userstate: ChatUserstate,
    question: string,
    displayName: string
  ): Promise<void> {
    const username = userstate.username || 'unknown';
    
    try {
      logger.info('Processing Twitch message', {
        username: username,
        displayName: displayName,
        channel: channel,
        contentLength: question.length
      });

      // Check if user is banned in this channel (using Twitch-specific ban tracking)
      const banStatus = await checkTwitchUserBanStatus(username, channel);
      if (banStatus.isBanned) {
        // User is banned - silently reject (don't respond)
        logger.info('Rejecting message from banned user', {
          username,
          channel,
          bannedAt: banStatus.bannedAt,
          reason: banStatus.reason
        });
        return; // Silently reject - don't process with AI
      }

      // Pre-processing: Check message for offensive content before AI processing
      const normalizedChannel = channel.replace('#', '').toLowerCase().trim();
      const moderationCheck = await checkMessageContent(question, username, normalizedChannel);
      
      if (!moderationCheck.shouldProcess) {
        // Offensive content detected - handle moderation violation
        await handleModerationViolation(
          channel,
          username,
          displayName,
          moderationCheck,
          question // Pass original message for logging
        );
        return; // Don't process offensive messages with AI
      }

      // Map Twitch username to Video Game Wingman username
      // First, check if this user is the channel owner (streamer)
      let wingmanUsername: string | null = null;
      let isChannelOwner = false;
      
      try {
        await connectToWingmanDB();
        const channelName = channel.replace('#', '').toLowerCase();
        
        // Check if user is the channel owner
        const channelData = await TwitchBotChannel.findOne({ 
          channelName: channelName 
        });
        
        if (channelData && channelData.streamerTwitchId) {
          // Check if the user's Twitch ID matches the streamer's Twitch ID
          // Note: We have the username, but we'd need the user's Twitch ID to match exactly
          // For now, we'll check if the username matches the channel name (streamer is usually the channel owner)
          if (username.toLowerCase() === channelName) {
            isChannelOwner = true;
            wingmanUsername = channelData.streamerUsername;
            logger.info('User is channel owner, using streamer username for Pro check', {
              twitchUsername: username,
              channelName: channelName,
              streamerUsername: wingmanUsername
            });
          }
        }
        
        // If not channel owner, try to find user by Twitch username
        if (!isChannelOwner) {
          // Check if user has linked their Twitch account using the twitchUsername field
          const twitchUsernameLower = username.toLowerCase();
          const user = await User.findOne({ 
            twitchUsername: twitchUsernameLower
          }).select('username twitchUsername').lean();
          
          if (user && !Array.isArray(user)) {
            wingmanUsername = user.username;
            logger.info('Found Video Game Wingman user by Twitch username', {
              twitchUsername: username,
              wingmanUsername: wingmanUsername
            });
          } else {
            logger.info('User not found by Twitch username (account not linked)', {
              twitchUsername: username,
              displayName: displayName
            });
            // Store that account is not linked for better messaging
            // This will be used when Pro access is denied
          }
        }
      } catch (error) {
        logger.error('Error looking up user by Twitch username', {
          error: error instanceof Error ? error.message : String(error),
          twitchUsername: username
        });
      }

      // Check Pro access using username if found, otherwise allow anonymous usage
      // For Twitch, we'll allow anonymous usage but still check Pro if linked
      // Channel owners use their streamerUsername for Pro check
      const identifier = wingmanUsername || username;
      
      logger.info('Checking Pro access', {
        twitchUsername: username,
        identifier,
        usingWingmanUsername: !!wingmanUsername
      });

      const hasAccess = await this.retryOperation(() => checkProAccess(identifier));
      
      logger.info('Pro access check result', {
        username: username,
        identifier,
        hasAccess
      });

      if (!hasAccess) {
        logger.warn('Pro access denied', { username });
        
        // Provide more helpful message if account is not linked
        const isAccountLinked = !!wingmanUsername;
        let message = `@${displayName} This feature requires Video Game Wingman Pro.`;
        
        if (!isAccountLinked) {
          message += ` Link your Twitch account (@${username}) on our website to use your Pro access! Use !help for more info.`;
        } else {
          message += ` Visit our website to learn more!`;
        }
        
        await this.sendMessage(channel, message);
        return;
      }

      // Check cache first
      const cachedResponse = this.getCachedResponse(question);
      if (cachedResponse) {
        await this.sendLongMessage(channel, displayName, cachedResponse);
        return;
      }

      // Process the message
      logger.info('Generating AI response', { username });
      const channelName = channel.replace('#', '').toLowerCase();
      const response = await this.processMessage(question, username, channelName);
      if (response) {
        // Cache the response
        this.cacheResponse(question, response);
        logger.info('Sending response to user', {
          username,
          responseLength: response.length
        });

        // Split long messages into chunks (Twitch has 500 character limit)
        await this.sendLongMessage(channel, displayName, response);
        logger.info('Response sent successfully', { username });

        // Update message count for this channel
        await this.updateChannelMessageCount(channel);
      } else {
        logger.warn('No response generated', { username });
      }
    } catch (error) {
      logger.error('Error in handleMessage', {
        error,
        username,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      this.handleError(error, channel, displayName);
    }
  }

  private async processMessage(question: string, twitchUsername: string, channelName?: string): Promise<string> {
    try {
      // Create a system message using botConfig
      const systemMessage = this.createSystemMessage();

      // Get AI response with retry mechanism
      const response = await this.retryOperation(() =>
        getChatCompletion(question, systemMessage)
      );

      const aiResponse = response || this.createFallbackResponse();

      // Post-processing: Check AI response for inappropriate content
      const responseCheck = await checkAIResponse(aiResponse, twitchUsername, channelName);
      
      if (!responseCheck.shouldProcess) {
        // AI generated inappropriate content - replace with safe fallback
        logger.warn('AI generated inappropriate response - replacing with safe fallback', {
          twitchUsername,
          offendingWords: responseCheck.offendingWords,
          responsePreview: aiResponse.substring(0, 200), // Log first 200 chars for review
          reason: responseCheck.reason,
          note: 'This is AI-generated content, not user-generated. User should not be penalized.'
        });
        
        // Return safe fallback instead of inappropriate response
        return getSafeFallbackResponse();
      }

      // Response is clean - return original AI response
      return aiResponse;
    } catch (error) {
      logger.error('Error getting chat completion:', error);
      throw error;
    }
  }

  private createSystemMessage(): string {
    return `You are ${botConfig.name}, ${botConfig.description}. 
Your expertise includes: ${botConfig.knowledge.join(', ')}. 
Character: ${botConfig.bio[0]}

Keep responses concise for Twitch chat (under 500 characters when possible).`;
  }

  private createFallbackResponse(): string {
    return `I apologize, but I was unable to generate a response. As ${botConfig.name}, I aim to provide helpful gaming advice and information.`;
  }

  /**
   * Split and send long messages that exceed Twitch's 500 character limit
   * Attempts to split at sentence boundaries when possible
   */
  private async sendLongMessage(channel: string, displayName: string, text: string): Promise<void> {
    const MAX_LENGTH = this.MAX_MESSAGE_LENGTH;
    
    // If message fits, send it directly
    if (text.length <= MAX_LENGTH) {
      await this.sendMessage(channel, `@${displayName} ${text}`);
      return;
    }

    // Split into chunks, trying to break at sentence boundaries
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const sentence of sentences) {
      // Check if adding this sentence would exceed limit
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      if (potentialChunk.length > MAX_LENGTH && currentChunk.length > 0) {
        // Current chunk is full, save it
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk = potentialChunk;
      }
      
      // If current chunk itself exceeds limit, force split
      if (currentChunk.length > MAX_LENGTH) {
        // Split at word boundaries
        const words = currentChunk.split(' ');
        let wordChunk = '';
        for (const word of words) {
          if ((wordChunk + ' ' + word).length > MAX_LENGTH && wordChunk.length > 0) {
            chunks.push(wordChunk.trim());
            wordChunk = word;
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
        }
        currentChunk = wordChunk;
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
        // First chunk mentions user
        await this.sendMessage(channel, `@${displayName} ${finalChunks[i]}`);
      } else {
        // Subsequent chunks as follow-up messages
        await this.sendMessage(channel, finalChunks[i]);
      }

      // Small delay between messages to avoid rate limits (Twitch: 20 messages per 30 seconds)
      if (i < finalChunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
      }
    }

    logger.info('Sent long message in chunks', {
      username: displayName,
      totalChunks: finalChunks.length,
      totalLength: text.length
    });
  }

  /**
   * Send a message to a Twitch channel
   */
  private async sendMessage(channel: string, message: string): Promise<void> {
    try {
      await this.client.say(channel, message);
    } catch (error) {
      logger.error('Error sending Twitch message', {
        error,
        channel,
        messageLength: message.length
      });
      throw error;
    }
  }

  /**
   * Update message count for a channel
   */
  private async updateChannelMessageCount(channel: string): Promise<void> {
    try {
      await connectToWingmanDB();
      const channelName = channel.replace('#', '').toLowerCase();
      await TwitchBotChannel.findOneAndUpdate(
        { channelName: channelName },
        { $inc: { messageCount: 1 } }
      );
    } catch (error) {
      // Silently fail - this is not critical
      logger.error('Error updating channel message count:', error);
    }
  }

  private checkRateLimit(username: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimits.get(username);

    if (!userLimit || (now - userLimit.timestamp) > this.RATE_LIMIT_WINDOW) {
      this.rateLimits.set(username, { timestamp: now, count: 1 });
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

  private handleError(error: any, channel: string, displayName: string): void {
    logger.error('Error in bot handler:', {
      error,
      channel,
      displayName
    });

    this.sendMessage(channel, `@${displayName} Sorry, I encountered an error processing your request. Please try again later.`)
      .catch(err => logger.error('Error sending error message:', err));
  }

  private startMaintenanceTasks(): void {
    // Clean up rate limits periodically
    setInterval(() => {
      const now = Date.now();
      Array.from(this.rateLimits.entries()).forEach(([username, limit]) => {
        if (now - limit.timestamp > this.RATE_LIMIT_WINDOW) {
          this.rateLimits.delete(username);
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
      Array.from(this.messageQueue.entries()).forEach(([username, promise]) => {
        if (promise.constructor.name === 'Promise') {
          promise.then(() => this.messageQueue.delete(username));
        }
      });
    }, 60000);

    // Clean up processed messages map periodically (remove entries older than dedup window)
    setInterval(() => {
      const now = Date.now();
      Array.from(this.processedMessages.entries()).forEach(([messageId, timestamp]) => {
        if (now - timestamp > this.MESSAGE_DEDUP_WINDOW) {
          this.processedMessages.delete(messageId);
        }
      });
    }, this.MESSAGE_DEDUP_WINDOW);
  }
}

