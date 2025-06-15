import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Question from '../../models/Question';
import { logger } from '../../utils/logger';

// Constants for pagination and caching
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const CACHE_TTL = 60 * 1000; // 1 minute in milliseconds

// Cache interface
interface CacheEntry {
  data: any[];
  timestamp: number;
}

// In-memory cache (consider using Redis for production)
const conversationCache = new Map<string, CacheEntry>();

// Helper function to validate and parse query parameters
function parseQueryParams(query: any) {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.pageSize as string) || DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * pageSize;
  
  return { page, pageSize, skip };
}

// Helper function to check cache
function getCachedData(username: string): any[] | null {
  const cached = conversationCache.get(username);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

// Helper function to update cache
function updateCache(username: string, data: any[]): void {
  conversationCache.set(username, {
    data,
    timestamp: Date.now()
  });
}

// Helper function to clear cache for a user
function clearUserCache(username: string): void {
  conversationCache.delete(username);
}

// get conversation
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  // Validate username
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid username parameter' });
  }

  try {
    // Parse query parameters
    const { page, pageSize, skip } = parseQueryParams(req.query);

    // Check cache first
    const cachedData = getCachedData(username);
    if (cachedData) {
      logger.info('Cache hit for conversations', { username });
      return res.status(200).json({
        conversations: cachedData.slice(skip, skip + pageSize),
        pagination: {
          total: cachedData.length,
          page,
          pageSize,
          totalPages: Math.ceil(cachedData.length / pageSize)
        }
      });
    }

    // Connect to MongoDB
    logger.info('Fetching conversations from database', { username });
    await connectToMongoDB();

    // Get total count for pagination
    const total = await Question.countDocuments({ username });

    // Fetch conversations with pagination and lean query
    const conversations = await Question.find({ username })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean()
      .select('question response timestamp');

    // Update cache with full dataset
    updateCache(username, conversations);

    // Log success
    logger.info('Conversations fetched successfully', {
      username,
      count: conversations.length,
      page,
      pageSize
    });

    // Return response with pagination info
    res.status(200).json({
      conversations,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error: any) {
    // Log error with details
    logger.error('Error fetching conversations:', {
      error: error.message,
      stack: error.stack,
      username
    });

    // Send appropriate error response
    res.status(500).json({
      error: 'Failed to fetch conversations',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Optional: Add a POST endpoint to clear cache
export async function clearCache(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Invalid username parameter' });
  }

  try {
    clearUserCache(username);
    logger.info('Cache cleared for user', { username });
    res.status(200).json({ message: 'Cache cleared successfully' });
  } catch (error: any) {
    logger.error('Error clearing cache:', {
      error: error.message,
      username
    });
    res.status(500).json({ error: 'Failed to clear cache' });
  }
}