// import { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../utils/mongodb';
// import Forum from '../../models/Forum';

// export default async function deleteTopic(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'DELETE') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   const { forumId, topicId, userId, deleteForum = false } = req.query;

//   try {
//     await connectToMongoDB();
    
//     const forum = await Forum.findById(forumId);
//     if (!forum) {
//       return res.status(404).json({ error: 'Forum not found' });
//     }

//     if (deleteForum) {
//       // Delete entire forum if user created any topics in it
//       const hasCreatedTopics = forum.topics.some((t: { createdBy: string }) => t.createdBy === userId);
//       if (!hasCreatedTopics) {
//         return res.status(403).json({ error: 'Not authorized to delete this forum' });
//       }
//       await Forum.findByIdAndDelete(forumId);
//       return res.status(200).json({ message: 'Forum deleted successfully' });
//     } else {
//       // Delete single topic
//       const topicIndex = forum.topics.findIndex((t: { _id: string }) => t._id === topicId);
//       if (topicIndex === -1) {
//         return res.status(404).json({ error: 'Topic not found' });
//       }

//       const topic = forum.topics[topicIndex];
//       if (topic.createdBy !== userId) {
//         return res.status(403).json({ error: 'Not authorized to delete this topic' });
//       }

//       forum.topics.splice(topicIndex, 1);
//       await forum.save();
//     }

//     return res.status(200).json({ message: 'Operation completed successfully' });
//   } catch (error) {
//     console.error('Error:', error);
//     return res.status(500).json({ error: 'Operation failed' });
//   }
// } 