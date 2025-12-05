import type { NextApiRequest, NextApiResponse } from 'next';
import { clearAuthCookies } from '../../../utils/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Clear authentication cookies
    clearAuthCookies(res);

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error in logout API:', error);
    
    return res.status(500).json({
      message: 'Error logging out. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
