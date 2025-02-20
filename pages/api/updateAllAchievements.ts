import type { NextApiRequest, NextApiResponse } from 'next';
import { updateAchievementsForAllUsers } from '../../utils/updateAchievements';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await updateAchievementsForAllUsers();
    res.status(200).json({ message: 'Successfully updated all users achievements' });
  } catch (error) {
    console.error('Error updating achievements:', error);
    res.status(500).json({ message: 'Error updating achievements' });
  }
}