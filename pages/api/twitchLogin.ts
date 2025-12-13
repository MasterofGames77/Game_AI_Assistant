import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '';
  
  // Use TWITCH_REDIRECT_URI from environment variables to ensure consistency
  // This should match exactly what's registered in Twitch Developer Console
  let redirectUri = process.env.TWITCH_REDIRECT_URI || '';
  
  // Fallback to localhost if not set (for development)
  if (!redirectUri) {
    const domain = process.env.NODE_ENV === 'production'
      ? 'https://assistant.videogamewingman.com'
      : 'http://localhost:3000';
    redirectUri = `${domain}/api/twitchCallback`;
  }

  // Ensure no trailing slash and no double slashes (except after "https://")
  redirectUri = redirectUri.replace(/\/$/, '').replace(/([^:]\/)\/+/g, "$1");

  // Log the redirect URI before encoding
  // console.log("Redirect URI before encoding:", redirectUri); // Commented out for production

  // Encode the redirect URI
  const encodedRedirectUri = encodeURIComponent(redirectUri);

  const authUrl = process.env.TWITCH_AUTH_URL || 'https://id.twitch.tv/oauth2/authorize';
  const scopes = process.env.TWITCH_SCOPES || 'user:read:email';

  // Construct the Twitch OAuth2 login URL
  const twitchLoginUrl = `${authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${encodeURIComponent(scopes)}`;

  // console.log("Redirect URI after encoding:", encodedRedirectUri); // Commented out for production
  // console.log("Twitch Login URL:", twitchLoginUrl); // Commented out for production

  if (!clientId) {
    return res.status(500).json({ error: 'Missing TWITCH_CLIENT_ID environment variable' });
  }

  // Redirect the user to Twitch's OAuth2 login page
  res.redirect(twitchLoginUrl);
}