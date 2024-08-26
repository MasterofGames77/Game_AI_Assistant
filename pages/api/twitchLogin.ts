import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const domain = process.env.NODE_ENV === 'production'
    ? 'https://video-game-wingman-57d61bef9e61.herokuapp.com'
    : 'http://localhost:3000';

  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '';
  let redirectUri = `${domain}/api/twitchCallback`;

  // Ensure no double slashes in the URI (except after "https://")
  redirectUri = redirectUri.replace(/([^:]\/)\/+/g, "$1");

  // Log the redirect URI before encoding
  console.log("Redirect URI before encoding:", redirectUri);

  // Encode the redirect URI
  const encodedRedirectUri = encodeURIComponent(redirectUri);

  const authUrl = process.env.TWITCH_AUTH_URL || 'https://id.twitch.tv/oauth2/authorize';
  const scopes = process.env.TWITCH_SCOPES || 'user:read:email';

  // Construct the Twitch OAuth2 login URL
  const twitchLoginUrl = `${authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=${encodeURIComponent(scopes)}`;

  console.log("Redirect URI after encoding:", encodedRedirectUri);
  console.log("Twitch Login URL:", twitchLoginUrl);

  if (!clientId) {
    return res.status(500).json({ error: 'Missing TWITCH_CLIENT_ID environment variable' });
  }

  // Redirect the user to Twitch's OAuth2 login page
  res.redirect(twitchLoginUrl);
}