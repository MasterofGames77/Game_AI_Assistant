import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.NODE_ENV === 'production' ? 'https://game-ai-assistant.vercel.app' : 'http://localhost:3000';

  const clientId = process.env.TWITCH_CLIENT_ID || '';
  const redirectUri = `${domain}/api/twitchCallback`;
  const authUrl = process.env.TWITCH_AUTH_URL || 'https://id.twitch.tv/oauth2/authorize';
  const scopes = process.env.TWITCH_SCOPES || 'user:read:email';

  const twitchLoginUrl = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
  
  if (!clientId) {
    return res.status(500).json({ error: 'Missing TWITCH_CLIENT_ID environment variable' });
  }

  res.redirect(twitchLoginUrl);
}