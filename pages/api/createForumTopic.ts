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

//     const { forumId, topicTitle, isPrivate, allowedUsers } = req.body;
//     const userId = req.headers['user-id']; // Assuming user authentication is implemented

//     if (!forumId || !topicTitle) {
//       return res.status(400).json({ error: "forumId and topicTitle are required" });
//     }

//     if (!userId) {
//       return res.status(401).json({ error: "Authentication required" });
//     }

//     const forum = await Forum.findById(forumId);
//     if (!forum) {
//       return res.status(404).json({ error: "Forum not found" });
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