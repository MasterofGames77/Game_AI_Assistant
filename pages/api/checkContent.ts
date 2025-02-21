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
    
    // Check for offensive content
    const result = await containsOffensiveContent(content, userId);
    
    // If user is banned, include the expiration date
    if (result.violationResult?.action === 'banned') {
      return res.status(403).json({
        ...result,
        message: 'Your account is temporarily suspended',
        banExpiresAt: result.violationResult.expiresAt
      });
    }

    // If it's a warning, include the warning count
    if (result.violationResult?.action === 'warning') {
      return res.status(200).json({
        ...result,
        message: `Warning ${result.violationResult.count}/3: Please avoid using inappropriate language`
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error checking content:', error);
    res.status(500).json({ message: 'Error checking content' });
  }
} 