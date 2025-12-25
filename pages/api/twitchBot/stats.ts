import { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../../utils/databaseConnections';
import connectToMongoDB from '../../../utils/mongodb';
import TwitchBotChannel from '../../../models/TwitchBotChannel';
import TwitchBotAnalytics from '../../../models/TwitchBotAnalytics';
import { isBotInitialized } from '../../../utils/twitchBot';
import { logger } from '../../../utils/logger';

/**
 * Public API endpoint for Twitch Bot statistics
 * No authentication required - public bot profile information
 * 
 * GET /api/twitchBot/stats
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    await connectToWingmanDB();

    // Get channel statistics
    const totalChannels = await TwitchBotChannel.countDocuments({});
    const activeChannels = await TwitchBotChannel.countDocuments({ isActive: true });
    
    // Get total message count across all channels
    const channels = await TwitchBotChannel.find({})
      .select('messageCount')
      .lean();
    const totalMessages = channels.reduce((sum, ch) => sum + (ch.messageCount || 0), 0);

    // Get analytics statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAnalytics = await TwitchBotAnalytics.find({
      receivedAt: { $gte: thirtyDaysAgo }
    }).lean();

    const recentMessages = recentAnalytics.length;
    const recentUniqueUsers = new Set(recentAnalytics.map(a => a.twitchUsername)).size;
    const recentSuccessfulMessages = recentAnalytics.filter(a => a.success).length;
    const recentSuccessRate = recentMessages > 0 
      ? (recentSuccessfulMessages / recentMessages) * 100 
      : 0;

    // Get bot status
    const botStatus = isBotInitialized() ? 'online' : 'offline';

    // Calculate bot uptime (if we have a start time, we could track this)
    // For now, we'll just return the status

    // Get first channel added date (bot launch approximation)
    const firstChannel = await TwitchBotChannel.findOne({})
      .select('addedAt')
      .sort({ addedAt: 1 })
      .lean() as { addedAt: Date } | null;
    
    const botLaunchDate = firstChannel?.addedAt || null;

    // Get top channels by message count (for display)
    const topChannels = await TwitchBotChannel.find({ isActive: true })
      .select('channelName messageCount')
      .sort({ messageCount: -1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      stats: {
        // Channel statistics
        totalChannels,
        activeChannels,
        inactiveChannels: totalChannels - activeChannels,
        
        // Message statistics
        totalMessages,
        recentMessages, // Last 30 days
        recentSuccessRate: Math.round(recentSuccessRate * 100) / 100,
        
        // User statistics
        recentUniqueUsers, // Last 30 days
        
        // Bot status
        status: botStatus,
        botLaunchDate,
        
        // Top channels
        topChannels: topChannels.map(ch => ({
          channelName: ch.channelName,
          messageCount: ch.messageCount || 0
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting bot statistics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve bot statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

