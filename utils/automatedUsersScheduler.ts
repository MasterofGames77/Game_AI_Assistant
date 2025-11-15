import cron from 'node-cron';
import { askQuestion, createForumPost, getUserPreferences } from './automatedUsersService';
import { ScheduledTask } from '../types';

class AutomatedUsersScheduler {
  private tasks: ScheduledTask[] = [];
  public isEnabled: boolean; // Made public so getScheduler can check it

  constructor() {
    this.isEnabled = process.env.AUTOMATED_USERS_ENABLED === 'true';
  }

  /**
   * Initialize and start all scheduled tasks
   */
  public initialize(): void {
    if (!this.isEnabled) {
      console.log('Automated users scheduler is disabled');
      return;
    }

    console.log('Initializing automated users scheduler...');

    // MysteriousMrEnter: Question at 10:20 AM EST (15:20 UTC)
    // Note: EST is UTC-5, but we need to handle EDT (UTC-4) during daylight saving
    // For simplicity, using UTC times. Adjust for DST if needed.
    this.addTask({
      name: 'MysteriousMrEnter-Question',
      cronExpression: process.env.AUTOMATED_USERS_MYSTERIOUS_QUESTION || '20 15 * * *', // 10:20 AM EST
      isRunning: false,
      task: async () => {
        await this.executeQuestion('MysteriousMrEnter');
      }
    });

    // MysteriousMrEnter: Forum Post at 1:30 PM EST (18:30 UTC)
    this.addTask({
      name: 'MysteriousMrEnter-ForumPost',
      cronExpression: process.env.AUTOMATED_USERS_MYSTERIOUS_POST || '30 18 * * *', // 1:30 PM EST
      isRunning: false,
      task: async () => {
        await this.executeForumPost('MysteriousMrEnter');
      }
    });

    // WaywardJammer: Question at 11:10 AM EST (16:10 UTC)
    this.addTask({
      name: 'WaywardJammer-Question',
      cronExpression: process.env.AUTOMATED_USERS_WAYWARD_QUESTION || '10 16 * * *', // 11:10 AM EST
      isRunning: false,
      task: async () => {
        await this.executeQuestion('WaywardJammer');
      }
    });

    // WaywardJammer: Forum Post at 3:45 PM EST (20:45 UTC)
    this.addTask({
      name: 'WaywardJammer-ForumPost',
      cronExpression: process.env.AUTOMATED_USERS_WAYWARD_POST || '45 20 * * *', // 3:45 PM EST
      isRunning: false,
      task: async () => {
        await this.executeForumPost('WaywardJammer');
      }
    });

    // Start all tasks
    this.tasks.forEach(task => {
      cron.schedule(task.cronExpression, async () => {
        if (task.isRunning) {
          console.log(`Task ${task.name} is already running, skipping...`);
          return;
        }

        task.isRunning = true;
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
    });

    console.log(`Automated users scheduler initialized with ${this.tasks.length} tasks`);
  }

  /**
   * Add a scheduled task
   */
  private addTask(task: ScheduledTask): void {
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
    }>;
  } {
    return {
      enabled: this.isEnabled,
      tasks: this.tasks.map(task => ({
        name: task.name,
        cronExpression: task.cronExpression,
        isRunning: task.isRunning
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

