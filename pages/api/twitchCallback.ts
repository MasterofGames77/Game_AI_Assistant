import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('No code provided');
    }

    const clientId = process.env.TWITCH_CLIENT_ID || '';
    const clientSecret = process.env.TWITCH_CLIENT_SECRET || '';
    const redirectUri = process.env.TWITCH_REDIRECT_URI || '';

    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            },
        });

        const { access_token, refresh_token } = response.data;

        // You can now store the tokens in a session or database

        res.redirect('/some-dashboard-page');  // Redirect the user to a dashboard or home page after successful login
    } catch (error) {
        console.error('Error exchanging code for tokens:', error);
        res.status(500).send('Failed to exchange code for tokens');
    }
}
