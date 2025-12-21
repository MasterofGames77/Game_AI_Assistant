import type { NextApiRequest, NextApiResponse } from 'next';
import { getPerformanceMonitor, measureOperation, measureDBQuery, measureAPICall } from '../../../utils/twitch/performanceMonitor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, ...params } = req.body;
  const monitor = getPerformanceMonitor();

  try {
    switch (action) {
      case 'recordResponseTime': {
        const { operation, responseTimeMs, channelName, metadata } = params;
        monitor.recordResponseTime(operation, responseTimeMs, channelName, metadata);
        return res.status(200).json({
          success: true,
          action: 'recordResponseTime',
          message: 'Response time recorded successfully'
        });
      }

      case 'recordAIResponseTime': {
        const { operation, responseTimeMs, channelName, metadata } = params;
        monitor.recordAIResponseTime(operation, responseTimeMs, channelName, metadata);
        return res.status(200).json({
          success: true,
          action: 'recordAIResponseTime',
          message: 'AI response time recorded successfully'
        });
      }

      case 'recordDBQueryTime': {
        const { operation, queryTimeMs, channelName, metadata } = params;
        monitor.recordDBQueryTime(operation, queryTimeMs, channelName, metadata);
        return res.status(200).json({
          success: true,
          action: 'recordDBQueryTime',
          message: 'Database query time recorded successfully'
        });
      }

      case 'recordAPICallTime': {
        const { operation, callTimeMs, channelName, metadata } = params;
        monitor.recordAPICallTime(operation, callTimeMs, channelName, metadata);
        return res.status(200).json({
          success: true,
          action: 'recordAPICallTime',
          message: 'API call time recorded successfully'
        });
      }

      case 'recordErrorRate': {
        const { operation, errorRate, channelName, metadata } = params;
        monitor.recordErrorRate(operation, errorRate, channelName, metadata);
        return res.status(200).json({
          success: true,
          action: 'recordErrorRate',
          message: 'Error rate recorded successfully'
        });
      }

      case 'recordCacheHitRate': {
        const { operation, cacheHitRate, channelName, metadata } = params;
        monitor.recordCacheHitRate(operation, cacheHitRate, channelName, metadata);
        return res.status(200).json({
          success: true,
          action: 'recordCacheHitRate',
          message: 'Cache hit rate recorded successfully'
        });
      }

      case 'analyzeErrorRate': {
        const { channelName, totalMessages, failedMessages, timeWindowMs } = params;
        monitor.analyzeErrorRate(channelName, totalMessages, failedMessages, timeWindowMs);
        return res.status(200).json({
          success: true,
          action: 'analyzeErrorRate',
          message: 'Error rate analyzed successfully'
        });
      }

      case 'analyzeCachePerformance': {
        const { channelName, cacheHits, totalRequests, timeWindowMs } = params;
        monitor.analyzeCachePerformance(channelName, cacheHits, totalRequests, timeWindowMs);
        return res.status(200).json({
          success: true,
          action: 'analyzeCachePerformance',
          message: 'Cache performance analyzed successfully'
        });
      }

      case 'getPerformanceStats': {
        const { startDate, endDate, channelName } = params;
        const stats = monitor.getPerformanceStats(
          new Date(startDate),
          new Date(endDate),
          channelName
        );
        return res.status(200).json({
          success: true,
          action: 'getPerformanceStats',
          message: 'Performance statistics retrieved successfully',
          data: stats
        });
      }

      case 'getRecentAlerts': {
        const { count, channelName } = params;
        const alerts = monitor.getRecentAlerts(count || 10, channelName);
        return res.status(200).json({
          success: true,
          action: 'getRecentAlerts',
          message: 'Recent alerts retrieved successfully',
          data: alerts
        });
      }

      case 'getRecentMetrics': {
        const { count, channelName } = params;
        const metrics = monitor.getRecentMetrics(count || 100, channelName);
        return res.status(200).json({
          success: true,
          action: 'getRecentMetrics',
          message: 'Recent metrics retrieved successfully',
          data: metrics
        });
      }

      case 'generateReport': {
        const { channelName, days } = params;
        const report = monitor.generatePerformanceReport(channelName, days || 1);
        return res.status(200).json({
          success: true,
          action: 'generateReport',
          message: 'Performance report generated successfully',
          data: report
        });
      }

      case 'testMeasureOperation': {
        const { operation, channelName, delayMs } = params;
        const result = await measureOperation(
          operation || 'test_operation',
          async () => {
            await new Promise(resolve => setTimeout(resolve, delayMs || 100));
            return { success: true, delay: delayMs || 100 };
          },
          channelName,
          { test: true }
        );
        return res.status(200).json({
          success: true,
          action: 'testMeasureOperation',
          message: 'Operation measured successfully',
          data: result
        });
      }

      case 'testMeasureDBQuery': {
        const { operation, channelName, delayMs } = params;
        const result = await measureDBQuery(
          operation || 'test_db_query',
          async () => {
            await new Promise(resolve => setTimeout(resolve, delayMs || 50));
            return { success: true, delay: delayMs || 50 };
          },
          channelName,
          { test: true }
        );
        return res.status(200).json({
          success: true,
          action: 'testMeasureDBQuery',
          message: 'Database query measured successfully',
          data: result
        });
      }

      case 'testMeasureAPICall': {
        const { operation, channelName, delayMs } = params;
        const result = await measureAPICall(
          operation || 'test_api_call',
          async () => {
            await new Promise(resolve => setTimeout(resolve, delayMs || 200));
            return { success: true, delay: delayMs || 200 };
          },
          channelName,
          { test: true }
        );
        return res.status(200).json({
          success: true,
          action: 'testMeasureAPICall',
          message: 'API call measured successfully',
          data: result
        });
      }

      case 'testAll': {
        const testResults = [];

        // Test 1: Record response time (normal)
        monitor.recordResponseTime('test_response', 500, 'testchannel');
        testResults.push({ name: 'recordResponseTime', success: true });

        // Test 2: Record response time (warning threshold)
        monitor.recordResponseTime('test_response_warning', 2500, 'testchannel');
        testResults.push({ name: 'recordResponseTimeWarning', success: true });

        // Test 3: Record response time (critical threshold)
        monitor.recordResponseTime('test_response_critical', 6000, 'testchannel');
        testResults.push({ name: 'recordResponseTimeCritical', success: true });

        // Test 4: Record AI response time
        monitor.recordAIResponseTime('test_ai_response', 3000, 'testchannel');
        testResults.push({ name: 'recordAIResponseTime', success: true });

        // Test 5: Record DB query time
        monitor.recordDBQueryTime('test_db_query', 100, 'testchannel');
        testResults.push({ name: 'recordDBQueryTime', success: true });

        // Test 6: Record error rate
        monitor.recordErrorRate('test_error_rate', 0.15, 'testchannel');
        testResults.push({ name: 'recordErrorRate', success: true });

        // Test 7: Record cache hit rate
        monitor.recordCacheHitRate('test_cache', 0.8, 'testchannel');
        testResults.push({ name: 'recordCacheHitRate', success: true });

        // Test 8: Analyze error rate
        monitor.analyzeErrorRate('testchannel', 100, 10, 60000);
        testResults.push({ name: 'analyzeErrorRate', success: true });

        // Test 9: Get performance stats
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        const stats = monitor.getPerformanceStats(startDate, endDate, 'testchannel');
        testResults.push({
          name: 'getPerformanceStats',
          success: true,
          data: {
            totalOperations: stats.totalOperations,
            avgResponseTime: stats.avgResponseTime,
            thresholdViolations: stats.thresholdViolations
          }
        });

        // Test 10: Get recent alerts
        const alerts = monitor.getRecentAlerts(5, 'testchannel');
        testResults.push({
          name: 'getRecentAlerts',
          success: true,
          data: { alertCount: alerts.length }
        });

        return res.status(200).json({
          success: true,
          action: 'testAll',
          message: 'All performance monitor tests completed',
          tests: testResults
        });
      }

      default:
        return res.status(400).json({
          error: 'Invalid action',
          availableActions: [
            'recordResponseTime',
            'recordAIResponseTime',
            'recordDBQueryTime',
            'recordAPICallTime',
            'recordErrorRate',
            'recordCacheHitRate',
            'analyzeErrorRate',
            'analyzeCachePerformance',
            'getPerformanceStats',
            'getRecentAlerts',
            'getRecentMetrics',
            'generateReport',
            'testMeasureOperation',
            'testMeasureDBQuery',
            'testMeasureAPICall',
            'testAll'
          ]
        });
    }
  } catch (error) {
    console.error('Error in performance monitor test:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


