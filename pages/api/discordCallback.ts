// import { NextApiRequest, NextApiResponse } from 'next';
// import axios from 'axios';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     console.log('Discord callback received with query:', req.query);

//     const { code } = req.query;

//     if (!code) {
//         console.error("No code provided in the Discord callback.");
//         return res.status(400).json({ error: 'No code provided' });
//     }

//     const applicationId = process.env.DISCORD_APPLICATION_ID;
//     const clientSecret = process.env.DISCORD_CLIENT_SECRET;
//     let redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/discordCallback';

//     // Ensure no trailing slash and correct encoding
//     redirectUri = redirectUri.replace(/\/$/, '').replace(/([^:]\/)\/+/g, "$1");

//     const tokenUrl = 'https://discord.com/api/oauth2/token';

//     console.log("Discord OAuth2 environment variables:", {
//         applicationId,
//         clientSecret: clientSecret ? '***' : undefined,
//         redirectUri,
//         tokenUrl
//     });

//     if (!applicationId || !clientSecret) {
//         console.error("Missing required environment variables.");
//         return res.status(500).json({ error: 'Missing required environment variables' });
//     }

//     try {
//         const params = new URLSearchParams({
//             client_id: applicationId,
//             client_secret: clientSecret,
//             grant_type: 'authorization_code',
//             code: code as string,
//             redirect_uri: redirectUri,
//         });

//         console.log('Attempting to exchange code for token...');
        
//         const response = await axios.post(tokenUrl, params, {
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded',
//             },
//         });

//         console.log('Token exchange successful');

//         // Store the access token or handle the user session here
//         const { access_token, token_type } = response.data;
        
//         // Redirect to your frontend with success
//         res.redirect(`/?auth=success`);
        
//     } catch (error: any) {
//         console.error('Error exchanging code for token:', error.response?.data || error.message);
//         return res.status(500).json({
//             error: 'Failed to exchange code for token',
//             details: error.response?.data || error.message
//         });
//     }
// }