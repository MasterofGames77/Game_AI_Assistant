import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Discord API configuration
const DISCORD_API_URL = 'https://discord.com/api/v10';
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID || '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || '';

// Validate required environment variables
if (!APPLICATION_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  throw new Error('Missing required Discord OAuth2 environment variables.');
}

// Get OAuth2 token from Discord using authorization code
export const getDiscordOAuth2Token = async (code: string): Promise<string> => {
  try {
    const params = new URLSearchParams({
      client_id: APPLICATION_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    });

    const response = await axios.post(`${DISCORD_API_URL}/oauth2/token`, params);
    return response.data.access_token;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error during Discord OAuth2 flow:', error.message);
      throw new Error('Failed to complete Discord OAuth2 flow');
    } else {
      console.error('Unknown error during Discord OAuth2 flow:', error);
      throw new Error('An unknown error occurred during Discord OAuth2 flow');
    }
  }
};

// Fetch user information using access token
export const fetchDiscordUser = async (accessToken: string) => {
  try {
    const response = await axios.get(`${DISCORD_API_URL}/users/@me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching user information from Discord:', error.message);
      throw new Error('Failed to fetch user information from Discord');
    } else {
      console.error('Unknown error fetching user information from Discord:', error);
      throw new Error('An unknown error occurred while fetching user information from Discord');
    }
  }
};

// Generate OAuth2 URL for Discord login
export const getDiscordOAuth2Url = () => {
  const scope = 'identify email guilds'; // Added 'guilds' scope for server access
  return `${DISCORD_API_URL}/oauth2/authorize?client_id=${APPLICATION_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
};