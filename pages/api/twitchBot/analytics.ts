import { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import connectToMongoDB from '../../../utils/mongodb';
import TwitchBotChannel from '../../../models/TwitchBotChannel';
import TwitchBotChannelAnalytics from '../../../models/TwitchBotChannelAnalytics';
import TwitchBotAnalytics from '../../../models/TwitchBotAnalytics';
import { getSession } from '../../../utils/session';
import { logger } from '../../../utils/logger';
import {
  getChannelStatistics,
  getUserStatistics,
  aggregateAnalytics
} from '../../../utils/twitch/analytics';

/**
 * Analytics API for Twitch Bot
 * Provides analytics data for channels with authentication and ownership verification
 * 
 * Endpoints:
 * - GET /api/twitchBot/analytics?type=channel&channelName=xxx&days=7&granularity=hourly
 * - GET /api/twitchBot/analytics?type=user&channelName=xxx&twitchUsername=xxx&days=30
 * - GET /api/twitchBot/analytics?type=summary&channelName=xxx&days=30
 * - GET /api/twitchBot/analytics?type=export&channelName=xxx&format=json&startDate=xxx&endDate=xxx
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  const session = await getSession(req);
  if (!session || !session.username) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'You must be logged in to view analytics'
    });
  }

  const username = session.username;

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.query;

  try {
    switch (type) {
      case 'channel':
        return await handleChannelAnalytics(req, res, username);
      
      case 'user':
        return await handleUserAnalytics(req, res, username);
      
      case 'summary':
        return await handleSummaryAnalytics(req, res, username);
      
      case 'export':
        return await handleExportAnalytics(req, res, username);
      
      default:
        return res.status(400).json({
          error: 'Invalid endpoint type',
          message: 'Type must be one of: channel, user, summary, export',
          availableTypes: ['channel', 'user', 'summary', 'export']
        });
    }
  } catch (error) {
    logger.error('Error in analytics API', {
      error: error instanceof Error ? error.message : String(error),
      type,
      username
    });
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Verify channel ownership
 */
async function verifyChannelOwnership(
  channelName: string,
  username: string
): Promise<boolean> {
  await connectToMongoDB();
  
  const normalizedChannelName = channelName.toLowerCase().trim();
  
  const channel = await TwitchBotChannel.findOne({
    channelName: normalizedChannelName,
    streamerUsername: username
  });

  return !!channel;
}

/**
 * GET /api/twitchBot/analytics?type=channel
 * Returns aggregated analytics for a channel
 */
async function handleChannelAnalytics(
  req: NextApiRequest,
  res: NextApiResponse,
  username: string
) {
  const { channelName, days, granularity } = req.query;

  if (!channelName || typeof channelName !== 'string') {
    return res.status(400).json({
      error: 'Missing required parameter',
      message: 'channelName query parameter is required'
    });
  }

  // Verify channel ownership
  const hasAccess = await verifyChannelOwnership(channelName, username);
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this channel\'s analytics'
    });
  }

  const daysNum = days ? parseInt(days as string, 10) : 7;
  const gran = (granularity === 'daily' ? 'daily' : 'hourly') as 'hourly' | 'daily';

  if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
    return res.status(400).json({
      error: 'Invalid days parameter',
      message: 'Days must be a number between 1 and 365'
    });
  }

  try {
    await connectToWingmanDB();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get aggregated analytics
    const aggregated = await aggregateAnalytics(
      channelName,
      startDate,
      endDate,
      gran
    );

    return res.status(200).json({
      success: true,
      channelName,
      days: daysNum,
      granularity: gran,
      startDate,
      endDate,
      data: aggregated,
      count: aggregated.length
    });
  } catch (error) {
    logger.error('Error getting channel analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName,
      username
    });
    throw error;
  }
}

/**
 * GET /api/twitchBot/analytics?type=user
 * Returns user-specific statistics for a channel
 */
async function handleUserAnalytics(
  req: NextApiRequest,
  res: NextApiResponse,
  username: string
) {
  const { channelName, twitchUsername, days } = req.query;

  if (!channelName || typeof channelName !== 'string') {
    return res.status(400).json({
      error: 'Missing required parameter',
      message: 'channelName query parameter is required'
    });
  }

  if (!twitchUsername || typeof twitchUsername !== 'string') {
    return res.status(400).json({
      error: 'Missing required parameter',
      message: 'twitchUsername query parameter is required'
    });
  }

  // Verify channel ownership
  const hasAccess = await verifyChannelOwnership(channelName, username);
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this channel\'s analytics'
    });
  }

  const daysNum = days ? parseInt(days as string, 10) : 30;

  if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
    return res.status(400).json({
      error: 'Invalid days parameter',
      message: 'Days must be a number between 1 and 365'
    });
  }

  try {
    await connectToWingmanDB();

    const userStats = await getUserStatistics(
      channelName,
      twitchUsername,
      daysNum
    );

    return res.status(200).json({
      success: true,
      channelName,
      twitchUsername,
      days: daysNum,
      data: userStats
    });
  } catch (error) {
    logger.error('Error getting user analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName,
      twitchUsername,
      username
    });
    throw error;
  }
}

/**
 * GET /api/twitchBot/analytics?type=summary
 * Returns summary statistics for a channel
 */
async function handleSummaryAnalytics(
  req: NextApiRequest,
  res: NextApiResponse,
  username: string
) {
  const { channelName, days } = req.query;

  if (!channelName || typeof channelName !== 'string') {
    return res.status(400).json({
      error: 'Missing required parameter',
      message: 'channelName query parameter is required'
    });
  }

  // Verify channel ownership
  const hasAccess = await verifyChannelOwnership(channelName, username);
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this channel\'s analytics'
    });
  }

  const daysNum = days ? parseInt(days as string, 10) : 30;

  if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
    return res.status(400).json({
      error: 'Invalid days parameter',
      message: 'Days must be a number between 1 and 365'
    });
  }

  try {
    await connectToWingmanDB();

    // Get channel statistics for current period
    const channelStats = await getChannelStatistics(channelName, daysNum);

    // Calculate trends (compare last period with previous period)
    const normalizedChannel = channelName.toLowerCase().trim();
    
    const currentEnd = new Date();
    const currentStart = new Date();
    currentStart.setDate(currentStart.getDate() - daysNum);
    
    const previousEnd = currentStart;
    const previousStart = new Date();
    previousStart.setDate(previousStart.getDate() - daysNum * 2);

    // Get previous period analytics
    const previousAnalytics = await TwitchBotAnalytics.find({
      channelName: normalizedChannel,
      receivedAt: { $gte: previousStart, $lt: previousEnd }
    });

    // Calculate previous period stats
    const previousTotalMessages = previousAnalytics.length;
    const previousSuccessfulMessages = previousAnalytics.filter(a => a.success).length;
    const previousUniqueUsers = new Set(previousAnalytics.map(a => a.twitchUsername)).size;
    const previousResponseTimes = previousAnalytics.map(a => a.aiResponseTimeMs).filter(t => t > 0);
    const previousAvgResponseTime = previousResponseTimes.length > 0
      ? Math.round(previousResponseTimes.reduce((a, b) => a + b, 0) / previousResponseTimes.length)
      : 0;
    const previousCacheHits = previousAnalytics.filter(a => a.cacheHit).length;
    const previousCacheHitRate = previousTotalMessages > 0 ? previousCacheHits / previousTotalMessages : 0;
    const previousSuccessRate = previousTotalMessages > 0 ? previousSuccessfulMessages / previousTotalMessages : 0;

    // Calculate trends
    const currentSuccessRate = channelStats.totalMessages > 0 
      ? channelStats.successfulMessages / channelStats.totalMessages 
      : 0;

    const trends = {
      totalMessages: channelStats.totalMessages - previousTotalMessages,
      uniqueUsers: channelStats.uniqueUsers - previousUniqueUsers,
      avgResponseTimeMs: channelStats.avgResponseTimeMs - previousAvgResponseTime,
      cacheHitRate: channelStats.cacheHitRate - previousCacheHitRate,
      successRate: currentSuccessRate - previousSuccessRate
    };

    const previousPeriodStats = {
      totalMessages: previousTotalMessages,
      successfulMessages: previousSuccessfulMessages,
      uniqueUsers: previousUniqueUsers,
      avgResponseTimeMs: previousAvgResponseTime,
      cacheHitRate: previousCacheHitRate,
      successRate: previousSuccessRate,
      startDate: previousStart,
      endDate: previousEnd
    };

    return res.status(200).json({
      success: true,
      channelName,
      days: daysNum,
      summary: {
        current: {
          ...channelStats,
          successRate: currentSuccessRate
        },
        previous: previousPeriodStats,
        trends
      }
    });
  } catch (error) {
    logger.error('Error getting summary analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName,
      username
    });
    throw error;
  }
}

/**
 * GET /api/twitchBot/analytics?type=export
 * Returns exportable analytics data in JSON or CSV format
 */
async function handleExportAnalytics(
  req: NextApiRequest,
  res: NextApiResponse,
  username: string
) {
  const { channelName, format, startDate, endDate } = req.query;

  if (!channelName || typeof channelName !== 'string') {
    return res.status(400).json({
      error: 'Missing required parameter',
      message: 'channelName query parameter is required'
    });
  }

  // Verify channel ownership
  const hasAccess = await verifyChannelOwnership(channelName, username);
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this channel\'s analytics'
    });
  }

  const exportFormat = (format === 'csv' ? 'csv' : 'json') as 'json' | 'csv';

  let start: Date;
  let end: Date;

  if (startDate && endDate) {
    start = new Date(startDate as string);
    end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'startDate and endDate must be valid ISO date strings'
      });
    }

    if (start > end) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'startDate must be before endDate'
      });
    }
  } else {
    // Default to last 30 days
    end = new Date();
    start = new Date();
    start.setDate(start.getDate() - 30);
  }

  try {
    await connectToWingmanDB();

    // Get raw analytics data for export
    const normalizedChannel = channelName.toLowerCase().trim();
    
    // Use aggregated data if available, otherwise use raw data
    const aggregatedData = await TwitchBotChannelAnalytics.find({
      channelName: normalizedChannel,
      date: {
        $gte: start,
        $lte: end
      }
    })
    .sort({ date: 1, hour: 1 })
    .lean();

    if (exportFormat === 'csv') {
      // Convert to CSV
      if (aggregatedData.length === 0) {
        return res.status(200)
          .setHeader('Content-Type', 'text/csv')
          .setHeader('Content-Disposition', `attachment; filename="${normalizedChannel}-analytics-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`)
          .send('No data available for the specified period\n');
      }

      // CSV header
      const headers = [
        'Date',
        'Hour',
        'Total Messages',
        'Successful Messages',
        'Failed Messages',
        'Unique Users',
        'Help Commands',
        'Commands Commands',
        'Questions',
        'Avg Processing Time (ms)',
        'Avg Response Time (ms)',
        'Cache Hit Rate',
        'Rate Limit Hits',
        'API Errors',
        'Moderation Actions',
        'New Users',
        'Returning Users'
      ];

      // CSV rows
      const rows = aggregatedData.map((record: any) => {
        const date = new Date(record.date);
        return [
          date.toISOString().split('T')[0],
          record.hour !== undefined ? record.hour : '',
          record.totalMessages || 0,
          record.successfulMessages || 0,
          record.failedMessages || 0,
          record.uniqueUsers || 0,
          record.helpCommandCount || 0,
          record.commandsCommandCount || 0,
          record.questionCount || 0,
          record.avgProcessingTimeMs || 0,
          record.avgResponseTimeMs || 0,
          (record.cacheHitRate || 0).toFixed(2),
          record.rateLimitHits || 0,
          record.apiErrors || 0,
          record.moderationActions || 0,
          record.newUsers || 0,
          record.returningUsers || 0
        ];
      });

      // Combine header and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      return res.status(200)
        .setHeader('Content-Type', 'text/csv')
        .setHeader('Content-Disposition', `attachment; filename="${normalizedChannel}-analytics-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`)
        .send(csvContent);
    } else {
      // Return JSON
      return res.status(200).json({
        success: true,
        channelName: normalizedChannel,
        format: 'json',
        startDate: start,
        endDate: end,
        count: aggregatedData.length,
        data: aggregatedData
      });
    }
  } catch (error) {
    logger.error('Error exporting analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName,
      username
    });
    throw error;
  }
}

