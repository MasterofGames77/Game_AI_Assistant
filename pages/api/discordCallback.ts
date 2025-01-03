// import { NextApiRequest, NextApiResponse } from 'next';
// import { getDiscordOAuth2Token, fetchDiscordUser } from '../../utils/discordAuth';
// import { syncUserData } from '../../utils/checkProAccess';
// import { logger } from '../../utils/logger';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   try {
//     const { code } = req.query;

//     if (!code || Array.isArray(code)) {
//       logger.error('Invalid or missing code in Discord callback');
//       return res.status(400).json({ error: 'Invalid authorization code' });
//     }

//     // Get OAuth2 token
//     const accessToken = await getDiscordOAuth2Token(code);
    
//     // Fetch user data from Discord
//     const discordUser = await fetchDiscordUser(accessToken);
    
//     // Sync user data with our database
//     await syncUserData(discordUser.id, discordUser.email);

//     // Redirect to frontend with success
//     const redirectUrl = process.env.NODE_ENV === 'production'
//       ? 'https://assistant.videogamewingman.com'
//       : 'http://localhost:3000';

//     res.redirect(`${redirectUrl}?auth=success`);
//   } catch (error) {
//     logger.error('Discord callback error:', error);
    
//     const redirectUrl = process.env.NODE_ENV === 'production'
//       ? 'https://assistant.videogamewingman.com'
//       : 'http://localhost:3000';

//     res.redirect(`${redirectUrl}?auth=error`);
//   }
// }