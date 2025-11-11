import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { forumId, postId } = req.query;
  const { message, username } = req.body;

  if (!forumId || !postId) {
    return res.status(400).json({ error: 'Missing forumId or postId' });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required and cannot be empty' });
  }

  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
  }

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    await connectToMongoDB();
    
    // First, find the forum and post to check authorization
    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Find the post to verify ownership
    const post = forum.posts.id(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Only allow post creator to edit
    if (post.createdBy !== username) {
      return res.status(403).json({ error: 'Only the post creator can edit this post' });
    }

    // Use findOneAndUpdate with positional operator to update only the specific post
    // This avoids validating all posts in the array
    const updatedForum = await Forum.findOneAndUpdate(
      { 
        forumId,
        'posts._id': postId
      },
      {
        $set: {
          'posts.$.message': message.trim(),
          'posts.$.metadata.edited': true,
          'posts.$.metadata.editedAt': new Date(),
          'posts.$.metadata.editedBy': username
        }
      },
      { 
        new: true, // Return the updated document
        runValidators: false // Skip validation to avoid issues with other posts
      }
    );

    if (!updatedForum) {
      return res.status(404).json({ error: 'Forum or post not found after update' });
    }

    return res.status(200).json({ message: 'Post updated', forum: updatedForum });
  } catch (error) {
    console.error('Error editing post:', error);
    return res.status(500).json({ error: 'Failed to edit post' });
  }
}

