// DEPRECATED: This endpoint has been consolidated into /api/updateAchievements?updateAll=true
// Please use the new endpoint instead.

/*
import type { NextApiRequest, NextApiResponse } from 'next';
import { updateAchievementsForAllUsers } from '../../utils/updateAchievements';

// This endpoint updates all achievements for all users
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Accept both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await updateAchievementsForAllUsers();
    res.status(200).json({ message: 'Successfully updated all users achievements' });
  } catch (error) {
    console.error('Error updating achievements:', error);
    res.status(500).json({ message: 'Error updating achievements', error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
*/

// Redirect to new endpoint
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.redirect(307, '/api/updateAchievements?updateAll=true');
}