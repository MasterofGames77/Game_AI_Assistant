import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Log the incoming query parameters to debug the issue
    console.log('Twitch callback received with query:', req.query);

    const { code } = req.query;

    if (!code) {
        console.error("No code provided in the Twitch callback.");
        return res.status(400).json({ error: 'No code provided' });
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const redirectUri = process.env.TWITCH_REDIRECT_URI;
    const tokenUrl = process.env.TWITCH_TOKEN_URL;

    // Log the environment variables used
    console.log("Twitch OAuth2 environment variables:", { clientId, clientSecret, redirectUri, tokenUrl });

    if (!clientId || !clientSecret || !redirectUri || !tokenUrl) {
        console.error("Missing environment variables for Twitch OAuth2.");
        return res.status(500).json({ error: 'Missing environment variables' });
    }

    const params = {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
    };

    try {
        // Log the parameters used in the token request
        console.log("OAuth token request parameters:", params);

        const tokenResponse = await axios.post(tokenUrl, null, { params });

        // Log the entire token response
        console.log("Access Token Response:", tokenResponse.data);

        const { access_token } = tokenResponse.data;

        if (!access_token) {
            console.error("Failed to obtain access token from Twitch.");
            return res.status(400).json({ error: 'Failed to obtain access token' });
        }

        // Fetch user information
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Client-Id': clientId
            }
        });

        // Log the user data received from Twitch
        console.log("Twitch user data response:", userResponse.data);

        res.status(200).json(userResponse.data);
    } catch (error) {
        console.error('Error in Twitch callback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}