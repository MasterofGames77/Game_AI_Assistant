// import { Issuer, generators } from 'openid-client';
// import type { NextApiRequest, NextApiResponse } from 'next';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     try {
//         // Discover the OpenID configuration for Steam
//         const steamIssuer = await Issuer.discover('https://steamcommunity.com/openid');

//         // Ensure clean URLs without trailing slashes
//         const realm = (process.env.STEAM_OPENID_REALM || 'https://video-game-wingman-57d61bef9e61.herokuapp.com').replace(/\/$/, '');
//         const redirectUri = (process.env.STEAM_OPENID_RETURN_URL || 'https://video-game-wingman-57d61bef9e61.herokuapp.com/api/steamCallback').replace(/\/$/, '');

//         // Create a new OpenID client using the discovered configuration
//         const client = new steamIssuer.Client({
//             client_id: realm, // Use the clean realm as client_id
//             redirect_uris: [redirectUri], // Use the clean redirectUri
//             response_types: ['id_token'],
//         });

//         // Generate the authorization URL with OpenID scope and state parameter
//         const url = client.authorizationUrl({
//             scope: 'openid',
//             state: generators.state(), // Generate a random state to prevent CSRF attacks
//         });

//         // Redirect the user to the Steam authorization URL
//         res.redirect(url);
//     } catch (error) {
//         console.error('Error during Steam OpenID login:', error);
//         res.status(500).json({ error: 'Failed to initiate Steam login' });
//     }
// }