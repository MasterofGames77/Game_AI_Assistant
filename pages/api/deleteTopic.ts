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
    await connectToMongoDB();
    const userId = req.headers['user-id'] as string;
    const authToken = req.headers.authorization?.split(' ')[1];

    // Validate authentication
    const authError = validateAuth(req);
    if (authError) {
      return res.status(401).json({ error: authError });
    }

    // Validate user authentication
    const userAuthErrors = validateUserAuthentication(userId);
    if (userAuthErrors.length > 0) {
      return res.status(401).json({ error: userAuthErrors[0] });
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

    // Find the forum and topic first to validate access
    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    const topic = forum.topics.find((t: Topic) => t.topicId === topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Validate user access to the topic
    const accessErrors = validateUserAccess(topic, userId);
    if (accessErrors.length > 0) {
      return res.status(403).json({ error: accessErrors[0] });
    }

    // Add delay before processing request
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Use findOneAndUpdate to avoid validation issues
    const result = await Forum.findOneAndUpdate(
      { forumId },
      { 
        $pull: { topics: { topicId } },
        $set: { 'metadata.lastActivityAt': new Date() }
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Update forum metadata counts
    await Forum.findOneAndUpdate(
      { forumId },
      {
        $set: {
          'metadata.totalTopics': result.topics.length,
          'metadata.totalPosts': result.topics.reduce((sum: number, t: Topic) => sum + t.metadata.postCount, 0)
        }
      }
    );

    return res.status(200).json({ 
      message: 'Topic deleted successfully',
      metadata: {
        totalTopics: result.topics.length,
        totalPosts: result.topics.reduce((sum: number, t: Topic) => sum + t.metadata.postCount, 0),
        lastActivityAt: result.metadata.lastActivityAt
      }
    });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return res.status(500).json({ error: 'Failed to delete topic' });
  }
} 