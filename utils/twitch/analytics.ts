import { connectToWingmanDB } from '../databaseConnections';
import { logger } from '../logger';
import TwitchBotAnalytics from '../../models/TwitchBotAnalytics';

/**
 * Interface for message event data to be logged
 */
export interface MessageEventData {
  channelName: string;
  twitchUsername: string;
  displayName: string;
  messageType: 'command' | 'question' | 'other';
  command?: string;
  questionLength: number;
  responseLength: number;
  processingTimeMs: number;
  aiResponseTimeMs: number;
  totalTimeMs: number;
  cacheHit: boolean;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  wasModerated?: boolean;
  moderationAction?: string;
  receivedAt?: Date;
  processedAt?: Date;
  respondedAt?: Date;
}

/**
 * Interface for aggregated analytics result
 */
export interface AggregatedAnalytics {
  channelName: string;
  date: Date;
  hour?: number;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  uniqueUsers: number;
  helpCommandCount: number;
  commandsCommandCount: number;
  questionCount: number;
  avgProcessingTimeMs: number;
  avgResponseTimeMs: number;
  cacheHitRate: number;
  rateLimitHits: number;
  apiErrors: number;
  moderationActions: number;
  newUsers: number;
  returningUsers: number;
}

/**
 * Interface for user statistics
 */
export interface UserStatistics {
  twitchUsername: string;
  displayName: string;
  channelName: string;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  avgProcessingTimeMs: number;
  avgResponseTimeMs: number;
  cacheHitRate: number;
  commandUsage: {
    help: number;
    commands: number;
    questions: number;
  };
  errorBreakdown: {
    rateLimit: number;
    apiError: number;
    moderation: number;
    other: number;
  };
  firstSeen: Date | null;
  lastSeen: Date | null;
  days?: number; // Time period analyzed
}

/**
 * Interface for channel statistics
 */
export interface ChannelStatistics {
  channelName: string;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  uniqueUsers: number;
  avgProcessingTimeMs: number;
  avgResponseTimeMs: number;
  cacheHitRate: number;
  commandUsage: {
    help: number;
    commands: number;
    questions: number;
  };
  errorBreakdown: {
    rateLimit: number;
    apiError: number;
    moderation: number;
    other: number;
  };
  moderationActions: number;
  newUsers: number;
  returningUsers: number;
  days?: number; // Time period analyzed
  startDate: Date;
  endDate: Date;
}

/**
 * Generate a unique message ID for analytics
 */
function generateMessageId(channelName: string, twitchUsername: string, receivedAt: Date): string {
  const timestamp = receivedAt.getTime();
  const random = Math.random().toString(36).substring(2, 11);
  return `msg_${channelName.replace('#', '').toLowerCase()}_${twitchUsername.toLowerCase()}_${timestamp}_${random}`;
}

/**
 * Normalize channel name (remove #, lowercase, trim)
 */
function normalizeChannelName(channel: string): string {
  return channel.replace('#', '').toLowerCase().trim();
}

/**
 * Normalize Twitch username (lowercase, trim)
 */
function normalizeTwitchUsername(username: string): string {
  return username.toLowerCase().trim();
}

/**
 * Log a message event to the analytics database
 * This function is designed to be non-blocking and fail gracefully
 * 
 * @param data - Message event data to log
 * @returns Promise<void>
 */
export async function logMessageEvent(data: MessageEventData): Promise<void> {
  try {
    // Ensure database connection
    await connectToWingmanDB();

    // Normalize channel name and username
    const channelName = normalizeChannelName(data.channelName);
    const twitchUsername = normalizeTwitchUsername(data.twitchUsername);

    // Generate unique message ID
    const receivedAt = data.receivedAt || new Date();
    const messageId = generateMessageId(channelName, twitchUsername, receivedAt);

    // Create analytics document
    const analyticsDoc = new TwitchBotAnalytics({
      messageId,
      channelName,
      twitchUsername,
      displayName: data.displayName.trim(),
      messageType: data.messageType,
      command: data.command?.trim(),
      questionLength: data.questionLength,
      responseLength: data.responseLength,
      processingTimeMs: data.processingTimeMs,
      aiResponseTimeMs: data.aiResponseTimeMs,
      totalTimeMs: data.totalTimeMs,
      cacheHit: data.cacheHit,
      success: data.success,
      errorType: data.errorType?.trim(),
      errorMessage: data.errorMessage?.trim(),
      wasModerated: data.wasModerated || false,
      moderationAction: data.moderationAction?.trim(),
      receivedAt,
      processedAt: data.processedAt || receivedAt,
      respondedAt: data.respondedAt
    });

    // Save to database (fire and forget - don't block on this)
    await analyticsDoc.save();

    logger.debug('Analytics event logged', {
      messageId,
      channelName,
      twitchUsername,
      messageType: data.messageType,
      success: data.success
    });
  } catch (error) {
    // Log error but don't throw - analytics failures shouldn't break bot functionality
    logger.error('Error logging analytics event', {
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName: data.channelName,
      twitchUsername: data.twitchUsername
    });
  }
}

/**
 * Aggregate analytics for a time period
 * Returns aggregated statistics grouped by the specified granularity
 * 
 * @param channelName - Channel name to aggregate for
 * @param startDate - Start date for aggregation
 * @param endDate - End date for aggregation
 * @param granularity - 'hourly' or 'daily' aggregation
 * @returns Promise<AggregatedAnalytics[]>
 */
export async function aggregateAnalytics(
  channelName: string,
  startDate: Date,
  endDate: Date,
  granularity: 'hourly' | 'daily'
): Promise<AggregatedAnalytics[]> {
  try {
    await connectToWingmanDB();

    const normalizedChannel = normalizeChannelName(channelName);

    // Build aggregation pipeline
    const matchStage: any = {
      channelName: normalizedChannel,
      receivedAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Group by date and optionally hour
    const groupStage: any = {
      _id: {
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$receivedAt',
            timezone: 'UTC'
          }
        }
      },
      totalMessages: { $sum: 1 },
      successfulMessages: { $sum: { $cond: ['$success', 1, 0] } },
      failedMessages: { $sum: { $cond: ['$success', 0, 1] } },
      uniqueUsers: { $addToSet: '$twitchUsername' },
      helpCommandCount: {
        $sum: { $cond: [{ $eq: ['$command', '!help'] }, 1, 0] }
      },
      commandsCommandCount: {
        $sum: { $cond: [{ $eq: ['$command', '!commands'] }, 1, 0] }
      },
      questionCount: {
        $sum: { $cond: [{ $eq: ['$messageType', 'question'] }, 1, 0] }
      },
      avgProcessingTimeMs: { $avg: '$processingTimeMs' },
      avgResponseTimeMs: { $avg: '$aiResponseTimeMs' },
      cacheHits: { $sum: { $cond: ['$cacheHit', 1, 0] } },
      rateLimitHits: {
        $sum: { $cond: [{ $eq: ['$errorType', 'rate_limit'] }, 1, 0] }
      },
      apiErrors: {
        $sum: { $cond: [{ $eq: ['$errorType', 'api_error'] }, 1, 0] }
      },
      moderationActions: {
        $sum: { $cond: ['$wasModerated', 1, 0] }
      }
    };

    // Add hour grouping for hourly granularity
    if (granularity === 'hourly') {
      groupStage._id.hour = { $hour: '$receivedAt' };
    }

    const pipeline: any[] = [
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { '_id.date': 1, '_id.hour': 1 } }
    ];

    const results = await TwitchBotAnalytics.aggregate(pipeline);

    // Transform results to match AggregatedAnalytics interface
    const aggregated: AggregatedAnalytics[] = results.map((result: any) => {
      const date = new Date(result._id.date);
      const totalMessages = result.totalMessages || 0;
      const cacheHits = result.cacheHits || 0;

      return {
        channelName: normalizedChannel,
        date,
        hour: granularity === 'hourly' ? result._id.hour : undefined,
        totalMessages,
        successfulMessages: result.successfulMessages || 0,
        failedMessages: result.failedMessages || 0,
        uniqueUsers: result.uniqueUsers?.length || 0,
        helpCommandCount: result.helpCommandCount || 0,
        commandsCommandCount: result.commandsCommandCount || 0,
        questionCount: result.questionCount || 0,
        avgProcessingTimeMs: Math.round(result.avgProcessingTimeMs || 0),
        avgResponseTimeMs: Math.round(result.avgResponseTimeMs || 0),
        cacheHitRate: totalMessages > 0 ? cacheHits / totalMessages : 0,
        rateLimitHits: result.rateLimitHits || 0,
        apiErrors: result.apiErrors || 0,
        moderationActions: result.moderationActions || 0,
        newUsers: 0, // Will be calculated separately if needed
        returningUsers: 0 // Will be calculated separately if needed
      };
    });

    return aggregated;
  } catch (error) {
    logger.error('Error aggregating analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName,
      startDate,
      endDate,
      granularity
    });
    throw error;
  }
}

/**
 * Get user statistics for a specific user in a channel
 * 
 * @param channelName - Channel name
 * @param twitchUsername - Twitch username
 * @param days - Number of days to look back (default: 30)
 * @returns Promise<UserStatistics>
 */
export async function getUserStatistics(
  channelName: string,
  twitchUsername: string,
  days: number = 30
): Promise<UserStatistics> {
  try {
    await connectToWingmanDB();

    const normalizedChannel = normalizeChannelName(channelName);
    const normalizedUsername = normalizeTwitchUsername(twitchUsername);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query user's analytics
    const userAnalytics = await TwitchBotAnalytics.find({
      channelName: normalizedChannel,
      twitchUsername: normalizedUsername,
      receivedAt: { $gte: startDate }
    }).sort({ receivedAt: 1 });

    if (userAnalytics.length === 0) {
      return {
        twitchUsername: normalizedUsername,
        displayName: '',
        channelName: normalizedChannel,
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        avgProcessingTimeMs: 0,
        avgResponseTimeMs: 0,
        cacheHitRate: 0,
        commandUsage: {
          help: 0,
          commands: 0,
          questions: 0
        },
        errorBreakdown: {
          rateLimit: 0,
          apiError: 0,
          moderation: 0,
          other: 0
        },
        firstSeen: null,
        lastSeen: null,
        days
      };
    }

    // Calculate statistics
    const totalMessages = userAnalytics.length;
    const successfulMessages = userAnalytics.filter(a => a.success).length;
    const failedMessages = totalMessages - successfulMessages;

    const processingTimes = userAnalytics.map(a => a.processingTimeMs).filter(t => t > 0);
    const responseTimes = userAnalytics.map(a => a.aiResponseTimeMs).filter(t => t > 0);
    const cacheHits = userAnalytics.filter(a => a.cacheHit).length;

    const avgProcessingTimeMs = processingTimes.length > 0
      ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
      : 0;
    const avgResponseTimeMs = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    const cacheHitRate = totalMessages > 0 ? cacheHits / totalMessages : 0;

    // Command usage
    const helpCount = userAnalytics.filter(a => a.command === '!help').length;
    const commandsCount = userAnalytics.filter(a => a.command === '!commands').length;
    const questionCount = userAnalytics.filter(a => a.messageType === 'question').length;

    // Error breakdown
    const rateLimitCount = userAnalytics.filter(a => a.errorType === 'rate_limit').length;
    const apiErrorCount = userAnalytics.filter(a => a.errorType === 'api_error').length;
    const moderationCount = userAnalytics.filter(a => a.wasModerated).length;
    const otherErrorCount = userAnalytics.filter(a => 
      !a.success && 
      a.errorType !== 'rate_limit' && 
      a.errorType !== 'api_error' && 
      !a.wasModerated
    ).length;

    const firstSeen = userAnalytics[0]?.receivedAt || null;
    const lastSeen = userAnalytics[userAnalytics.length - 1]?.receivedAt || null;
    const displayName = userAnalytics[0]?.displayName || normalizedUsername;

    return {
      twitchUsername: normalizedUsername,
      displayName,
      channelName: normalizedChannel,
      totalMessages,
      successfulMessages,
      failedMessages,
      avgProcessingTimeMs,
      avgResponseTimeMs,
      cacheHitRate,
      commandUsage: {
        help: helpCount,
        commands: commandsCount,
        questions: questionCount
      },
      errorBreakdown: {
        rateLimit: rateLimitCount,
        apiError: apiErrorCount,
        moderation: moderationCount,
        other: otherErrorCount
      },
      firstSeen,
      lastSeen,
      days
    };
  } catch (error) {
    logger.error('Error getting user statistics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName,
      twitchUsername,
      days
    });
    throw error;
  }
}

/**
 * Get channel statistics for a specific channel
 * 
 * @param channelName - Channel name
 * @param days - Number of days to look back (default: 30)
 * @returns Promise<ChannelStatistics>
 */
export async function getChannelStatistics(
  channelName: string,
  days: number = 30
): Promise<ChannelStatistics> {
  try {
    await connectToWingmanDB();

    const normalizedChannel = normalizeChannelName(channelName);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query channel analytics
    const channelAnalytics = await TwitchBotAnalytics.find({
      channelName: normalizedChannel,
      receivedAt: { $gte: startDate, $lte: endDate }
    });

    if (channelAnalytics.length === 0) {
      return {
        channelName: normalizedChannel,
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        uniqueUsers: 0,
        avgProcessingTimeMs: 0,
        avgResponseTimeMs: 0,
        cacheHitRate: 0,
        commandUsage: {
          help: 0,
          commands: 0,
          questions: 0
        },
        errorBreakdown: {
          rateLimit: 0,
          apiError: 0,
          moderation: 0,
          other: 0
        },
        moderationActions: 0,
        newUsers: 0,
        returningUsers: 0,
        days,
        startDate,
        endDate
      };
    }

    // Calculate statistics
    const totalMessages = channelAnalytics.length;
    const successfulMessages = channelAnalytics.filter(a => a.success).length;
    const failedMessages = totalMessages - successfulMessages;

    const uniqueUserSet = new Set(channelAnalytics.map(a => a.twitchUsername));
    const uniqueUsers = uniqueUserSet.size;

    const processingTimes = channelAnalytics.map(a => a.processingTimeMs).filter(t => t > 0);
    const responseTimes = channelAnalytics.map(a => a.aiResponseTimeMs).filter(t => t > 0);
    const cacheHits = channelAnalytics.filter(a => a.cacheHit).length;

    const avgProcessingTimeMs = processingTimes.length > 0
      ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
      : 0;
    const avgResponseTimeMs = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    const cacheHitRate = totalMessages > 0 ? cacheHits / totalMessages : 0;

    // Command usage
    const helpCount = channelAnalytics.filter(a => a.command === '!help').length;
    const commandsCount = channelAnalytics.filter(a => a.command === '!commands').length;
    const questionCount = channelAnalytics.filter(a => a.messageType === 'question').length;

    // Error breakdown
    const rateLimitCount = channelAnalytics.filter(a => a.errorType === 'rate_limit').length;
    const apiErrorCount = channelAnalytics.filter(a => a.errorType === 'api_error').length;
    const moderationCount = channelAnalytics.filter(a => a.wasModerated).length;
    const otherErrorCount = channelAnalytics.filter(a => 
      !a.success && 
      a.errorType !== 'rate_limit' && 
      a.errorType !== 'api_error' && 
      !a.wasModerated
    ).length;

    // Moderation actions
    const moderationActions = channelAnalytics.filter(a => a.wasModerated && a.moderationAction).length;

    // Calculate new vs returning users
    // New users: users who first appeared in this time period
    // Returning users: users who appeared before this time period and also in this period
    const usersInPeriod = new Set(channelAnalytics.map(a => a.twitchUsername));
    
    // Get first appearance date for each user in this period
    const userFirstAppearances = new Map<string, Date>();
    channelAnalytics.forEach(a => {
      const username = a.twitchUsername;
      const receivedAt = a.receivedAt;
      if (!userFirstAppearances.has(username) || receivedAt < userFirstAppearances.get(username)!) {
        userFirstAppearances.set(username, receivedAt);
      }
    });

    // Check if users appeared before this period
    const usersBeforePeriod = await TwitchBotAnalytics.distinct('twitchUsername', {
      channelName: normalizedChannel,
      receivedAt: { $lt: startDate }
    });

    const usersBeforePeriodSet = new Set(usersBeforePeriod);
    let newUsers = 0;
    let returningUsers = 0;

    usersInPeriod.forEach(username => {
      if (usersBeforePeriodSet.has(username)) {
        returningUsers++;
      } else {
        newUsers++;
      }
    });

    return {
      channelName: normalizedChannel,
      totalMessages,
      successfulMessages,
      failedMessages,
      uniqueUsers,
      avgProcessingTimeMs,
      avgResponseTimeMs,
      cacheHitRate,
      commandUsage: {
        help: helpCount,
        commands: commandsCount,
        questions: questionCount
      },
      errorBreakdown: {
        rateLimit: rateLimitCount,
        apiError: apiErrorCount,
        moderation: moderationCount,
        other: otherErrorCount
      },
      moderationActions,
      newUsers,
      returningUsers,
      days,
      startDate,
      endDate
    };
  } catch (error) {
    logger.error('Error getting channel statistics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName,
      days
    });
    throw error;
  }
}

