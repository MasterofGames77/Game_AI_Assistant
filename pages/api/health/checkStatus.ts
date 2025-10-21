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

    // Initialize health monitoring if it doesn't exist
    if (!user.healthMonitoring) {
      user.healthMonitoring = {
        breakReminderEnabled: true,
        breakIntervalMinutes: 45,
        totalSessionTime: 0,
        breakCount: 0,
        healthTipsEnabled: true,
        ergonomicsReminders: true
      };
    }

    // Initialize session start time if not set or if it's been more than 24 hours
    const now = new Date();
    const lastSessionStart = user.healthMonitoring.lastSessionStart;
    const shouldResetSession = !lastSessionStart || 
      (now.getTime() - lastSessionStart.getTime()) > 24 * 60 * 60 * 1000; // 24 hours

    if (shouldResetSession) {
      user.healthMonitoring.lastSessionStart = now;
      // Don't set lastBreakTime to now - let it be undefined so the countdown starts from session start
      user.healthMonitoring.lastBreakTime = undefined;
      user.healthMonitoring.breakCount = 0;
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
      healthTips: showReminder ? healthTips : undefined
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
