// import { NextApiRequest, NextApiResponse } from 'next';

// export default function handler(req: NextApiRequest, res: NextApiResponse) {
//   // Get Discord OAuth configuration from environment variables
//   const redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/discordCallback';
//   const applicationId = process.env.DISCORD_APPLICATION_ID || '';

//   // Log redirect URI for debugging
//   console.log('Discord Redirect URI:', redirectUri);

//   // Prepare OAuth URL parameters
//   const encodedRedirectUri = encodeURIComponent(redirectUri);
//   const scope = 'identify email guilds';  // Required Discord permissions

//   // Construct Discord OAuth authorization URL
//   const discordLoginUrl = `https://discord.com/api/oauth2/authorize?client_id=${applicationId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${encodeURIComponent(scope)}`;

//   // Check for missing configuration
//   if (!applicationId) {
//     return res.status(500).json({ error: 'Missing DISCORD_APPLICATION_ID environment variable' });
//   }

//   // Log final URL for debugging
//   console.log('Discord Login URL:', discordLoginUrl);

//   // Redirect user to Discord OAuth page
//   res.redirect(discordLoginUrl);
// } 