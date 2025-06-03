import type { NextApiRequest, NextApiResponse } from "next";
import connectToMongoDB from "../../utils/mongodb";
import Forum from "../../models/Forum";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await connectToMongoDB();
    const { forumId, postId, userId } = req.body;

    if (!forumId || !postId || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: "Forum not found" });
    }

    const post = forum.posts.id(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Ensure likes is an array of userIds in post.metadata
    if (!post.metadata.likes) post.metadata.likes = 0;
    if (!post.metadata.likedBy) post.metadata.likedBy = [];
    if (!post.metadata.likedBy.includes(userId)) {
      post.metadata.likedBy.push(userId);
      post.metadata.likes = post.metadata.likedBy.length;
    }

    await forum.save();

    return res.status(200).json({ forum });
  } catch (error) {
    console.error("Error liking post:", error);
    return res.status(500).json({ error: "Failed to like post" });
  }
}
