import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../../utils/mongodb';
import User from '../../../models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, sessionEndTime, sessionDuration } = req.body;

    if (!username || !sessionEndTime) {
      return res.status(400).json({ 
        error: 'Username and sessionEndTime are required' 
      });
    }

    // Connect to database
    await connectToMongoDB();

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.healthMonitoring) {
      return res.status(200).json({
        success: true,
        message: 'No health monitoring data to update'
      });
    }

    // Add session duration to total session time
    if (sessionDuration && sessionDuration > 0) {
      user.healthMonitoring.totalSessionTime = 
        (user.healthMonitoring.totalSessionTime || 0) + sessionDuration;
    }

    // Reset session tracking
    user.healthMonitoring.lastSessionStart = undefined;
    user.healthMonitoring.isOnBreak = false;
    user.healthMonitoring.breakStartTime = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Session ended successfully',
      totalSessionTime: user.healthMonitoring.totalSessionTime
    });

  } catch (error) {
    console.error('Error ending session:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
