import type { NextApiRequest, NextApiResponse } from 'next';
import { syncUserData } from '../../utils/checkProAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId, email } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  try {
    await syncUserData(userId, email);
    res.status(200).json({ message: 'User data synced successfully' });
  } catch (error) {
    console.error('Error in syncUser API:', error);
    res.status(500).json({ message: 'Error syncing user data' });
  }
} 