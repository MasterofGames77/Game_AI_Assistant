import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { containsOffensiveContent } from '../../utils/contentModeration';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    const { forumId, message, username } = req.body;

    // Validate required fields
    if (!forumId || !message || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the forum
    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Check if forum is private and user is allowed
    if (forum.isPrivate && !forum.allowedUsers.includes(username)) {
      return res.status(403).json({ error: 'Not authorized to post in this forum' });
    }

    // Check if forum is active
    if (forum.metadata.status !== 'active') {
      return res.status(403).json({ error: 'Forum is not active' });
    }

    // Check for offensive content
    const contentCheck = await containsOffensiveContent(message, username);
    if (contentCheck.isOffensive) {
      return res.status(400).json({ 
        error: `The following words violate our policy: ${contentCheck.offendingWords.join(', ')}`,
        violationResult: contentCheck.violationResult
      });
    }

    // Create new post
    const newPost = {
      username,
      message: message.trim(),
      timestamp: new Date(),
      createdBy: username,
      likes: [],
      metadata: {
        edited: false
      }
    };

    // Add post to forum
    forum.posts.push(newPost);
    
    // Update forum metadata
    forum.metadata.totalPosts += 1;
    forum.metadata.lastActivityAt = new Date();

    // Save changes
    await forum.save();

    return res.status(200).json({ 
      message: 'Post added successfully', 
      forum
    });
  } catch (error) {
    console.error('Error adding post:', error);
    return res.status(500).json({ error: 'Failed to add post' });
  }
}