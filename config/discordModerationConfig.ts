/**
 * Discord Bot Moderation Configuration
 * 
 * Centralized configuration for moderation features
 * These settings control how the bot moderates content and applies actions
 */

export interface DiscordModerationConfig {
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
export const defaultDiscordModerationConfig: DiscordModerationConfig = {
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
 * Supports per-server configuration from database
 * Falls back to environment variables or defaults if server config not found
 * 
 * @param guildId - Optional: Discord server (guild) ID for per-server config
 * @returns Promise<DiscordModerationConfig> - Moderation configuration
 */
export async function getDiscordModerationConfig(guildId?: string): Promise<DiscordModerationConfig> {
  // If guildId is provided, try to load per-server config from database
  // For now, we'll use defaults - can be extended later to support per-server config
  if (guildId) {
    try {
      // TODO: Add per-server configuration support in the future
      // For now, all servers use the same config
    } catch (error) {
      // If database lookup fails, fall through to environment/default config
      console.warn('Failed to load per-server moderation config, using defaults', {
        guildId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Fall back to environment variables or defaults
  const config: DiscordModerationConfig = {
    enabled: process.env.DISCORD_MODERATION_ENABLED !== 'false',
    strictMode: process.env.DISCORD_MODERATION_STRICT_MODE === 'true',
    timeoutDurations: {
      first: parseInt(process.env.DISCORD_MODERATION_TIMEOUT_FIRST || '0', 10),
      second: parseInt(process.env.DISCORD_MODERATION_TIMEOUT_SECOND || '300', 10),
      third: parseInt(process.env.DISCORD_MODERATION_TIMEOUT_THIRD || '1800', 10),
      fourth: parseInt(process.env.DISCORD_MODERATION_TIMEOUT_FOURTH || '3600', 10),
    },
    maxViolationsBeforeBan: parseInt(process.env.DISCORD_MODERATION_MAX_VIOLATIONS || '5', 10),
    checkAIResponses: process.env.DISCORD_MODERATION_CHECK_AI_RESPONSES !== 'false',
    logAllActions: process.env.DISCORD_MODERATION_LOG_ALL !== 'false',
  };
  
  // Use defaults if environment variables are not set or invalid
  if (isNaN(config.timeoutDurations.first)) config.timeoutDurations.first = defaultDiscordModerationConfig.timeoutDurations.first;
  if (isNaN(config.timeoutDurations.second)) config.timeoutDurations.second = defaultDiscordModerationConfig.timeoutDurations.second;
  if (isNaN(config.timeoutDurations.third)) config.timeoutDurations.third = defaultDiscordModerationConfig.timeoutDurations.third;
  if (isNaN(config.timeoutDurations.fourth)) config.timeoutDurations.fourth = defaultDiscordModerationConfig.timeoutDurations.fourth;
  if (isNaN(config.maxViolationsBeforeBan)) config.maxViolationsBeforeBan = defaultDiscordModerationConfig.maxViolationsBeforeBan;
  
  return config;
}

