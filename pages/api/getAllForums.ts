import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { validateUserAuthentication } from '../../utils/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    // Use test user for local development if user-id is not provided
    let userId = req.headers['user-id'] as string;
    if (!userId) {
      userId = 'test-user';
    }

    // Validate user authentication only if not test user
    if (userId !== 'test-user') {
      const userAuthErrors = validateUserAuthentication(userId);
      if (userAuthErrors.length > 0) {
        return res.status(401).json({ error: userAuthErrors[0] });
      }
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Find forums that are either public or private but accessible to the user
    const forums = await Forum.find({
      $or: [
        { isPrivate: false },
        { allowedUsers: userId }
      ],
      'metadata.status': 'active'
    })
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

    // Get total count for pagination
    const total = await Forum.countDocuments({
      $or: [
        { isPrivate: false },
        { allowedUsers: userId }
      ],
      'metadata.status': 'active'
    });

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