import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { Forum as ForumType, Topic } from '../../types';
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
  if (req.method !== 'GET') {
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

    // Fetch all forums
    const forums = await Forum.find({});
    
    // Process forums to filter private topics and add metadata
    const accessibleForums = forums.map(forum => {
      const forumData = forum.toObject();
      
      // Filter topics based on access and status
      const accessibleTopics = forumData.topics.filter((topic: Topic) => {
        // Skip if topic is not active
        if (topic.metadata.status !== 'active') {
          return false;
        }

        // Check private topic access
        if (topic.isPrivate) {
          const accessErrors = validateUserAccess(topic, userId);
          if (accessErrors.length > 0) {
            return false;
          }
        }

        return true;
      });

      // Add forum metadata to each topic
      const topicsWithMetadata = accessibleTopics.map((topic: Topic) => ({
        ...topic,
        forumId: forumData._id,
        gameTitle: forumData.metadata.gameTitle,
        category: forumData.metadata.category,
        // Add access information for private topics
        accessInfo: topic.isPrivate ? {
          isPrivate: true,
          allowedUsers: topic.allowedUsers
        } : null
      }));

      return {
        ...forumData,
        topics: topicsWithMetadata,
        // Add forum-level access information
        accessInfo: {
          canCreateTopics: forumData.metadata.settings.allowNewTopics,
          maxTopicsPerUser: forumData.metadata.settings.maxTopicsPerUser,
          isModerator: forumData.metadata.moderators.includes(userId)
        }
      };
    });

    return res.status(200).json(accessibleForums);
  } catch (error) {
    console.error('Error fetching forums:', error);
    return res.status(500).json({ error: 'Error fetching forums' });
  }
} 