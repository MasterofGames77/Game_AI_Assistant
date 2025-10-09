import { NextApiRequest, NextApiResponse } from 'next';
import { getDiscordOAuth2Token, fetchDiscordUser } from '../../utils/discordAuth';
import { syncUserData } from '../../utils/proAccessUtil';
import { logger } from '../../utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check request method
  if (req.method !== 'GET') {
    logger.error('Invalid request method', { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Log all environment variables (redacted)
  logger.info('Environment check', {
    hasApplicationId: !!process.env.DISCORD_APPLICATION_ID,
    hasClientSecret: !!process.env.DISCORD_CLIENT_SECRET,
    hasRedirectUri: !!process.env.DISCORD_REDIRECT_URI,
    environment: process.env.NODE_ENV,
    redirectUri: process.env.DISCORD_REDIRECT_URI
  });

  // Log initial request details
  logger.info('Discord callback initiated', {
    query: {
      code: req.query.code ? '[REDACTED]' : undefined,
      state: req.query.state,
      error: req.query.error
    },
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer
    }
  });

  // Check for Discord error response
  if (req.query.error) {
    logger.error('Discord returned an error', { error: req.query.error });
    return res.status(400).json({ error: 'Discord authorization failed' });
  }

  try {
    const { code } = req.query;

    // Validate authorization code
    if (!code || Array.isArray(code)) {
      logger.error('Invalid code format', { 
        code: code ? '[REDACTED]' : undefined,
        type: typeof code,
        isArray: Array.isArray(code)
      });
      return res.status(400).json({ error: 'Invalid authorization code format' });
    }

    // Step 1: Get OAuth2 token
    logger.info('Starting OAuth2 token exchange');
    let accessToken;
    try {
      accessToken = await getDiscordOAuth2Token(code);
      logger.info('OAuth2 token received successfully');
    } catch (tokenError) {
      logger.error('OAuth2 token exchange failed', { 
        error: tokenError instanceof Error ? tokenError.message : tokenError 
      });
      throw new Error('Failed to exchange authorization code for token');
    }

    // Step 2: Fetch Discord user data
    logger.info('Starting Discord user data fetch');
    let discordUser;
    try {
      discordUser = await fetchDiscordUser(accessToken);
      logger.info('Discord user data fetched successfully', {
        userId: discordUser.id ? '[REDACTED]' : undefined,
        hasEmail: !!discordUser.email
      });
    } catch (userError) {
      logger.error('Discord user fetch failed', { 
        error: userError instanceof Error ? userError.message : userError 
      });
      throw new Error('Failed to fetch Discord user data');
    }

    // Step 3: Sync user data
    logger.info('Starting user data sync');
    try {
      await syncUserData(discordUser.id, discordUser.email);
      logger.info('User data synced successfully');
    } catch (syncError) {
      logger.error('User data sync failed', { 
        error: syncError instanceof Error ? syncError.message : syncError 
      });
      // Don't throw error, just log it - user can still proceed
      logger.info('Continuing with Discord authentication despite sync error');
    }

    // After successful authentication, redirect to Discord bot invite URL
    const botInviteUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.DISCORD_APPLICATION_ID}&permissions=2252332390017024&scope=bot%20applications.commands`;
    
    // Create a landing page URL that will show options to either add bot or start DM
    const landingUrl = new URL('/discord-landing', process.env.NODE_ENV === 'production'
      ? 'https://assistant.videogamewingman.com'
      : 'http://localhost:3000');
    
    // Add necessary parameters
    landingUrl.searchParams.append('botInvite', botInviteUrl);
    landingUrl.searchParams.append('userId', discordUser.id);
    landingUrl.searchParams.append('auth', 'success');
    
    return res.redirect(landingUrl.toString());

  } catch (error) {
    // Comprehensive error logging
    logger.error('Discord callback failed', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      query: {
        code: req.query.code ? '[REDACTED]' : undefined,
        state: req.query.state
      },
      headers: {
        host: req.headers.host,
        origin: req.headers.origin
      }
    });

    // Determine error redirect URL
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://assistant.videogamewingman.com'
      : 'http://localhost:3000';

    const errorUrl = new URL(redirectUrl);
    errorUrl.searchParams.append('auth', 'error');
    errorUrl.searchParams.append('error_time', Date.now().toString());
    
    return res.redirect(errorUrl.toString());
  }
}