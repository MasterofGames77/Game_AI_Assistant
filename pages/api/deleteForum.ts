import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import Forum from '../../models/Forum';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    const userId = req.headers['user-id'] as string;
    const authToken = req.headers.authorization?.split(' ')[1];

    if (!userId || !authToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { forumId } = req.query;

    if (!forumId) {
      return res.status(400).json({ error: 'Forum ID is required' });
    }

    // Add delay before processing request
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Delete the forum
    const result = await Forum.findOneAndDelete({ forumId });

    if (!result) {
      return res.status(404).json({ error: 'Forum not found' });
    }

    return res.status(200).json({ 
      message: 'Forum deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting forum:', error);
    return res.status(500).json({ error: 'Failed to delete forum' });
  }
} 