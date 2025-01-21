import axios from 'axios';
import { NextApiResponse } from 'next';

let cachedAccessToken: string | null = null;
let tokenExpiryTime: number | null = null;

/**
 * Retrieves a client credentials access token for Twitch API access
 * Implements caching to avoid unnecessary token requests
 * @returns Promise containing the access token string
 * @throws Error if environment variables are missing or token fetch fails
 */
export const getClientCredentialsAccessToken = async (): Promise<string> => {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const tokenUrl = process.env.TWITCH_TOKEN_URL || 'https://id.twitch.tv/oauth2/token';

  if (!clientId || !clientSecret) {
    throw new Error('Missing environment variables');
  }

  if (cachedAccessToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return cachedAccessToken;
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'client_credentials');

    console.log("Requesting client credentials access token with parameters:", params.toString());

    const response = await axios.post(tokenUrl, params);

    cachedAccessToken = response.data.access_token;
    tokenExpiryTime = Date.now() + response.data.expires_in * 1000;

    console.log("Access token retrieved successfully:", cachedAccessToken);
    return cachedAccessToken || '';
  } catch (error: any) {
    console.error("Error fetching client credentials access token:", error.response?.data || error.message);
    throw new Error('Failed to fetch client credentials access token');
  }
};

/**
 * Gets an access token using authorization code flow or refresh token
 * @param code - Authorization code from Twitch OAuth
 * @param refreshToken - Optional refresh token for token renewal
 * @returns Promise containing the access token string
 * @throws Error if required parameters are missing or token fetch fails
 */
export const getAccessToken = async (code: string, refreshToken?: string): Promise<string> => {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const redirectUri = process.env.TWITCH_REDIRECT_URI || '';
  const tokenUrl = process.env.TWITCH_TOKEN_URL || 'https://id.twitch.tv/oauth2/token';

  if (!clientId || !clientSecret || !redirectUri || !code) {
    throw new Error('Missing required parameters for authorization code flow');
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', refreshToken ? 'refresh_token' : 'authorization_code');
    if (refreshToken) {
      params.append('refresh_token', refreshToken);
    } else {
      params.append('code', code);
      params.append('redirect_uri', redirectUri);
    }

    console.log("Requesting authorization code access token with parameters:", params.toString());

    const response = await axios.post(tokenUrl, params);

    console.log("Access token response:", response.data);

    return response.data.access_token;
  } catch (error: any) {
    console.error("Error fetching authorization code access token:", error.response?.data || error.message);
    throw new Error('Failed to fetch authorization code access token');
  }
};

/**
 * Fetches user data from Twitch API using provided access token
 * @param accessToken - Valid Twitch access token
 * @returns Promise containing user data from Twitch API
 * @throws Error if API request fails
 */
export const getTwitchUserData = async (accessToken: string) => {
  try {
    console.log('Fetching Twitch user data with access token:', accessToken);
    const response = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
      },
    });
    console.log('Twitch user data response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching Twitch user data:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Constructs the Twitch authorization URL with proper parameters
 * Handles URL cleaning to prevent double slashes
 * @param redirectUri - URI where Twitch should redirect after auth
 * @returns Properly formatted Twitch authorization URL
 */
function buildTwitchAuthorizationUrl(redirectUri: string): string {
  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  const scope = process.env.TWITCH_SCOPES || 'user:read:email';

  // Remove any double slashes except the initial "https://"
  const cleanUri = redirectUri.replace(/([^:]\/)\/+/g, "$1");

  // Return the fully constructed URL without double encoding
  return `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${cleanUri}&scope=${encodeURIComponent(scope)}`;
}

/**
 * Redirects user to Twitch authorization page
 * @param res - NextJS response object for handling redirect
 */
export const redirectToTwitch = (res: NextApiResponse) => {
  let redirectUri = process.env.TWITCH_REDIRECT_URI || '';

  // Ensure no trailing slash and no double slashes
  redirectUri = redirectUri.replace(/\/$/, '').replace(/([^:]\/)\/+/g, "$1");

  console.log('Using redirect_uri (before encoding):', redirectUri);

  // Construct the authorization URL
  const authorizationUrl = buildTwitchAuthorizationUrl(redirectUri);

  console.log('Redirecting to Twitch authorization URL:', authorizationUrl);

  res.redirect(authorizationUrl);
};