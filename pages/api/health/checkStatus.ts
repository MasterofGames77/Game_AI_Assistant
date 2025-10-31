import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../../utils/mongodb';
import User from '../../../models/User';
import { HealthStatusResponse } from '../../../types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthStatusResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      shouldShowBreak: false,
      timeSinceLastBreak: 0,
      breakCount: 0,
      showReminder: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ 
        shouldShowBreak: false,
        timeSinceLastBreak: 0,
        breakCount: 0,
        showReminder: false,
        error: 'Username is required' 
      });
    }

    // Connect to database
    await connectToMongoDB();

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ 
        shouldShowBreak: false,
        timeSinceLastBreak: 0,
        breakCount: 0,
        showReminder: false,
        error: 'User not found' 
      });
    }

    // Initialize session start time if not set or if it's been more than 24 hours
    const now = new Date();
    
    // Initialize health monitoring if it doesn't exist
    if (!user.healthMonitoring) {
      user.healthMonitoring = {
        breakReminderEnabled: true,
        breakIntervalMinutes: 45,
        totalSessionTime: 0,
        breakCount: 0,
        healthTipsEnabled: true,
        ergonomicsReminders: true,
        lastSessionStart: now,
        isOnBreak: false
      };
    }
    const lastSessionStart = user.healthMonitoring.lastSessionStart;
    const shouldResetSession = !lastSessionStart || 
      (now.getTime() - lastSessionStart.getTime()) > 24 * 60 * 60 * 1000; // 24 hours

    if (shouldResetSession) {
      user.healthMonitoring.lastSessionStart = now;
      // Reset break tracking for new day
      user.healthMonitoring.lastBreakTime = undefined;
      user.healthMonitoring.breakCount = 0;
      user.healthMonitoring.lastBreakReminder = undefined;
      user.healthMonitoring.isOnBreak = false;
      user.healthMonitoring.breakStartTime = undefined;
      await user.save();
    } else if (!lastSessionStart) {
      // Initialize session start time if missing (shouldn't happen with the above fix, but just in case)
      user.healthMonitoring.lastSessionStart = now;
      await user.save();
    }

    // Check if user needs a break reminder
    const breakStatus = user.shouldShowBreakReminder();
    
    // Get health tips if user has tips enabled
    let healthTips: string[] = [];
    if (user.healthMonitoring?.healthTipsEnabled) {
      healthTips = user.getHealthTips();
    }

    // Determine if we should show a reminder
    const showReminder = breakStatus.shouldShow && 
      (!user.healthMonitoring?.lastBreakReminder || 
       (new Date().getTime() - user.healthMonitoring.lastBreakReminder.getTime()) > 5 * 60 * 1000);

    return res.status(200).json({
      shouldShowBreak: breakStatus.shouldShow,
      timeSinceLastBreak: breakStatus.timeSinceLastBreak,
      nextBreakIn: breakStatus.nextBreakIn,
      breakCount: user.healthMonitoring?.breakCount || 0,
      showReminder,
      healthTips: showReminder ? healthTips : undefined,
      isOnBreak: user.healthMonitoring?.isOnBreak || false,
      breakStartTime: user.healthMonitoring?.breakStartTime,
      lastBreakTime: user.healthMonitoring?.lastBreakTime,
      breakIntervalMinutes: user.healthMonitoring?.breakIntervalMinutes || 45,
      lastSessionStart: user.healthMonitoring?.lastSessionStart || undefined,
    });

  } catch (error) {
    console.error('Error checking health status:', error);
    return res.status(500).json({ 
      shouldShowBreak: false,
      timeSinceLastBreak: 0,
      breakCount: 0,
      showReminder: false,
      error: 'Internal server error' 
    });
  }
}
