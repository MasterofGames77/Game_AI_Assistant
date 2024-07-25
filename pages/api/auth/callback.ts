import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccessToken } from '../twitchAuth'; // Adjusted path to match the location of twitchAuth.ts

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { code } = req.query;

  if (!code) {
    res.status(400).json({ error: 'Authorization code is missing' });
    return;
  }

  try {
    const accessToken = await getAccessToken(code as string);
    res.status(200).json({ accessToken });
  } catch (error: any) {
    console.error("Error during token exchange:", error.message);
    res.status(500).json({ error: 'Failed to exchange authorization code for access token' });
  }
};