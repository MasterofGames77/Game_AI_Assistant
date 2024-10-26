// import type { NextApiRequest, NextApiResponse } from 'next';
// import checkProAccess from '../../utils/checkProAccess';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   const { userId } = req.query;  // Pass the userId as a query parameter

//   if (!userId || typeof userId !== 'string') {
//     return res.status(400).json({ error: 'User ID is required and should be a string' });
//   }

//   try {
//     await checkProAccess(userId);
//     res.status(200).json({ message: `Pro Access checked for user ${userId}` });
//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : 'Error checking Pro Access';
//     res.status(500).json({ error: errorMessage });
//   }
// }