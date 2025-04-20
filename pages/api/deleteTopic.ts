import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { Topic } from '../../types';
import { validateUserAuthentication, validateUserAccess } from '@/utils/validation';

// Rate limiting configuration
const MAX_REQUESTS_PER_MINUTE = 60;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Middleware to check rate limiting
const checkRateLimit = (userId: string) => {
  const now = Date.now();
  const userRateLimit = rateLimitMap.get(userId);

  if (!userRateLimit || now > userRateLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 });
    return null;
  }

  if (userRateLimit.count >= MAX_REQUESTS_PER_MINUTE) {
    return `Rate limit exceeded. Please wait ${Math.ceil((userRateLimit.resetTime - now) / 1000)} seconds.`;
  }

  userRateLimit.count++;
  return null;
};

// Middleware to validate authentication
const validateAuth = (req: NextApiRequest) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return 'Authentication required';
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return 'Invalid authentication token';
  }

  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate authentication
    const authError = validateAuth(req);
    if (authError) {
      return res.status(401).json({ error: authError });
    }

    await connectToMongoDB();
    const userId = req.headers['user-id'] as string;

    // Validate user authentication
    const authErrors = validateUserAuthentication(userId);
    if (authErrors.length > 0) {
      return res.status(401).json({ error: authErrors[0] });
    }

    // Check rate limiting
    const rateLimitError = checkRateLimit(userId);
    if (rateLimitError) {
      return res.status(429).json({ error: rateLimitError });
    }

    const { forumId, topicId } = req.query;

    if (!forumId || !topicId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Find the topic
    const topicIndex = forum.topics.findIndex((t: Topic) => t.topicId === topicId);
    if (topicIndex === -1) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const topic = forum.topics[topicIndex];

    // Check if user has permission to delete (creator or moderator)
    const moderators = forum.metadata.moderators || [];
    const isModerator = moderators.includes(userId);
    const isCreator = topic.createdBy === userId;

    if (!isCreator && !isModerator) {
      return res.status(403).json({ error: 'Not authorized to delete this topic' });
    }

    // For private topics, ensure the user has access
    if (topic.isPrivate) {
      const accessErrors = validateUserAccess(topic, userId);
      if (accessErrors.length > 0) {
        return res.status(403).json({ error: accessErrors[0] });
      }
    }

    // Remove the topic
    forum.topics.splice(topicIndex, 1);
    
    // Update forum metadata
    forum.metadata.totalTopics = forum.topics.length;
    forum.metadata.lastActivityAt = new Date();
    forum.metadata.totalPosts = forum.topics.reduce((sum: number, t: Topic) => sum + t.metadata.postCount, 0);

    // Save changes
    await forum.save();

    return res.status(200).json({ 
      message: 'Topic deleted successfully',
      metadata: {
        totalTopics: forum.metadata.totalTopics,
        totalPosts: forum.metadata.totalPosts,
        lastActivityAt: forum.metadata.lastActivityAt
      }
    });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return res.status(500).json({ error: 'Failed to delete topic' });
  }
} 