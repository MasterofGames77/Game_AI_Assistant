import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../utils/mongodb';
import User from '../../models/User';
import { ChallengeProgress, ChallengeStreak, ChallengeReward } from '../../types';
import { logger } from '../../utils/logger';
import { updateChallengeStreak, getTodayDateString } from '../../utils/challengeStreak';
import { checkAndAwardRewards } from '../../utils/checkChallengeRewards';

/**
 * GET /api/challenge-progress?username=xxx
 * Returns the challenge progress for today's challenge
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ 
    progress: ChallengeProgress | null; 
    streak: ChallengeStreak | null;
    rewards?: ChallengeReward[];
    newRewards?: ChallengeReward[];
  } | { error: string; details?: string }>
) {
  if (req.method === 'GET') {
    try {
      const { username } = req.query;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' });
      }

      await connectToMongoDB();

      const user = await User.findOne({ username }).select('challengeProgress challengeStreak challengeRewards');

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get today's date string (UTC)
      const todayString = getTodayDateString();

      // Check if progress exists and is for today (UTC)
      if (
        user.challengeProgress &&
        user.challengeProgress.date === todayString
      ) {
        // Convert completedAt to Date if it's a string
        const progress: ChallengeProgress = {
          challengeId: user.challengeProgress.challengeId || '',
          date: user.challengeProgress.date,
          completed: user.challengeProgress.completed || false,
          completedAt: user.challengeProgress.completedAt
            ? new Date(user.challengeProgress.completedAt)
            : undefined,
          progress: user.challengeProgress.progress,
          target: user.challengeProgress.target,
        };
        return res.status(200).json({ 
          progress,
          streak: user.challengeStreak || null,
          rewards: user.challengeRewards || []
        });
      }

      // No progress for today
      return res.status(200).json({ 
        progress: null,
        streak: user.challengeStreak || null,
        rewards: user.challengeRewards || []
      });
    } catch (error) {
      logger.error('Error fetching challenge progress:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return res.status(500).json({
        error: 'Failed to fetch challenge progress',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { username, progress } = req.body;

      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Challenge Progress API] POST request received:', {
          username,
          progressType: typeof progress,
          progressIsArray: Array.isArray(progress),
          progressValue: progress,
        });
      }

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' });
      }

      if (!progress) {
        return res.status(400).json({ 
          error: 'Progress data is required',
          details: 'Expected an object with challengeId, date, and completed fields'
        });
      }

      if (typeof progress !== 'object' || Array.isArray(progress)) {
        return res.status(400).json({ 
          error: 'Invalid progress data type',
          details: `Progress must be an object, received: ${typeof progress}${Array.isArray(progress) ? ' (array)' : ''}`
        });
      }

      // Validate progress structure
      if (!progress.challengeId || typeof progress.challengeId !== 'string') {
        return res.status(400).json({ 
          error: 'Invalid progress data',
          details: 'challengeId is required and must be a string'
        });
      }

      if (typeof progress.completed !== 'boolean') {
        return res.status(400).json({ 
          error: 'Invalid progress data',
          details: 'completed field is required and must be a boolean'
        });
      }

      await connectToMongoDB();

      // Get today's date string to ensure we're saving for today (UTC)
      const today = new Date();
      const year = today.getUTCFullYear();
      const month = String(today.getUTCMonth() + 1).padStart(2, '0');
      const day = String(today.getUTCDate()).padStart(2, '0');
      const todayString = `${year}-${month}-${day}`;

      // Ensure date is set to today
      const progressToSave: ChallengeProgress = {
        ...progress,
        date: todayString,
      };

      // Prepare challenge progress object for database
      const challengeProgressData: any = {
        challengeId: progressToSave.challengeId,
        date: progressToSave.date,
        completed: progressToSave.completed,
      };

      // Only include optional fields if they exist
      if (progressToSave.completedAt) {
        challengeProgressData.completedAt = new Date(progressToSave.completedAt);
      }
      if (progressToSave.progress !== undefined) {
        challengeProgressData.progress = progressToSave.progress;
      }
      if (progressToSave.target !== undefined) {
        challengeProgressData.target = progressToSave.target;
      }

      // Get existing user to check current streak and rewards
      const existingUser = await User.findOne({ username }).select('challengeStreak challengeRewards');

      // Update challenge streak if challenge is completed
      let updatedStreak: ChallengeStreak | undefined;
      let newRewards: ChallengeReward[] = [];
      
      if (progressToSave.completed) {
        const currentStreak = existingUser?.challengeStreak || null;
        updatedStreak = updateChallengeStreak(
          currentStreak,
          progressToSave.date
        );

        // Check for new milestone rewards
        if (updatedStreak) {
          const existingRewards = existingUser?.challengeRewards || [];
          newRewards = checkAndAwardRewards(updatedStreak, existingRewards);
        }
      }

      // Prepare update object
      const updateData: any = {
        challengeProgress: challengeProgressData,
      };

      // Include streak update if challenge was completed
      if (updatedStreak) {
        updateData.challengeStreak = updatedStreak;
      }

      // Add new rewards if any were earned
      if (newRewards.length > 0) {
        const existingRewards = existingUser?.challengeRewards || [];
        updateData.challengeRewards = [...existingRewards, ...newRewards];
      }

      // Update user's challenge progress and streak
      const user = await User.findOneAndUpdate(
        { username },
        {
          $set: updateData,
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      logger.info('Challenge progress saved', {
        username,
        challengeId: progressToSave.challengeId,
        completed: progressToSave.completed,
        streakUpdated: !!updatedStreak,
        currentStreak: updatedStreak?.currentStreak || 0,
        rewardsEarned: newRewards.length,
      });

      return res.status(200).json({
        progress: {
          challengeId: progressToSave.challengeId,
          date: progressToSave.date,
          completed: progressToSave.completed,
          completedAt: progressToSave.completedAt,
          progress: progressToSave.progress,
          target: progressToSave.target,
        },
        streak: user.challengeStreak || null,
        newRewards: newRewards.length > 0 ? newRewards : undefined,
      });
    } catch (error) {
      logger.error('Error saving challenge progress:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return res.status(500).json({
        error: 'Failed to save challenge progress',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

