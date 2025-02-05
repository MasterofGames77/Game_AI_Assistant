// import type { NextApiRequest, NextApiResponse } from "next";
// import connectToMongoDB from "../../utils/mongodb";
// import Forum from "../../models/Forum";
// import { nanoid } from 'nanoid'; // For better ID generation

// const createForumTopic = async (req: NextApiRequest, res: NextApiResponse) => {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }

//   try {
//     await connectToMongoDB();

//     const { forumId, topicTitle, isPrivate, allowedUsers, gameTitle, category } = req.body;
//     const userId = req.headers['user-id']; // Assuming user authentication is implemented

//     if (!gameTitle || !topicTitle) {
//       return res.status(400).json({ error: "Game title and topic title are required" });
//     }

//     if (!userId) {
//       return res.status(401).json({ error: "Authentication required" });
//     }

//     // Find or create forum for this game
//     let forum = await Forum.findById(forumId);
//     if (!forum) {
//       forum = await Forum.create({
//         _id: forumId,
//         title: topicTitle.trim(),
//         topics: [],
//         metadata: {
//           gameTitle: gameTitle,
//           category: category || 'General',
//           tags: [gameTitle.toLowerCase()],
//           totalTopics: 0,
//           totalPosts: 0,
//           lastActivityAt: new Date(),
//           viewCount: 0
//         }
//       });
//     }

//     const newTopic = {
//       _id: nanoid(), // Generate a shorter, unique ID
//       topicTitle: topicTitle.trim(),
//       posts: [],
//       isPrivate: !!isPrivate,
//       allowedUsers: isPrivate ? Array.from(new Set([userId, ...(allowedUsers || [])])) : [],
//       createdBy: userId,
//       createdAt: new Date(),
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