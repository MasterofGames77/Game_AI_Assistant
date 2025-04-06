import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { Topic } from '../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    const { forumId, topicId, message, userId } = req.body;

    // Validate required fields
    if (!forumId || !topicId || !message || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the forum
    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Find the topic
    const topic = forum.topics.find((t: Topic) => t.topicId === topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Check if topic is private and user is allowed
    if (topic.isPrivate && !topic.allowedUsers.includes(userId)) {
      return res.status(403).json({ error: 'Not authorized to post in this topic' });
    }

    // Check if topic is active
    if (topic.metadata.status !== 'active') {
      return res.status(403).json({ error: 'Topic is not active' });
    }

    // Check post limit
    if (topic.posts.length >= forum.metadata.settings.maxPostsPerTopic) {
      return res.status(400).json({ error: 'Topic has reached maximum posts limit' });
    }

    // Create new post
    const newPost = {
      userId,
      message: message.trim(),
      timestamp: new Date(),
      createdBy: userId,
      metadata: {
        edited: false,
        likes: 0,
        status: 'active'
      }
    };

    // Add post to topic
    topic.posts.push(newPost);
    
    // Update topic metadata
    topic.metadata.lastPostAt = new Date();
    topic.metadata.lastPostBy = userId;
    topic.metadata.postCount = topic.posts.length;

    // Update forum metadata
    forum.metadata.totalPosts += 1;
    forum.metadata.lastActivityAt = new Date();

    // Save changes
    await forum.save();

    return res.status(200).json({ 
      message: 'Post added successfully', 
      post: newPost,
      topic: topic
    });
  } catch (error) {
    console.error('Error adding post:', error);
    return res.status(500).json({ error: 'Failed to add post' });
  }
}