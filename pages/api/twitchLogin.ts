import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(process.env.NODE_ENV);
  
  const domain = process.env.NODE_ENV === 'production'
  ? 'https://video-game-wingman-57d61bef9e61.herokuapp.com'
  : 'http://localhost:3000';
  
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '';
  const redirectUri = encodeURIComponent(process.env.TWITCH_REDIRECT_URI || `${domain}/api/twitchCallback`);
  console.log("Encoded Redirect URI:", redirectUri);
  
  const authUrl = process.env.TWITCH_AUTH_URL || 'https://id.twitch.tv/oauth2/authorize';
  const scopes = process.env.TWITCH_SCOPES || 'user:read:email';

  // Construct the Twitch OAuth2 login URL
  const twitchLoginUrl = `${authUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scopes)}`;
  console.log("Redirecting to Twitch login URL:", twitchLoginUrl);

  if (!clientId) {
    return res.status(500).json({ error: 'Missing TWITCH_CLIENT_ID environment variable' });
  }

  // Redirect the user to Twitch's OAuth2 login page
  res.redirect(twitchLoginUrl);
}