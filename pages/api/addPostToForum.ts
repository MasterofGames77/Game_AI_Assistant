// import { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../utils/mongodb';
// import Forum from '../../models/Forum';

// export default async function addPostToForum(req: NextApiRequest, res: NextApiResponse) {
//   const { forumId, topicId, message, userId } = req.body;

//   if (!forumId || !topicId || !message || !userId) {
//     return res.status(400).json({ message: 'forumId, topicId, userId, and message are required' });
//   }

//   try {
//     await connectToMongoDB();
//     // Find the forum by the generated ID (from gameTitle)
//     const forum = await Forum.findOne({ _id: forumId });

//     if (!forum) {
//       return res.status(404).json({ message: 'Forum not found' });
//     }

//     // Find the topic in the forum's topics array
//     const topic = forum.topics.find((t: { _id: string }) => t._id === topicId);
//     if (!topic) {
//       return res.status(404).json({ message: 'Topic not found' });
//     }

//     // Add the new post
//     topic.posts.push({
//       userId,
//       message,
//       timestamp: new Date()
//     });

//     // Update metadata
//     forum.metadata.totalPosts += 1;
//     forum.metadata.lastActivityAt = new Date();
//     forum.metadata.lastActiveUser = userId;

//     await forum.save();
//     res.status(200).json({ message: 'Post added successfully', topic });
//   } catch (error) {
//     console.error('Error adding post:', error);
//     res.status(500).json({ message: 'Failed to add post' });
//   }
// }