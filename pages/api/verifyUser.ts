// import { NextApiRequest, NextApiResponse } from 'next';
// import { verifyKey } from 'discord-interactions';  // Ensure this function verifies the authenticity of the request
// import connectToMongoDB from '../../utils/mongodb';  // Import your MongoDB connection utility
// import User from '../../models/User';  // Import the User model

// const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!;

// // Function to verify Discord's request
// const verifyDiscordRequest = (req: NextApiRequest) => {
//   const signature = req.headers['x-signature-ed25519'] as string;
//   const timestamp = req.headers['x-signature-timestamp'] as string;
//   const body = JSON.stringify(req.body);

//   return verifyKey(body, signature, timestamp, DISCORD_PUBLIC_KEY);
// };

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   // Ensure it's a POST request
//   if (req.method !== 'POST') {
//     return res.status(405).send('Method Not Allowed');
//   }

//   // Verify the request authenticity
//   if (!verifyDiscordRequest(req)) {
//     return res.status(401).send('Bad request signature');
//   }

//   // Connect to MongoDB
//   await connectToMongoDB();

//   try {
//     const { user_id } = req.body;

//     // Fetch user from MongoDB
//     const user = await User.findOne({ userId: user_id });

//     if (!user) {
//       // User not found, deny role
//       return res.status(200).json({ message: 'User not found', status: 'DENY' });
//     }

//     // You can add more detailed checks based on your application's needs,
//     // such as checking specific roles, subscription status, etc.

//     // If user is verified, grant role
//     return res.status(200).json({ message: 'User verified', status: 'ALLOW' });
//   } catch (error) {
//     console.error('Error verifying user:', error);
//     return res.status(500).json({ message: 'Internal Server Error' });
//   }
// }

// export const config = {
//   api: {
//     bodyParser: false,  // Ensure body is parsed correctly
//   },
// };