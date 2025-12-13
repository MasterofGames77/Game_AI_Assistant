import { NextApiRequest, NextApiResponse } from 'next';
import { refreshBotToken, updateBotTokenAndReconnect, checkAndRefreshBotTokenIfNeeded } from '../../utils/twitchBotTokenRefresh';
import { logger } from '../../utils/logger';

/**
 * API endpoint to manually refresh the Twitch bot's OAuth token
 * Can be called to force a token refresh or check token status
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const refreshToken = process.env.TWITCH_BOT_REFRESH_TOKEN;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'No refresh token available',
        message: 'TWITCH_BOT_REFRESH_TOKEN is not set in environment variables.'
      });
    }

    const { action } = req.body;

    // Action: 'check' - just check if refresh is needed
    if (action === 'check') {
      const wasRefreshed = await checkAndRefreshBotTokenIfNeeded();
      return res.status(200).json({
        message: wasRefreshed ? 'Token was refreshed' : 'Token is still valid, no refresh needed',
        refreshed: wasRefreshed
      });
    }

    // Action: 'force' or default - force refresh
    logger.info('Manual bot token refresh requested');
    
    const refreshResult = await refreshBotToken(refreshToken);
    await updateBotTokenAndReconnect(refreshResult.accessToken, refreshResult.refreshToken);

    logger.info('Bot token refreshed successfully via API');

    // Return the new tokens so user can update .env file if needed
    // Note: process.env is updated, but .env file is not (requires manual update or restart)
    return res.status(200).json({
      message: 'Bot token refreshed successfully',
      expiresIn: refreshResult.expiresIn,
      expiresInHours: Math.floor(refreshResult.expiresIn / 3600),
      hasNewRefreshToken: !!refreshResult.refreshToken,
      note: 'Token updated in process.env. Restart server to use new token, or update .env file manually.',
      // Include token info for manual .env update (optional - user can check logs)
      tokenPrefix: refreshResult.accessToken.substring(0, 20) + '...',
      tokenLength: refreshResult.accessToken.length
    });

  } catch (error) {
    logger.error('Error refreshing bot token via API', {
      error: error instanceof Error ? error.message : String(error)
    });

    return res.status(500).json({
      error: 'Failed to refresh bot token',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

