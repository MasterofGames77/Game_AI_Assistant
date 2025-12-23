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
import { logMessageEvent } from './analytics';
import { getPerformanceMonitor, measureOperation, measureDBQuery, measureAPICall } from './performanceMonitor';
import { shortenMarkdownLinks } from '../linkShortener';
import { getChannelSettings, TwitchChannelSettings, defaultChannelSettings } from '../../config/twitchChannelSettings';

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
  private channelSettingsCache: Map<string, { settings: TwitchChannelSettings; timestamp: number }>; // Cache channel settings
  private readonly MAX_RETRIES = 3;
  private readonly MESSAGE_DEDUP_WINDOW = 10000; // 10 seconds - prevent processing same message twice
  private readonly CHANNEL_SETTINGS_CACHE_TTL = 300000; // 5 minutes - cache channel settings
  private readonly BOT_USERNAME: string; // Default bot username (can be overridden per channel)

  constructor(client: tmi.Client) {
    this.client = client;
    this.rateLimits = new Map();
    this.responseCache = new Map();
    this.messageQueue = new Map();
    this.processedMessages = new Map();
    this.channelSettingsCache = new Map();
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
      const normalizedChannel = channel.replace('#', '').toLowerCase();

      // Load channel settings (cached)
      const channelSettings = await this.getChannelSettings(normalizedChannel);

      // Check for dedicated commands first (!help, !commands)
      const messageLower = message.toLowerCase().trim();
      
      if (messageLower === '!help' || messageLower.startsWith('!help ')) {
        await this.handleHelpCommand(channel, displayName, userstate, channelSettings);
        return;
      }
      
      if (messageLower === '!commands' || messageLower.startsWith('!commands ')) {
        await this.handleCommandsCommand(channel, displayName, userstate, channelSettings);
        return;
      }

      // Check if message is directed at the bot using channel-specific settings
      const botMentioned = this.isBotMentioned(message, channelSettings);

      if (!botMentioned) {
        // Bot not mentioned - ignore message
        return;
      }

      // Extract the question (remove command/mention) using channel-specific prefixes
      let question = this.extractQuestion(message, channelSettings);

      // If no question after mention/command, show help
      if (!question || question.length === 0) {
        await this.handleHelpCommand(channel, displayName, userstate);
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
        // Check rate limits using channel-specific settings
        if (!this.checkRateLimit(username, normalizedChannel, channelSettings)) {
          logger.warn('Rate limit exceeded', { username, channel: normalizedChannel });
          await this.sendMessage(channel, `@${displayName} You're sending messages too quickly. Please wait a moment.`);
          return;
        }

        // Queue message processing
        const processing = this.messageQueue.get(username) || Promise.resolve();
        const newProcessing = processing.then(() => this.handleMessage(channel, userstate, question, displayName, channelSettings));
        this.messageQueue.set(username, newProcessing);

      } catch (error) {
        this.handleError(error, channel, displayName);
      }
    });
  }

  /**
   * Get channel settings (with caching)
   */
  private async getChannelSettings(channelName: string): Promise<TwitchChannelSettings> {
    const now = Date.now();
    const cached = this.channelSettingsCache.get(channelName);
    
    // Return cached settings if still valid
    if (cached && (now - cached.timestamp) < this.CHANNEL_SETTINGS_CACHE_TTL) {
      return cached.settings;
    }
    
    // Load settings from database or use defaults
    const settings = await getChannelSettings(channelName);
    
    // Cache the settings
    this.channelSettingsCache.set(channelName, {
      settings,
      timestamp: now
    });
    
    return settings;
  }

  /**
   * Check if bot is mentioned in message using channel-specific settings
   */
  private isBotMentioned(message: string, settings: TwitchChannelSettings): boolean {
    const messageLower = message.toLowerCase();
    
    // Check bot mention if enabled
    if (settings.botMentionEnabled) {
      const mentionPattern = `@${settings.botMentionName}`;
      if (messageLower.includes(mentionPattern)) {
        return true;
      }
    }
    
    // Check command prefixes
    for (const prefix of settings.commandPrefixes) {
      if (messageLower.startsWith(prefix.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Extract question from message using channel-specific settings
   */
  private extractQuestion(message: string, settings: TwitchChannelSettings): string {
    let question = message;
    
    // Remove bot mention if enabled
    if (settings.botMentionEnabled) {
      question = question.replace(new RegExp(`@${settings.botMentionName}`, 'gi'), '');
    }
    
    // Remove command prefixes
    for (const prefix of settings.commandPrefixes) {
      const prefixRegex = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
      question = question.replace(prefixRegex, '');
    }
    
    return question.trim();
  }

  /**
   * Handle !help command - Show comprehensive help information
   */
  private async handleHelpCommand(channel: string, displayName: string, userstate?: ChatUserstate, settings?: TwitchChannelSettings): Promise<void> {
    const receivedAt = new Date();
    const processedAt = new Date();
    const username = userstate?.username || 'unknown';
    const normalizedChannel = channel.replace('#', '').toLowerCase();
    
    // Load settings if not provided
    if (!settings) {
      settings = await this.getChannelSettings(normalizedChannel);
    }
    
    try {
      // Build command list from channel settings
      const commandList = settings.commandPrefixes.map(p => `${p} <question>`).join(', ');
      const mentionText = settings.botMentionEnabled ? `, or @${settings.botMentionName} <question>` : '';
      
      const helpMessage = `@${displayName} 📚 ${botConfig.name} Help — I'm an AI assistant for video game discussions! ` +
        `Ask me anything about games, strategies, walkthroughs, or recommendations. ` +
        `Commands: ${commandList}${mentionText}. ` +
        `Use !commands to see all commands. ` +
        `Requires Video Game Wingman Pro — link your Twitch account on our website!`;
      
      const respondedAt = new Date();
      await this.sendMessage(channel, helpMessage);
      
      const totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
      const processingTimeMs = processedAt.getTime() - receivedAt.getTime();
      
      // Log analytics for command
      await logMessageEvent({
        channelName: normalizedChannel,
        twitchUsername: username,
        displayName: displayName,
        messageType: 'command',
        command: '!help',
        questionLength: 0,
        responseLength: helpMessage.length,
        processingTimeMs,
        aiResponseTimeMs: 0, // Commands don't use AI
        totalTimeMs,
        cacheHit: false,
        success: true,
        receivedAt,
        processedAt,
        respondedAt
      });
      
      logger.info('Help command executed', { channel, displayName });
    } catch (error) {
      const respondedAt = new Date();
      const totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
      const processingTimeMs = processedAt.getTime() - receivedAt.getTime();
      
      // Log analytics for failed command
      await logMessageEvent({
        channelName: normalizedChannel,
        twitchUsername: username,
        displayName: displayName,
        messageType: 'command',
        command: '!help',
        questionLength: 0,
        responseLength: 0,
        processingTimeMs,
        aiResponseTimeMs: 0,
        totalTimeMs,
        cacheHit: false,
        success: false,
        errorType: 'api_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        receivedAt,
        processedAt,
        respondedAt
      });
      
      throw error;
    }
  }

  /**
   * Handle !commands command - List all available commands
   */
  private async handleCommandsCommand(channel: string, displayName: string, userstate?: ChatUserstate, settings?: TwitchChannelSettings): Promise<void> {
    const receivedAt = new Date();
    const processedAt = new Date();
    const username = userstate?.username || 'unknown';
    const normalizedChannel = channel.replace('#', '').toLowerCase();
    
    // Load settings if not provided
    if (!settings) {
      settings = await this.getChannelSettings(normalizedChannel);
    }
    
    try {
      // Build command list from channel settings
      const commandEntries = settings.commandPrefixes.map(p => `• ${p} <question> — Ask a gaming question`);
      const mentionEntry = settings.botMentionEnabled 
        ? [`• @${settings.botMentionName} <question> — Mention me with a question`]
        : [];
      
      const commandsList = [
        `@${displayName} 📋 Available Commands:`,
        `• !help — Show this help message`,
        `• !commands — List all commands`,
        ...commandEntries,
        ...mentionEntry,
        ``,
        `💡 Tip: Link your Twitch account on our website for Pro access!`
      ];
      
      // Send commands in chunks if needed (respecting channel-specific message length limit)
      const maxLength = settings.maxMessageLength;
      let currentMessage = '';
      let totalResponseLength = 0;
      for (const line of commandsList) {
        const potentialMessage = currentMessage ? `${currentMessage}\n${line}` : line;
        
        if (potentialMessage.length > maxLength) {
          // Send current message if it has content
          if (currentMessage) {
            await this.sendMessage(channel, currentMessage);
            totalResponseLength += currentMessage.length;
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
        totalResponseLength += currentMessage.length;
      }
      
      const respondedAt = new Date();
      const totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
      const processingTimeMs = processedAt.getTime() - receivedAt.getTime();
      
      // Log analytics for command
      await logMessageEvent({
        channelName: normalizedChannel,
        twitchUsername: username,
        displayName: displayName,
        messageType: 'command',
        command: '!commands',
        questionLength: 0,
        responseLength: totalResponseLength,
        processingTimeMs,
        aiResponseTimeMs: 0, // Commands don't use AI
        totalTimeMs,
        cacheHit: false,
        success: true,
        receivedAt,
        processedAt,
        respondedAt
      });
      
      logger.info('Commands command executed', { channel, displayName });
    } catch (error) {
      const respondedAt = new Date();
      const totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
      const processingTimeMs = processedAt.getTime() - receivedAt.getTime();
      
      // Log analytics for failed command
      await logMessageEvent({
        channelName: normalizedChannel,
        twitchUsername: username,
        displayName: displayName,
        messageType: 'command',
        command: '!commands',
        questionLength: 0,
        responseLength: 0,
        processingTimeMs,
        aiResponseTimeMs: 0,
        totalTimeMs,
        cacheHit: false,
        success: false,
        errorType: 'api_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        receivedAt,
        processedAt,
        respondedAt
      });
      
      throw error;
    }
  }

  private async handleMessage(
    channel: string,
    userstate: ChatUserstate,
    question: string,
    displayName: string,
    settings?: TwitchChannelSettings
  ): Promise<void> {
    const username = userstate.username || 'unknown';
    const normalizedChannel = channel.replace('#', '').toLowerCase().trim();
    
    // Load settings if not provided
    if (!settings) {
      settings = await this.getChannelSettings(normalizedChannel);
    }
    
    // Analytics tracking variables
    const receivedAt = new Date();
    let processedAt: Date | null = null;
    let respondedAt: Date | null = null;
    let processingTimeMs = 0;
    let aiResponseTimeMs = 0;
    let totalTimeMs = 0;
    let cacheHit = false;
    let success = false;
    let errorType: string | undefined;
    let errorMessage: string | undefined;
    let wasModerated = false;
    let moderationAction: string | undefined;
    let responseLength = 0;
    let messageType: 'command' | 'question' | 'other' = 'question';
    let command: string | undefined;
    
    try {
      processedAt = new Date();
      processingTimeMs = processedAt.getTime() - receivedAt.getTime();
      
      logger.info('Processing Twitch message', {
        username: username,
        displayName: displayName,
        channel: channel,
        contentLength: question.length
      });

      // Check if user is banned in this channel (using Twitch-specific ban tracking)
      const banStatus = await measureDBQuery(
        'check_twitch_user_ban_status',
        () => checkTwitchUserBanStatus(username, channel),
        normalizedChannel,
        { username }
      );
      if (banStatus.isBanned) {
        // User is banned - silently reject (don't respond)
        logger.info('Rejecting message from banned user', {
          username,
          channel,
          bannedAt: banStatus.bannedAt,
          reason: banStatus.reason
        });
        
        // Log analytics for banned user
        respondedAt = new Date();
        totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
        await logMessageEvent({
          channelName: normalizedChannel,
          twitchUsername: username,
          displayName: displayName,
          messageType: 'other',
          questionLength: question.length,
          responseLength: 0,
          processingTimeMs,
          aiResponseTimeMs: 0,
          totalTimeMs,
          cacheHit: false,
          success: false,
          errorType: 'moderation',
          errorMessage: 'User is banned',
          wasModerated: true,
          moderationAction: 'banned',
          receivedAt,
          processedAt,
          respondedAt
        });
        return; // Silently reject - don't process with AI
      }

      // Pre-processing: Check message for offensive content before AI processing
      const moderationCheck = await measureOperation(
        'check_message_content',
        () => checkMessageContent(question, username, normalizedChannel),
        normalizedChannel,
        { username, messageLength: question.length }
      );
      
      if (!moderationCheck.shouldProcess) {
        // Offensive content detected - handle moderation violation
        wasModerated = true;
        moderationAction = moderationCheck.violationResult?.action || 'warning';
        
        await handleModerationViolation(
          channel,
          username,
          displayName,
          moderationCheck,
          question // Pass original message for logging
        );
        
        // Log analytics for moderated message
        respondedAt = new Date();
        totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
        await logMessageEvent({
          channelName: normalizedChannel,
          twitchUsername: username,
          displayName: displayName,
          messageType: 'other',
          questionLength: question.length,
          responseLength: 0,
          processingTimeMs,
          aiResponseTimeMs: 0,
          totalTimeMs,
          cacheHit: false,
          success: false,
          errorType: 'moderation',
          errorMessage: moderationCheck.reason,
          wasModerated: true,
          moderationAction,
          receivedAt,
          processedAt,
          respondedAt
        });
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
        const channelData = await measureDBQuery(
          'find_twitch_bot_channel',
          () => TwitchBotChannel.findOne({ 
            channelName: channelName 
          }),
          normalizedChannel,
          { channelName }
        );
        
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
          const user = await measureDBQuery(
            'find_user_by_twitch_username',
            () => User.findOne({ 
              twitchUsername: twitchUsernameLower
            }).select('username twitchUsername').lean(),
            normalizedChannel,
            { twitchUsername: twitchUsernameLower }
          );
          
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

      const hasAccess = await measureAPICall(
        'check_pro_access',
        () => this.retryOperation(() => checkProAccess(identifier)),
        normalizedChannel,
        { identifier, username }
      );
      
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
        
        respondedAt = new Date();
        totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
        responseLength = message.length;
        
        await this.sendMessage(channel, message);
        
        // Log analytics for Pro access denied
        await logMessageEvent({
          channelName: normalizedChannel,
          twitchUsername: username,
          displayName: displayName,
          messageType: 'question',
          questionLength: question.length,
          responseLength,
          processingTimeMs,
          aiResponseTimeMs: 0,
          totalTimeMs,
          cacheHit: false,
          success: false,
          errorType: 'pro_access_denied',
          errorMessage: 'Pro access required',
          receivedAt,
          processedAt: processedAt || receivedAt,
          respondedAt
        });
        return;
      }

        // Check cache first (if enabled)
      const cachedResponse = settings.cacheEnabled ? this.getCachedResponse(question, settings) : null;
      if (cachedResponse) {
        cacheHit = true;
        responseLength = cachedResponse.length;
        respondedAt = new Date();
        totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
        
        // Record cache hit performance
        const monitor = getPerformanceMonitor();
        monitor.recordCacheHitRate('cache_check', 1.0, normalizedChannel, {
          username,
          questionLength: question.length
        });
        monitor.recordResponseTime('cached_response', totalTimeMs, normalizedChannel, {
          username,
          cacheHit: true
        });
        
        // Shorten markdown links in the cached response before sending
        const formattedCachedResponse = shortenMarkdownLinks(cachedResponse);
        
        await this.sendLongMessage(channel, displayName, formattedCachedResponse, settings);
        
        // Log analytics for cached response
        await logMessageEvent({
          channelName: normalizedChannel,
          twitchUsername: username,
          displayName: displayName,
          messageType: 'question',
          questionLength: question.length,
          responseLength,
          processingTimeMs,
          aiResponseTimeMs: 0, // Cache hit - no AI processing
          totalTimeMs,
          cacheHit: true,
          success: true,
          receivedAt,
          processedAt: processedAt || receivedAt,
          respondedAt
        });
        return;
      }
      
      // Record cache miss
      const monitor = getPerformanceMonitor();
      monitor.recordCacheHitRate('cache_check', 0.0, normalizedChannel, {
        username,
        questionLength: question.length
      });

      // Process the message with AI
      logger.info('Generating AI response', { username });
      const aiStartTime = Date.now();
      const response = await measureOperation(
        'process_message_ai',
        () => this.processMessage(question, username, normalizedChannel, settings),
        normalizedChannel,
        { username, questionLength: question.length }
      );
      const aiEndTime = Date.now();
      aiResponseTimeMs = aiEndTime - aiStartTime;
      
      // Record AI response time separately
      monitor.recordAIResponseTime(
        'ai_response_generation',
        aiResponseTimeMs,
        normalizedChannel,
        { username, questionLength: question.length, responseLength: response?.length || 0 }
      );
      
      if (response) {
        responseLength = response.length;
        
        // Cache the response (cache original, not shortened) if caching is enabled
        if (settings.cacheEnabled) {
          this.cacheResponse(question, response, settings);
        }
        logger.info('Sending response to user', {
          username,
          responseLength: response.length
        });

        // Shorten markdown links in the response before sending
        const formattedResponse = shortenMarkdownLinks(response);

        // Split long messages into chunks using channel-specific message length limit
        respondedAt = new Date();
        await this.sendLongMessage(channel, displayName, formattedResponse, settings);
        totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
        success = true;
        
        logger.info('Response sent successfully', { username });

        // Update message count for this channel
        await this.updateChannelMessageCount(channel);
        
        // Record successful response performance
        monitor.recordResponseTime('message_processing', totalTimeMs, normalizedChannel, {
          username,
          success: true,
          cacheHit: false
        });
        
        // Log analytics for successful message processing
        await logMessageEvent({
          channelName: normalizedChannel,
          twitchUsername: username,
          displayName: displayName,
          messageType: 'question',
          questionLength: question.length,
          responseLength,
          processingTimeMs,
          aiResponseTimeMs,
          totalTimeMs,
          cacheHit: false,
          success: true,
          receivedAt,
          processedAt: processedAt || receivedAt,
          respondedAt
        });
      } else {
        logger.warn('No response generated', { username });
        respondedAt = new Date();
        totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
        errorType = 'no_response';
        errorMessage = 'AI did not generate a response';
        
        // Record error performance
        monitor.recordResponseTime('message_processing', totalTimeMs, normalizedChannel, {
          username,
          success: false,
          errorType
        });
        monitor.recordErrorRate('message_processing', 1.0, normalizedChannel, {
          username,
          errorType
        });
        
        // Log analytics for no response
        await logMessageEvent({
          channelName: normalizedChannel,
          twitchUsername: username,
          displayName: displayName,
          messageType: 'question',
          questionLength: question.length,
          responseLength: 0,
          processingTimeMs,
          aiResponseTimeMs,
          totalTimeMs,
          cacheHit: false,
          success: false,
          errorType,
          errorMessage,
          receivedAt,
          processedAt: processedAt || receivedAt,
          respondedAt
        });
      }
    } catch (error) {
      logger.error('Error in handleMessage', {
        error,
        username,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      
      // Determine error type
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('rate limit') || errorMsg.includes('rate_limit')) {
        errorType = 'rate_limit';
      } else if (errorMsg.includes('API') || errorMsg.includes('api')) {
        errorType = 'api_error';
      } else {
        errorType = 'other';
      }
      errorMessage = errorMsg;
      
      respondedAt = new Date();
      totalTimeMs = respondedAt.getTime() - receivedAt.getTime();
      
      // Record error performance
      const monitor = getPerformanceMonitor();
      monitor.recordResponseTime('message_processing', totalTimeMs, normalizedChannel, {
        username,
        success: false,
        errorType,
        errorMessage: errorMsg
      });
      monitor.recordErrorRate('message_processing', 1.0, normalizedChannel, {
        username,
        errorType,
        errorMessage: errorMsg
      });
      
      // Log analytics for error
      await logMessageEvent({
        channelName: normalizedChannel,
        twitchUsername: username,
        displayName: displayName,
        messageType: 'question',
        questionLength: question.length,
        responseLength: 0,
        processingTimeMs,
        aiResponseTimeMs,
        totalTimeMs,
        cacheHit: false,
        success: false,
        errorType,
        errorMessage,
        wasModerated,
        moderationAction,
        receivedAt,
        processedAt: processedAt || receivedAt,
        respondedAt
      });
      
      this.handleError(error, channel, displayName);
    }
  }

  private async processMessage(question: string, twitchUsername: string, channelName?: string, settings?: TwitchChannelSettings): Promise<string> {
    try {
      // Load settings if not provided
      if (!settings && channelName) {
        settings = await this.getChannelSettings(channelName);
      }
      
      // Create a system message using botConfig and channel settings
      const systemMessage = this.createSystemMessage(settings);

      // Get AI response with retry mechanism
      const response = await measureAPICall(
        'get_chat_completion',
        () => this.retryOperation(() =>
          getChatCompletion(question, systemMessage)
        ),
        channelName,
        { twitchUsername, questionLength: question.length }
      );

      const aiResponse = response || this.createFallbackResponse();

      // Post-processing: Check AI response for inappropriate content
      const responseCheck = await measureOperation(
        'check_ai_response',
        () => checkAIResponse(aiResponse, twitchUsername, channelName),
        channelName,
        { twitchUsername, responseLength: aiResponse.length }
      );
      
      if (!responseCheck.shouldProcess) {
        // AI generated inappropriate content - replace with safe fallback
        // Note: This is tracked in analytics but wasModerated is false because it's AI-generated, not user-generated
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

  private createSystemMessage(settings?: TwitchChannelSettings): string {
    // Use custom system message if provided, otherwise use default
    if (settings?.customSystemMessage) {
      return settings.customSystemMessage;
    }
    
    const maxLength = settings?.maxMessageLength || 500;
    return `You are ${botConfig.name}, ${botConfig.description}. 
Your expertise includes: ${botConfig.knowledge.join(', ')}. 
Character: ${botConfig.bio[0]}

Keep responses concise for Twitch chat (under ${maxLength} characters when possible).`;
  }

  private createFallbackResponse(): string {
    return `I apologize, but I was unable to generate a response. As ${botConfig.name}, I aim to provide helpful gaming advice and information.`;
  }

  /**
   * Split and send long messages that exceed channel-specific message length limit
   * Attempts to split at sentence boundaries when possible
   */
  private async sendLongMessage(channel: string, displayName: string, text: string, settings: TwitchChannelSettings): Promise<void> {
    const MAX_LENGTH = settings.maxMessageLength;
    
    // If message fits, send it directly with appropriate formatting based on response style
    if (text.length <= MAX_LENGTH) {
      const formattedMessage = this.formatMessage(text, displayName, settings, true);
      await this.sendMessage(channel, formattedMessage);
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

    // Send all chunks with appropriate formatting
    for (let i = 0; i < finalChunks.length; i++) {
      const isFirst = i === 0;
      const formattedMessage = this.formatMessage(finalChunks[i], displayName, settings, isFirst);
      await this.sendMessage(channel, formattedMessage);

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

  private checkRateLimit(username: string, channelName: string, settings: TwitchChannelSettings): boolean {
    const now = Date.now();
    // Use channel-specific key to allow different rate limits per channel
    const rateLimitKey = `${channelName}:${username}`;
    const userLimit = this.rateLimits.get(rateLimitKey);

    const windowMs = settings.rateLimitWindowMs;
    const maxMessages = settings.maxMessagesPerWindow;

    if (!userLimit || (now - userLimit.timestamp) > windowMs) {
      this.rateLimits.set(rateLimitKey, { timestamp: now, count: 1 });
      return true;
    }

    if (userLimit.count >= maxMessages) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  private getCachedResponse(question: string, settings: TwitchChannelSettings): string | null {
    if (!settings.cacheEnabled) {
      return null;
    }
    
    const cached = this.responseCache.get(question);
    if (cached && Date.now() - cached.timestamp < settings.cacheTTLMs) {
      return cached.response;
    }
    return null;
  }

  private cacheResponse(question: string, response: string, settings: TwitchChannelSettings): void {
    if (!settings.cacheEnabled) {
      return;
    }
    
    this.responseCache.set(question, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Format message based on channel response style settings
   */
  private formatMessage(text: string, displayName: string, settings: TwitchChannelSettings, isFirst: boolean): string {
    switch (settings.responseStyle) {
      case 'no-mention':
        // Never mention user
        return text;
      
      case 'compact':
        // Minimal formatting, only mention in first message if enabled
        if (isFirst && settings.mentionUserInFirstMessage) {
          return `@${displayName} ${text}`;
        }
        return text;
      
      case 'mention':
      default:
        // Always mention user in first message, optionally in others
        if (isFirst && settings.mentionUserInFirstMessage) {
          return `@${displayName} ${text}`;
        }
        // For subsequent messages, only mention if mentionUserInFirstMessage is false (then mention all)
        if (!settings.mentionUserInFirstMessage) {
          return `@${displayName} ${text}`;
        }
        return text;
    }
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
    // Clean up rate limits periodically (use default window for cleanup)
    const defaultWindow = 60000; // 1 minute default
    setInterval(() => {
      const now = Date.now();
      Array.from(this.rateLimits.entries()).forEach(([key, limit]) => {
        // Use a reasonable default window for cleanup (rate limits are per-channel anyway)
        if (now - limit.timestamp > defaultWindow * 2) {
          this.rateLimits.delete(key);
        }
      });
    }, defaultWindow);

    // Clean up response cache periodically (use default TTL for cleanup)
    const defaultCacheTTL = 300000; // 5 minutes default
    setInterval(() => {
      const now = Date.now();
      Array.from(this.responseCache.entries()).forEach(([question, cached]) => {
        if (now - cached.timestamp > defaultCacheTTL * 2) {
          this.responseCache.delete(question);
        }
      });
    }, defaultCacheTTL);

    // Clean up channel settings cache periodically
    setInterval(() => {
      const now = Date.now();
      Array.from(this.channelSettingsCache.entries()).forEach(([channelName, cached]) => {
        if (now - cached.timestamp > this.CHANNEL_SETTINGS_CACHE_TTL) {
          this.channelSettingsCache.delete(channelName);
        }
      });
    }, this.CHANNEL_SETTINGS_CACHE_TTL);

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

