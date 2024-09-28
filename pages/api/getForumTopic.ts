// import { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../utils/mongodb';
// import Forum from '../../models/Forum';

// export default async function getForumTopics(req: NextApiRequest, res: NextApiResponse) {
//   const { forumId, userId } = req.query;

//   try {
//     await connectToMongoDB();

//     // Fetch topics for the forum
//     const topics = await Forum.find({ forumId });

//     // Filter private topics
//     const filteredTopics = topics.filter(topic => {
//       if (!topic.isPrivate) return true; // Public topics
//       return topic.allowedUsers.includes(userId); // Private topics user has access to
//     });

//     return res.status(200).json(filteredTopics);
//   } catch (error) {
//     return res.status(500).json({ error: 'Error fetching forum topics.' });
//   }
// }