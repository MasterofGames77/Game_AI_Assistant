/**
 * Twitch Bot Channel-Specific Settings Configuration
 * 
 * Centralized configuration for channel-specific bot settings
 * These settings allow streamers to customize bot behavior per channel
 */

export interface TwitchChannelSettings {
  /** Custom command prefixes (e.g., ['!wingman', '!hgwm', '!custom']) */
  commandPrefixes: string[];
  
  /** Whether bot mentions (@botname) are enabled */
  botMentionEnabled: boolean;
  
  /** Bot mention name (default: 'herogamewingman') */
  botMentionName: string;
  
  /** Rate limit window in milliseconds (default: 60000 = 1 minute) */
  rateLimitWindowMs: number;
  
  /** Maximum messages per rate limit window (default: 10) */
  maxMessagesPerWindow: number;
  
  /** Response style: 'mention' (always mention user), 'no-mention' (never mention), 'compact' (minimal formatting) */
  responseStyle: 'mention' | 'no-mention' | 'compact';
  
  /** Whether to mention user in first message of multi-part responses */
  mentionUserInFirstMessage: boolean;
  
  /** Maximum message length in characters (default: 500, Twitch limit) */
  maxMessageLength: number;
  
  /** Whether response caching is enabled */
  cacheEnabled: boolean;
  
  /** Cache TTL in milliseconds (default: 300000 = 5 minutes) */
  cacheTTLMs: number;
  
  /** Custom system message for AI (optional, overrides default) */
  customSystemMessage?: string;
}

/**
 * Default channel settings
 * Sensible defaults that match current bot behavior
 */
export const defaultChannelSettings: TwitchChannelSettings = {
  commandPrefixes: ['!wingman', '!hgwm'],
  botMentionEnabled: true,
  botMentionName: 'herogamewingman',
  rateLimitWindowMs: 60000, // 1 minute
  maxMessagesPerWindow: 10,
  responseStyle: 'mention',
  mentionUserInFirstMessage: true,
  maxMessageLength: 500, // Twitch limit
  cacheEnabled: true,
  cacheTTLMs: 300000, // 5 minutes
};

/**
 * Get channel settings for a specific channel
 * Falls back to defaults if channel config not found
 * 
 * @param channelName - Channel name (with or without #)
 * @returns Promise<TwitchChannelSettings> - Channel settings
 */
export async function getChannelSettings(channelName?: string): Promise<TwitchChannelSettings> {
  // If channelName is provided, try to load per-channel settings from database
  if (channelName) {
    try {
      const normalizedChannelName = channelName.replace('#', '').toLowerCase().trim();
      
      // Dynamically import to avoid circular dependencies
      const connectToMongoDB = (await import('../utils/mongodb')).default;
      const TwitchBotChannel = (await import('../models/TwitchBotChannel')).default;
      
      await connectToMongoDB();
      
      const channel = await TwitchBotChannel.findOne({
        channelName: normalizedChannelName
      }).select('channelSettings').lean() as { channelSettings?: TwitchChannelSettings } | null;
      
      if (channel && channel.channelSettings) {
        // Merge with defaults to ensure all fields are present
        return {
          ...defaultChannelSettings,
          ...channel.channelSettings,
        };
      }
    } catch (error) {
      // If database lookup fails, fall through to defaults
      // This ensures the bot continues to work even if DB is unavailable
      console.warn('Failed to load per-channel settings, using defaults', {
        channelName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Return defaults if no channel-specific settings found
  return defaultChannelSettings;
}

/**
 * Validate channel settings
 * Ensures settings are within acceptable ranges
 * 
 * @param settings - Settings to validate
 * @returns Validated settings with corrections applied
 */
export function validateChannelSettings(settings: Partial<TwitchChannelSettings>): TwitchChannelSettings {
  const validated = { ...defaultChannelSettings, ...settings };
  
  // Validate command prefixes
  if (!Array.isArray(validated.commandPrefixes) || validated.commandPrefixes.length === 0) {
    validated.commandPrefixes = defaultChannelSettings.commandPrefixes;
  }
  // Ensure all prefixes start with !
  validated.commandPrefixes = validated.commandPrefixes.map(prefix => 
    prefix.startsWith('!') ? prefix : `!${prefix}`
  );
  
  // Validate rate limit window (min 1000ms, max 300000ms = 5 minutes)
  if (validated.rateLimitWindowMs < 1000 || validated.rateLimitWindowMs > 300000) {
    validated.rateLimitWindowMs = defaultChannelSettings.rateLimitWindowMs;
  }
  
  // Validate max messages per window (min 1, max 100)
  if (validated.maxMessagesPerWindow < 1 || validated.maxMessagesPerWindow > 100) {
    validated.maxMessagesPerWindow = defaultChannelSettings.maxMessagesPerWindow;
  }
  
  // Validate max message length (min 100, max 500)
  if (validated.maxMessageLength < 100 || validated.maxMessageLength > 500) {
    validated.maxMessageLength = defaultChannelSettings.maxMessageLength;
  }
  
  // Validate cache TTL (min 60000ms = 1 minute, max 3600000ms = 1 hour)
  if (validated.cacheTTLMs < 60000 || validated.cacheTTLMs > 3600000) {
    validated.cacheTTLMs = defaultChannelSettings.cacheTTLMs;
  }
  
  // Validate bot mention name (must be lowercase, alphanumeric + underscore)
  if (validated.botMentionName && !/^[a-z0-9_]+$/.test(validated.botMentionName.toLowerCase())) {
    validated.botMentionName = defaultChannelSettings.botMentionName;
  } else if (validated.botMentionName) {
    validated.botMentionName = validated.botMentionName.toLowerCase();
  }
  
  return validated;
}

