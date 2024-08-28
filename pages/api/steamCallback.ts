// import { NextApiRequest, NextApiResponse } from 'next';
// import { Issuer } from 'openid-client';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     console.log('Received Steam OpenID callback with parameters:', req.query);
//     try {
//         // Discover the OpenID configuration for Steam
//         const steamIssuer = await Issuer.discover('https://steamcommunity.com/openid');

//         // Ensure that realm and redirect_uris are correctly formatted
//         const realm = (process.env.STEAM_OPENID_REALM || 'https://video-game-wingman-57d61bef9e61.herokuapp.com').replace(/\/$/, '');
//         const redirectUri = (process.env.STEAM_OPENID_RETURN_URL || 'https://video-game-wingman-57d61bef9e61.herokuapp.com/api/steamCallback').replace(/\/$/, '');

//         // Create a client instance using the discovered configuration
//         const client = new steamIssuer.Client({
//             client_id: realm,
//             redirect_uris: [redirectUri],
//             response_types: ['id_token'],
//         });

//         // Handle the state parameter (used to maintain the state between request and callback)
//         const state = Array.isArray(req.query.state) ? req.query.state[0] : req.query.state;

//         // Extract OpenID callback parameters from the request
//         const params = client.callbackParams(req);

//         // Check if Steam returned an error in the OpenID response
//         if (req.query.openid_mode === 'error') {
//             console.error('Steam OpenID Error:', req.query);
//             return res.status(400).send('Steam OpenID Error'); // Send a 400 error response if there's an OpenID error
//         }

//         // Validate the OpenID response using the client instance and callback parameters
//         const tokenSet = await client.callback(redirectUri, params, { state });

//         // Extract the Steam ID from the token set claims
//         const steamId = tokenSet.claims().sub;
//         console.log(`Steam ID: ${steamId}`); // Log the Steam ID for debugging

//         // Redirect the user to the main page with the Steam ID as a query parameter
//         res.redirect(`/?steamId=${steamId}`);
//     } catch (error: any) {
//         console.error('Error in Steam callback:', error.message);
//         if (error.response && error.response.data) {
//             console.error('Steam OpenID Response Error:', error.response.data);
//         }
//         res.status(500).send('Internal Server Error');
//     }
// }