// Commented out until I can get Steam API working properly

// import { NextApiRequest, NextApiResponse } from 'next';
// import { Issuer } from 'openid-client';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     try {
//         // Discover the OpenID configuration for Steam
//         const steamIssuer = await Issuer.discover('https://steamcommunity.com/openid');

//         // Create a client instance using the discovered configuration
//         const client = new steamIssuer.Client({
//             client_id: process.env.STEAM_OPENID_REALM || 'https://video-game-wingman-57d61bef9e61.herokuapp.com/', // Realm is the application domain
//             redirect_uris: [process.env.STEAM_OPENID_RETURN_URL || 'https://video-game-wingman-57d61bef9e61.herokuapp.com/api/steamCallback'], // Redirect URI after login
//             response_types: ['id_token'], // The type of response expected
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
//         const tokenSet = await client.callback(process.env.STEAM_OPENID_RETURN_URL || 'https://game-ai-assistant.vercel.app/api/steamCallback', params, { state });

//         // Extract the Steam ID from the token set claims
//         const steamId = tokenSet.claims().sub;
//         console.log(`Steam ID: ${steamId}`); // Log the Steam ID for debugging

//         // Redirect the user to a dashboard or other page with the Steam ID as a query parameter
//         res.redirect(`/some-dashboard-page?steamId=${steamId}`);
//     } catch (error: any) { // Handle any errors that occur during the process
//         console.error('Error in Steam callback:', error);
//         if (error.response && error.response.data) {
//             console.error('Steam OpenID Response Error:', error.response.data); // Log detailed error information if available
//         }
//         res.status(500).send('Internal Server Error'); // Send a 500 error response for any other issues
//     }
// }