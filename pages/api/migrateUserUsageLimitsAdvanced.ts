import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToWingmanDB } from '../../utils/databaseConnections';
import User from '../../models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectToWingmanDB();

    console.log('🔄 Starting advanced user usage limits migration...');

    // Get all users from the database
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let proUsersCount = 0;
    let freeUsersCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Check if user already has usageLimit data
        if (user.usageLimit) {
          console.log(`⏭️  Skipping user ${user.username} - already has usage limit data`);
          skippedCount++;
          continue;
        }

        const now = new Date();
        let usageLimit;

        // Check if user has Pro access (early access or paid subscription)
        const hasProAccess = user.hasActiveProAccess();
        
        if (hasProAccess) {
          // Pro users get unlimited access (no usage limits needed)
          usageLimit = {
            freeQuestionsUsed: 0,
            freeQuestionsLimit: -1, // Unlimited
            windowStartTime: now,
            windowDurationHours: 0, // No window for Pro users
            lastQuestionTime: now
          };
          proUsersCount++;
          console.log(`👑 Pro user: ${user.username} (${user.subscription?.status || 'legacy'})`);
        } else {
          // Free users get standard limits
          usageLimit = {
            freeQuestionsUsed: 0,
            freeQuestionsLimit: 7,
            windowStartTime: now,
            windowDurationHours: 1,
            lastQuestionTime: now
          };
          freeUsersCount++;
          console.log(`🆓 Free user: ${user.username}`);
        }

        // Update the user with usage limit data
        await User.findByIdAndUpdate(
          user._id,
          { 
            $set: { 
              usageLimit: usageLimit 
            } 
          },
          { new: true }
        );

        console.log(`✅ Migrated user: ${user.username}`);
        migratedCount++;

      } catch (error) {
        const errorMsg = `Failed to migrate user ${user.username}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Get updated counts by user type
    const totalProUsers = await User.countDocuments({ hasProAccess: true });
    const totalFreeUsers = await User.countDocuments({ hasProAccess: false });
    const usersWithUsageLimits = await User.countDocuments({ 'usageLimit': { $exists: true } });
    
    // Get subscription breakdown
    const earlyAccessUsers = await User.countDocuments({ 
      'subscription.earlyAccessGranted': true 
    });
    const paidUsers = await User.countDocuments({ 
      'subscription.status': 'active' 
    });
    const canceledUsers = await User.countDocuments({ 
      'subscription.status': 'canceled' 
    });

    const result = {
      totalUsers: users.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errors.length,
      errorDetails: errors,
      userTypeBreakdown: {
        proUsersMigrated: proUsersCount,
        freeUsersMigrated: freeUsersCount
      },
      finalStats: {
        totalProUsers,
        totalFreeUsers,
        usersWithUsageLimits,
        subscriptionBreakdown: {
          earlyAccessUsers,
          paidUsers,
          canceledUsers
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Advanced migration completed!');
    console.log('📈 Final Stats:', result.finalStats);

    return res.status(200).json({
      message: 'Advanced user usage limits migration completed successfully',
      ...result
    });

  } catch (error) {
    console.error('❌ Advanced migration failed:', error);
    return res.status(500).json({
      message: 'Advanced migration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
