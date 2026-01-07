import tmi from 'tmi.js';
import axios from 'axios';
import { TwitchBotHandler } from './twitch/botHandler';
import { EngagementTracker } from './twitch/engagementTracker';
import dotenv from 'dotenv';
import connectToMongoDB from './mongodb';
import TwitchBotChannel from '../models/TwitchBotChannel';

dotenv.config();

// Initialize variables that will be set during initialization
let client: tmi.Client | null = null;
let botHandler: TwitchBotHandler | null = null;
let engagementTracker: EngagementTracker | null = null;
let isInitializing = false;
let isInitialized = false;

const dev = process.env.NODE_ENV !== 'production';

/**
 * Initialize the Twitch bot
 * @returns Promise<boolean> - true if initialization succeeded, false otherwise
 */
export async function initializeTwitchBot(): Promise<boolean> {
  // Prevent multiple simultaneous initialization attempts
  if (isInitializing) {
    if (dev) {
      console.warn('⚠️ Twitch bot initialization already in progress, skipping duplicate call');
    }
    return false;
  }

  // If already initialized, return success
  if (isInitialized && client && botHandler) {
    if (dev) {
      console.log('ℹ️ Twitch bot already initialized');
    }
    return true;
  }

  // Check for required environment variables
  const botUsername = process.env.TWITCH_BOT_USERNAME;
  let botOAuthToken = process.env.TWITCH_BOT_OAUTH_TOKEN;

  if (!botUsername || !botOAuthToken) {
    console.warn('⚠️ TWITCH_BOT_USERNAME or TWITCH_BOT_OAUTH_TOKEN is not defined in environment variables.');
    console.warn('Twitch bot will not start. Set these environment variables to enable Twitch bot functionality.');
    return false;
  }

  // Ensure OAuth token has the correct format (tmi.js requires "oauth:" prefix)
  if (!botOAuthToken.startsWith('oauth:')) {
    botOAuthToken = `oauth:${botOAuthToken}`;
    // Update the environment variable for consistency
    process.env.TWITCH_BOT_OAUTH_TOKEN = botOAuthToken;
    if (dev) {
      console.log('ℹ️ Added "oauth:" prefix to bot token');
    }
  }

  // Debug: Log token info (without exposing full token)
  if (dev) {
    console.log('🔐 Token info:', {
      hasToken: !!botOAuthToken,
      tokenLength: botOAuthToken.length,
      tokenPrefix: botOAuthToken.substring(0, 15) + '...',
      username: botUsername
    });
  }

  // Validate token with Twitch before attempting connection
  // If invalid, try to refresh it automatically
  let tokenValid = false;
  try {
    const tokenForValidation = botOAuthToken.replace(/^oauth:/, ''); // Remove oauth: prefix for validation
    const validateResponse = await axios.get('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `OAuth ${tokenForValidation}`
      }
    });

    tokenValid = true;
    if (dev) {
      console.log('✅ Token validated with Twitch:', {
        clientId: validateResponse.data.client_id,
        login: validateResponse.data.login,
        scopes: validateResponse.data.scopes,
        expiresIn: validateResponse.data.expires_in
      });
    }

    // Verify the token belongs to the bot username
    if (validateResponse.data.login?.toLowerCase() !== botUsername.toLowerCase()) {
      console.warn(`⚠️ Token username mismatch! Token is for "${validateResponse.data.login}" but bot username is "${botUsername}"`);
    }
  } catch (validationError: any) {
    const errorMsg = validationError.response?.data || validationError.message;
    console.warn('⚠️ Token validation failed:', errorMsg);
    
    // Try to refresh the token automatically if we have a refresh token
    const refreshToken = process.env.TWITCH_BOT_REFRESH_TOKEN;
    if (refreshToken) {
      console.log('🔄 Attempting to refresh token automatically...');
      try {
        const { refreshBotToken, updateBotTokenAndReconnect } = await import('./twitchBotTokenRefresh');
        const refreshResult = await refreshBotToken(refreshToken);
        await updateBotTokenAndReconnect(refreshResult.accessToken, refreshResult.refreshToken);
        
        // Update the token variable with the refreshed token
        botOAuthToken = process.env.TWITCH_BOT_OAUTH_TOKEN || botOAuthToken;
        console.log('✅ Token refreshed successfully. Retrying connection...');
        tokenValid = true;
      } catch (refreshError: any) {
        console.error('❌ Failed to refresh token:', refreshError.message);
        console.error('Please refresh the token manually using /api/twitchBotRefreshToken');
        // Continue anyway - let tmi.js handle the connection error
      }
    } else {
      console.error('❌ No refresh token available. Cannot auto-refresh.');
      console.error('Please refresh the token manually using /api/twitchBotRefreshToken');
    }
  }

  isInitializing = true;

  try {
    if (dev) {
      console.log('🔄 Initializing Twitch bot...');
      console.log('Environment check:', {
        hasUsername: !!botUsername,
        hasToken: !!botOAuthToken,
        environment: process.env.NODE_ENV
      });
    } else {
      console.log('🔄 Initializing Twitch bot...');
    }

    // Connect to MongoDB to load active channels
    await connectToMongoDB();

    // Load active channels from database
    const activeChannels = await TwitchBotChannel.find({ isActive: true })
      .select('channelName')
      .lean();

    const channelsToJoin = activeChannels.map(ch => ch.channelName.toLowerCase());

    if (dev) {
      console.log(`📊 Found ${channelsToJoin.length} active channel(s) to join:`, channelsToJoin);
    }

    // Initialize the Twitch IRC client
    client = new tmi.Client({
      options: {
        debug: dev, // Enable debug logging in development
      },
      identity: {
        username: botUsername,
        password: botOAuthToken, // OAuth token (starts with "oauth:")
      },
      channels: channelsToJoin, // Channels to join on connect
    });

    // Initialize bot handler
    botHandler = new TwitchBotHandler(client);
    
    // Initialize engagement tracker
    engagementTracker = new EngagementTracker(client);

    // Set up event handlers
    client.on('connected', (addr, port) => {
      console.log(`✅ Twitch bot connected to ${addr}:${port}`);
      console.log(`✅ Bot username: ${botUsername}`);
      console.log(`✅ Bot is now online and ready!`);
      
      if (channelsToJoin.length > 0) {
        console.log(`📊 Bot joined ${channelsToJoin.length} channel(s):`);
        channelsToJoin.forEach(channel => {
          console.log(`   - #${channel}`);
        });
      } else {
        console.log('ℹ️ Bot is online but not in any channels yet. Add channels via OAuth flow.');
      }
    });

    client.on('disconnected', (reason) => {
      console.log(`⚠️ Twitch bot disconnected: ${reason}`);
    });

    client.on('reconnect', () => {
      console.log('🔄 Twitch bot reconnecting...');
    });

    client.on('join', (channel, username, self) => {
      if (self) {
        console.log(`✅ Bot joined channel: #${channel}`);
        // Update lastJoinedAt in database
        updateChannelJoinTime(channel, true).catch(err => {
          console.error(`Error updating join time for ${channel}:`, err);
        });
      }
    });

    client.on('part', (channel, username, self) => {
      if (self) {
        console.log(`⚠️ Bot left channel: #${channel}`);
        // Update lastLeftAt in database
        updateChannelLeaveTime(channel).catch(err => {
          console.error(`Error updating leave time for ${channel}:`, err);
        });
      }
    });

    // Note: tmi.js doesn't have a direct 'error' event
    // Errors are handled through other events like 'disconnected' with error reasons

    // Attempt to connect
    if (dev) {
      console.log('🔄 Attempting to connect to Twitch IRC...');
    }
    
    await client.connect();
    console.log('✅ Twitch bot connection initiated successfully');
    
    isInitialized = true;
    isInitializing = false;
    return true;
  } catch (error) {
    // Log error but don't throw - server should continue even if bot fails
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to initialize Twitch bot:', errorMessage);
    if (error instanceof Error && error.stack) {
      if (dev) {
        console.error('Error stack:', error.stack);
      }
    }
    // Clean up on failure
    client = null;
    botHandler = null;
    engagementTracker = null;
    isInitialized = false;
    isInitializing = false;
    return false;
  }
}

/**
 * Helper function to update channel join time
 */
async function updateChannelJoinTime(channelName: string, joined: boolean): Promise<void> {
  try {
    await connectToMongoDB();
    const channel = channelName.replace('#', '').toLowerCase();
    const update: any = {};
    if (joined) {
      update.lastJoinedAt = new Date();
      update.$unset = { lastLeftAt: '' };
    }
    await TwitchBotChannel.findOneAndUpdate(
      { channelName: channel },
      update
    );
  } catch (error) {
    // Silently fail - this is not critical
    console.error('Error updating channel join time:', error);
  }
}

/**
 * Helper function to update channel leave time
 */
async function updateChannelLeaveTime(channelName: string): Promise<void> {
  try {
    await connectToMongoDB();
    const channel = channelName.replace('#', '').toLowerCase();
    await TwitchBotChannel.findOneAndUpdate(
      { channelName: channel },
      { lastLeftAt: new Date() }
    );
  } catch (error) {
    // Silently fail - this is not critical
    console.error('Error updating channel leave time:', error);
  }
}

/**
 * Gracefully shutdown the Twitch bot
 * Call this on process exit or server shutdown
 */
export async function shutdownTwitchBot(): Promise<void> {
  if (!client || !isInitialized) {
    return;
  }

  try {
    if (dev) {
      console.log('🔄 Shutting down Twitch bot...');
    }
    await client.disconnect();
    client = null;
    botHandler = null;
    engagementTracker = null;
    isInitialized = false;
    if (dev) {
      console.log('✅ Twitch bot shut down successfully');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error shutting down Twitch bot:', errorMessage);
    // Force cleanup even if disconnect fails
    client = null;
    botHandler = null;
    engagementTracker = null;
    isInitialized = false;
  }
}

/**
 * Get the engagement tracker instance
 */
export function getEngagementTracker(): EngagementTracker | null {
  if (!isInitialized || !engagementTracker) {
    if (dev) {
      console.warn('⚠️ Engagement tracker accessed before initialization. Call initializeTwitchBot() first.');
    }
    return null;
  }
  return engagementTracker;
}

/**
 * Join a new channel
 * @param channelName - Channel name (without #)
 */
export async function joinChannel(channelName: string): Promise<boolean> {
  if (!client || !isInitialized) {
    console.warn('⚠️ Twitch bot not initialized. Cannot join channel.');
    return false;
  }

  try {
    const channel = channelName.toLowerCase().replace('#', '');
    await client.join(channel);
    console.log(`✅ Bot joined channel: #${channel}`);
    return true;
  } catch (error) {
    console.error(`❌ Error joining channel ${channelName}:`, error);
    return false;
  }
}

/**
 * Leave a channel
 * @param channelName - Channel name (without #)
 */
export async function leaveChannel(channelName: string): Promise<boolean> {
  if (!client || !isInitialized) {
    console.warn('⚠️ Twitch bot not initialized. Cannot leave channel.');
    return false;
  }

  try {
    const channel = channelName.toLowerCase().replace('#', '');
    await client.part(channel);
    console.log(`✅ Bot left channel: #${channel}`);
    return true;
  } catch (error) {
    console.error(`❌ Error leaving channel ${channelName}:`, error);
    return false;
  }
}

// Export the bot handler and client for use in other modules
export function getBotHandler(): TwitchBotHandler | null {
  if (!isInitialized || !botHandler) {
    if (dev) {
      console.warn('⚠️ Bot handler accessed before initialization. Call initializeTwitchBot() first.');
    }
    return null;
  }
  return botHandler;
}

export function getClient(): tmi.Client | null {
  if (!isInitialized || !client) {
    if (dev) {
      console.warn('⚠️ Twitch client accessed before initialization. Call initializeTwitchBot() first.');
    }
    return null;
  }
  return client;
}

/**
 * Check if the bot is initialized and ready
 */
export function isBotInitialized(): boolean {
  return isInitialized && client !== null && botHandler !== null;
}

// Legacy exports for backward compatibility
// Note: These will be null until initializeTwitchBot() is called
export { botHandler };
export default client;

