/**
 * Twitch Bot Moderation Configuration
 * 
 * Centralized configuration for moderation features
 * These settings control how the bot moderates content and applies actions
 */

export interface TwitchModerationConfig {
  /** Whether moderation is enabled */
  enabled: boolean;
  
  /** Stricter filtering mode (more aggressive content detection) */
  strictMode: boolean;
  
  /** Timeout durations in seconds for progressive moderation */
  timeoutDurations: {
    /** First violation - warning only (0 = no timeout) */
    first: number;
    /** Second violation - short timeout */
    second: number;
    /** Third violation - medium timeout */
    third: number;
    /** Fourth violation - long timeout */
    fourth: number;
  };
  
  /** Maximum violations before permanent ban */
  maxViolationsBeforeBan: number;
  
  /** Whether to check AI-generated responses for inappropriate content */
  checkAIResponses: boolean;
  
  /** Whether to log all moderation actions to database */
  logAllActions: boolean;
}

/**
 * Default moderation configuration
 * Sensible defaults for most use cases
 */
export const defaultModerationConfig: TwitchModerationConfig = {
  enabled: true,
  strictMode: false,
  timeoutDurations: {
    first: 0,        // Warning only - no timeout
    second: 300,     // 5 minutes
    third: 1800,     // 30 minutes
    fourth: 3600,    // 1 hour
  },
  maxViolationsBeforeBan: 5, // Ban on 5th violation
  checkAIResponses: true,    // Check AI responses for inappropriate content
  logAllActions: true,       // Log all actions to database
};

/**
 * Get moderation configuration
 * Supports per-channel configuration from database
 * Falls back to environment variables or defaults if channel config not found
 * 
 * @param channelName - Optional: channel name for per-channel config
 * @returns Promise<TwitchModerationConfig> - Moderation configuration
 */
export async function getModerationConfig(channelName?: string): Promise<TwitchModerationConfig> {
  // If channelName is provided, try to load per-channel config from database
  if (channelName) {
    try {
      const normalizedChannelName = channelName.replace('#', '').toLowerCase().trim();
      
      // Dynamically import to avoid circular dependencies
      const connectToMongoDB = (await import('../utils/mongodb')).default;
      const TwitchBotChannel = (await import('../models/TwitchBotChannel')).default;
      
      await connectToMongoDB();
      
      const channel = await TwitchBotChannel.findOne({
        channelName: normalizedChannelName
      }).select('moderationConfig').lean() as { moderationConfig?: TwitchModerationConfig } | null;
      
      if (channel && channel.moderationConfig) {
        // Return per-channel config
        return channel.moderationConfig;
      }
    } catch (error) {
      // If database lookup fails, fall through to environment/default config
      // This ensures the bot continues to work even if DB is unavailable
      console.warn('Failed to load per-channel moderation config, using defaults', {
        channelName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Fall back to environment variables or defaults
  const config: TwitchModerationConfig = {
    enabled: process.env.TWITCH_MODERATION_ENABLED !== 'false',
    strictMode: process.env.TWITCH_MODERATION_STRICT_MODE === 'true',
    timeoutDurations: {
      first: parseInt(process.env.TWITCH_MODERATION_TIMEOUT_FIRST || '0', 10),
      second: parseInt(process.env.TWITCH_MODERATION_TIMEOUT_SECOND || '300', 10),
      third: parseInt(process.env.TWITCH_MODERATION_TIMEOUT_THIRD || '1800', 10),
      fourth: parseInt(process.env.TWITCH_MODERATION_TIMEOUT_FOURTH || '3600', 10),
    },
    maxViolationsBeforeBan: parseInt(process.env.TWITCH_MODERATION_MAX_VIOLATIONS || '5', 10),
    checkAIResponses: process.env.TWITCH_MODERATION_CHECK_AI_RESPONSES !== 'false',
    logAllActions: process.env.TWITCH_MODERATION_LOG_ALL !== 'false',
  };
  
  // Use defaults if environment variables are not set or invalid
  if (isNaN(config.timeoutDurations.first)) config.timeoutDurations.first = defaultModerationConfig.timeoutDurations.first;
  if (isNaN(config.timeoutDurations.second)) config.timeoutDurations.second = defaultModerationConfig.timeoutDurations.second;
  if (isNaN(config.timeoutDurations.third)) config.timeoutDurations.third = defaultModerationConfig.timeoutDurations.third;
  if (isNaN(config.timeoutDurations.fourth)) config.timeoutDurations.fourth = defaultModerationConfig.timeoutDurations.fourth;
  if (isNaN(config.maxViolationsBeforeBan)) config.maxViolationsBeforeBan = defaultModerationConfig.maxViolationsBeforeBan;
  
  return config;
}

/**
 * Export default config for direct access
 */
export const moderationConfig = getModerationConfig();

