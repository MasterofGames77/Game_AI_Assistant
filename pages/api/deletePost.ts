import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { forumId, postId } = req.query;

  if (!forumId || !postId) {
    return res.status(400).json({ error: 'Missing forumId or postId' });
  }

  try {
    await connectToMongoDB();
    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Remove the post
    forum.posts = forum.posts.filter((post: any) => post._id.toString() !== postId);
    forum.metadata.totalPosts = forum.posts.length;
    await forum.save();

    return res.status(200).json({ message: 'Post deleted', forum });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
}