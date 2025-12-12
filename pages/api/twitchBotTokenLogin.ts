import { NextApiRequest, NextApiResponse } from 'next';

/**
 * One-time use route to generate bot's OAuth token
 * Visit this route while logged into the bot's Twitch account
 * This will redirect to Twitch OAuth to generate the bot's token
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const domain = process.env.NODE_ENV === 'production'
    ? 'https://assistant.videogamewingman.com'
    : 'http://localhost:3000';

  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '';
  
  // Use a specific callback route for bot token generation
  let redirectUri = `${domain}/api/twitchBotTokenCallback`;

  // Ensure no trailing slash and no double slashes in the URI (except after "https://")
  redirectUri = redirectUri.replace(/\/$/, '').replace(/([^:]\/)\/+/g, "$1");

  // Encode the redirect URI
  const encodedRedirectUri = encodeURIComponent(redirectUri);

  const authUrl = process.env.TWITCH_AUTH_URL || 'https://id.twitch.tv/oauth2/authorize';
  
  // Bot token scopes - corrected: channel:moderate (with colon)
  const scopes = [
    'analytics:read:games',
    'chat:read',
    'chat:edit',
    'channel:moderate',  // Fixed: was channel_moderate
    'user:read:chat'
  ].join(' ');

  // Construct the Twitch OAuth2 authorization URL
  const twitchAuthUrl = `${authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${encodeURIComponent(scopes)}`;

  if (!clientId) {
    return res.status(500).json({ 
      error: 'Missing NEXT_PUBLIC_TWITCH_CLIENT_ID environment variable',
      instructions: 'Make sure NEXT_PUBLIC_TWITCH_CLIENT_ID is set in your .env file'
    });
  }

  // Redirect to Twitch OAuth
  res.redirect(twitchAuthUrl);
}

