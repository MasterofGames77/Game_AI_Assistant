import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const isProduction = process.env.NODE_ENV === 'production';

  const clientId = process.env.TWITCH_CLIENT_ID || '';
  const redirectUri = process.env.TWITCH_REDIRECT_URI || 'https://game-ai-assistant.vercel.app/api/twitchCallback';
  const authUrl = process.env.TWITCH_AUTH_URL || 'https://id.twitch.tv/oauth2/authorize';
  const scopes = process.env.TWITCH_SCOPES || 'user:read:email';

  const twitchLoginUrl = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
  console.log("Redirecting to Twitch login URL:", twitchLoginUrl);
  
  if (!clientId) {
    return res.status(500).json({ error: 'Missing TWITCH_CLIENT_ID environment variable' });
  }

  res.redirect(twitchLoginUrl);
}