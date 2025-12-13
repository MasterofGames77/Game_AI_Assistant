import axios from 'axios';
import { logger } from './logger';
import { TokenRefreshResult } from '../types';

/**
 * Refresh the Twitch bot's OAuth access token using the refresh token
 * @param refreshToken - The refresh token to use
 * @returns Promise containing the new access token, refresh token, and expiration info
 * @throws Error if refresh fails
 */
export async function refreshBotToken(refreshToken: string): Promise<TokenRefreshResult> {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const tokenUrl = process.env.TWITCH_TOKEN_URL || 'https://id.twitch.tv/oauth2/token';

  if (!clientId || !clientSecret) {
    throw new Error('Missing Twitch Client ID or Client Secret');
  }

  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    logger.info('Refreshing Twitch bot token...');
    const response = await axios.post(tokenUrl, params);

    const { access_token, refresh_token, expires_in, scope } = response.data;

    if (!access_token) {
      throw new Error('Twitch did not return an access token');
    }

    logger.info('Twitch bot token refreshed successfully', {
      expiresIn: expires_in,
      hasNewRefreshToken: !!refresh_token
    });

    // Update expiration cache
    tokenExpirationTime = Date.now() + (expires_in * 1000);

    return {
      accessToken: access_token,
      refreshToken: refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep old one
      expiresIn: expires_in,
      scope: scope
    };
  } catch (error: any) {
    logger.error('Error refreshing Twitch bot token', {
      error: error.response?.data || error.message,
      status: error.response?.status
    });
    
    if (error.response?.status === 400) {
      throw new Error('Invalid refresh token. Token may have expired or been revoked.');
    }
    
    throw new Error(`Failed to refresh bot token: ${error.message}`);
  }
}

/**
 * Update the bot's OAuth token in the environment and reconnect the bot
 * This updates process.env and reconnects the bot client with the new token
 */
export async function updateBotTokenAndReconnect(
  newAccessToken: string,
  newRefreshToken?: string
): Promise<void> {
  try {
    // Ensure OAuth token has the correct format (tmi.js requires "oauth:" prefix)
    let formattedToken = newAccessToken;
    if (!formattedToken.startsWith('oauth:')) {
      formattedToken = `oauth:${formattedToken}`;
      logger.info('Added "oauth:" prefix to refreshed token');
    }

    // Update environment variables
    process.env.TWITCH_BOT_OAUTH_TOKEN = formattedToken;
    if (newRefreshToken) {
      process.env.TWITCH_BOT_REFRESH_TOKEN = newRefreshToken;
    }

    logger.info('Bot token updated in environment variables', {
      tokenLength: formattedToken.length,
      tokenPrefix: formattedToken.substring(0, 10) + '...'
    });

    // Reconnect the bot with the new token
    // Use dynamic import to avoid circular dependency issues
    const twitchBotModule = await import('./twitchBot');
    const { initializeTwitchBot, shutdownTwitchBot, isBotInitialized } = twitchBotModule;

    if (isBotInitialized()) {
      logger.info('Reconnecting bot with new token...');
      
      // Disconnect and reconnect with new token
      await shutdownTwitchBot();
      
      // Small delay to ensure clean disconnect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reinitialize with new token
      const reinitialized = await initializeTwitchBot();
      
      if (reinitialized) {
        logger.info('Bot reconnected successfully with new token');
      } else {
        logger.warn('Bot reinitialization returned false. Bot may not be connected.');
      }
    } else {
      logger.info('Bot not currently initialized. Attempting to initialize with new token...');
      
      // Try to initialize the bot with the new token
      try {
        const reinitialized = await initializeTwitchBot();
        if (reinitialized) {
          logger.info('Bot initialized successfully with refreshed token');
        } else {
          logger.warn('Bot initialization returned false. Token updated but bot not connected.');
          logger.info('Bot will use new token on next server restart.');
        }
      } catch (initError) {
        logger.error('Error initializing bot with refreshed token', {
          error: initError instanceof Error ? initError.message : String(initError)
        });
        logger.info('Token updated. Bot will use new token on next server restart.');
      }
    }
  } catch (error) {
    logger.error('Error updating bot token and reconnecting', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Cache for token expiration time to avoid frequent API calls
let tokenExpirationTime: number | null = null;

/**
 * Check if the bot token needs to be refreshed
 * Refreshes if token expires within the next hour
 * @returns Promise<boolean> - true if token was refreshed, false otherwise
 */
export async function checkAndRefreshBotTokenIfNeeded(): Promise<boolean> {
  const refreshToken = process.env.TWITCH_BOT_REFRESH_TOKEN;
  const currentAccessToken = process.env.TWITCH_BOT_OAUTH_TOKEN;

  if (!refreshToken) {
    logger.warn('No refresh token available. Cannot automatically refresh bot token.');
    return false;
  }

  if (!currentAccessToken) {
    logger.warn('No current access token found. Cannot check expiration.');
    return false;
  }

  try {
    // Check cached expiration time first
    const now = Date.now();
    if (tokenExpirationTime && now < tokenExpirationTime) {
      const expiresIn = Math.floor((tokenExpirationTime - now) / 1000);
      
      // Refresh if token expires within the next hour (3600 seconds)
      if (expiresIn < 3600) {
        logger.info(`Bot token expires in ${expiresIn} seconds (from cache). Refreshing now...`);
        
        const refreshResult = await refreshBotToken(refreshToken);
        await updateBotTokenAndReconnect(refreshResult.accessToken, refreshResult.refreshToken);
        
        // Update expiration cache
        tokenExpirationTime = Date.now() + (refreshResult.expiresIn * 1000);
        
        logger.info('Bot token refreshed and bot reconnected successfully');
        return true;
      } else {
        logger.debug(`Bot token is still valid for ${expiresIn} seconds (from cache). No refresh needed.`);
        return false;
      }
    }

    // Cache miss or expired - verify current token with Twitch API
    try {
      const verifyResponse = await axios.get('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `OAuth ${currentAccessToken}`
        }
      });

      const expiresIn = verifyResponse.data.expires_in; // seconds until expiration
      
      // Update cache
      tokenExpirationTime = Date.now() + (expiresIn * 1000);

      // Refresh if token expires within the next hour (3600 seconds)
      if (expiresIn < 3600) {
        logger.info(`Bot token expires in ${expiresIn} seconds. Refreshing now...`);
        
        const refreshResult = await refreshBotToken(refreshToken);
        await updateBotTokenAndReconnect(refreshResult.accessToken, refreshResult.refreshToken);
        
        // Update expiration cache with new token
        tokenExpirationTime = Date.now() + (refreshResult.expiresIn * 1000);
        
        logger.info('Bot token refreshed and bot reconnected successfully');
        return true;
      } else {
        logger.debug(`Bot token is still valid for ${expiresIn} seconds. No refresh needed.`);
        return false;
      }
    } catch (validationError: any) {
      // If validation fails (token expired or invalid), try to refresh anyway
      if (validationError.response?.status === 401) {
        logger.warn('Bot token appears to be expired or invalid. Attempting refresh...');
        
        const refreshResult = await refreshBotToken(refreshToken);
        await updateBotTokenAndReconnect(refreshResult.accessToken, refreshResult.refreshToken);
        
        // Update expiration cache
        tokenExpirationTime = Date.now() + (refreshResult.expiresIn * 1000);
        
        logger.info('Bot token refreshed after validation failure');
        return true;
      }
      
      // Other validation errors - log but continue
      logger.warn('Token validation failed, but will attempt refresh anyway', {
        error: validationError.response?.data || validationError.message
      });
      
      // Try refresh anyway
      const refreshResult = await refreshBotToken(refreshToken);
      await updateBotTokenAndReconnect(refreshResult.accessToken, refreshResult.refreshToken);
      
      // Update expiration cache
      tokenExpirationTime = Date.now() + (refreshResult.expiresIn * 1000);
      
      logger.info('Bot token refreshed after validation error');
      return true;
    }
  } catch (error: any) {
    // Critical error - log and throw
    logger.error('Error checking/refreshing bot token', {
      error: error.response?.data || error.message,
      status: error.response?.status
    });
    
    // Don't throw - allow bot to continue with old token
    // The next check will try again
    return false;
  }
}

/**
 * Start automatic token refresh scheduler
 * Checks and refreshes token every hour
 */
export function startTokenRefreshScheduler(): void {
  const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

  logger.info('Starting Twitch bot token refresh scheduler (checks every hour)');

  // Check immediately on startup
  checkAndRefreshBotTokenIfNeeded().catch(error => {
    logger.error('Initial bot token check failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  });

  // Then check every hour
  setInterval(() => {
    checkAndRefreshBotTokenIfNeeded().catch(error => {
      logger.error('Scheduled bot token refresh check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
    });
  }, CHECK_INTERVAL);
}

