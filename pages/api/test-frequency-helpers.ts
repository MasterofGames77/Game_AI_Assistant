/**
 * TEST ENDPOINT: Frequency Analysis Helpers
 * COMMENTED OUT FOR PRODUCTION - Uncomment for testing/debugging
 * 
 * This endpoint was used to test the frequency analysis helper functions:
 * - calculateWeeklyRate
 * - detectPeakHours  
 * - detectSessionPatterns
 * 
 * To re-enable: Uncomment the code below and uncomment testFrequencyHelpers in aiHelper.ts
 */

/*
import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import { testFrequencyHelpers } from '../../utils/aiHelper';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ 
      error: 'Username parameter required',
      usage: 'GET /api/test-frequency-helpers?username=TestUser1'
    });
  }

  try {
    // Connect to database
    await connectToMongoDB();

    // Run the test
    const results = await testFrequencyHelpers(username);

    return res.status(200).json({
      success: true,
      message: 'Frequency helpers test completed',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in test-frequency-helpers:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      username,
    });
  }
}
*/

// Disabled in production - return 404
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return res.status(404).json({ 
    error: 'Test endpoint disabled in production',
    message: 'This endpoint is for testing only and has been disabled'
  });
}

