import axios from 'axios';
import { NextApiResponse } from 'next';

export const getAccessToken = async (code?: string): Promise<string> => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;
  const tokenUrl = process.env.TWITCH_TOKEN_URL;

  if (!clientId || !clientSecret || !redirectUri || !tokenUrl) {
    throw new Error('Missing environment variables');
  }

  try {
    const params: any = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: code ? 'authorization_code' : 'client_credentials',
    };

    if (code) {
      params.code = code;
      params.redirect_uri = redirectUri;
    }

    const response = await axios.post(tokenUrl, null, { params });
    console.log("Access Token Response:", response.data);
    return response.data.access_token;
  } catch (error: any) {
    console.error("Error fetching access token:", error.message);
    throw new Error('Failed to fetch access token');
  }
};

export const getTwitchUserData = async (accessToken: string) => {
  try {
    const response = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Twitch user data:', error);
    throw error;
  }
};

export const redirectToTwitch = (res: NextApiResponse) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;
  const authorizationUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:read:email`;
  res.redirect(authorizationUrl);
};