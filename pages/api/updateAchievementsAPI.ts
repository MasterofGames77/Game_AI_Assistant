import type { NextApiRequest, NextApiResponse } from 'next';
import { updateAchievementsForAllUsers, updateAchievementsForUser } from '../../utils/updateAchievements';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Accept both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, updateAll } = req.query;

    // If updateAll is true, update all users
    if (updateAll === 'true') {
      await updateAchievementsForAllUsers();
      return res.status(200).json({ 
        message: 'Successfully updated all users achievements'
      });
    }

    // If email is provided, update single user
    if (email && typeof email === 'string') {
      const result = await updateAchievementsForUser(email);
      if (!result) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.status(200).json({ 
        message: 'Successfully updated user achievements',
        progress: result.progress,
        achievements: result.achievements
      });
    }

    // If neither updateAll nor email is provided
    return res.status(400).json({ 
      message: 'Missing required parameters. Use ?email=user@example.com for single user or ?updateAll=true for all users' 
    });
  } catch (error) {
    console.error('Error in achievement update:', error);
    return res.status(500).json({ 
      message: 'Error updating achievements',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 