import type { NextApiRequest, NextApiResponse } from 'next';
import SubscriptionCleanupService from '../../utils/subscriptionCleanupService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const service = SubscriptionCleanupService.getInstance();

    switch (req.method) {
      case 'POST':
        const { action, username } = req.body;

        if (action === 'forceCleanup' && username) {
          // Force cleanup for specific user
          const result = await service.forceCleanupForUser(username);
          return res.status(200).json({
            success: true,
            message: result.message,
            updated: result.updated
          });
        } else if (action === 'dailyCleanup') {
          // Trigger daily cleanup manually
          const result = await service.performDailyCleanup();
          return res.status(200).json({
            success: true,
            message: 'Daily cleanup completed successfully',
            result
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Invalid action. Use "dailyCleanup" or "forceCleanup" with username'
          });
        }

      case 'GET':
        // Get cleanup statistics
        const stats = await service.getCleanupStats();
        return res.status(200).json({
          success: true,
          stats
        });

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }

  } catch (error) {
    console.error('Error in subscription cleanup API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
