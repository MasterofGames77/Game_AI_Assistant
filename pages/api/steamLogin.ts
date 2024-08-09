// Commented out until I can get Steam API working properly

// import { Issuer, generators } from 'openid-client';
// import type { NextApiRequest, NextApiResponse } from 'next';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     // Discover the OpenID configuration for Steam
//     const steamIssuer = await Issuer.discover('https://steamcommunity.com/openid');

//     // Create a new OpenID client using the discovered configuration
//     const client = new steamIssuer.Client({
//         client_id: process.env.STEAM_OPENID_REALM || 'https://game-ai-assistant.vercel.app', // Set the realm (client ID)
//         redirect_uris: [process.env.STEAM_OPENID_RETURN_URL || 'https://game-ai-assistant.vercel.app/api/steamCallback'], // Set the callback URL
//         response_types: ['id_token'], // Define the response type
//     });

//     // Generate the authorization URL with OpenID scope and state parameter
//     const url = client.authorizationUrl({
//         scope: 'openid',
//         state: generators.state(), // Generate a random state to prevent CSRF attacks
//     });

//     // Redirect the user to the Steam authorization URL
//     res.redirect(url);
// }
