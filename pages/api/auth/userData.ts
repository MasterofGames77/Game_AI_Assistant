import type { NextApiRequest, NextApiResponse } from 'next';
import { getTwitchUserData } from '../twitchAuth'; // Adjust the path to match the location of twitchAuth.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { accessToken } = req.query;

  if (!accessToken) {
    res.status(400).json({ error: 'Access token is missing' });
    return;
  }

  try {
    const userData = await getTwitchUserData(accessToken as string);
    res.status(200).json({ userData });
  } catch (error: any) {
    console.error("Error fetching Twitch user data:", error.message);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
}