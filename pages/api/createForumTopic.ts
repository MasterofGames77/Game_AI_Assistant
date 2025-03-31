// import type { NextApiRequest, NextApiResponse } from "next";
// import connectToMongoDB from "../../utils/mongodb";
// import Forum from "../../models/Forum";
// import { nanoid } from 'nanoid';
// import { Topic, Forum as ForumType } from '../../types';

// const createForumTopic = async (req: NextApiRequest, res: NextApiResponse) => {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   try {
//     await connectToMongoDB();

//     const { forumId, topicTitle, description, isPrivate, allowedUsers, gameTitle, category } = req.body;
//     const userId = Array.isArray(req.headers['user-id']) 
//       ? req.headers['user-id'][0] 
//       : req.headers['user-id'];

//     if (!gameTitle || !topicTitle) {
//       return res.status(400).json({ error: "Game title and topic title are required" });
//     }

//     if (!userId) {
//       return res.status(401).json({ error: "Authentication required" });
//     }

//     // Find or create forum
//     let forum = await Forum.findOne({ forumId });
//     if (!forum) {
//       forum = await Forum.create({
//         forumId,
//         title: topicTitle.trim(),
//         description: description || '',
//         topics: [],
//         metadata: {
//           gameTitle,
//           category: category || 'General',
//           tags: [gameTitle.toLowerCase()],
//           totalTopics: 0,
//           totalPosts: 0,
//           lastActivityAt: new Date(),
//           viewCount: 0,
//           status: 'active'
//         }
//       });
//     }

//     // Check forum settings
//     if (!forum.metadata.settings.allowNewTopics) {
//       return res.status(403).json({ error: "New topics are not allowed in this forum" });
//     }

//     // Check user's topic limit
//     const userTopics = forum.topics.filter((t: Topic) => t.createdBy === userId).length;
//     if (userTopics >= forum.metadata.settings.maxTopicsPerUser) {
//       return res.status(400).json({ error: "You have reached the maximum number of topics allowed" });
//     }

//     const newTopic: Topic = {
//       topicId: nanoid(),
//       topicTitle: topicTitle.trim(),
//       description: description || '',
//       posts: [],
//       isPrivate: !!isPrivate,
//       allowedUsers: isPrivate ? Array.from(new Set([userId, ...(allowedUsers || [])])) : [],
//       createdBy: userId,
//       createdAt: new Date(),
//       metadata: {
//         lastPostAt: new Date(),
//         lastPostBy: userId,
//         postCount: 0,
//         viewCount: 0,
//         status: 'active'
//       }
//     };

//     forum.topics.push(newTopic);
//     await forum.save();

//     return res.status(201).json({ 
//       message: "Forum topic created successfully", 
//       topic: newTopic 
//     });
//   } catch (error: any) {
//     console.error("Error creating forum topic:", error.message);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// export default createForumTopic;