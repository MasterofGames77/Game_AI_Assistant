import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, userId } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    await connectToWingmanDB();

    // Find user
    const user = await User.findOne({
      $or: [
        { username },
        { userId },
        ...(userId ? [{ userId }] : [])
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has early access subscription
    if (!user.subscription?.earlyAccessGranted) {
      return res.status(200).json({
        hasEarlyAccess: false,
        warning: null,
        daysUntilExpiration: null
      });
    }

    const now = new Date();
    const earlyAccessEndDate = user.subscription.earlyAccessEndDate;
    
    if (!earlyAccessEndDate) {
      return res.status(200).json({
        hasEarlyAccess: true,
        warning: null,
        daysUntilExpiration: null
      });
    }

    // Calculate days until expiration
    const daysUntilExpiration = Math.ceil(
      (earlyAccessEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine warning level
    let warning = null;
    let warningLevel = null;

    if (daysUntilExpiration <= 0) {
      // Already expired
      warning = {
        level: 'expired',
        message: 'Your free Pro access has expired. Upgrade now to continue enjoying Pro features.',
        action: 'upgrade',
        urgent: true
      };
      warningLevel = 'expired';
    } else if (daysUntilExpiration <= 7) {
      // Critical warning - 7 days or less
      warning = {
        level: 'critical',
        message: `Your free Pro access expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'}. Don't lose access to Pro features!`,
        action: 'upgrade',
        urgent: true
      };
      warningLevel = 'critical';
    } else if (daysUntilExpiration <= 30) {
      // Warning - 30 days or less
      warning = {
        level: 'warning',
        message: `Your free Pro access expires in ${daysUntilExpiration} days. Consider upgrading to continue enjoying Pro features.`,
        action: 'upgrade',
        urgent: false
      };
      warningLevel = 'warning';
    } else if (daysUntilExpiration <= 60) {
      // Notice - 60 days or less
      warning = {
        level: 'notice',
        message: `Your free Pro access expires in ${daysUntilExpiration} days.`,
        action: 'info',
        urgent: false
      };
      warningLevel = 'notice';
    }

    return res.status(200).json({
      hasEarlyAccess: true,
      warning,
      warningLevel,
      daysUntilExpiration,
      expiresAt: earlyAccessEndDate,
      canUpgrade: true
    });

  } catch (error) {
    console.error('Error checking early access expiration:', error);
    return res.status(500).json({
      message: 'Error checking early access expiration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 