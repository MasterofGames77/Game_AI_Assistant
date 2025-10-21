import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../../utils/mongodb';
import User from '../../../models/User';
import { UpdateHealthSettingsResponse } from '../../../types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateHealthSettingsResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { username, settings } = req.body;

    if (!username) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username is required' 
      });
    }

    if (!settings) {
      return res.status(400).json({ 
        success: false, 
        error: 'Settings are required' 
      });
    }

    // Connect to database
    await connectToMongoDB();

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
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

    // Update health monitoring settings
    user.healthMonitoring.breakReminderEnabled = settings.breakReminderEnabled ?? user.healthMonitoring.breakReminderEnabled;
    user.healthMonitoring.breakIntervalMinutes = settings.breakIntervalMinutes ?? user.healthMonitoring.breakIntervalMinutes;
    user.healthMonitoring.healthTipsEnabled = settings.healthTipsEnabled ?? user.healthMonitoring.healthTipsEnabled;
    user.healthMonitoring.ergonomicsReminders = settings.ergonomicsReminders ?? user.healthMonitoring.ergonomicsReminders;

    // Validate break interval
    if (user.healthMonitoring.breakIntervalMinutes < 15 || user.healthMonitoring.breakIntervalMinutes > 120) {
      return res.status(400).json({ 
        success: false, 
        error: 'Break interval must be between 15 and 120 minutes' 
      });
    }

    // Save user
    await user.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Health settings updated successfully' 
    });

  } catch (error) {
    console.error('Error updating health settings:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
