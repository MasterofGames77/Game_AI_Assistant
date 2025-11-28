import { askQuestion, createForumPost, respondToForumPost, getUserPreferences } from './automatedUsersService';
import { CronTask } from '../types';
// @ts-ignore - node-schedule types may not be perfect with ES modules
import { scheduleJob } from 'node-schedule';

// Helper to convert cron expression to node-schedule format
// node-schedule uses: second minute hour day month dayOfWeek
// Standard cron uses: minute hour day month dayOfWeek
function convertCronExpression(cronExpr: string): string {
  const parts = cronExpr.split(/\s+/);
  if (parts.length === 5) {
    // Add '0' for seconds at the beginning
    return `0 ${parts.join(' ')}`;
  }
  return cronExpr;
}

class AutomatedUsersScheduler {
  private tasks: CronTask[] = [];
  private cronTasks: any[] = []; // Store all node-schedule job objects to prevent garbage collection
  public isEnabled: boolean; // Made public so getScheduler can check it

  constructor() {
    this.isEnabled = process.env.AUTOMATED_USERS_ENABLED === 'true';
  }

  /**
   * Clean and validate cron expression from environment variable
   * Removes quotes and validates the format
   */
  private cleanCronExpression(envVar: string | undefined, defaultValue: string): string {
    let expression = envVar || defaultValue;
    // Remove surrounding quotes if present
    expression = expression.trim().replace(/^["']|["']$/g, '');
    // Validate basic cron format (5 parts: minute hour day month weekday)
    const parts = expression.split(/\s+/);
    if (parts.length !== 5) {
      console.warn(`Invalid cron expression format: ${expression}, using default: ${defaultValue}`);
      return defaultValue;
    }
    return expression;
  }

  /**
   * Initialize and start all scheduled tasks
   */
  public initialize(): void {
    if (!this.isEnabled) {
      console.log('[SCHEDULER] Automated users scheduler is disabled (AUTOMATED_USERS_ENABLED is not "true")');
      console.log(`[SCHEDULER] Current value: "${process.env.AUTOMATED_USERS_ENABLED}"`);
      return;
    }

    // Prevent re-initialization if already initialized
    if (this.tasks.length > 0) {
      console.log(`[SCHEDULER] Scheduler already initialized with ${this.tasks.length} tasks, skipping...`);
      return;
    }

    const initTime = new Date();
    console.log('[SCHEDULER] Initializing automated users scheduler...');
    console.log(`[SCHEDULER] Scheduler enabled: ${this.isEnabled}`);
    console.log(`[SCHEDULER] Initialization time: ${initTime.toISOString()} (UTC)`);
    console.log(`[SCHEDULER] Current UTC time: ${new Date().toISOString()}`);
    
    // Check if we're in test mode (use shorter intervals for testing)
    const isTestMode = process.env.AUTOMATED_USERS_TEST_MODE === 'true';
    if (isTestMode) {
      console.log('⚠️  TEST MODE ENABLED: Using shorter cron intervals for testing');
      console.log('   Set AUTOMATED_USERS_TEST_MODE=false to use production schedules');
    }
    
    // MysteriousMrEnter: Question at 10:20 AM EST (15:20 UTC)
    // Note: EST is UTC-5, but we need to handle EDT (UTC-4) during daylight saving
    // For simplicity, using UTC times. Adjust for DST if needed.
    // In test mode: runs every 2 minutes
    this.addTask({
      name: 'MysteriousMrEnter-Question',
      cronExpression: isTestMode 
        ? '*/2 * * * *' // Every 2 minutes in test mode
        : this.cleanCronExpression(
            process.env.AUTOMATED_USERS_MYSTERIOUS_QUESTION,
            '20 15 * * *'
          ), // 10:20 AM EST
      isRunning: false,
      task: async () => {
        await this.executeQuestion('MysteriousMrEnter');
      }
    });

    // MysteriousMrEnter: Forum Post at 1:30 PM EST (18:30 UTC)
    // In test mode: runs every 3 minutes
    this.addTask({
      name: 'MysteriousMrEnter-ForumPost',
      cronExpression: isTestMode
        ? '*/3 * * * *' // Every 3 minutes in test mode
        : this.cleanCronExpression(
            process.env.AUTOMATED_USERS_MYSTERIOUS_POST,
            '30 18 * * *'
          ), // 1:30 PM EST
      isRunning: false,
      task: async () => {
        await this.executeForumPost('MysteriousMrEnter');
      }
    });

    // WaywardJammer: Question at 11:10 AM EST (16:10 UTC)
    // In test mode: runs every 4 minutes
    this.addTask({
      name: 'WaywardJammer-Question',
      cronExpression: isTestMode
        ? '*/4 * * * *' // Every 4 minutes in test mode
        : this.cleanCronExpression(
            process.env.AUTOMATED_USERS_WAYWARD_QUESTION,
            '10 16 * * *'
          ), // 11:10 AM EST
      isRunning: false,
      task: async () => {
        await this.executeQuestion('WaywardJammer');
      }
    });

    // WaywardJammer: Forum Post at 3:45 PM EST (20:45 UTC)
    // In test mode: runs every 5 minutes
    this.addTask({
      name: 'WaywardJammer-ForumPost',
      cronExpression: isTestMode
        ? '*/5 * * * *' // Every 5 minutes in test mode
        : this.cleanCronExpression(
            process.env.AUTOMATED_USERS_WAYWARD_POST,
            '45 20 * * *'
          ), // 3:45 PM EST
      isRunning: false,
      task: async () => {
        await this.executeForumPost('WaywardJammer');
      }
    });

    // InterdimensionalHipster: Respond to posts at 2:00 PM EST (19:00 UTC)
    // In test mode: runs every 6 minutes
    this.addTask({
      name: 'InterdimensionalHipster-Reply',
      cronExpression: isTestMode
        ? '*/6 * * * *' // Every 6 minutes in test mode
        : this.cleanCronExpression(
            process.env.AUTOMATED_USERS_HIPSTER_REPLY,
            '0 19 * * *'
          ), // 2:00 PM EST
      isRunning: false,
      task: async () => {
        await this.executePostReply('InterdimensionalHipster');
      }
    });

    // InterdimensionalHipster: Second reply at 4:30 PM EST (21:30 UTC)
    // In test mode: runs every 7 minutes
    this.addTask({
      name: 'InterdimensionalHipster-Reply2',
      cronExpression: isTestMode
        ? '*/7 * * * *' // Every 7 minutes in test mode
        : this.cleanCronExpression(
            process.env.AUTOMATED_USERS_HIPSTER_REPLY2 || process.env.AUTOMATED_USERS_HIPSTER_REPLY,
            '30 21 * * *'
          ), // 4:30 PM EST
      isRunning: false,
      task: async () => {
        await this.executePostReply('InterdimensionalHipster');
      }
    });

    // InterdimensionalHipster: Create original forum post at 12:00 PM EST (17:00 UTC)
    // In test mode: runs every 8 minutes
    this.addTask({
      name: 'InterdimensionalHipster-ForumPost',
      cronExpression: isTestMode
        ? '*/8 * * * *' // Every 8 minutes in test mode
        : this.cleanCronExpression(
            process.env.AUTOMATED_USERS_HIPSTER_POST_1 || process.env.AUTOMATED_USERS_HIPSTER_POST,
            '0 17 * * *'
          ), // 12:00 PM EST
      isRunning: false,
      task: async () => {
        await this.executeForumPost('InterdimensionalHipster');
      }
    });

    // InterdimensionalHipster: Second original forum post (optional)
    // Only added if AUTOMATED_USERS_HIPSTER_POST_2 is set
    if (process.env.AUTOMATED_USERS_HIPSTER_POST_2) {
      this.addTask({
        name: 'InterdimensionalHipster-ForumPost2',
        cronExpression: isTestMode
          ? '*/9 * * * *' // Every 9 minutes in test mode
          : this.cleanCronExpression(
              process.env.AUTOMATED_USERS_HIPSTER_POST_2,
              '0 14 * * *' // 10:00 AM EST default
            ),
        isRunning: false,
        task: async () => {
          await this.executeForumPost('InterdimensionalHipster');
        }
      });
    }

    console.log('✅ Using node-schedule (simpler and more reliable)');
    
    // Add a heartbeat task (runs every 5 minutes) - logs every 5 minutes for debugging
    // Also verify that node-schedule is actually working by checking if jobs are firing
    const heartbeatTask = scheduleJob('*/5 * * * *', () => {
      const now = new Date();
      console.log(`[SCHEDULER HEARTBEAT] Scheduler is alive at ${now.toISOString()} - All tasks scheduled: ${this.tasks.length}`);
      
      // Verify scheduled tasks are still active
      const activeTasks = this.tasks.filter(t => t.cronTask).length;
      if (activeTasks < this.tasks.length) {
        console.warn(`[SCHEDULER WARNING] Only ${activeTasks}/${this.tasks.length} tasks have active cron jobs!`);
      }
      
      // Log next run times for verification
      this.tasks.forEach(task => {
        if (task.cronTask && task.nextRun) {
          const nextRun = new Date(task.nextRun);
          const timeUntil = nextRun.getTime() - now.getTime();
          if (timeUntil < 60000 && timeUntil > -60000) { // Within 1 minute
            console.log(`[SCHEDULER] Task ${task.name} should run soon (in ${Math.floor(timeUntil/1000)}s)`);
          }
        }
      });
    });
    if (heartbeatTask) {
      this.cronTasks.push(heartbeatTask);
      console.log('✅ Heartbeat task scheduled (runs every 5 minutes)');
    } else {
      console.error('❌ [SCHEDULER ERROR] Failed to schedule heartbeat task! This indicates node-schedule may not be working.');
    }

    // Verify tasks were added
    if (this.tasks.length === 0) {
      console.error('[SCHEDULER ERROR] No tasks were added during initialization!');
      console.error('[SCHEDULER ERROR] This should not happen - check addTask() calls above');
      return;
    }
    
    console.log(`[SCHEDULER] Added ${this.tasks.length} tasks to scheduler`);
    
    // Start all tasks
    let scheduledCount = 0;
    this.tasks.forEach(task => {
      try {
        // Use node-schedule for reliable scheduling
        const cronSchedule = convertCronExpression(task.cronExpression);
        const scheduledTask = scheduleJob(cronSchedule, async () => {
          const triggerTime = new Date();
          console.log(`[CRON TRIGGER] Task ${task.name} triggered by cron at ${triggerTime.toISOString()}`);
          
          // Double-check if task is already running (race condition protection)
          if (task.isRunning) {
            console.warn(`⚠️ Task ${task.name} is already running, skipping duplicate trigger...`);
            return;
          }

          // Set running flag immediately to prevent race conditions
          task.isRunning = true;
          task.lastRun = new Date();
          console.log(`[TASK START] Starting scheduled task: ${task.name} at ${new Date().toISOString()}`);
          
          try {
            await task.task();
            console.log(`[TASK SUCCESS] Completed scheduled task: ${task.name} at ${new Date().toISOString()}`);
          } catch (error) {
            console.error(`[TASK ERROR] Error in scheduled task ${task.name}:`, error);
            if (error instanceof Error) {
              console.error(`Error message: ${error.message}`);
              console.error(`Error stack: ${error.stack}`);
            }
          } finally {
            // Always reset the running flag, even on error
            task.isRunning = false;
            console.log(`[TASK END] Task ${task.name} finished, isRunning set to false`);
          }
        });

        if (scheduledTask) {
          // Store the cron task object so we can verify it's running
          task.cronTask = scheduledTask;
          this.cronTasks.push(scheduledTask); // Store in array to prevent garbage collection
          scheduledCount++;
          
          // Calculate next run time
          const nextRun = this.calculateNextRun(task.cronExpression);
          task.nextRun = nextRun || undefined;
          
          // Verify the job is actually scheduled in node-schedule
          let actualNextRun: Date | null = null;
          try {
            const nextInvocation = scheduledTask.nextInvocation();
            actualNextRun = nextInvocation ? new Date(nextInvocation) : null;
          } catch (error) {
            console.warn(`   ⚠️  Could not get nextInvocation for ${task.name}:`, error);
          }
          
          // Check if this task should have already run today
          const now = new Date();
          const todayAtScheduledTime = new Date();
          const cronParts = task.cronExpression.split(/\s+/);
          if (cronParts.length === 5) {
            const hour = parseInt(cronParts[1]);
            const minute = parseInt(cronParts[0]);
            todayAtScheduledTime.setUTCHours(hour, minute, 0, 0);
            const shouldHaveRunToday = todayAtScheduledTime < now && todayAtScheduledTime.getUTCDate() === now.getUTCDate();
            
            console.log(`✅ Scheduled task: ${task.name} with cron: ${task.cronExpression}`);
            console.log(`   Task object type: ${typeof scheduledTask}, stored in memory`);
            console.log(`   node-schedule nextInvocation: ${actualNextRun ? actualNextRun.toISOString() : 'null'}`);
            if (task.nextRun) {
              console.log(`   Calculated next run: ${task.nextRun.toISOString()}`);
            }
            if (shouldHaveRunToday) {
              console.warn(`   ⚠️  This task should have run today at ${todayAtScheduledTime.toISOString()} but didn't (server may have restarted after that time)`);
            }
          } else {
            console.log(`✅ Scheduled task: ${task.name} with cron: ${task.cronExpression}`);
            console.log(`   Task object type: ${typeof scheduledTask}, stored in memory`);
            console.log(`   node-schedule nextInvocation: ${actualNextRun ? actualNextRun.toISOString() : 'null'}`);
            if (task.nextRun) {
              console.log(`   Calculated next run: ${task.nextRun.toISOString()}`);
            }
          }
          
          // Log if there's a mismatch
          if (actualNextRun && task.nextRun) {
            const diff = Math.abs(actualNextRun.getTime() - task.nextRun.getTime());
            if (diff > 60000) { // More than 1 minute difference
              console.warn(`   ⚠️  Warning: Calculated nextRun differs from node-schedule nextInvocation by ${Math.floor(diff/1000)} seconds`);
            }
          }
          
          // Verify the task is actually in node-schedule's job list
          if (!actualNextRun) {
            console.warn(`   ⚠️  Warning: Task ${task.name} may not be properly scheduled (nextInvocation returned null)`);
          }
        } else {
          console.error(`❌ Failed to schedule task: ${task.name} - scheduleJob returned null/undefined`);
          console.error(`   This usually means the cron expression is invalid or node-schedule failed to create the job`);
        }
      } catch (error) {
        console.error(`❌ Error scheduling task ${task.name}:`, error);
        console.error(`Cron expression: ${task.cronExpression}`);
        if (error instanceof Error) {
          console.error(`Error message: ${error.message}`);
        }
      }
    });

    console.log(`[SCHEDULER INIT] Automated users scheduler initialized: ${scheduledCount}/${this.tasks.length} tasks scheduled`);
    
    if (scheduledCount < this.tasks.length) {
      console.warn(`⚠️  [SCHEDULER WARNING] Some tasks failed to schedule. Check cron expressions and logs above.`);
      const failedTasks = this.tasks.filter(t => !t.cronTask).map(t => t.name);
      console.warn(`   Failed tasks: ${failedTasks.join(', ')}`);
    } else {
      console.log(`✅ [SCHEDULER SUCCESS] All ${scheduledCount} tasks scheduled successfully`);
    }
    
    // Log current UTC time for reference
    console.log(`[SCHEDULER] Current UTC time: ${new Date().toISOString()}`);
    console.log(`[SCHEDULER] Scheduler will run tasks at their scheduled times. Monitor logs for [CRON TRIGGER] messages.`);
    
    // Verify all tasks are stored in memory (prevent garbage collection)
    console.log(`[SCHEDULER] Stored ${this.cronTasks.length} cron job objects in memory to prevent garbage collection`);
    
    // Log when each task will next run for verification
    console.log(`[SCHEDULER] Upcoming scheduled runs:`);
    this.tasks.forEach(task => {
      if (task.cronTask && task.nextRun) {
        const nextRunDate = new Date(task.nextRun);
        const timeUntil = nextRunDate.getTime() - new Date().getTime();
        const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`   - ${task.name}: ${nextRunDate.toISOString()} (in ${hoursUntil}h ${minutesUntil}m)`);
      }
    });
  }

  /**
   * Calculate the next run time for a cron expression
   */
  private calculateNextRun(cronExpression: string): Date | null {
    try {
      // Parse cron expression: minute hour day month weekday
      const parts = cronExpression.split(/\s+/);
      if (parts.length !== 5) return null;

      const now = new Date();
      const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      
      let nextRun = new Date(utcNow);
      nextRun.setSeconds(0);
      nextRun.setMilliseconds(0);
      
      // For daily tasks, set to the next occurrence of the specified time
      const targetMinute = parts[0] === '*' ? 0 : parseInt(parts[0]);
      const targetHour = parts[1] === '*' ? 0 : parseInt(parts[1]);
      
      nextRun.setUTCMinutes(targetMinute);
      nextRun.setUTCHours(targetHour);
      
      // If the time has already passed today, set for tomorrow
      if (nextRun <= utcNow) {
        nextRun.setUTCDate(nextRun.getUTCDate() + 1);
      }
      
      return nextRun;
    } catch (error) {
      console.error('Error calculating next run time:', error);
      return null;
    }
  }

  /**
   * Add a scheduled task
   */
  private addTask(task: CronTask): void {
    this.tasks.push(task);
  }

  /**
   * Execute question activity for a user
   */
  private async executeQuestion(username: string): Promise<void> {
    try {
      const preferences = await getUserPreferences(username);
      if (!preferences) {
        console.error(`No preferences found for user: ${username}`);
        return;
      }

      console.log(`Executing question activity for ${username}...`);
      const result = await askQuestion(username, preferences);

      if (result.success) {
        console.log(`✅ ${username} asked question successfully:`, result.details?.question);
      } else {
        console.error(`❌ ${username} failed to ask question:`, result.error);
      }
    } catch (error) {
      console.error(`Error executing question for ${username}:`, error);
    }
  }

  /**
   * Execute forum post activity for a user
   */
  private async executeForumPost(username: string): Promise<void> {
    try {
      const preferences = await getUserPreferences(username);
      if (!preferences) {
        console.error(`No preferences found for user: ${username}`);
        return;
      }

      console.log(`Executing forum post activity for ${username}...`);
      const result = await createForumPost(username, preferences);

      if (result.success) {
        console.log(`✅ ${username} created forum post successfully:`, result.details?.postContent?.substring(0, 50) + '...');
      } else {
        console.error(`❌ ${username} failed to create forum post:`, result.error);
        console.error(`   Error details:`, result.details);
        console.error(`   Full result:`, JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error(`Error executing forum post for ${username}:`, error);
    }
  }

  /**
   * Execute post reply activity for a user
   */
  private async executePostReply(username: string): Promise<void> {
    try {
      const preferences = await getUserPreferences(username);
      if (!preferences) {
        console.error(`No preferences found for user: ${username}`);
        return;
      }

      console.log(`Executing post reply activity for ${username}...`);
      const result = await respondToForumPost(username, preferences);

      if (result.success) {
        console.log(`✅ ${username} replied to forum post successfully:`, result.details?.replyContent?.substring(0, 50) + '...');
        console.log(`   Replied to: ${result.details?.repliedToAuthor} in forum: ${result.details?.forumTitle}`);
      } else {
        console.error(`❌ ${username} failed to reply to forum post:`, result.error);
      }
    } catch (error) {
      console.error(`Error executing post reply for ${username}:`, error);
    }
  }

  /**
   * Get status of all scheduled tasks
   */
  public getStatus(): {
    enabled: boolean;
    tasks: Array<{
      name: string;
      cronExpression: string;
      isRunning: boolean;
      nextRun?: string;
      lastRun?: string;
      isScheduled?: boolean;
      taskType: 'question' | 'forumPost' | 'postReply';
      description: string;
    }>;
  } {
    const getTaskType = (name: string): 'question' | 'forumPost' | 'postReply' => {
      if (name.includes('Question')) {
        return 'question';
      } else if (name.includes('Reply')) {
        return 'postReply';
      } else {
        return 'forumPost';
      }
    };

    const getDescription = (name: string): string => {
      if (name.includes('Question')) {
        return 'Asks Video Game Wingman a question about a game';
      } else if (name.includes('Reply')) {
        return 'Responds to forum posts from other users';
      } else {
        return 'Creates a forum post in an existing or new forum';
      }
    };

    return {
      enabled: this.isEnabled,
      tasks: this.tasks.map(task => ({
        name: task.name,
        cronExpression: task.cronExpression,
        isRunning: task.isRunning,
        nextRun: task.nextRun ? task.nextRun.toISOString() : undefined,
        lastRun: task.lastRun ? task.lastRun.toISOString() : undefined,
        isScheduled: !!task.cronTask,
        taskType: getTaskType(task.name),
        description: getDescription(task.name)
      }))
    };
  }

  /**
   * Manually trigger a task (for testing)
   */
  public async triggerTask(taskName: string): Promise<void> {
    const task = this.tasks.find(t => t.name === taskName);
    if (!task) {
      throw new Error(`Task ${taskName} not found`);
    }

    console.log(`Manually triggering task: ${taskName}`);
    await task.task();
  }
}

// Singleton instance
let schedulerInstance: AutomatedUsersScheduler | null = null;
let isInitialized: boolean = false;
let initializationInProgress: boolean = false;

/**
 * Get the scheduler instance
 * Auto-initializes if enabled but not yet initialized
 */
export function getScheduler(): AutomatedUsersScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new AutomatedUsersScheduler();
  }
  
  // Auto-initialize if enabled but not yet initialized
  // This ensures the scheduler works even if initializeScheduler() hasn't been called yet
  if (schedulerInstance.isEnabled && !isInitialized && !initializationInProgress) {
    console.log('[SCHEDULER] Auto-initializing scheduler on first access...');
    try {
      schedulerInstance.initialize();
      isInitialized = true;
      console.log('[SCHEDULER] Auto-initialization successful');
    } catch (error) {
      console.error('[SCHEDULER] Error during auto-initialization:', error);
      // Don't set isInitialized to false here - allow manual retry
    }
  }
  
  return schedulerInstance;
}

/**
 * Initialize the scheduler (call this from server.ts)
 * This ensures the scheduler is only initialized once, even if called multiple times
 */
export function initializeScheduler(): void {
  // Prevent multiple simultaneous initializations
  if (isInitialized || initializationInProgress) {
    console.log('[SCHEDULER] Scheduler already initialized or initialization in progress, skipping...');
    return;
  }
  
  initializationInProgress = true;
  
  try {
    const scheduler = getScheduler();
    
    if (!scheduler.isEnabled) {
      console.log('[SCHEDULER] Automated users scheduler is disabled, not initializing');
      initializationInProgress = false;
      return;
    }
    
    console.log('[SCHEDULER] Initializing automated users scheduler...');
    scheduler.initialize();
    isInitialized = true;
    console.log('[SCHEDULER] Scheduler initialized successfully');
  } catch (error) {
    console.error('[SCHEDULER] Error initializing scheduler:', error);
    isInitialized = false; // Allow retry on error
  } finally {
    initializationInProgress = false;
  }
}

