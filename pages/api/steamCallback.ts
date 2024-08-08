import { NextApiRequest, NextApiResponse } from 'next';
import { Issuer } from 'openid-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Discover the OpenID configuration for Steam
        const steamIssuer = await Issuer.discover('https://steamcommunity.com/openid');

        // Create a new OpenID client using the discovered configuration
        const client = new steamIssuer.Client({
            client_id: process.env.STEAM_OPENID_REALM || 'https://game-ai-assistant.vercel.app', // Set the realm (client ID)
            redirect_uris: [process.env.STEAM_OPENID_RETURN_URL || 'https://game-ai-assistant.vercel.app/api/steamCallback'], // Set the callback URL
            response_types: ['id_token'], // Define the response type
        });

        // Ensure the state parameter is handled correctly if it's an array
        const state = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;

        // Extract the parameters from the OpenID callback request
        const params = client.callbackParams(req);

        // Handle the OpenID callback and retrieve the token set, verifying the state
        const tokenSet = await client.callback(process.env.STEAM_OPENID_RETURN_URL || 'https://game-ai-assistant.vercel.app/api/steamCallback', params, { state });

        // Extract the Steam ID from the token set
        const steamId = tokenSet.claims().sub;

        console.log(`Steam ID: ${steamId}`);

        // Redirect the user to a dashboard page with the Steam ID as a query parameter
        res.redirect(`/some-dashboard-page?steamId=${steamId}`);
    } catch (error) {
        console.error('Error in Steam callback:', error);
        // Send an internal server error response in case of failure
        res.status(500).send('Internal Server Error');
    }
}