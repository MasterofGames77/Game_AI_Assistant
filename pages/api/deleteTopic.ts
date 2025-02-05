// import type { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../utils/mongodb';
// import Forum from '../../models/Forum';

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'DELETE') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   try {
//     await connectToMongoDB();
//     const { forumId, userId } = req.query;

//     if (!forumId || !userId) {
//       return res.status(400).json({ error: 'Missing required parameters' });
//     }

//     const forum = await Forum.findById(forumId);
//     if (!forum) {
//       return res.status(404).json({ error: 'Forum not found' });
//     }

//     // Delete the forum document
//     await Forum.findByIdAndDelete(forumId);

//     return res.status(200).json({ message: 'Forum deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting forum:', error);
//     return res.status(500).json({ error: 'Failed to delete forum' });
//   }
// } 