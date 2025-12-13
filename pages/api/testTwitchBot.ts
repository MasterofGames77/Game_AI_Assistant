import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import TwitchBotChannel from '../../models/TwitchBotChannel';
import { getClient, isBotInitialized, joinChannel } from '../../utils/twitchBot';
import { checkAndRefreshBotTokenIfNeeded } from '../../utils/twitchBotTokenRefresh';
import { logger } from '../../utils/logger';

/**
 * Test endpoint for Twitch bot functionality
 * Helps verify bot setup and test various features
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    switch (action) {
      case 'status':
        return await handleStatusCheck(res);
      
      case 'addChannel':
        return await handleAddChannel(req, res);
      
      case 'listChannels':
        return await handleListChannels(res);
      
      case 'removeChannel':
        return await handleRemoveChannel(req, res);
      
      case 'testConnection':
        return await handleTestConnection(res);
      
      case 'testTokenRefresh':
        return await handleTestTokenRefresh(res);
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action',
          availableActions: ['status', 'addChannel', 'listChannels', 'removeChannel', 'testConnection', 'testTokenRefresh']
        });
    }
  } catch (error) {
    logger.error('Error in test endpoint', {
      error: error instanceof Error ? error.message : String(error)
    });
    return res.status(500).json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Check bot status
 */
async function handleStatusCheck(res: NextApiResponse) {
  const botInitialized = isBotInitialized();
  const client = getClient();
  
  const status = {
    initialized: botInitialized,
    connected: client?.readyState() === 'OPEN',
    username: process.env.TWITCH_BOT_USERNAME || 'Not set',
    hasAccessToken: !!process.env.TWITCH_BOT_OAUTH_TOKEN,
    hasRefreshToken: !!process.env.TWITCH_BOT_REFRESH_TOKEN,
    environment: process.env.NODE_ENV
  };

  return res.status(200).json({
    message: 'Bot status retrieved',
    status
  });
}

/**
 * Add a test channel to database
 */
async function handleAddChannel(req: NextApiRequest, res: NextApiResponse) {
  const { channelName, streamerTwitchId, streamerUsername } = req.body;

  if (!channelName || !streamerTwitchId || !streamerUsername) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['channelName', 'streamerTwitchId', 'streamerUsername']
    });
  }

  await connectToMongoDB();

  // Check if channel already exists
  const existing = await TwitchBotChannel.findOne({ 
    channelName: channelName.toLowerCase() 
  });

  if (existing) {
    return res.status(400).json({
      error: 'Channel already exists',
      channel: existing
    });
  }

  // Create new channel
  const channel = await TwitchBotChannel.create({
    channelName: channelName.toLowerCase(),
    streamerTwitchId,
    streamerUsername,
    isActive: true,
    addedAt: new Date(),
    messageCount: 0
  });

  // Try to join channel if bot is initialized
  if (isBotInitialized()) {
    const joined = await joinChannel(channelName);
    return res.status(200).json({
      message: 'Channel added successfully',
      channel,
      botJoined: joined
    });
  }

  return res.status(200).json({
    message: 'Channel added successfully. Bot will join on next initialization.',
    channel
  });
}

/**
 * List all channels
 */
async function handleListChannels(res: NextApiResponse) {
  await connectToMongoDB();

  const channels = await TwitchBotChannel.find({})
    .select('channelName streamerUsername isActive addedAt messageCount')
    .lean();

  return res.status(200).json({
    message: 'Channels retrieved',
    channels,
    total: channels.length,
    active: channels.filter(ch => ch.isActive).length
  });
}

/**
 * Remove a channel
 */
async function handleRemoveChannel(req: NextApiRequest, res: NextApiResponse) {
  const { channelName } = req.body;

  if (!channelName) {
    return res.status(400).json({
      error: 'Missing channelName'
    });
  }

  await connectToMongoDB();

  const channel = await TwitchBotChannel.findOneAndDelete({
    channelName: channelName.toLowerCase()
  });

  if (!channel) {
    return res.status(404).json({
      error: 'Channel not found'
    });
  }

  // Try to leave channel if bot is initialized
  if (isBotInitialized()) {
    const { leaveChannel } = await import('../../utils/twitchBot');
    await leaveChannel(channelName);
  }

  return res.status(200).json({
    message: 'Channel removed successfully',
    channel
  });
}

/**
 * Test bot connection
 */
async function handleTestConnection(res: NextApiResponse) {
  const botInitialized = isBotInitialized();
  const client = getClient();

  if (!botInitialized || !client) {
    return res.status(400).json({
      error: 'Bot not initialized',
      message: 'Bot must be initialized before testing connection'
    });
  }

  // Check if client is connected (tmi.js doesn't expose readyState directly)
  // We'll check by attempting to get client options
  let isConnected = false;
  try {
    // Try to access client options - if it exists, client is likely initialized
    const opts = (client as any).opts;
    isConnected = !!opts;
  } catch (e) {
    // Client might not be fully initialized
    isConnected = false;
  }
  
  // Get channels from database (bot tracks these)
  await connectToMongoDB();
  const activeChannels = await TwitchBotChannel.find({ isActive: true })
    .select('channelName')
    .lean();

  return res.status(200).json({
    message: 'Connection test completed',
    connected: isConnected,
    botInitialized: botInitialized,
    channels: activeChannels.map(ch => ch.channelName),
    channelCount: activeChannels.length,
    botUsername: process.env.TWITCH_BOT_USERNAME
  });
}

/**
 * Test token refresh
 */
async function handleTestTokenRefresh(res: NextApiResponse) {
  try {
    const wasRefreshed = await checkAndRefreshBotTokenIfNeeded();
    
    return res.status(200).json({
      message: wasRefreshed 
        ? 'Token was refreshed successfully' 
        : 'Token is still valid, no refresh needed',
      refreshed: wasRefreshed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Token refresh test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

