// import type { NextApiRequest, NextApiResponse } from "next";
// import connectToMongoDB from "../../utils/mongodb";
// import Forum from "../../models/Forum";

// // This handler will create a new forum topic within a forum
// const createForumTopic = async (req: NextApiRequest, res: NextApiResponse) => {
//   try {
//     // Connect to the MongoDB database
//     await connectToMongoDB();

//     const { forumId, topicTitle, isPrivate, allowedUsers } = req.body;

//     if (!forumId || !topicTitle) {
//       return res.status(400).json({ error: "forumId and topicTitle are required" });
//     }

//     // Find the forum by its ID
//     const forum = await Forum.findById(forumId);

//     if (!forum) {
//       return res.status(404).json({ error: "Forum not found" });
//     }

//     // Create the new topic
//     const newTopic = {
//       _id: new Date().getTime().toString(), // Use timestamp as unique topic ID or use Mongoose auto-gen
//       topicTitle,
//       posts: [],
//       isPrivate: !!isPrivate,
//       allowedUsers: isPrivate ? allowedUsers || [] : [], // If private, set allowed users
//     };

//     // Add the new topic to the forum's topics array
//     forum.topics.push(newTopic);

//     // Save the updated forum to the database
//     await forum.save();

//     return res.status(201).json({ message: "Forum topic created successfully", forum });
//   } catch (error: any) {
//     console.error("Error creating forum topic:", error.message);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// export default createForumTopic;