import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const redirectUri = process.env.TWITCH_REDIRECT_URI;
    const tokenUrl = process.env.TWITCH_TOKEN_URL;

    if (!clientId || !clientSecret || !redirectUri || !tokenUrl) {
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
        const tokenResponse = await axios.post(tokenUrl, null, { params });
        const { access_token } = tokenResponse.data;

        if (!access_token) {
            return res.status(400).json({ error: 'Failed to obtain access token' });
        }

        // Fetch user information
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Client-Id': clientId
            }
        });

        res.status(200).json(userResponse.data);
    } catch (error) {
        console.error('Error in Twitch callback:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}