import { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { forumId, userId } = req.query;

  if (!forumId) {
    return res.status(400).json({ error: 'Forum ID is required' });
  }

  try {
    await connectToMongoDB();
    
    const forum = await Forum.findOne({ forumId });
    if (!forum) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    // Check if forum is private and user has access
    if (forum.isPrivate && !forum.allowedUsers.includes(userId as string)) {
      return res.status(403).json({ error: 'Access denied to private forum' });
    }

    // Check if forum is active
    if (forum.metadata.status !== 'active') {
      return res.status(403).json({ error: 'Forum is not active' });
    }

    // Increment view count
    forum.metadata.viewCount += 1;
    await forum.save();

    // Return forum with posts
    return res.status(200).json(forum);
  } catch (error) {
    console.error('Error fetching forum:', error);
    return res.status(500).json({ error: 'Error fetching forum' });
  }
}