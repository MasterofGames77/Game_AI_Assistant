import { connectToWingmanDB } from './databaseConnections';
import User from '../models/User';
import { logger } from './logger';
import { CleanupResult } from '../types';

/**
 * Simple service for cleaning up expired subscriptions
 */
export class SubscriptionCleanupService {
  private static instance: SubscriptionCleanupService;

  private constructor() {}

  public static getInstance(): SubscriptionCleanupService {
    if (!SubscriptionCleanupService.instance) {
      SubscriptionCleanupService.instance = new SubscriptionCleanupService();
    }
    return SubscriptionCleanupService.instance;
  }

  /**
   * Perform daily cleanup of expired subscriptions
   */
  public async performDailyCleanup(): Promise<CleanupResult> {
    try {
      await connectToWingmanDB();
      
      const result: CleanupResult = {
        totalUsers: 0,
        expiredEarlyAccess: 0,
        updatedStatuses: 0,
        timestamp: new Date(),
        expiredPaidSubscriptions: 0,
        errors: []
      };

      // Find users with expired early access
      const now = new Date();
      const expiredUsers = await User.find({
        'subscription.earlyAccessGranted': true,
        'subscription.earlyAccessEndDate': { $lt: now },
        'subscription.status': 'free_period'
      });

      result.totalUsers = expiredUsers.length;

      // Update expired users
      for (const user of expiredUsers) {
        try {
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                hasProAccess: false,
                'subscription.status': 'expired_free'
              }
            }
          );
          result.expiredEarlyAccess++;
          result.updatedStatuses++;
          
          logger.info(`User ${user.username} early access expired and was updated`);
        } catch (error) {
          logger.error(`Error updating user ${user.username}:`, error);
        }
      }

      logger.info('Daily cleanup completed', result);
      return result;

    } catch (error) {
      logger.error('Error during daily cleanup:', error);
      throw error;
    }
  }

  /**
   * Force cleanup for a specific user
   */
  public async forceCleanupForUser(username: string): Promise<{ message: string; updated: boolean }> {
    try {
      await connectToWingmanDB();
      
      const user = await User.findOne({ username });
      if (!user) {
        return { message: 'User not found', updated: false };
      }

      if (user.subscription?.earlyAccessGranted && user.subscription?.earlyAccessEndDate < new Date()) {
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              hasProAccess: false,
              'subscription.status': 'expired_free'
            }
          }
        );
        return { message: 'User subscription cleaned up successfully', updated: true };
      }

      return { message: 'User does not need cleanup', updated: false };

    } catch (error) {
      logger.error('Error during force cleanup:', error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics
   */
  public async getCleanupStats(): Promise<{
    totalUsers: number;
    expiredUsers: number;
    activeUsers: number;
    lastCleanup: Date | null;
  }> {
    try {
      await connectToWingmanDB();
      
      const totalUsers = await User.countDocuments();
      const expiredUsers = await User.countDocuments({
        'subscription.status': 'expired_free'
      });
      const activeUsers = await User.countDocuments({
        hasProAccess: true
      });

      return {
        totalUsers,
        expiredUsers,
        activeUsers,
        lastCleanup: new Date() // For now, just return current time
      };

    } catch (error) {
      logger.error('Error getting cleanup stats:', error);
      throw error;
    }
  }
}

export default SubscriptionCleanupService;
