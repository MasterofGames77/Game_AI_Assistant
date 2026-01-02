import type { NextApiRequest, NextApiResponse } from 'next';
import connectToMongoDB from '../../../utils/mongodb';
import User from '../../../models/User';
import {
  getWeeklyAchievements,
  getWeeklyForumActivity,
  getWeeklyGameRecommendations
} from '../../../utils/weeklyDigestHelpers';
import { sendWeeklyDigestEmail, emailCircuitBreaker } from '../../../utils/emailService';

/**
 * Helper function to add timeout to promises
 * Prevents individual operations from hanging indefinitely
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

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
  const currentMinute = today.getUTCMinutes(); // Get UTC minute
  
  // Also get local time for debugging (server's local timezone)
  const localHour = today.getHours();
  const localMinute = today.getMinutes();
  const timezoneOffset = -today.getTimezoneOffset() / 60; // Offset in hours (negative because offset is backwards)
  
  // Scheduled time: Sunday at 9:00 PM UTC (21:00 UTC) - matches Heroku Scheduler
  // Allow a 2-hour window (20:00-21:59 UTC) to account for timing variations and scheduler delays
  const SCHEDULED_HOUR_START = 20; // 8:00 PM UTC
  const SCHEDULED_HOUR_END = 21; // 9:00 PM UTC
  
  const isScheduledDay = dayOfWeek === 0; // Sunday
  const isScheduledTime = currentHour >= SCHEDULED_HOUR_START && currentHour <= SCHEDULED_HOUR_END;
  
  if (!isTestMode && (!isScheduledDay || !isScheduledTime)) {
    // Log why the job didn't run (for debugging)
    console.log(`[Weekly Digest] Skipped - Day: ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]}, Hour: ${currentHour}:${currentMinute.toString().padStart(2, '0')} UTC`);
    
    return res.status(200).json({
      success: true,
      message: 'Weekly digest scheduled for Sunday between 8:00 PM - 9:59 PM UTC. Current time does not match schedule.',
      currentDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      currentTime: {
        utc: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} UTC`,
        local: `${localHour.toString().padStart(2, '0')}:${localMinute.toString().padStart(2, '0')} (Server timezone: UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset})`,
        iso: today.toISOString()
      },
      scheduledDay: 'Sunday',
      scheduledHours: `${SCHEDULED_HOUR_START}:00 - ${SCHEDULED_HOUR_END}:59 UTC`,
      note: 'Add ?test=true to the URL to bypass this check for testing. Add ?user=username to test a single user.'
    });
  }
  
  // Log that the job is running
  if (!isTestMode) {
    console.log(`[Weekly Digest] Running scheduled job - Day: Sunday, Time: ${currentHour}:${currentMinute.toString().padStart(2, '0')} UTC`);
  }

  // Test mode logging and validation
  if (isTestMode) {
    console.log('[Weekly Digest] TEST MODE: Bypassing day/hour check');
    if (testUsername) {
      console.log(`[Weekly Digest] SINGLE USER TEST MODE: Testing for user ${testUsername}`);
    } else {
      // Safety check: require username in test mode to prevent accidentally sending to all users
      return res.status(400).json({
        success: false,
        error: 'Username required in test mode',
        message: 'When using test mode (?test=true), you must specify a username with ?user=username',
        note: 'This prevents accidentally sending test emails to all users. Example: ?test=true&user=YourUsername'
      });
    }
  }

  const startTime = Date.now();
  const results = {
    totalUsers: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [] as string[]
  };

  try {
    // Verify email service is configured
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      console.error('[Weekly Digest] Email service not configured', {
        error: 'RESEND_API_KEY or RESEND_FROM_EMAIL missing',
        timestamp: new Date().toISOString(),
        operation: 'weekly-digest-configuration-check',
        missingKeys: {
          RESEND_API_KEY: !process.env.RESEND_API_KEY,
          RESEND_FROM_EMAIL: !process.env.RESEND_FROM_EMAIL
        }
      });
      return res.status(500).json({
        success: false,
        error: 'Email service not configured',
        message: 'RESEND_API_KEY or RESEND_FROM_EMAIL environment variables are missing'
      });
    }

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
      
      console.log(`[Weekly Digest] SINGLE USER TEST: Processing user ${testUsername}`);
    } else {
      // Normal mode - get all users with email addresses who have opted in
      // Users with weeklyDigest.enabled !== false are included (defaults to true)
      // Note: We filter out automated users and fake emails in the application code below
      const userDocs = await User.find({
        email: { $exists: true, $ne: '' },
        $or: [
          { 'weeklyDigest.enabled': { $ne: false } }, // Enabled or not set (defaults to true)
          { weeklyDigest: { $exists: false } } // No weeklyDigest field (defaults to enabled)
        ]
      }).select('username email weeklyDigest').lean();
      
      users = userDocs
        .filter((doc: any) => {
          // Additional safety filter: exclude automated users and fake emails
          if (!doc.username || !doc.email) return false;
          
          const email = doc.email.toLowerCase();
          // Exclude @wingman.internal emails (automated users)
          if (email.endsWith('@wingman.internal')) return false;
          // Exclude fake email domains
          const fakeDomains = ['@ymail.com', '@smail.com', '@rmail.com', '@dmail.com'];
          if (fakeDomains.some(domain => email.endsWith(domain))) return false;
          
          return true;
        })
        .map((doc: any): UserForDigest => ({
          username: doc.username,
          email: doc.email,
          weeklyDigest: doc.weeklyDigest
        }));
    }

    results.totalUsers = users.length;
    console.log(`[Weekly Digest] Processing ${users.length} user${users.length !== 1 ? 's' : ''}...`);

    // Check circuit breaker before processing
    const circuitBreakerState = emailCircuitBreaker.getState();
    const circuitBreakerFailures = emailCircuitBreaker.getFailureCount();
    
    if (circuitBreakerState === 'OPEN') {
      console.error('[Weekly Digest] Email circuit breaker is OPEN - aborting batch processing', {
        state: circuitBreakerState,
        failureCount: circuitBreakerFailures,
        timestamp: new Date().toISOString(),
        operation: 'weekly-digest-circuit-breaker-check'
      });
      return res.status(503).json({
        success: false,
        error: 'Email service unavailable',
        message: 'Email service is currently unavailable. Please try again later.',
        circuitBreakerState,
        failureCount: circuitBreakerFailures,
        timestamp: new Date().toISOString()
      });
    }

    if (circuitBreakerState === 'HALF_OPEN') {
      console.warn('[Weekly Digest] Email circuit breaker is HALF_OPEN - testing recovery', {
        state: circuitBreakerState,
        failureCount: circuitBreakerFailures,
        timestamp: new Date().toISOString(),
        operation: 'weekly-digest-circuit-breaker-check'
      });
    }

    // Process users in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const batchStartTime = Date.now();
      
      // Use Promise.allSettled to continue processing even if some users fail
      const batchResults = await Promise.allSettled(
        batch.map(async (user: UserForDigest) => {
          const userStartTime = Date.now();
          const username = user.username;
          const email = user.email;

          if (!email || !username) {
            console.warn(`[Weekly Digest] Skipping user ${username} - missing email or username`);
            return { success: false, skipped: true, username };
          }

          try {
            // Check if this is the first weekly digest email
            const isFirstEmail = !user.weeklyDigest?.firstEmailSentAt;

            // Get data for the email with timeout (60 seconds total for data fetching)
            const [achievements, forumActivity, gameRecommendations] = await withTimeout(
              Promise.all([
                getWeeklyAchievements(username, isFirstEmail),
                getWeeklyForumActivity(username),
                getWeeklyGameRecommendations(username)
              ]),
              60000, // 60 seconds timeout for data fetching
              `Weekly digest data fetch for ${username}`
            ).catch((error) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('[Weekly Digest] Timeout or error fetching data for user', {
                username,
                email,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                timestamp: new Date().toISOString(),
                operation: 'weekly-digest-data-fetch',
                duration: Date.now() - userStartTime
              });
              throw error;
            });

            // Send the email with timeout (30 seconds for email sending)
            const emailSent = await withTimeout(
              sendWeeklyDigestEmail(
                email,
                username,
                achievements,
                forumActivity,
                gameRecommendations,
                isFirstEmail
              ),
              30000, // 30 seconds timeout for email sending
              `Email send for ${username}`
            ).catch((error) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('[Weekly Digest] Timeout or error sending email to user', {
                username,
                email,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                timestamp: new Date().toISOString(),
                operation: 'weekly-digest-email-send',
                duration: Date.now() - userStartTime
              });
              return false; // Return false on timeout/error instead of throwing
            });

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

              const duration = Date.now() - userStartTime;
              console.log(`[Weekly Digest] Email sent to ${username} (${email}) in ${duration}ms`);
              return { success: true, username, email, duration };
            } else {
              const duration = Date.now() - userStartTime;
              const errorMsg = `Failed to send email to ${username} (${email})`;
              results.errors.push(errorMsg);
              console.error('[Weekly Digest] Failed to send email to user', {
                username,
                email,
                error: 'Email sending returned false',
                timestamp: new Date().toISOString(),
                operation: 'weekly-digest-email-send',
                duration
              });
              return { success: false, username, email, duration, error: 'Email sending failed' };
            }
          } catch (error) {
            const duration = Date.now() - userStartTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorMsg = `Error processing ${username}: ${errorMessage}`;
            results.errors.push(errorMsg);
            
            console.error('[Weekly Digest] Error processing user', {
              username,
              email,
              error: errorMessage,
              stack: error instanceof Error ? error.stack : undefined,
              timestamp: new Date().toISOString(),
              operation: 'weekly-digest-processing',
              duration,
              isTimeout: errorMessage.includes('timed out')
            });
            
            return { success: false, username, email, duration, error: errorMessage };
          }
        })
      );

      // Process batch results - handle both fulfilled and rejected promises
      batchResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          // Handle promise rejection (shouldn't happen with our try-catch, but safety net)
          const user = batch[index];
          results.emailsFailed++;
          const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
          results.errors.push(`Error processing ${user.username}: ${errorMessage}`);
          
          console.error('[Weekly Digest] Promise rejected for user', {
            username: user.username,
            email: user.email,
            error: errorMessage,
            stack: result.reason instanceof Error ? result.reason.stack : undefined,
            timestamp: new Date().toISOString(),
            operation: 'weekly-digest-batch-processing'
          });
        } else if (result.status === 'fulfilled') {
          // Handle fulfilled promise result
          const userResult = result.value;
          if (userResult && !userResult.skipped) {
            if (userResult.success) {
              results.emailsSent++;
            } else {
              results.emailsFailed++;
            }
          }
        }
      });

      const batchDuration = Date.now() - batchStartTime;
      console.log(`[Weekly Digest] Batch ${Math.floor(i / batchSize) + 1} completed in ${batchDuration}ms (${batch.length} users)`);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const totalTime = Date.now() - startTime;
    const success = results.emailsFailed === 0;

    // Log completion summary with circuit breaker status
    const finalCircuitBreakerState = emailCircuitBreaker.getState();
    const finalCircuitBreakerFailures = emailCircuitBreaker.getFailureCount();
    
    console.log(`[Weekly Digest] Completed in ${Math.floor(totalTime / 1000)}s`);
    console.log(`[Weekly Digest] Results: ${results.emailsSent} sent, ${results.emailsFailed} failed out of ${results.totalUsers} total users`);
    console.log(`[Weekly Digest] Circuit breaker state: ${finalCircuitBreakerState} (${finalCircuitBreakerFailures} failures)`);
    
    // Log detailed error information if there were failures
    if (results.emailsFailed > 0) {
      console.error('[Weekly Digest] Failed emails summary', {
        totalFailed: results.emailsFailed,
        totalUsers: results.totalUsers,
        failureRate: `${((results.emailsFailed / results.totalUsers) * 100).toFixed(2)}%`,
        sampleErrors: results.errors.slice(0, 5), // Log first 5 errors
        circuitBreakerState: finalCircuitBreakerState,
        circuitBreakerFailures: finalCircuitBreakerFailures,
        timestamp: new Date().toISOString(),
        operation: 'weekly-digest-completion',
        totalTime: `${Math.floor(totalTime / 1000)}s`
      });
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
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[Weekly Digest] Fatal error', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      operation: 'weekly-digest-fatal-error',
      duration: totalTime,
      results: {
        totalUsers: results.totalUsers,
        emailsSent: results.emailsSent,
        emailsFailed: results.emailsFailed,
        errorCount: results.errors.length
      }
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to send weekly digest emails',
      details: errorMessage,
      results,
      totalTime: `${Math.floor(totalTime / 1000)}s`,
      timestamp: new Date().toISOString()
    });
  }
}
