import { NextApiRequest, NextApiResponse } from 'next';
import { containsOffensiveContent } from '../../utils/contentModeration';
import connectToMongoDB from '../../utils/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToMongoDB();
    const { userId, content } = req.body;
    
    const result = await containsOffensiveContent(content, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error checking content:', error);
    res.status(500).json({ message: 'Error checking content' });
  }
} 