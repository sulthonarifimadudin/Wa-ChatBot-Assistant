import * as cron from 'node-cron';
import { createLogger } from '../config/logger';
import { env } from '../config/env';
import { reminderService } from '../tools/reminder/reminder.service';
import { sendText, phoneToJid } from '../whatsapp/sender';

const log = createLogger('reminder-scheduler');

let schedulerTask: cron.ScheduledTask | null = null;

/**
 * Reminder Scheduler
 * Runs a cron job that checks for due reminders and sends
 * WhatsApp messages automatically.
 *
 * Flow:
 * 1. Cron fires every N seconds
 * 2. Query database for PENDING reminders where time <= now
 * 3. For each due reminder:
 *    a. Send WhatsApp message to the user
 *    b. Mark reminder as SENT
 *    c. If recurring, create the next occurrence
 */
export function startReminderScheduler(): void {
  const intervalSeconds = env.REMINDER_CHECK_INTERVAL_SECONDS;

  // node-cron uses cron syntax — we convert seconds to the closest cron expression
  // For intervals < 60s, we use a workaround with setInterval
  if (intervalSeconds < 60) {
    log.info(
      { intervalSeconds },
      '⏰ Starting reminder scheduler (interval mode)'
    );

    const intervalId = setInterval(checkDueReminders, intervalSeconds * 1000);

    // Store cleanup reference
    schedulerTask = {
      stop: () => clearInterval(intervalId),
    } as unknown as cron.ScheduledTask;
  } else {
    // Convert to cron expression (every N minutes)
    const minutes = Math.max(1, Math.floor(intervalSeconds / 60));
    const cronExpression = `*/${minutes} * * * *`;

    log.info(
      { cronExpression, intervalSeconds },
      '⏰ Starting reminder scheduler (cron mode)'
    );

    schedulerTask = cron.schedule(cronExpression, checkDueReminders);
  }
}

import { prisma } from '../database/prisma';

/**
 * Check for and process due reminders.
 */
async function checkDueReminders(): Promise<void> {
  try {
    // DEBUG: Log all pending reminders to see what's in the database
    const allPending = await prisma.reminder.findMany({ where: { status: 'PENDING' } });
    log.info(
      { 
        now: new Date().toISOString(), 
        pendingCount: allPending.length,
        pendingTimes: allPending.map(r => r.reminderTime.toISOString()) 
      }, 
      'Scheduler tick'
    );

    const dueReminders = await reminderService.getDueReminders();

    if (dueReminders.length === 0) return;

    log.info({ count: dueReminders.length }, 'Processing due reminders');

    for (const reminder of dueReminders) {
      try {
        const jid = phoneToJid(reminder.user.whatsappNumber);

        // Format the reminder message
        const message = formatReminderMessage(
          reminder.title,
          reminder.message
        );

        // Send WhatsApp message
        await sendText(jid, message);

        // Mark as sent
        await reminderService.markAsSent(reminder.id);

        // Create next occurrence for recurring reminders
        if (reminder.recurrence !== 'NONE') {
          await reminderService.createNextOccurrence(reminder);
          log.info(
            { reminderId: reminder.id, recurrence: reminder.recurrence },
            'Created next recurring reminder'
          );
        }

        log.info(
          {
            reminderId: reminder.id,
            userId: reminder.userId,
            title: reminder.title,
          },
          'Reminder sent'
        );
      } catch (error) {
        log.error(
          { error, reminderId: reminder.id },
          'Failed to process reminder'
        );
      }
    }
  } catch (error) {
    log.error({ error }, 'Error checking due reminders');
  }
}

/**
 * Format a reminder notification message.
 */
function formatReminderMessage(title: string, details?: string | null): string {
  let message = `⏰ *REMINDER*\n\n`;
  message += `📌 ${title}`;

  if (details) {
    message += `\n\n${details}`;
  }

  message += `\n\n_Reminder ini dibuat oleh AI Assistant kamu._`;
  return message;
}

/**
 * Stop the scheduler gracefully.
 */
export function stopReminderScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    log.info('Reminder scheduler stopped');
  }
}
