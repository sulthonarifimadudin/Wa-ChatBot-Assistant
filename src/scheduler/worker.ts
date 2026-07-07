import { createLogger } from '../config/logger';
import { startReminderScheduler, stopReminderScheduler } from './reminder-scheduler';

const log = createLogger('scheduler-worker');

/**
 * Scheduler Worker
 * Initializes and manages all background scheduled tasks.
 * Currently runs the reminder scheduler.
 * Add new schedulers here as needed.
 */
export function startSchedulers(): void {
  log.info('Starting all schedulers...');

  // Start the reminder checker
  startReminderScheduler();

  log.info('✅ All schedulers started');
}

/**
 * Stop all schedulers gracefully.
 */
export function stopSchedulers(): void {
  log.info('Stopping all schedulers...');

  stopReminderScheduler();

  log.info('All schedulers stopped');
}
