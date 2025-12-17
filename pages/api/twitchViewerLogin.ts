import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { getSession } from '../../utils/session';
import { logger } from '../../utils/logger';

// In-memory store for OAuth state (in production, use Redis or similar)
// Maps state token -> { username, expiresAt }
const oauthStateStore = new Map<string, { username: string; expiresAt: number }>();

// Clean up expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(oauthStateStore.entries()).forEach(([state, data]) => {
    if (data.expiresAt < now) {
      oauthStateStore.delete(state);
    }
  });
}, 5 * 60 * 1000);

/**
 * Viewer OAuth login endpoint for linking Twitch accounts
 * This is specifically for viewers who want to link their Twitch account
 * to their Video Game Wingman account for bot usage
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let username: string | null = null;

  // Try to get username from session first
  try {
    const session = await getSession(req);
    if (session && session.username) {
      username = session.username;
      logger.info('Username obtained from session for viewer OAuth', { username });
    }
  } catch (error) {
    logger.warn('Session check failed, will try username parameter', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Fallback: Get username from query parameter (for cases where session expired but user is logged in on frontend)
  if (!username) {
    const usernameParam = req.query.username as string | undefined;
    if (usernameParam) {
      username = usernameParam;
      logger.info('Username obtained from query parameter for viewer OAuth', { username });
    }
  }

  if (!username) {
    const domain = process.env.NODE_ENV === 'production'
      ? 'https://assistant.videogamewingman.com'
      : 'http://localhost:3000';
    const errorUrl = new URL('/twitch-viewer-landing', domain);
    errorUrl.searchParams.append('auth', 'error');
    errorUrl.searchParams.append('error', 'login_required');
    return res.redirect(errorUrl.toString());
  }

  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '';
  
  if (!clientId) {
    return res.status(500).json({ 
      error: 'Missing NEXT_PUBLIC_TWITCH_CLIENT_ID environment variable',
      instructions: 'Make sure NEXT_PUBLIC_TWITCH_CLIENT_ID is set in your .env file'
    });
  }

  const domain = process.env.NODE_ENV === 'production'
    ? 'https://assistant.videogamewingman.com'
    : 'http://localhost:3000';

  // Use dedicated callback route for viewer authorization
  let redirectUri = `${domain}/api/twitchViewerCallback`;

  // Ensure no trailing slash and no double slashes in the URI (except after "https://")
  redirectUri = redirectUri.replace(/\/$/, '').replace(/([^:]\/)\/+/g, "$1");

  // Encode the redirect URI
  const encodedRedirectUri = encodeURIComponent(redirectUri);

  const authUrl = process.env.TWITCH_AUTH_URL || 'https://id.twitch.tv/oauth2/authorize';
  
  // Viewer scopes needed for bot usage (minimal permissions)
  const scopes = [
    'user:read:email'
  ].join(' ');

  // Generate secure state token that includes username
  // State format: randomToken:base64(username)
  const randomToken = crypto.randomBytes(32).toString('hex');
  const encodedUsername = Buffer.from(username).toString('base64');
  const state = `${randomToken}:${encodedUsername}`;

  // Store state with 10 minute expiration
  oauthStateStore.set(randomToken, {
    username,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });

  // Construct the Twitch OAuth2 authorization URL
  const twitchAuthUrl = `${authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&force_verify=true`;

  logger.info('Redirecting to Twitch OAuth for viewer account linking', {
    username,
    redirectUri
  });

  // Redirect to Twitch OAuth
  res.redirect(twitchAuthUrl);
}

// Export function to verify state (used by callback)
export function verifyOAuthState(state: string): { valid: boolean; username?: string } {
  const [randomToken, encodedUsername] = state.split(':');
  
  if (!randomToken || !encodedUsername) {
    return { valid: false };
  }

  // Try to get from in-memory store first
  const storedState = oauthStateStore.get(randomToken);
  
  if (storedState) {
    // Check if expired
    if (storedState.expiresAt < Date.now()) {
      oauthStateStore.delete(randomToken);
      return { valid: false };
    }

    // Verify username matches
    const decodedUsername = Buffer.from(encodedUsername, 'base64').toString('utf-8');
    if (decodedUsername !== storedState.username) {
      return { valid: false };
    }

    // Clean up used state
    oauthStateStore.delete(randomToken);

    return { valid: true, username: storedState.username };
  }

  // Fallback: If state not in memory (e.g., hot-reload in dev), verify using encoded username
  // This is less secure but works for development when hot-reload clears the store
  try {
    const decodedUsername = Buffer.from(encodedUsername, 'base64').toString('utf-8');
    
    // Basic validation: username should be a valid string
    if (decodedUsername && decodedUsername.length > 0 && decodedUsername.length < 100) {
      // In development, allow this fallback
      if (process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ State not found in memory store (likely due to hot-reload), using fallback verification');
        return { valid: true, username: decodedUsername };
      }
    }
  } catch (error) {
    // Invalid base64 encoding
    return { valid: false };
  }

  return { valid: false };
}

