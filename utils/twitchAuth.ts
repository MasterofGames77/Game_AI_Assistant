import axios from 'axios';
import { NextApiResponse } from 'next';

export const getAccessToken = async (code?: string): Promise<string> => {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const redirectUri = process.env.TWITCH_REDIRECT_URI;
  const tokenUrl = process.env.TWITCH_TOKEN_URL;

  console.log("Attempting to fetch access token with the following details:", { clientId, clientSecret, redirectUri, tokenUrl }); // Log details being used to fetch the token

  if (!clientId || !clientSecret || !redirectUri || !tokenUrl) {
    console.error('Missing required environment variables');
    throw new Error('Missing environment variables');
  }

  try {
    const params = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: code ? 'authorization_code' : 'client_credentials',
      code,
      redirect_uri: redirectUri
    };

    console.log("OAuth token request parameters:", params); // Log the parameters being sent to Twitch
    const response = await axios.post(tokenUrl, null, { params });
    console.log("Access Token Response:", response.data); // Log the response from Twitch
    return response.data.access_token;
  } catch (error: any) {
    console.error("Error fetching access token:", error.message); // Log any errors during fetching
    throw new Error('Failed to fetch access token');
  }
};

export const getTwitchUserData = async (accessToken: string) => {
  try {
    console.log('Fetching Twitch user data with access token:', accessToken); // Log the access token
    const response = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID,
      },
    });
    console.log('Twitch user data response:', response.data); // Log the API response
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