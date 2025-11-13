import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { forumId, postId } = req.query;
  const { username } = req.body;

  if (!forumId || !postId) {
    return res.status(400).json({ error: 'Missing forumId or postId' });
  }

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    await connectToMongoDB();
    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Find the post
    const post = forum.posts.id(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Only allow post creator to delete
    if (post.createdBy !== username) {
      return res.status(403).json({ error: 'Only the post creator can delete this post' });
    }

    // Remove the post
    forum.posts = forum.posts.filter((p: any) => p._id.toString() !== postId);
    forum.metadata.totalPosts = forum.posts.length;
    await forum.save();

    return res.status(200).json({ message: 'Post deleted', forum });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
}