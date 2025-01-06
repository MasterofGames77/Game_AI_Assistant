// import { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../utils/mongodb';
// import Forum from '../../models/Forum';

// export default async function getForumTopics(req: NextApiRequest, res: NextApiResponse) {
//   const { forumId, topicId, userId } = req.query;

//   try {
//     await connectToMongoDB();
    
//     const forum = await Forum.findById(forumId);
//     if (!forum) {
//       return res.status(404).json({ error: 'Forum not found' });
//     }

//     // If topicId is provided, return specific topic
//     if (topicId) {
//       const topic = forum.topics.find(t => t._id === topicId);
//       if (!topic) {
//         return res.status(404).json({ error: 'Topic not found' });
//       }
      
//       // Check private access
//       if (topic.isPrivate && !topic.allowedUsers.includes(userId as string)) {
//         return res.status(403).json({ error: 'Access denied' });
//       }
      
//       return res.status(200).json(topic);
//     }

//     // Filter topics based on access
//     const accessibleTopics = forum.topics.filter(topic => 
//       !topic.isPrivate || topic.allowedUsers.includes(userId as string)
//     );

//     return res.status(200).json(accessibleTopics);
//   } catch (error) {
//     return res.status(500).json({ error: 'Error fetching forum topics' });
//   }
// }