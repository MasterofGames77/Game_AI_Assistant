import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';

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
    
    const forum = await Forum.findOne({ forumId }).lean() as any;
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Check if forum is private and user has access
    if (forum.isPrivate && !forum.allowedUsers.includes(username as string)) {
      return res.status(403).json({ error: 'Access denied to private forum' });
    }

    // Check if forum is active
    if (forum.metadata.status !== 'active') {
      return res.status(403).json({ error: 'Forum is not active' });
    }

    if (incrementView !== "false") {
      // Only increment view count if user hasn't viewed this forum before
      if (!forum.metadata.viewedBy?.includes(username as string)) {
        forum.metadata.viewCount += 1;
        forum.metadata.viewedBy = [...(forum.metadata.viewedBy || []), username];
        await Forum.updateOne(
          { forumId },
          { 
            $set: { 
              'metadata.viewCount': forum.metadata.viewCount,
              'metadata.viewedBy': forum.metadata.viewedBy
            } 
          }
        );
      }
    }

    // Return forum with posts
    return res.status(200).json(forum);
  } catch (error) {
    console.error('Error fetching forum:', error);
    return res.status(500).json({ error: 'Error fetching forum' });
  }
}