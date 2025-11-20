import type { NextApiRequest, NextApiResponse } from 'next';
import { getScheduler } from '../../../utils/automatedUsersScheduler';

/**
 * GET /api/automated-users/diagnostics
 * 
 * Returns diagnostic information about the cron scheduler
 * 
 * Response includes:
 * - Current UTC time
 * - Whether scheduler is enabled
 * - Task status
 * - Next scheduled runs
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const scheduler = getScheduler();
    const status = scheduler.getStatus();
    const now = new Date();
    const utcNow = new Date(now.toISOString());

    // Check if any tasks should have run by now
    const overdueTasks = status.tasks
      .filter(task => {
        if (!task.nextRun) return false;
        const nextRunDate = new Date(task.nextRun);
        return nextRunDate < utcNow && !task.isRunning;
      })
      .map(task => ({
        name: task.name,
        nextRun: task.nextRun,
        lastRun: task.lastRun,
        isScheduled: task.isScheduled,
        overdueBy: Math.floor((utcNow.getTime() - new Date(task.nextRun!).getTime()) / 1000 / 60) + ' minutes'
      }));

    return res.status(200).json({
      success: true,
      diagnostics: {
        currentTime: {
          local: now.toISOString(),
          utc: utcNow.toISOString(),
          utcString: utcNow.toUTCString()
        },
        scheduler: {
          enabled: status.enabled,
          totalTasks: status.tasks.length,
          scheduledTasks: status.tasks.filter(t => t.isScheduled).length,
          runningTasks: status.tasks.filter(t => t.isRunning).length
        },
        tasks: status.tasks.map(task => ({
          name: task.name,
          cronExpression: task.cronExpression,
          isScheduled: task.isScheduled,
          isRunning: task.isRunning,
          nextRun: task.nextRun,
          lastRun: task.lastRun,
          taskType: task.taskType,
          description: task.description,
          shouldHaveRun: task.nextRun ? new Date(task.nextRun) < utcNow : false
        })),
        overdueTasks,
        recommendations: [
          ...(overdueTasks.length > 0 ? [
            `⚠️ ${overdueTasks.length} task(s) should have run but haven't. Check server logs for [CRON TRIGGER] messages.`
          ] : []),
          ...(!status.enabled ? [
            '❌ Scheduler is disabled. Set AUTOMATED_USERS_ENABLED=true'
          ] : []),
          ...(status.tasks.some(t => !t.isScheduled) ? [
            '⚠️ Some tasks are not scheduled. Check cron expressions.'
          ] : []),
          '💡 Check server logs for [CRON HEARTBEAT] messages every 5 minutes to verify cron is running.',
          '💡 Use POST /api/automated-users/trigger to manually test tasks.'
        ]
      }
    });
  } catch (error) {
    console.error('Error getting diagnostics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get diagnostics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

