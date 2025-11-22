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
      console.log('Automated users scheduler is disabled (AUTOMATED_USERS_ENABLED is not "true")');
      console.log(`Current value: "${process.env.AUTOMATED_USERS_ENABLED}"`);
      return;
    }

    const initTime = new Date();
    console.log('Initializing automated users scheduler...');
    console.log(`Scheduler enabled: ${this.isEnabled}`);
    console.log(`Initialization time: ${initTime.toISOString()} (UTC)`);
    console.log(`Current UTC time: ${new Date().toISOString()}`);
    
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
    const heartbeatTask = scheduleJob('*/5 * * * *', () => {
      const now = new Date();
      console.log(`[SCHEDULER HEARTBEAT] Scheduler is alive at ${now.toISOString()} - All tasks scheduled: ${this.tasks.length}`);
    });
    if (heartbeatTask) {
      this.cronTasks.push(heartbeatTask);
      console.log('✅ Heartbeat task scheduled (runs every 5 minutes, logs every 30 minutes)');
    }

    // Start all tasks
    let scheduledCount = 0;
    this.tasks.forEach(task => {
      try {
        // Use node-schedule for reliable scheduling
        const cronSchedule = convertCronExpression(task.cronExpression);
        const scheduledTask = scheduleJob(cronSchedule, async () => {
          const triggerTime = new Date();
          console.log(`[CRON TRIGGER] Task ${task.name} triggered by cron at ${triggerTime.toISOString()}`);
          
          if (task.isRunning) {
            console.log(`Task ${task.name} is already running, skipping...`);
            return;
          }

          task.isRunning = true;
          task.lastRun = new Date();
          console.log(`Starting scheduled task: ${task.name} at ${new Date().toISOString()}`);
          
          try {
            await task.task();
            console.log(`Completed scheduled task: ${task.name}`);
          } catch (error) {
            console.error(`Error in scheduled task ${task.name}:`, error);
            if (error instanceof Error) {
              console.error(`Error stack: ${error.stack}`);
            }
          } finally {
            task.isRunning = false;
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
          const nextInvocation = scheduledTask.nextInvocation();
          const actualNextRun = nextInvocation ? new Date(nextInvocation) : null;
          
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
        } else {
          console.error(`❌ Failed to schedule task: ${task.name} - cron.schedule returned null/undefined`);
        }
      } catch (error) {
        console.error(`❌ Error scheduling task ${task.name}:`, error);
        console.error(`Cron expression: ${task.cronExpression}`);
        if (error instanceof Error) {
          console.error(`Error message: ${error.message}`);
        }
      }
    });

    console.log(`Automated users scheduler initialized: ${scheduledCount}/${this.tasks.length} tasks scheduled`);
    
    if (scheduledCount < this.tasks.length) {
      console.warn(`⚠️  Some tasks failed to schedule. Check cron expressions and logs above.`);
    }
    
    // Log current UTC time for reference
    console.log(`Current UTC time: ${new Date().toISOString()}`);
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

/**
 * Get the scheduler instance
 */
export function getScheduler(): AutomatedUsersScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new AutomatedUsersScheduler();
  }
  // Auto-initialize if enabled but not yet initialized
  if (schedulerInstance.isEnabled && !isInitialized) {
    schedulerInstance.initialize();
    isInitialized = true;
  }
  return schedulerInstance;
}

/**
 * Initialize the scheduler (call this from server.ts)
 */
export function initializeScheduler(): void {
  const scheduler = getScheduler();
  if (!isInitialized) {
    scheduler.initialize();
    isInitialized = true;
  }
}

