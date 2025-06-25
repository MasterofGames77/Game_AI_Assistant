import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { validateUserAuthentication } from '../../utils/validation';
import { checkProAccess } from '../../utils/checkProAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    // Use test user for local development if user-id is not provided
    let username = req.headers['username'] as string;
    if (!username) {
      username = 'test-user';
    }

    // Validate user authentication only if not test user
    if (username !== 'test-user') {
      const userAuthErrors = validateUserAuthentication(username);
      if (userAuthErrors.length > 0) {
        return res.status(401).json({ error: userAuthErrors[0] });
      }
    }

    // Check Pro access for the user
    const hasProAccess = await checkProAccess(username);

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build query conditions
    const baseConditions: Record<string, any> = {
      $or: [
        { isPrivate: false },
        { allowedUsers: username }
      ],
      'metadata.status': 'active'
    };

    // Add Pro-only filter for non-Pro users
    if (!hasProAccess) {
      baseConditions['isProOnly'] = false;
    }

    // Find forums that are either public or private but accessible to the user
    const forums = await Forum.find(baseConditions)
    .sort({ 'metadata.lastActivityAt': -1 })
    .skip(skip)
    .limit(limit);

    // Process forums to include metadata
    const processedForums = forums.map(forum => ({
      ...forum.toObject(),
      metadata: {
        totalPosts: forum.metadata.totalPosts || 0,
        lastActivityAt: forum.metadata.lastActivityAt || new Date(),
        viewCount: forum.metadata.viewCount || 0,
        status: forum.metadata.status || 'active'
      }
    }));

    // Get total count for pagination (using same conditions)
    const total = await Forum.countDocuments(baseConditions);

    return res.status(200).json({
      forums: processedForums,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching forums:', error);
    return res.status(500).json({ error: 'Error fetching forums' });
  }
} 