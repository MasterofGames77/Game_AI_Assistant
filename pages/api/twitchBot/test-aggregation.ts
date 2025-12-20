import { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import {
  aggregatePreviousHour,
  aggregatePreviousDay,
  aggregateAndSaveAnalytics
} from '../../../utils/twitch/analyticsAggregator';
import TwitchBotChannelAnalytics from '../../../models/TwitchBotChannelAnalytics';
import { logger } from '../../../utils/logger';

/**
 * Test endpoint for Analytics Aggregation Service
 * Allows testing aggregation functions via Postman or other API clients
 * 
 * Available test actions:
 * - aggregatePreviousHour: Aggregate previous hour's data
 * - aggregatePreviousDay: Aggregate previous day's data
 * - aggregateCustom: Aggregate custom time period
 * - getAggregatedData: Retrieve aggregated data from database
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
        'aggregatePreviousHour',
        'aggregatePreviousDay',
        'aggregateCustom',
        'getAggregatedData',
        'testAll'
      ],
      example: {
        action: 'aggregatePreviousHour',
        channelName: 'testchannel' // optional
      }
    });
  }

  try {
    await connectToWingmanDB();

    switch (action) {
      case 'aggregatePreviousHour':
        return await handleAggregatePreviousHour(req, res);
      
      case 'aggregatePreviousDay':
        return await handleAggregatePreviousDay(req, res);
      
      case 'aggregateCustom':
        return await handleAggregateCustom(req, res);
      
      case 'getAggregatedData':
        return await handleGetAggregatedData(req, res);
      
      case 'testAll':
        return await handleTestAll(req, res);
      
      default:
        return res.status(400).json({
          error: 'Invalid action',
          availableActions: [
            'aggregatePreviousHour',
            'aggregatePreviousDay',
            'aggregateCustom',
            'getAggregatedData',
            'testAll'
          ]
        });
    }
  } catch (error) {
    logger.error('Error in aggregation test endpoint', {
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
 * Test aggregatePreviousHour function
 */
async function handleAggregatePreviousHour(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await aggregatePreviousHour();

    return res.status(200).json({
      success: true,
      action: 'aggregatePreviousHour',
      message: 'Previous hour aggregated successfully',
      result: {
        channelsProcessed: result.channelsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        errors: result.errors.length > 0 ? result.errors : undefined
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      action: 'aggregatePreviousHour',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test aggregatePreviousDay function
 */
async function handleAggregatePreviousDay(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await aggregatePreviousDay();

    return res.status(200).json({
      success: true,
      action: 'aggregatePreviousDay',
      message: 'Previous day aggregated successfully',
      result: {
        channelsProcessed: result.channelsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        errors: result.errors.length > 0 ? result.errors : undefined
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      action: 'aggregatePreviousDay',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Test aggregateCustom function with custom time period
 */
async function handleAggregateCustom(req: NextApiRequest, res: NextApiResponse) {
  const { channelName, startDate, endDate, granularity } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['startDate', 'endDate'],
      optional: ['channelName', 'granularity'],
      example: {
        action: 'aggregateCustom',
        channelName: 'testchannel',
        startDate: '2024-12-19T00:00:00Z',
        endDate: '2024-12-19T23:59:59Z',
        granularity: 'daily' // or 'hourly'
      }
    });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const gran = (granularity || 'hourly') as 'hourly' | 'daily';

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        message: 'Dates must be valid ISO date strings',
        received: { startDate, endDate }
      });
    }

    const result = await aggregateAndSaveAnalytics(
      channelName,
      start,
      end,
      gran
    );

    return res.status(200).json({
      success: true,
      action: 'aggregateCustom',
      message: 'Custom aggregation completed successfully',
      parameters: {
        channelName: channelName || 'all channels',
        startDate: start,
        endDate: end,
        granularity: gran
      },
      result: {
        channelsProcessed: result.channelsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        errors: result.errors.length > 0 ? result.errors : undefined
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      action: 'aggregateCustom',
      error: error instanceof Error ? error.message : 'Unknown error',
      parameters: {
        channelName,
        startDate,
        endDate,
        granularity
      }
    });
  }
}

/**
 * Get aggregated data from database
 */
async function handleGetAggregatedData(req: NextApiRequest, res: NextApiResponse) {
  const { channelName, startDate, endDate, granularity } = req.body;

  try {
    const query: any = {};

    if (channelName) {
      query.channelName = channelName.toLowerCase().trim();
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    if (granularity === 'hourly') {
      query.hour = { $exists: true };
    } else if (granularity === 'daily') {
      query.hour = { $exists: false };
    }

    const aggregatedData = await TwitchBotChannelAnalytics.find(query)
      .sort({ date: -1, hour: -1 })
      .limit(100) // Limit to 100 records for testing
      .lean();

    return res.status(200).json({
      success: true,
      action: 'getAggregatedData',
      message: 'Aggregated data retrieved successfully',
      query,
      count: aggregatedData.length,
      data: aggregatedData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      action: 'getAggregatedData',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Run all tests in sequence
 */
async function handleTestAll(req: NextApiRequest, res: NextApiResponse) {
  const { channelName } = req.body;

  const results: any = {
    success: true,
    action: 'testAll',
    tests: []
  };

  // Test 1: Aggregate previous hour
  try {
    const result = await aggregatePreviousHour();
    results.tests.push({
      name: 'aggregatePreviousHour',
      success: true,
      message: 'Previous hour aggregated',
      data: {
        channelsProcessed: result.channelsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated
      }
    });
  } catch (error) {
    results.success = false;
    results.tests.push({
      name: 'aggregatePreviousHour',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 2: Get aggregated hourly data
  try {
    const query: any = { hour: { $exists: true } };
    if (channelName) {
      query.channelName = channelName.toLowerCase().trim();
    }

    const hourlyData = await TwitchBotChannelAnalytics.find(query)
      .sort({ date: -1, hour: -1 })
      .limit(10)
      .lean();

    results.tests.push({
      name: 'getAggregatedHourlyData',
      success: true,
      message: 'Hourly aggregated data retrieved',
      data: {
        recordCount: hourlyData.length,
        sampleRecord: hourlyData[0] || null
      }
    });
  } catch (error) {
    results.success = false;
    results.tests.push({
      name: 'getAggregatedHourlyData',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 3: Aggregate previous day
  try {
    const result = await aggregatePreviousDay();
    results.tests.push({
      name: 'aggregatePreviousDay',
      success: true,
      message: 'Previous day aggregated',
      data: {
        channelsProcessed: result.channelsProcessed,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated
      }
    });
  } catch (error) {
    results.success = false;
    results.tests.push({
      name: 'aggregatePreviousDay',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test 4: Get aggregated daily data
  try {
    const query: any = { hour: { $exists: false } };
    if (channelName) {
      query.channelName = channelName.toLowerCase().trim();
    }

    const dailyData = await TwitchBotChannelAnalytics.find(query)
      .sort({ date: -1 })
      .limit(10)
      .lean();

    results.tests.push({
      name: 'getAggregatedDailyData',
      success: true,
      message: 'Daily aggregated data retrieved',
      data: {
        recordCount: dailyData.length,
        sampleRecord: dailyData[0] || null
      }
    });
  } catch (error) {
    results.success = false;
    results.tests.push({
      name: 'getAggregatedDailyData',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return res.status(results.success ? 200 : 207).json(results);
}

