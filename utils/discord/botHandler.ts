import { Client, Message, EmbedBuilder } from 'discord.js';
import { botConfig } from '../../config/botConfig';
import { getChatCompletion } from '../aiHelper';
import { checkProAccess } from '../proAccessUtil';
import { logger } from '../logger';

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
      
      try {
        // Check rate limits
        if (!this.checkRateLimit(message.author.id)) {
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
      // Check Pro access with retry mechanism
      const hasAccess = await this.retryOperation(() => checkProAccess(message.author.id));
      if (!hasAccess) {
        await message.reply({
          embeds: [this.createProAccessEmbed()]
        });
        return;
      }

      // Check cache first
      const cachedResponse = this.getCachedResponse(message.content);
      if (cachedResponse) {
        await message.reply(cachedResponse);
        return;
      }

      // Process the message
      const response = await this.processMessage(message);
      if (response) {
        // Cache the response
        this.cacheResponse(message.content, response);
        await message.reply(response);
      }
    } catch (error) {
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
