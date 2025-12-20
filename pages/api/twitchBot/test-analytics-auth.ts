import { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import connectToMongoDB from '../../../utils/mongodb';
import TwitchBotChannel from '../../../models/TwitchBotChannel';
import { getSession } from '../../../utils/session';
import { logger } from '../../../utils/logger';

/**
 * Test endpoint to verify authentication and channel access for analytics
 * Helps verify that you can access analytics endpoints
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint only accepts GET requests'
    });
  }

  // Check authentication
  const session = await getSession(req);
  if (!session || !session.username) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'You must be logged in. This endpoint requires authentication.',
      hint: 'Login first, then include the access_token cookie in your requests'
    });
  }

  const username = session.username;

  try {
    await connectToMongoDB();
    await connectToWingmanDB();

    // Get all channels for this user
    const channels = await TwitchBotChannel.find({ streamerUsername: username })
      .select('channelName isActive messageCount addedAt')
      .sort({ addedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Authentication verified',
      user: {
        username: session.username,
        userId: session.userId,
        email: session.email
      },
      channels: channels.map(ch => ({
        channelName: ch.channelName,
        isActive: ch.isActive,
        messageCount: ch.messageCount || 0,
        addedAt: ch.addedAt
      })),
      totalChannels: channels.length,
      activeChannels: channels.filter(ch => ch.isActive).length,
      note: 'You can use any of these channel names to test the analytics endpoints'
    });
  } catch (error) {
    logger.error('Error in analytics auth test endpoint', {
      error: error instanceof Error ? error.message : String(error),
      username
    });
    return res.status(500).json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

