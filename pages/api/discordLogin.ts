import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get Discord OAuth configuration from environment variables
  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'https://assistant.videogamewingman.com/api/discordCallback';
  const applicationId = process.env.DISCORD_APPLICATION_ID || '';

  // Get username from query parameter (passed from frontend)
  const username = req.query.username as string | undefined;

  // Validate username is provided
  if (!username) {
    return res.status(400).json({ 
      error: 'Username is required. Please ensure you are logged into Video Game Wingman.' 
    });
  }

  // Check for missing configuration
  if (!applicationId) {
    return res.status(500).json({ error: 'Missing DISCORD_APPLICATION_ID environment variable' });
  }

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

  // Prepare OAuth URL parameters
  const encodedRedirectUri = encodeURIComponent(redirectUri);
  const scope = 'identify email guilds';  // Required Discord permissions

  // Construct Discord OAuth authorization URL
  // Add prompt=consent to force Discord to show login screen even if user is already logged in
  // This prevents account mixing when another Discord account is already logged into the browser
  const discordLoginUrl = `https://discord.com/api/oauth2/authorize?client_id=${applicationId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}&prompt=consent`;

  // Redirect user to Discord OAuth page
  res.redirect(discordLoginUrl);
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
  // In production, this should rarely happen, but it provides a safety net
  try {
    const decodedUsername = Buffer.from(encodedUsername, 'base64').toString('utf-8');
    
    // Basic validation: username should be a valid string
    if (decodedUsername && decodedUsername.length > 0 && decodedUsername.length < 100) {
      // In development, allow this fallback
      // In production, we should use Redis or similar persistent storage
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ State not found in memory store (likely due to hot-reload), using fallback verification');
        return { valid: true, username: decodedUsername };
      }
    }
  } catch (error) {
    // Invalid base64 encoding
    return { valid: false };
  }

  return { valid: false };
} 