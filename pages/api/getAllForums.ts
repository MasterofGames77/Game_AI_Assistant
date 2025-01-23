// import { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../utils/mongodb';
// import Forum from '../../models/Forum';

// export default async function getAllForums(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'GET') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   const { userId } = req.query;

//   try {
//     await connectToMongoDB();
    
//     const forums = await Forum.find({});
//     console.log('Found forums:', forums);
    
//     // Enhance topics with their parent forum's information
//     const accessibleForums = forums.map(forum => ({
//       ...forum.toObject(),
//       topics: forum.topics.filter((topic: { isPrivate: boolean; allowedUsers: string[] }) =>
//         !topic.isPrivate || topic.allowedUsers.includes(userId as string)
//       ).map((topic: any) => ({
//         ...topic,
//         forumId: forum._id,
//         gameTitle: forum.title,
//         category: forum.metadata?.category
//       }))
//     }));
    
//     console.log('Accessible forums:', accessibleForums);
//     return res.status(200).json(accessibleForums);
//   } catch (error) {
//     console.error('Error fetching forums:', error);
//     return res.status(500).json({ error: 'Error fetching forums' });
//   }
// } 