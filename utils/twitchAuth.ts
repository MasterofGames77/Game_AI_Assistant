import axios from 'axios';
import { NextApiResponse } from 'next';

let cachedAccessToken: string | null = null;
let tokenExpiryTime: number | null = null;

export const getAccessToken = async (code?: string): Promise<string> => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;
  const tokenUrl = process.env.TWITCH_TOKEN_URL;

  console.log("Attempting to fetch access token with the following details:", { clientId, clientSecret, redirectUri, tokenUrl });

  if (!clientId || !clientSecret || !redirectUri || !tokenUrl) {
    console.error('Missing required environment variables');
    throw new Error('Missing environment variables');
  }

  // Use cached token if it exists and hasn't expired
  if (cachedAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return cachedAccessToken;
  }

  try {
    const params = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: code ? 'authorization_code' : 'client_credentials',
      code,
      redirect_uri: redirectUri
    };

    console.log("OAuth token request parameters:", params);
    const response = await axios.post(tokenUrl, null, { params });

    console.log("Access Token Response:", response.data);

    // Cache the access token and set expiry time
    cachedAccessToken = response.data.access_token;
    tokenExpiryTime = Date.now() + (response.data.expires_in * 1000);

    // Ensure the token is not null before returning
    return cachedAccessToken || '';
  } catch (error: any) {
    console.error("Error fetching access token:", error.message);
    throw new Error('Failed to fetch access token');
  }
};

export const getTwitchUserData = async (accessToken: string) => {
  try {
    console.log('Fetching Twitch user data with access token:', accessToken);
    const response = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID,
      },
    });
    console.log('Twitch user data response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching Twitch user data:', error.response?.data || error.message);
    throw error;
  }
};

export const redirectToTwitch = (res: NextApiResponse) => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;
  const scope = process.env.TWITCH_SCOPES;
  const authorizationUrl = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  res.redirect(authorizationUrl);
};