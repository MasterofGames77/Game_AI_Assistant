import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../../utils/mongodb';
import User from '../../../models/User';
import {
  getWeeklyAchievements,
  getWeeklyForumActivity,
  getWeeklyGameRecommendations
} from '../../../utils/weeklyDigestHelpers';
import { sendWeeklyDigestEmail } from '../../../utils/emailService';

/**
 * Weekly digest email cron job endpoint
 * Sends weekly summary emails to all users on Sunday at 8:00 PM UTC (3:00 PM EST)
 * 
 * For Heroku deployment (recommended):
 * - Use an external cron service like EasyCron, Cron-job.org, UptimeRobot, etc.
 * - URL: https://your-app-name.herokuapp.com/api/cron/weekly-digest
 * - Schedule: "0 20 * * 0" (Sunday at 8:00 PM UTC / 3:00 PM EST)
 * - Method: GET or POST
 * 
 * For Heroku Scheduler (if available):
 * - Install Heroku Scheduler add-on: heroku addons:create scheduler:standard
 * - Open scheduler: heroku addons:open scheduler
 * - Add job: curl https://your-app-name.herokuapp.com/api/cron/weekly-digest
 * - Schedule: Every Sunday at 8:00 PM UTC
 * 
 * Note: The schedule is configured in your cron service, not in code.
 * The default schedule is Sunday at 8:00 PM UTC (3:00 PM EST).
 * 
 * Security: Consider adding authentication (API key, secret header, etc.)
 * Uncomment the authentication check below and set CRON_SECRET in your environment variables.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Optional: Add authentication check
  // const authHeader = req.headers.authorization;
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  // Allow both GET and POST for flexibility with different cron services
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Check if today is Sunday (0 = Sunday in JavaScript Date.getDay())
  // This allows the job to be scheduled daily but only run on Sundays
  // Allow bypass for testing with ?test=true query parameter
  const isTestMode = req.query.test === 'true';
  const testUsername = req.query.user as string | undefined; // For single-user testing
  
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentHour = today.getUTCHours(); // Get UTC hour
  
  // Only run on Sunday at 8:00 PM UTC (20:00 UTC) unless in test mode
  // Allow a 1-hour window (20:00-20:59 UTC) to account for slight timing variations
  if (!isTestMode && (dayOfWeek !== 0 || currentHour !== 20)) {
    return res.status(200).json({
      success: true,
      message: 'Weekly digest scheduled for Sunday at 8:00 PM UTC. Today is not the scheduled day.',
      currentDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      currentHour: currentHour,
      scheduledDay: 'Sunday',
      scheduledHour: 20,
      timestamp: today.toISOString(),
      note: 'Add ?test=true to the URL to bypass this check for testing. Add ?user=username to test a single user.'
    });
  }

  // Test mode logging (commented out for production)
  // if (isTestMode) {
  //   console.log('[Weekly Digest] TEST MODE: Bypassing day/hour check');
  //   if (testUsername) {
  //     console.log(`[Weekly Digest] SINGLE USER TEST MODE: Testing for user ${testUsername}`);
  //   }
  // }

  const startTime = Date.now();
  const results = {
    totalUsers: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [] as string[]
  };

  try {
    // Connect to MongoDB
    await connectToMongoDB();

    // Get users - either all users or a single test user
    type UserForDigest = {
      username: string;
      email: string;
      weeklyDigest?: {
        firstEmailSentAt?: Date;
        lastEmailSentAt?: Date;
      };
    };
    
    let users: UserForDigest[];
    if (isTestMode && testUsername) {
      // Single user test mode
      const testUserDoc = await User.findOne({
        username: testUsername,
        email: { $exists: true, $ne: '' }
      }).select('username email weeklyDigest').lean();
      
      // Type guard: check if testUserDoc exists and has required fields
      if (!testUserDoc || typeof testUserDoc !== 'object' || Array.isArray(testUserDoc)) {
        return res.status(404).json({
          success: false,
          error: `User "${testUsername}" not found or has no email address`,
          note: 'Make sure the username exists and has an email address'
        });
      }
      
      const testUser = testUserDoc as any;
      
      if (!testUser.username || !testUser.email) {
        return res.status(404).json({
          success: false,
          error: `User "${testUsername}" not found or has no email address`,
          note: 'Make sure the username exists and has an email address'
        });
      }
      
      users = [{
        username: testUser.username,
        email: testUser.email,
        weeklyDigest: testUser.weeklyDigest
      }];
      
      // Test mode logging (commented out for production)
      // console.log(`[Weekly Digest] SINGLE USER TEST: Processing user ${testUsername}`);
    } else {
      // Normal mode - get all users with email addresses who have opted in
      // Users with weeklyDigest.enabled !== false are included (defaults to true)
      const userDocs = await User.find({
        email: { $exists: true, $ne: '' },
        $or: [
          { 'weeklyDigest.enabled': { $ne: false } }, // Enabled or not set (defaults to true)
          { weeklyDigest: { $exists: false } } // No weeklyDigest field (defaults to enabled)
        ]
      }).select('username email weeklyDigest').lean();
      
      users = userDocs
        .filter((doc: any) => doc.username && doc.email)
        .map((doc: any): UserForDigest => ({
          username: doc.username,
          email: doc.email,
          weeklyDigest: doc.weeklyDigest
        }));
    }

    results.totalUsers = users.length;
    // Logging (commented out for production)
    // console.log(`[Weekly Digest] Processing ${users.length} user${users.length !== 1 ? 's' : ''}...`);

    // Process users in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (user: UserForDigest) => {
          try {
            const username = user.username;
            const email = user.email;

            if (!email || !username) {
              console.warn(`[Weekly Digest] Skipping user ${username} - missing email or username`);
              return;
            }

            // Check if this is the first weekly digest email
            const isFirstEmail = !user.weeklyDigest?.firstEmailSentAt;

            // Get data for the email
            const [achievements, forumActivity, gameRecommendations] = await Promise.all([
              getWeeklyAchievements(username, isFirstEmail),
              getWeeklyForumActivity(username),
              getWeeklyGameRecommendations(username)
            ]);

            // Send the email
            const emailSent = await sendWeeklyDigestEmail(
              email,
              username,
              achievements,
              forumActivity,
              gameRecommendations,
              isFirstEmail
            );

            if (emailSent) {
              // Update user's weekly digest tracking
              await User.findOneAndUpdate(
                { username },
                {
                  $set: {
                    'weeklyDigest.lastEmailSentAt': new Date(),
                    ...(isFirstEmail && { 'weeklyDigest.firstEmailSentAt': new Date() })
                  }
                }
              );

              results.emailsSent++;
              console.log(`[Weekly Digest] Email sent to ${username} (${email})`);
            } else {
              results.emailsFailed++;
              results.errors.push(`Failed to send email to ${username} (${email})`);
              console.error(`[Weekly Digest] Failed to send email to ${username} (${email})`);
            }
          } catch (error) {
            results.emailsFailed++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorUsername = (user as UserForDigest).username || 'unknown';
            results.errors.push(`Error processing ${errorUsername}: ${errorMessage}`);
            console.error(`[Weekly Digest] Error processing user ${errorUsername}:`, error);
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const totalTime = Date.now() - startTime;
    const success = results.emailsFailed === 0;

    // Logging (commented out for production - keep error logging)
    // console.log(`[Weekly Digest] Completed in ${Math.floor(totalTime / 1000)}s`);
    // console.log(`[Weekly Digest] Results: ${results.emailsSent} sent, ${results.emailsFailed} failed`);
    
    // Only log if there were failures
    if (results.emailsFailed > 0) {
      console.error(`[Weekly Digest] Completed with ${results.emailsFailed} failed emails out of ${results.totalUsers} total users`);
    }

    return res.status(success ? 200 : 207).json({
      success,
      message: success
        ? 'Weekly digest emails sent successfully'
        : 'Some emails failed to send',
      results: {
        totalUsers: results.totalUsers,
        emailsSent: results.emailsSent,
        emailsFailed: results.emailsFailed,
        errors: results.errors.slice(0, 10) // Limit errors in response
      },
      totalTime: `${Math.floor(totalTime / 1000)}s`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Weekly Digest] Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send weekly digest emails',
      details: error instanceof Error ? error.message : 'Unknown error',
      results,
    });
  }
}
