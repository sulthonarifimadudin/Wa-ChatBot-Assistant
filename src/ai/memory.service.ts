import { prisma } from '../database/prisma';
import { createLogger } from '../config/logger';
import type { Memory } from '@prisma/client';

const log = createLogger('memory-service');

/**
 * Memory Service
 * Manages long-term memory for users. Memories are summarized facts
 * extracted from conversations — NOT full chat history.
 *
 * Example memories:
 *  - "User is a student at Telkom University"
 *  - "User's WiFi password is abc123"
 *  - "User has a meeting with Prof. Andi on Tuesdays"
 */
export class MemoryService {
  /**
   * Get all memories for a user, ordered by importance (high first).
   */
  async getMemories(userId: string, limit: number = 20): Promise<Memory[]> {
    return prisma.memory.findMany({
      where: { userId },
      orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });
  }

  /**
   * Create a new memory entry.
   */
  async createMemory(params: {
    userId: string;
    summary: string;
    importance?: number;
  }): Promise<Memory> {
    const memory = await prisma.memory.create({
      data: {
        userId: params.userId,
        summary: params.summary,
        importance: params.importance ?? 5,
      },
    });

    log.info({ memoryId: memory.id, userId: params.userId }, 'Memory created');
    return memory;
  }

  /**
   * Update an existing memory's summary or importance.
   */
  async updateMemory(
    memoryId: string,
    data: { summary?: string; importance?: number }
  ): Promise<Memory> {
    return prisma.memory.update({
      where: { id: memoryId },
      data,
    });
  }

  /**
   * Delete a memory by ID.
   */
  async deleteMemory(memoryId: string): Promise<void> {
    await prisma.memory.delete({ where: { id: memoryId } });
  }

  /**
   * Build a memory context string to inject into the system prompt.
   * This is what makes the AI "remember" things about the user.
   */
  async buildMemoryContext(userId: string): Promise<string> {
    const memories = await this.getMemories(userId);

    if (memories.length === 0) {
      return '';
    }

    const memoryLines = memories
      .map((m, i) => `${i + 1}. ${m.summary}`)
      .join('\n');

    return `\n## Hal yang kamu ingat tentang user ini:\n${memoryLines}\n`;
  }

  /**
   * Prune low-importance memories when count exceeds threshold.
   */
  async pruneMemories(userId: string, maxCount: number = 50): Promise<number> {
    const count = await prisma.memory.count({ where: { userId } });

    if (count <= maxCount) return 0;

    const toDelete = await prisma.memory.findMany({
      where: { userId },
      orderBy: { importance: 'asc' },
      take: count - maxCount,
      select: { id: true },
    });

    const result = await prisma.memory.deleteMany({
      where: { id: { in: toDelete.map((m) => m.id) } },
    });

    log.info({ userId, deletedCount: result.count }, 'Pruned low-importance memories');
    return result.count;
  }
}

export const memoryService = new MemoryService();
