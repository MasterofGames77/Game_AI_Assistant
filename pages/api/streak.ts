import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import User from '../../models/User';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    await connectToMongoDB();

    const user = await User.findOne({ username }).select('streak');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const streak = user.streak || {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null
    };

    return res.status(200).json({
      currentStreak: streak.currentStreak || 0,
      longestStreak: streak.longestStreak || 0,
      lastActivityDate: streak.lastActivityDate || null
    });
  } catch (error) {
    console.error('Error fetching streak:', error);
    return res.status(500).json({ error: 'Failed to fetch streak' });
  }
}

