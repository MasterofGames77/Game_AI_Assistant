import type { NextApiRequest, NextApiResponse } from 'next';
import { getAccessToken, getTwitchUserData } from '../../utils/twitchAuth';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const { code } = req.query;
  console.log("Received OAuth code:", code);

  if (!code) {
    console.error("Authorization code is missing");
    res.status(400).json({ error: 'Authorization code is missing' });
    return;
  }

  try {
    const accessToken = await getAccessToken(code as string);
    console.log("Access Token obtained:", accessToken);

    // Fetch user data using the access token
    const userData = await getTwitchUserData(accessToken);
    console.log("User Data obtained:", userData);

    res.status(200).json({ accessToken, userData });
  } catch (error: any) {
    console.error("Error during token exchange or fetching user data:", error.message);
    res.status(500).json({ error: 'Failed to exchange authorization code for access token or fetch user data' });
  }
};
