import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';
import { checkProAccess } from '../../utils/proAccessUtil';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { forumId, username, incrementView } = req.query;

  if (!forumId) {
    return res.status(400).json({ error: 'Forum ID is required' });
  }

  try {
    await connectToMongoDB();
    
    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Pro access check - all forums now require Pro access
    const hasProAccess = await checkProAccess((username as string) || '');
    if (!hasProAccess) {
      return res.status(403).json({ error: 'Pro access required to access forums. Upgrade to Wingman Pro to access forums.' });
    }

    // Ensure metadata exists and has all required fields
    if (!forum.metadata) {
      forum.metadata = {
        totalPosts: 0,
        lastActivityAt: new Date(),
        viewCount: 0,
        viewedBy: [],
        status: 'active'
      };
    } else {
      // Ensure all required metadata fields exist (preserve existing fields like gameTitle, category)
      forum.metadata.totalPosts = forum.metadata.totalPosts ?? 0;
      forum.metadata.lastActivityAt = forum.metadata.lastActivityAt ?? new Date();
      forum.metadata.viewCount = forum.metadata.viewCount ?? 0;
      forum.metadata.viewedBy = forum.metadata.viewedBy ?? [];
      forum.metadata.status = forum.metadata.status ?? 'active';
    }

    // Check if forum is active
    if (forum.metadata.status !== 'active') {
      return res.status(403).json({ error: 'Forum is not active' });
    }

    // Check if forum is private and user has access
    if (forum.isPrivate) {
      // Ensure allowedUsers array exists
      if (!forum.allowedUsers || !Array.isArray(forum.allowedUsers)) {
        forum.allowedUsers = [];
      }
      if (!forum.allowedUsers.includes(username as string)) {
        return res.status(403).json({ error: 'Access denied to private forum' });
      }
    }

    // Only increment view count if incrementView is not explicitly set to false and the user hasn't viewed this forum before
    if (incrementView !== "false" && username) {
      // Initialize viewedBy array if it doesn't exist
      if (!forum.metadata.viewedBy || !Array.isArray(forum.metadata.viewedBy)) {
        forum.metadata.viewedBy = [];
      }

      // Initialize viewCount if it doesn't exist
      if (typeof forum.metadata.viewCount !== 'number') {
        forum.metadata.viewCount = 0;
      }

      // Only increment if this is the user's first view
      if (!forum.metadata.viewedBy.includes(username as string)) {
        forum.metadata.viewCount += 1;
        forum.metadata.viewedBy.push(username as string);
        await forum.save();
      }
    }

    // Ensure isPrivate is a proper boolean before serialization
    if (typeof forum.isPrivate !== 'boolean') {
      forum.isPrivate = false;
    }
    
    // Return forum with posts (convert to plain object for JSON serialization)
    // toObject() converts Mongoose document to plain JavaScript object
    const forumObject = forum.toObject();
    return res.status(200).json(forumObject);
  } catch (error) {
    console.error('Error fetching forum:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      forumId: req.query.forumId,
      username: req.query.username,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ 
      error: 'Error fetching forum',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}