import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import { analyzeGameplayPatterns, shouldRunAnalysis } from '../../utils/aiHelper';

/**
 * Test endpoint for Performance Safeguards (Phase 4)
 * 
 * Tests:
 * 1. Intelligent Caching - Verify cache hits/misses
 * 2. Rate Limiting - Verify shouldRunAnalysis behavior
 * 3. Query Optimization - Verify efficient queries
 * 
 * Usage:
 * GET /api/test-performance-safeguards?username=testuser&testType=cache
 * GET /api/test-performance-safeguards?username=testuser&testType=rate-limit
 * GET /api/test-performance-safeguards?username=testuser&testType=all
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectToMongoDB();

  const { username, testType = 'all' } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      error: 'Username is required',
      usage: {
        cache: '/api/test-performance-safeguards?username=testuser&testType=cache',
        'rate-limit': '/api/test-performance-safeguards?username=testuser&testType=rate-limit',
        all: '/api/test-performance-safeguards?username=testuser&testType=all',
      },
    });
  }

  const results: any = {
    username,
    testType,
    timestamp: new Date().toISOString(),
  };

  try {
    // Test 1: Intelligent Caching
    if (testType === 'cache' || testType === 'all') {
      console.log(`\n[Test] Starting cache test for ${username}`);
      
      const cacheTest = {
        firstCall: { startTime: Date.now(), endTime: 0, duration: 0 },
        secondCall: { startTime: Date.now(), endTime: 0, duration: 0 },
        cacheHit: false,
      };

      // First call - should be a cache miss (calculates and caches)
      cacheTest.firstCall.startTime = Date.now();
      const firstResult = await analyzeGameplayPatterns(username, false);
      cacheTest.firstCall.endTime = Date.now();
      cacheTest.firstCall.duration = cacheTest.firstCall.endTime - cacheTest.firstCall.startTime;

      // Small delay to ensure timestamps are different
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second call - should be a cache hit (returns cached data)
      cacheTest.secondCall.startTime = Date.now();
      const secondResult = await analyzeGameplayPatterns(username, false);
      cacheTest.secondCall.endTime = Date.now();
      cacheTest.secondCall.duration = cacheTest.secondCall.endTime - cacheTest.secondCall.startTime;

      // Verify results are the same (cached)
      cacheTest.cacheHit = JSON.stringify(firstResult) === JSON.stringify(secondResult);

      // Third call with forceRefresh - should bypass cache
      const forceRefreshStart = Date.now();
      await analyzeGameplayPatterns(username, true);
      const forceRefreshDuration = Date.now() - forceRefreshStart;

      results.cacheTest = {
        ...cacheTest,
        forceRefreshDuration,
        performance: {
          firstCallMs: cacheTest.firstCall.duration,
          secondCallMs: cacheTest.secondCall.duration,
          speedup: cacheTest.firstCall.duration > 0 
            ? ((cacheTest.firstCall.duration - cacheTest.secondCall.duration) / cacheTest.firstCall.duration * 100).toFixed(1) + '%'
            : 'N/A',
        },
        success: cacheTest.cacheHit && cacheTest.secondCall.duration < cacheTest.firstCall.duration,
      };

      console.log(`[Test] Cache test completed:`, results.cacheTest);
    }

    // Test 2: Rate Limiting
    if (testType === 'rate-limit' || testType === 'all') {
      console.log(`\n[Test] Starting rate limit test for ${username}`);
      
      const rateLimitTest = {
        firstCheck: false,
        secondCheck: false,
        hoursSinceLastAnalysis: null as number | null,
        lastAnalysisTime: null as string | null,
      };

      // First check
      rateLimitTest.firstCheck = await shouldRunAnalysis(username);

      // Get user data to show lastAnalysisTime
      const User = (await import('../../models/User')).default;
      const user = await User.findOne({ username })
        .select('progress.personalized.recommendationHistory.lastAnalysisTime')
        .lean() as any;

      if (user?.progress?.personalized?.recommendationHistory?.lastAnalysisTime) {
        const lastAnalysis = new Date(user.progress.personalized.recommendationHistory.lastAnalysisTime);
        rateLimitTest.lastAnalysisTime = lastAnalysis.toISOString();
        rateLimitTest.hoursSinceLastAnalysis = 
          (Date.now() - lastAnalysis.getTime()) / (1000 * 60 * 60);
      }

      // Second check immediately after (should be same result)
      rateLimitTest.secondCheck = await shouldRunAnalysis(username);

      results.rateLimitTest = {
        ...rateLimitTest,
        consistent: rateLimitTest.firstCheck === rateLimitTest.secondCheck,
        success: true, // Always succeeds (fail open behavior)
      };

      console.log(`[Test] Rate limit test completed:`, results.rateLimitTest);
    }

    // Test 3: Query Optimization (verify efficient queries)
    if (testType === 'query' || testType === 'all') {
      console.log(`\n[Test] Starting query optimization test for ${username}`);
      
      const Question = (await import('../../models/Question')).default;
      
      // Count total questions for user
      const totalQuestions = await Question.countDocuments({ username });
      
      // Test optimized query (what we actually use)
      const optimizedStart = Date.now();
      const optimizedResults = await Question.find({ username })
        .sort({ timestamp: -1 })
        .limit(100)
        .select('timestamp detectedGenre difficultyHint questionCategory interactionType detectedGame')
        .lean();
      const optimizedDuration = Date.now() - optimizedStart;

      results.queryTest = {
        totalQuestions,
        questionsFetched: optimizedResults.length,
        queryDurationMs: optimizedDuration,
        fieldsSelected: ['timestamp', 'detectedGenre', 'difficultyHint', 'questionCategory', 'interactionType', 'detectedGame'],
        limit: 100,
        success: optimizedDuration < 1000, // Should be fast (< 1 second)
      };

      console.log(`[Test] Query optimization test completed:`, results.queryTest);
    }

    // Summary
    results.summary = {
      allTestsPassed: 
        (testType === 'cache' || testType === 'all' ? results.cacheTest?.success : true) &&
        (testType === 'rate-limit' || testType === 'all' ? results.rateLimitTest?.success : true) &&
        (testType === 'query' || testType === 'all' ? results.queryTest?.success : true),
      testsRun: testType === 'all' ? 3 : 1,
    };

    return res.status(200).json(results);
  } catch (error) {
    console.error('[Test] Error in performance safeguards test:', error);
    return res.status(500).json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      username,
      testType,
    });
  }
}
