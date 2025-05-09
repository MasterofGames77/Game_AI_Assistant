import type { NextApiRequest, NextApiResponse } from "next";
import connectToMongoDB from "../../utils/mongodb";
import Forum from "../../models/Forum";
import { nanoid } from 'nanoid';
import { Topic } from '../../types';
import { 
  validateTopicStatus,
  validateUserAuthentication,
  validateTopicData,
} from "@/utils/validation";
import { containsOffensiveContent } from "@/utils/contentModeration";

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate authentication
    const authError = validateAuth(req);
    if (authError) {
      return res.status(401).json({ error: authError });
    }

    await connectToMongoDB();

    const { forumId, topicTitle, description, isPrivate, allowedUsers, gameTitle, category } = req.body;
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

    // Validate required fields
    if (!gameTitle || !topicTitle || !forumId) {
      return res.status(400).json({ error: "Game title, topic title, and forum ID are required" });
    }

    // Sanitize input
    const sanitizedTitle = topicTitle.trim().replace(/[<>]/g, '');
    const sanitizedDescription = description?.trim().replace(/[<>]/g, '') || '';
    const sanitizedGameTitle = gameTitle.trim().replace(/[<>]/g, '');
    const sanitizedCategory = category?.trim().replace(/[<>]/g, '') || 'General';

    // Check for offensive content
    const contentCheck = await containsOffensiveContent(sanitizedTitle, userId);
    if (contentCheck.isOffensive) {
      return res.status(400).json({ 
        error: `Title contains offensive content: ${contentCheck.offendingWords.join(', ')}` 
      });
    }

    // Find or create forum
    let forum = await Forum.findOne({ forumId });
    if (!forum) {
      forum = await Forum.create({
        forumId,
        title: sanitizedTitle,
        description: sanitizedDescription,
        topics: [],
        metadata: {
          gameTitle: sanitizedGameTitle,
          category: sanitizedCategory,
          tags: [sanitizedGameTitle.toLowerCase()],
          totalTopics: 0,
          totalPosts: 0,
          lastActivityAt: new Date(),
          viewCount: 0,
          status: 'active',
          settings: {
            allowNewTopics: true,
            maxTopicsPerUser: 10,
            maxPostsPerTopic: 1000
          }
        }
      });
    }

    // Check forum settings
    if (!forum.metadata.settings.allowNewTopics) {
      return res.status(403).json({ error: "New topics are not allowed in this forum" });
    }

    // Check user's topic limit
    const userTopics = forum.topics.filter((t: Topic) => t.createdBy === userId).length;
    if (userTopics >= forum.metadata.settings.maxTopicsPerUser) {
      return res.status(400).json({ error: "You have reached the maximum number of topics allowed" });
    }

    // Validate and sanitize allowed users for private topics
    let sanitizedAllowedUsers: string[] = [];
    if (isPrivate) {
      if (!Array.isArray(allowedUsers)) {
        return res.status(400).json({ error: "Allowed users must be an array" });
      }
      
      sanitizedAllowedUsers = Array.from(new Set([
        userId,
        ...allowedUsers.map((id: string) => id.trim())
      ]));

      // Validate each user ID
      for (const id of sanitizedAllowedUsers) {
        if (typeof id !== 'string' || id.length < 1) {
          return res.status(400).json({ error: "Invalid user ID in allowed users list" });
        }
      }
    }

    const newTopic: Topic = {
      topicId: nanoid(),
      topicTitle: sanitizedTitle,
      description: sanitizedDescription,
      posts: [],
      isPrivate: !!isPrivate,
      allowedUsers: sanitizedAllowedUsers,
      createdBy: userId,
      createdAt: new Date(),
      metadata: {
        lastPostAt: new Date(),
        lastPostBy: userId,
        postCount: 0,
        viewCount: 0,
        status: 'active'
      }
    };

    // Validate topic data
    const validationErrors = validateTopicData(newTopic);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Validate topic status
    if (!validateTopicStatus(newTopic.metadata.status)) {
      return res.status(400).json({ error: "Invalid topic status" });
    }

    forum.topics.push(newTopic);
    await forum.save();

    return res.status(201).json({ 
      message: "Forum topic created successfully", 
      topic: newTopic 
    });
  } catch (error: any) {
    console.error("Error creating forum topic:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}