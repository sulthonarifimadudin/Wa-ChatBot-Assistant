import { prisma } from '../../database/prisma';
import { createLogger } from '../../config/logger';
import type { Reminder, ReminderStatus, Recurrence } from '@prisma/client';

const log = createLogger('reminder-service');

/**
 * Reminder Service
 * Business logic for creating, listing, updating, and deleting reminders.
 * Used by the reminder tools and the scheduler.
 */
export class ReminderService {
  /**
   * Create a new reminder.
   */
  async create(params: {
    userId: string;
    title: string;
    message?: string;
    reminderTime: Date;
    recurrence?: Recurrence;
  }): Promise<Reminder> {
    const reminder = await prisma.reminder.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        reminderTime: params.reminderTime,
        recurrence: params.recurrence || 'NONE',
      },
    });

    log.info(
      { reminderId: reminder.id, userId: params.userId, time: params.reminderTime },
      'Reminder created'
    );

    return reminder;
  }

  /**
   * List reminders for a user, optionally filtered by status.
   */
  async list(userId: string, status?: ReminderStatus | 'ALL'): Promise<Reminder[]> {
    const where: Record<string, unknown> = { userId };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    return prisma.reminder.findMany({
      where,
      orderBy: { reminderTime: 'asc' },
    });
  }

  /**
   * Get a reminder by its position in the user's list (1-indexed).
   * This is how users reference reminders: "hapus reminder nomor 2".
   */
  async getByNumber(userId: string, number: number): Promise<Reminder | null> {
    const reminders = await this.list(userId, 'PENDING');
    const index = number - 1;

    if (index < 0 || index >= reminders.length) {
      return null;
    }

    return reminders[index];
  }

  /**
   * Update a reminder.
   */
  async update(
    reminderId: string,
    data: {
      title?: string;
      message?: string;
      reminderTime?: Date;
      status?: ReminderStatus;
    }
  ): Promise<Reminder> {
    const reminder = await prisma.reminder.update({
      where: { id: reminderId },
      data,
    });

    log.info({ reminderId }, 'Reminder updated');
    return reminder;
  }

  /**
   * Delete a reminder.
   */
  async delete(reminderId: string): Promise<void> {
    await prisma.reminder.delete({ where: { id: reminderId } });
    log.info({ reminderId }, 'Reminder deleted');
  }

  /**
   * Get all pending reminders that are due (reminderTime <= now).
   * Used by the scheduler.
   */
  async getDueReminders(): Promise<(Reminder & { user: { whatsappNumber: string } })[]> {
    return prisma.reminder.findMany({
      where: {
        status: 'PENDING',
        reminderTime: { lte: new Date() },
      },
      include: {
        user: {
          select: { whatsappNumber: true },
        },
      },
      orderBy: { reminderTime: 'asc' },
    });
  }

  /**
   * Mark a reminder as sent.
   */
  async markAsSent(reminderId: string): Promise<void> {
    await prisma.reminder.update({
      where: { id: reminderId },
      data: { status: 'SENT' },
    });
  }

  /**
   * Create the next occurrence of a recurring reminder.
   */
  async createNextOccurrence(reminder: Reminder): Promise<Reminder | null> {
    if (reminder.recurrence === 'NONE') return null;

    const nextTime = new Date(reminder.reminderTime);

    switch (reminder.recurrence) {
      case 'DAILY':
        nextTime.setDate(nextTime.getDate() + 1);
        break;
      case 'WEEKLY':
        nextTime.setDate(nextTime.getDate() + 7);
        break;
      case 'MONTHLY':
        nextTime.setMonth(nextTime.getMonth() + 1);
        break;
    }

    return this.create({
      userId: reminder.userId,
      title: reminder.title,
      message: reminder.message || undefined,
      reminderTime: nextTime,
      recurrence: reminder.recurrence,
    });
  }
}

export const reminderService = new ReminderService();
