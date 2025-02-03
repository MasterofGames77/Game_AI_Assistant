// import type { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../utils/mongodb';
// import Forum from '../../models/Forum';
// import { containsOffensiveContent } from '../../utils/contentModeration';

// export default async function addPostToForum(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ message: 'Method not allowed' });
//   }

//   const { forumId, topicId, message, userId } = req.body;

//   if (!forumId || !topicId || !message || !userId) {
//     return res.status(400).json({ message: 'Missing required fields' });
//   }

//   try {
//     await connectToMongoDB();
//     const forum = await Forum.findOne({ _id: forumId });

//     if (!forum) {
//       return res.status(404).json({ message: 'Forum not found' });
//     }

//     const topic = forum.topics.find((t: { _id: string }) => t._id === topicId);
//     if (!topic) {
//       return res.status(404).json({ message: 'Topic not found' });
//     }

//     // Check if topic is private and user is allowed
//     if (topic.isPrivate && !topic.allowedUsers.includes(userId)) {
//       return res.status(403).json({ message: 'Not authorized to post in this topic' });
//     }

//     // Add the post
//     topic.posts.push({
//       userId,
//       message,
//       timestamp: new Date()
//     });

//     await forum.save();
//     res.status(200).json({ message: 'Post added successfully', topic });
//   } catch (error) {
//     console.error('Error adding post:', error);
//     res.status(500).json({ message: 'Failed to add post' });
//   }
// }