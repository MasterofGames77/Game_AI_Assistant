import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import User from '../../models/User';
import { CheckNewAchievementsRequest, CheckNewAchievementsResponse } from '../../types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckNewAchievementsResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      hasNewAchievements: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const { username, lastChecked }: CheckNewAchievementsRequest = req.body;

    if (!username) {
      return res.status(400).json({ 
        hasNewAchievements: false,
        error: 'Username is required' 
      });
    }

    // Connect to database
    await connectToMongoDB();

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ 
        hasNewAchievements: false,
        error: 'User not found' 
      });
    }

    // If no lastChecked timestamp, don't show any achievements as "new"
    // This prevents showing all existing achievements on page refresh
    if (!lastChecked) {
      return res.status(200).json({
        hasNewAchievements: false,
        username: user.username,
        isPro: user.hasProAccess,
        totalAchievements: user.achievements.length
      });
    }

    // Parse the last checked timestamp
    const lastCheckedDate = new Date(lastChecked);
    
    // Find achievements earned after the last checked timestamp
    const newAchievements = user.achievements.filter((achievement: any) => 
      achievement.dateEarned > lastCheckedDate
    );

    if (newAchievements.length === 0) {
      return res.status(200).json({
        hasNewAchievements: false
      });
    }

    // Format achievements for response
    const formattedAchievements = newAchievements.map((achievement: any) => ({
      name: achievement.name,
      dateEarned: achievement.dateEarned.toISOString()
    }));

    return res.status(200).json({
      hasNewAchievements: true,
      username: user.username,
      achievements: formattedAchievements,
      isPro: user.hasProAccess,
      message: `Congratulations! You've earned ${newAchievements.length} new achievement${newAchievements.length > 1 ? 's' : ''}!`,
      totalAchievements: user.achievements.length
    });

  } catch (error) {
    console.error('Error checking for new achievements:', error);
    return res.status(500).json({ 
      hasNewAchievements: false,
      error: 'Internal server error' 
    });
  }
}
