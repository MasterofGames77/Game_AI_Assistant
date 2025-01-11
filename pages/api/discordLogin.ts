import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/discordCallback';
  const applicationId = process.env.DISCORD_APPLICATION_ID || '';

  console.log('Discord Redirect URI:', redirectUri);

  const encodedRedirectUri = encodeURIComponent(redirectUri);
  const scope = 'identify email guilds';

  const discordLoginUrl = `https://discord.com/api/oauth2/authorize?client_id=${applicationId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${encodeURIComponent(scope)}`;

  if (!applicationId) {
    return res.status(500).json({ error: 'Missing DISCORD_APPLICATION_ID environment variable' });
  }

  console.log('Discord Login URL:', discordLoginUrl);

  res.redirect(discordLoginUrl);
} 