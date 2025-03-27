import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('Twitch callback received with query:', req.query);

    const { code } = req.query;

    if (!code) {
        console.error("No code provided in the Twitch callback.");
        return res.status(400).json({ error: 'No code provided' });
    }

    // get twitch client id and secret
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    let redirectUri = process.env.TWITCH_REDIRECT_URI || '';

    // Ensure no trailing slash and correct encoding
    redirectUri = redirectUri.replace(/\/$/, '').replace(/([^:]\/)\/+/g, "$1");
    const encodedRedirectUri = encodeURIComponent(redirectUri);

    const tokenUrl = process.env.TWITCH_TOKEN_URL || 'https://id.twitch.tv/oauth2/token';

    console.log("Twitch OAuth2 environment variables:", { clientId, clientSecret, encodedRedirectUri, tokenUrl });
    console.log("Using encoded redirect_uri:", encodedRedirectUri);

    if (!clientId || !clientSecret || !encodedRedirectUri || !tokenUrl) {
        console.error("Missing environment variables for Twitch OAuth2.");
        return res.status(500).json({ error: 'Missing environment variables' });
    }

    // create params for token request
    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
    });

    // try to get token response
    try {
        console.log("OAuth token request parameters:", params.toString());

        const tokenResponse = await axios.post(tokenUrl, params);

        console.log("Access Token Response:", tokenResponse.data);

        const { access_token } = tokenResponse.data;

        if (!access_token) {
            console.error("Failed to obtain access token from Twitch.");
            return res.status(400).json({ error: 'Failed to obtain access token' });
        }

        // Fetch user information using the access token
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Client-Id': clientId,
            },
        });

        console.log("Twitch user data response:", userResponse.data);

        // Return the user data as JSON to the frontend
        res.status(200).json(userResponse.data);
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error in Twitch callback:', error.message);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            console.error('Unexpected error in Twitch callback:', error);
            res.status(500).json({ error: 'Unexpected Error' });
        }
    }
}