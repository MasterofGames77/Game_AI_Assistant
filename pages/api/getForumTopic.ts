// import { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../utils/mongodb';
// import Forum from '../../models/Forum';
// import { Topic } from '../../types';

// export default async function getForumTopics(req: NextApiRequest, res: NextApiResponse) {
//   const { forumId, topicId, userId } = req.query;

//   try {
//     await connectToMongoDB();
    
//     const forum = await Forum.findOne({ forumId });
//     if (!forum) {
//       return res.status(404).json({ error: 'Forum not found' });
//     }

//     // If topicId is provided, return specific topic
//     if (topicId) {
//       const topic = forum.topics.find((t: Topic) => t.topicId === topicId);
//       if (!topic) {
//         return res.status(404).json({ error: 'Topic not found' });
//       }
      
//       // Check private access and topic status
//       if (topic.isPrivate && !topic.allowedUsers.includes(userId as string)) {
//         return res.status(403).json({ error: 'Access denied' });
//       }
      
//       if (topic.metadata.status !== 'active') {
//         return res.status(403).json({ error: 'Topic is not active' });
//       }
      
//       // Increment view count
//       topic.metadata.viewCount += 1;
//       await forum.save();
      
//       return res.status(200).json(topic);
//     }

//     // Filter topics based on access and status
//     const accessibleTopics = forum.topics.filter((topic: Topic) => 
//       (!topic.isPrivate || topic.allowedUsers.includes(userId as string)) &&
//       topic.metadata.status === 'active'
//     );

//     return res.status(200).json(accessibleTopics);
//   } catch (error) {
//     console.error('Error fetching forum topics:', error);
//     return res.status(500).json({ error: 'Error fetching forum topics' });
//   }
// }