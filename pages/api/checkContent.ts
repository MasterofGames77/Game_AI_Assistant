import type { NextApiRequest, NextApiResponse } from 'next';
import { handleContentViolation } from '../../utils/violationHandler';
import { containsOffensiveContent } from '../../utils/contentModeration';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, userId } = req.body;

    if (!content || !userId) {
      return res.status(400).json({ error: 'Content and userId are required' });
    }

    // Check content for violations
    const contentCheck = await containsOffensiveContent(content, userId);
    
    if (contentCheck.isOffensive) {
      // Handle violation on server side
      const violationResult = await handleContentViolation(userId, contentCheck.offendingWords);
      return res.status(403).json({
        error: 'Content violation detected',
        offendingWords: contentCheck.offendingWords,
        violationResult
      });
    }

    return res.status(200).json({ isValid: true });
  } catch (error) {
    console.error('Error checking content:', error);
    return res.status(500).json({ error: 'Failed to check content' });
  }
} 