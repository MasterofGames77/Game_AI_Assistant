import type { NextApiRequest, NextApiResponse } from 'next';
import { handleContentViolation } from '../../utils/violationHandler';
import { containsOffensiveContent } from '../../utils/contentModeration';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, username } = req.body;

    if (!content || !username) {
      console.warn('checkContent missing parameters:', { hasContent: !!content, hasUsername: !!username });
      return res.status(400).json({ error: 'Content and username are required' });
    }
    
    console.log('checkContent called:', { 
      contentLength: content.length, 
      username,
      contentPreview: content.substring(0, 50) + '...' 
    });

    // Check content for violations
    const contentCheck = await containsOffensiveContent(content, username);
    
    if (contentCheck.isOffensive) {
      // Handle violation on server side
      const violationResult = await handleContentViolation(username, contentCheck.offendingWords);
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