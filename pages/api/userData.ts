import type { NextApiRequest, NextApiResponse } from 'next';
import { getTwitchUserData } from '../../utils/twitchAuth'; // Adjust the path to match the location of twitchAuth.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { accessToken } = req.query;
  console.log("Received access token for user data request:", accessToken); // Log the received access token

  if (!accessToken) {
    console.error("Access token is missing");
    res.status(400).json({ error: 'Access token is missing' });
    return;
  }

  try {
    const userData = await getTwitchUserData(accessToken as string);
    console.log("Fetched Twitch user data:", userData); // Log the obtained user data
    res.status(200).json({ userData });
  } catch (error: any) {
    console.error("Error fetching Twitch user data:", error.message); // Log any errors during user data fetch
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};