import { NextApiRequest, NextApiResponse } from 'next';
import {
  logMessageEvent,
  getChannelStatistics,
  getUserStatistics,
  aggregateAnalytics,
  MessageEventData
} from '../../../utils/twitch/analytics';
import { logger } from '../../../utils/logger';

/**
 * Test endpoint for Twitch Bot Analytics
 * Allows testing analytics functions via Postman or other API clients
 * 
 * Available test actions:
 * - logEvent: Create a test analytics entry
 * - getChannelStats: Get channel statistics
 * - getUserStats: Get user statistics
 * - aggregate: Get aggregated analytics
 * - testAll: Run all tests in sequence
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    });
  }

  const { action } = req.body;

  if (!action) {
    return res.status(400).json({
      error: 'Missing required field: action',
      availableActions: [
        'logEvent',
        'getChannelStats',
        'getUserStats',
        'aggregate',
        'testAll'
      ],
      example: {
        action: 'logEvent',
        data: {
          channelName: 'testchannel',
          twitchUsername: 'testuser',
          displayName: 'TestUser',
          messageType: 'question',
          questionLength: 50,
          responseLength: 200,
          processingTimeMs: 100,
          aiResponseTimeMs: 500,
          totalTimeMs: 600,
          cacheHit: false,
          success: true
        }
      }
    });
  }

  try {
    switch (action) {
      case 'logEvent':
        return await handleLogEvent(req, res);
      
      case 'getChannelStats':
        return await handleGetChannelStats(req, res);
      
      case 'getUserStats':
        return await handleGetUserStats(req, res);
      
      case 'aggregate':
        return await handleAggregate(req, res);
      
      case 'testAll':
        return await handleTestAll(req, res);
      
      default:
        return res.status(400).json({
          error: 'Invalid action',
          availableActions: [
            'logEvent',
            'getChannelStats',
            'getUserStats',
            'aggregate',
            'testAll'
          ]
        });
    }
  } catch (error) {
    logger.error('Error in analytics test endpoint', {
      error: error instanceof Error ? error.message : String(error),
      action
    });
    return res.status(500).json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      action
    });
  }
}

/**
 * Test logMessageEvent function
 */
async function handleLogEvent(req: NextApiRequest, res: NextApiResponse) {
  const {
    channelName,
    twitchUsername,
    displayName,
    messageType,
    command,
    questionLength,
    responseLength,
    processingTimeMs,
    aiResponseTimeMs,
    totalTimeMs,
    cacheHit,
    success,
    errorType,
    errorMessage,
    wasModerated,
    moderationAction
  } = req.body;

  // Validate required fields
  if (!channelName || !twitchUsername || !displayName || !messageType) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['channelName', 'twitchUsername', 'displayName', 'messageType'],
      received: {
        channelName: !!channelName,
        twitchUsername: !!twitchUsername,
        displayName: !!displayName,
        messageType: !!messageType
      }
    });
  }

  // Set defaults for optional fields
  const eventData: MessageEventData = {
    channelName,
    twitchUsername,
    displayName,
    messageType: messageType as 'command' | 'question' | 'other',
    command,
    questionLength: questionLength || 0,
    responseLength: responseLength || 0,
    processingTimeMs: processingTimeMs || 0,
    aiResponseTimeMs: aiResponseTimeMs || 0,
    totalTimeMs: totalTimeMs || 0,
    cacheHit: cacheHit || false,
    success: success !== undefined ? success : true,
    errorType,
    errorMessage,
    wasModerated: wasModerated || false,
    moderationAction,
    receivedAt: new Date(),
    processedAt: new Date(),
    respondedAt: new Date()
  };

  try {
    await logMessageEvent(eventData);

    return res.status(200).json({
      success: true,
      action: 'logEvent',
      message: 'Analytics event logged successfully',
      data: eventData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      action: 'logEvent',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: eventData
    });
  }
}

/**
 * Test getChannelStatistics function
 */
async function handleGetChannelStats(req: NextApiRequest, res: NextApiResponse) {
  const { channelName, days } = req.body;

  if (!channelName) {
    return res.status(400).json({
      error: 'Missing required field: channelName',
      example: {
        action: 'getChannelStats',
        channelName: 'testchannel',
        days: 30
      }
    });
  }

  try {
    const stats = await getChannelStatistics(channelName, days || 30);

    return res.status(200).json({
      success: true,
      action: 'getChannelStats',
      message: 'Channel statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      action: 'getChannelStats',
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName,
      days: days || 30
    });
  }
}

/**
 * Test getUserStatistics function
 */
async function handleGetUserStats(req: NextApiRequest, res: NextApiResponse) {
  const { channelName, twitchUsername, days } = req.body;

  if (!channelName || !twitchUsername) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['channelName', 'twitchUsername'],
      example: {
        action: 'getUserStats',
        channelName: 'testchannel',
        twitchUsername: 'testuser',
        days: 30
      }
    });
  }

  try {
    const stats = await getUserStatistics(channelName, twitchUsername, days || 30);

    return res.status(200).json({
      success: true,
      action: 'getUserStats',
      message: 'User statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      action: 'getUserStats',
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName,
      twitchUsername,
      days: days || 30
    });
  }
}

/**
 * Test aggregateAnalytics function
 */
async function handleAggregate(req: NextApiRequest, res: NextApiResponse) {
  const { channelName, startDate, endDate, granularity } = req.body;

  if (!channelName || !startDate || !endDate) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['channelName', 'startDate', 'endDate'],
      example: {
        action: 'aggregate',
        channelName: 'testchannel',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        granularity: 'daily' // or 'hourly'
      }
    });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const gran = (granularity || 'daily') as 'hourly' | 'daily';

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'Dates must be valid ISO date strings',
        received: { startDate, endDate }
      });
    }

    const aggregated = await aggregateAnalytics(channelName, start, end, gran);

    return res.status(200).json({
      success: true,
      action: 'aggregate',
      message: 'Analytics aggregated successfully',
      data: aggregated,
      metadata: {
        channelName,
        startDate: start,
        endDate: end,
        granularity: gran,
        recordCount: aggregated.length
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      action: 'aggregate',
      error: error instanceof Error ? error.message : 'Unknown error',
      channelName,
      startDate,
      endDate,
      granularity
    });
  }
}

/**
 * Run all tests in sequence
 */
async function handleTestAll(req: NextApiRequest, res: NextApiResponse) {
  const { channelName, twitchUsername } = req.body;

  if (!channelName || !twitchUsername) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['channelName', 'twitchUsername'],
      example: {
        action: 'testAll',
        channelName: 'testchannel',
        twitchUsername: 'testuser'
      }
    });
  }

  const results: any = {
    success: true,
    action: 'testAll',
    tests: []
  };

  // Test 1: Log a test event
  try {
    const testEvent: MessageEventData = {
      channelName,
      twitchUsername,
      displayName: 'TestUser',
      messageType: 'question',
      questionLength: 50,
      responseLength: 200,
      processingTimeMs: 100,
      aiResponseTimeMs: 500,
      totalTimeMs: 600,
      cacheHit: false,
      success: true,
      receivedAt: new Date(),
      processedAt: new Date(),
      respondedAt: new Date()
    };

    await logMessageEvent(testEvent);
    results.tests.push({
      name: 'logEvent',
      success: true,
      message: 'Test event logged successfully'
    });
  } catch (error) {
    results.success = false;
    results.tests.push({
      name: 'logEvent',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: Get channel statistics
  try {
    const channelStats = await getChannelStatistics(channelName, 30);
    results.tests.push({
      name: 'getChannelStats',
      success: true,
      message: 'Channel statistics retrieved',
      data: {
        totalMessages: channelStats.totalMessages,
        uniqueUsers: channelStats.uniqueUsers
      }
    });
  } catch (error) {
    results.success = false;
    results.tests.push({
      name: 'getChannelStats',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Get user statistics
  try {
    const userStats = await getUserStatistics(channelName, twitchUsername, 30);
    results.tests.push({
      name: 'getUserStats',
      success: true,
      message: 'User statistics retrieved',
      data: {
        totalMessages: userStats.totalMessages,
        firstSeen: userStats.firstSeen,
        lastSeen: userStats.lastSeen
      }
    });
  } catch (error) {
    results.success = false;
    results.tests.push({
      name: 'getUserStats',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 4: Aggregate analytics
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const aggregated = await aggregateAnalytics(channelName, startDate, endDate, 'daily');
    results.tests.push({
      name: 'aggregate',
      success: true,
      message: 'Analytics aggregated successfully',
      data: {
        recordCount: aggregated.length,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    results.success = false;
    results.tests.push({
      name: 'aggregate',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return res.status(results.success ? 200 : 207).json(results);
}

