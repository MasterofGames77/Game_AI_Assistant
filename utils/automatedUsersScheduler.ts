import cron from 'node-cron';
import { askQuestion, createForumPost, getUserPreferences } from './automatedUsersService';
import { CronTask } from '../types';

class AutomatedUsersScheduler {
  private tasks: CronTask[] = [];
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

    console.log('Initializing automated users scheduler...');
    console.log(`Scheduler enabled: ${this.isEnabled}`);

    // MysteriousMrEnter: Question at 10:20 AM EST (15:20 UTC)
    // Note: EST is UTC-5, but we need to handle EDT (UTC-4) during daylight saving
    // For simplicity, using UTC times. Adjust for DST if needed.
    this.addTask({
      name: 'MysteriousMrEnter-Question',
      cronExpression: this.cleanCronExpression(
        process.env.AUTOMATED_USERS_MYSTERIOUS_QUESTION,
        '20 15 * * *'
      ), // 10:20 AM EST
      isRunning: false,
      task: async () => {
        await this.executeQuestion('MysteriousMrEnter');
      }
    });

    // MysteriousMrEnter: Forum Post at 1:30 PM EST (18:30 UTC)
    this.addTask({
      name: 'MysteriousMrEnter-ForumPost',
      cronExpression: this.cleanCronExpression(
        process.env.AUTOMATED_USERS_MYSTERIOUS_POST,
        '30 18 * * *'
      ), // 1:30 PM EST
      isRunning: false,
      task: async () => {
        await this.executeForumPost('MysteriousMrEnter');
      }
    });

    // WaywardJammer: Question at 11:10 AM EST (16:10 UTC)
    this.addTask({
      name: 'WaywardJammer-Question',
      cronExpression: this.cleanCronExpression(
        process.env.AUTOMATED_USERS_WAYWARD_QUESTION,
        '10 16 * * *'
      ), // 11:10 AM EST
      isRunning: false,
      task: async () => {
        await this.executeQuestion('WaywardJammer');
      }
    });

    // WaywardJammer: Forum Post at 3:45 PM EST (20:45 UTC)
    this.addTask({
      name: 'WaywardJammer-ForumPost',
      cronExpression: this.cleanCronExpression(
        process.env.AUTOMATED_USERS_WAYWARD_POST,
        '45 20 * * *'
      ), // 3:45 PM EST
      isRunning: false,
      task: async () => {
        await this.executeForumPost('WaywardJammer');
      }
    });

    // Start all tasks
    let scheduledCount = 0;
    this.tasks.forEach(task => {
      try {
        // node-cron will throw an error if the expression is invalid
        const scheduledTask = cron.schedule(task.cronExpression, async () => {
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
          } finally {
            task.isRunning = false;
          }
        }, {
          timezone: 'UTC' // Cron uses UTC, times are already converted
        });

        if (scheduledTask) {
          // Store the cron task object so we can verify it's running
          task.cronTask = scheduledTask;
          scheduledCount++;
          
          // Calculate next run time
          const nextRun = this.calculateNextRun(task.cronExpression);
          task.nextRun = nextRun || undefined;
          
          console.log(`✅ Scheduled task: ${task.name} with cron: ${task.cronExpression}`);
          if (task.nextRun) {
            console.log(`   Next run: ${task.nextRun.toISOString()}`);
          }
        } else {
          console.error(`❌ Failed to schedule task: ${task.name}`);
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
    }>;
  } {
    return {
      enabled: this.isEnabled,
      tasks: this.tasks.map(task => ({
        name: task.name,
        cronExpression: task.cronExpression,
        isRunning: task.isRunning,
        nextRun: task.nextRun ? task.nextRun.toISOString() : undefined,
        lastRun: task.lastRun ? task.lastRun.toISOString() : undefined,
        isScheduled: !!task.cronTask
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

