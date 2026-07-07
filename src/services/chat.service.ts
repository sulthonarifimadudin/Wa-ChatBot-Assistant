import { prisma } from '../database/prisma';
import { createLogger } from '../config/logger';
import type { ChatMessage, Role, MessageType } from '@prisma/client';

const log = createLogger('chat-service');

/**
 * Chat Service
 * Manages conversation history storage and retrieval.
 * Used for building LLM context and conversation memory.
 */
export class ChatService {
  /**
   * Save a new chat message to the database.
   */
  async saveMessage(params: {
    userId: string;
    role: Role;
    content: string;
    messageType?: MessageType;
  }): Promise<ChatMessage> {
    const message = await prisma.chatMessage.create({
      data: {
        userId: params.userId,
        role: params.role,
        content: params.content,
        messageType: params.messageType || 'TEXT',
      },
    });

    log.debug(
      { messageId: message.id, userId: params.userId, role: params.role },
      'Message saved'
    );

    return message;
  }

  /**
   * Get the most recent N messages for a user.
   * Used to build short-term context for the LLM.
   */
  async getRecentHistory(userId: string, limit: number = 20): Promise<ChatMessage[]> {
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Return in chronological order (oldest first)
    return messages.reverse();
  }

  /**
   * Count total messages for a user.
   */
  async countMessages(userId: string): Promise<number> {
    return prisma.chatMessage.count({ where: { userId } });
  }

  /**
   * Delete old messages beyond a threshold to save storage.
   * Keeps the most recent `keepCount` messages.
   */
  async pruneOldMessages(userId: string, keepCount: number = 100): Promise<number> {
    const totalCount = await this.countMessages(userId);

    if (totalCount <= keepCount) return 0;

    const messagesToDelete = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: totalCount - keepCount,
      select: { id: true },
    });

    const ids = messagesToDelete.map((m) => m.id);

    const result = await prisma.chatMessage.deleteMany({
      where: { id: { in: ids } },
    });

    log.info({ userId, deletedCount: result.count }, 'Pruned old messages');
    return result.count;
  }
}

export const chatService = new ChatService();
