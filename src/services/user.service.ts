import { prisma } from '../database/prisma';
import { createLogger } from '../config/logger';
import type { User } from '@prisma/client';

const log = createLogger('user-service');

/**
 * User Service
 * Handles user lookup and creation. Each WhatsApp number maps to exactly one user.
 * All data (memory, reminders, notes) is isolated per user.
 */
export class UserService {
  /**
   * Find an existing user or create a new one by WhatsApp number.
   * Called on every incoming message to ensure the user exists.
   */
  async findOrCreate(whatsappNumber: string, displayName?: string): Promise<User> {
    const existing = await prisma.user.findUnique({
      where: { whatsappNumber },
    });

    if (existing) {
      // Update display name if it changed
      if (displayName && displayName !== existing.displayName) {
        return prisma.user.update({
          where: { id: existing.id },
          data: { displayName },
        });
      }
      return existing;
    }

    const user = await prisma.user.create({
      data: {
        whatsappNumber,
        displayName: displayName || undefined,
      },
    });

    log.info({ userId: user.id, whatsappNumber }, 'New user created');
    return user;
  }

  /**
   * Get user by ID.
   */
  async getById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  /**
   * Get user by WhatsApp number.
   */
  async getByPhoneNumber(whatsappNumber: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { whatsappNumber } });
  }
}

export const userService = new UserService();
