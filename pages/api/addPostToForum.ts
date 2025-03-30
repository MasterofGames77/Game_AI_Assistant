// import type { NextApiRequest, NextApiResponse } from 'next';
// import connectToMongoDB from '../../utils/mongodb';
// import Forum from '../../models/Forum';
// import { Topic } from '../../types';

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
//     const forum = await Forum.findOne({ forumId });

//     if (!forum) {
//       return res.status(404).json({ message: 'Forum not found' });
//     }

//     const topic = forum.topics.find((t: Topic) => t.topicId === topicId);
//     if (!topic) {
//       return res.status(404).json({ message: 'Topic not found' });
//     }

//     // Check if topic is private and user is allowed
//     if (topic.isPrivate && !topic.allowedUsers.includes(userId)) {
//       return res.status(403).json({ message: 'Not authorized to post in this topic' });
//     }

//     // Check if topic is active
//     if (topic.metadata.status !== 'active') {
//       return res.status(403).json({ message: 'Topic is not active' });
//     }

//     // Check post limit
//     if (topic.posts.length >= forum.metadata.settings.maxPostsPerTopic) {
//       return res.status(400).json({ message: 'Topic has reached maximum posts limit' });
//     }

//     // Add the post
//     const newPost = {
//       userId,
//       message,
//       timestamp: new Date(),
//       createdBy: userId,
//       metadata: {
//         edited: false,
//         likes: 0,
//         status: 'active'
//       }
//     };

//     topic.posts.push(newPost);
//     topic.metadata.lastPostAt = new Date();
//     topic.metadata.lastPostBy = userId;
//     topic.metadata.postCount = topic.posts.length;

//     // Update forum activity
//     await forum.updateActivity(userId);
//     await forum.save();

//     res.status(200).json({ 
//       message: 'Post added successfully', 
//       post: newPost,
//       topic: topic
//     });
//   } catch (error) {
//     console.error('Error adding post:', error);
//     res.status(500).json({ message: 'Failed to add post' });
//   }
// }