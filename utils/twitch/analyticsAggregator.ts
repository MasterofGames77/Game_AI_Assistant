import { connectToWingmanDB } from '../databaseConnections';
import { logger } from '../logger';
import TwitchBotAnalytics from '../../models/TwitchBotAnalytics';
import TwitchBotChannelAnalytics from '../../models/TwitchBotChannelAnalytics';

/**
 * Normalize channel name (remove #, lowercase, trim)
 */
function normalizeChannelName(channel: string): string {
  return channel.replace('#', '').toLowerCase().trim();
}

/**
 * Get start of day in UTC (midnight UTC)
 */
function getStartOfDayUTC(date: Date): Date {
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
  return utcDate;
}

/**
 * Get start of hour in UTC
 */
function getStartOfHourUTC(date: Date): Date {
  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    0, 0, 0
  ));
  return utcDate;
}

/**
 * Aggregate analytics for a specific time period and save to TwitchBotChannelAnalytics
 * 
 * @param channelName - Channel name to aggregate for (optional - if not provided, aggregates all channels)
 * @param startDate - Start date for aggregation
 * @param endDate - End date for aggregation
 * @param granularity - 'hourly' or 'daily' aggregation
 * @returns Promise with aggregation results
 */
export async function aggregateAndSaveAnalytics(
  channelName?: string,
  startDate?: Date,
  endDate?: Date,
  granularity: 'hourly' | 'daily' = 'hourly'
): Promise<{
  channelsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
}> {
  try {
    await connectToWingmanDB();

    // Default to aggregating previous hour if no dates provided
    const now = new Date();
    const defaultEndDate = granularity === 'hourly' 
      ? getStartOfHourUTC(now) // Start of current hour
      : getStartOfDayUTC(now); // Start of current day
    
    const defaultStartDate = granularity === 'hourly'
      ? new Date(defaultEndDate.getTime() - 60 * 60 * 1000) // Previous hour
      : new Date(defaultEndDate.getTime() - 24 * 60 * 60 * 1000); // Previous day

    const start = startDate || defaultStartDate;
    const end = endDate || defaultEndDate;

    logger.info('Starting analytics aggregation', {
      channelName: channelName || 'all channels',
      startDate: start,
      endDate: end,
      granularity
    });

    // Get all channels that have analytics in this time period
    const channelsQuery: any = {
      receivedAt: {
        $gte: start,
        $lt: end
      }
    };

    if (channelName) {
      channelsQuery.channelName = normalizeChannelName(channelName);
    }

    const channels = await TwitchBotAnalytics.distinct('channelName', channelsQuery);

    if (channels.length === 0) {
      logger.info('No channels found with analytics in the specified time period');
      return {
        channelsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errors: []
      };
    }

    let recordsCreated = 0;
    let recordsUpdated = 0;
    const errors: string[] = [];

    // Process each channel
    for (const channel of channels) {
      try {
        const result = await aggregateChannelAnalytics(
          channel,
          start,
          end,
          granularity
        );
        recordsCreated += result.created;
        recordsUpdated += result.updated;
      } catch (error) {
        const errorMsg = `Error aggregating channel ${channel}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logger.error(errorMsg, { channel, error });
        errors.push(errorMsg);
      }
    }

    logger.info('Analytics aggregation completed', {
      channelsProcessed: channels.length,
      recordsCreated,
      recordsUpdated,
      errors: errors.length
    });

    return {
      channelsProcessed: channels.length,
      recordsCreated,
      recordsUpdated,
      errors
    };
  } catch (error) {
    logger.error('Error in aggregateAndSaveAnalytics', {
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
 * Aggregate analytics for a single channel and save to database
 */
async function aggregateChannelAnalytics(
  channelName: string,
  startDate: Date,
  endDate: Date,
  granularity: 'hourly' | 'daily'
): Promise<{ created: number; updated: number }> {
  const normalizedChannel = normalizeChannelName(channelName);
  let created = 0;
  let updated = 0;

  if (granularity === 'hourly') {
    // Aggregate by hour
    const currentHour = new Date(startDate);
    
    while (currentHour < endDate) {
      const hourStart = getStartOfHourUTC(currentHour);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      const hour = currentHour.getUTCHours();

      const result = await aggregateTimePeriod(
        normalizedChannel,
        hourStart,
        hourEnd,
        hour
      );

      if (result.created) created++;
      if (result.updated) updated++;

      // Move to next hour
      currentHour.setUTCHours(currentHour.getUTCHours() + 1);
    }
  } else {
    // Aggregate by day
    const currentDay = new Date(startDate);
    
    while (currentDay < endDate) {
      const dayStart = getStartOfDayUTC(currentDay);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const result = await aggregateTimePeriod(
        normalizedChannel,
        dayStart,
        dayEnd,
        undefined // No hour for daily aggregation
      );

      if (result.created) created++;
      if (result.updated) updated++;

      // Move to next day
      currentDay.setUTCDate(currentDay.getUTCDate() + 1);
    }
  }

  return { created, updated };
}

/**
 * Aggregate analytics for a specific time period and save to database
 */
async function aggregateTimePeriod(
  channelName: string,
  startDate: Date,
  endDate: Date,
  hour: number | undefined
): Promise<{ created: boolean; updated: boolean }> {
  // Build aggregation pipeline
  const matchStage: any = {
    channelName: channelName,
    receivedAt: {
      $gte: startDate,
      $lt: endDate
    }
  };

  const groupStage: any = {
    _id: null,
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
    },
    processingTimes: { $push: '$processingTimeMs' },
    responseTimes: { $push: '$aiResponseTimeMs' }
  };

  const pipeline: any[] = [
    { $match: matchStage },
    { $group: groupStage }
  ];

  const results = await TwitchBotAnalytics.aggregate(pipeline);

  if (results.length === 0) {
    // No data for this period
    return { created: false, updated: false };
  }

  const result = results[0];
  const totalMessages = result.totalMessages || 0;
  const cacheHits = result.cacheHits || 0;
  const uniqueUsersArray = result.uniqueUsers || [];
  const uniqueUsersCount = uniqueUsersArray.length;

  // Calculate new vs returning users
  // New users: users who first appeared in this time period
  // Returning users: users who appeared before this time period and also in this period
  const usersBeforePeriod = await TwitchBotAnalytics.distinct('twitchUsername', {
    channelName: channelName,
    receivedAt: { $lt: startDate }
  });

  const usersBeforePeriodSet = new Set(usersBeforePeriod);
  let newUsers = 0;
  let returningUsers = 0;

  uniqueUsersArray.forEach((username: string) => {
    if (usersBeforePeriodSet.has(username)) {
      returningUsers++;
    } else {
      newUsers++;
    }
  });

  // Prepare aggregation data
  const aggregationData = {
    channelName: channelName,
    date: startDate, // Store as Date at start of period
    hour: hour,
    totalMessages,
    successfulMessages: result.successfulMessages || 0,
    failedMessages: result.failedMessages || 0,
    uniqueUsers: uniqueUsersCount,
    helpCommandCount: result.helpCommandCount || 0,
    commandsCommandCount: result.commandsCommandCount || 0,
    questionCount: result.questionCount || 0,
    avgProcessingTimeMs: Math.round(result.avgProcessingTimeMs || 0),
    avgResponseTimeMs: Math.round(result.avgResponseTimeMs || 0),
    cacheHitRate: totalMessages > 0 ? cacheHits / totalMessages : 0,
    rateLimitHits: result.rateLimitHits || 0,
    apiErrors: result.apiErrors || 0,
    moderationActions: result.moderationActions || 0,
    newUsers,
    returningUsers
  };

  // Find or create aggregation record
  const query: any = {
    channelName: channelName,
    date: startDate
  };

  if (hour !== undefined) {
    query.hour = hour;
  } else {
    query.hour = { $exists: false };
  }

  const existing = await TwitchBotChannelAnalytics.findOne(query);

  if (existing) {
    // Update existing record
    await TwitchBotChannelAnalytics.findOneAndUpdate(
      query,
      { $set: aggregationData },
      { new: true }
    );
    return { created: false, updated: true };
  } else {
    // Create new record
    await TwitchBotChannelAnalytics.create(aggregationData);
    return { created: true, updated: false };
  }
}

/**
 * Aggregate previous hour's analytics for all channels
 * This is the main function called by the cron job
 */
export async function aggregatePreviousHour(): Promise<{
  channelsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
}> {
  const now = new Date();
  const currentHourStart = getStartOfHourUTC(now);
  const previousHourStart = new Date(currentHourStart.getTime() - 60 * 60 * 1000);
  const previousHourEnd = currentHourStart;

  logger.info('Aggregating previous hour analytics', {
    startDate: previousHourStart,
    endDate: previousHourEnd
  });

  return await aggregateAndSaveAnalytics(
    undefined, // All channels
    previousHourStart,
    previousHourEnd,
    'hourly'
  );
}

/**
 * Aggregate previous day's analytics for all channels
 * Useful for daily summaries
 */
export async function aggregatePreviousDay(): Promise<{
  channelsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
}> {
  const now = new Date();
  const currentDayStart = getStartOfDayUTC(now);
  const previousDayStart = new Date(currentDayStart.getTime() - 24 * 60 * 60 * 1000);
  const previousDayEnd = currentDayStart;

  logger.info('Aggregating previous day analytics', {
    startDate: previousDayStart,
    endDate: previousDayEnd
  });

  return await aggregateAndSaveAnalytics(
    undefined, // All channels
    previousDayStart,
    previousDayEnd,
    'daily'
  );
}

