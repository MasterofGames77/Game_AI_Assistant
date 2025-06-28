import type { NextApiRequest, NextApiResponse } from 'next';
import { checkProAccess } from '../../utils/proAccessUtil';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, userId } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const hasProAccess = await checkProAccess(username, userId);

    return res.status(200).json({ hasProAccess });
  } catch (error) {
    console.error('Error checking Pro access:', error);
    return res.status(500).json({ 
      message: 'Error checking Pro access',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 