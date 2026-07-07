import { prisma } from '../../database/prisma';
import { createLogger } from '../../config/logger';
import type { Note } from '@prisma/client';

const log = createLogger('notes-service');

/**
 * Notes Service
 * Business logic for creating, listing, and deleting user notes.
 */
export class NotesService {
  /**
   * Create a new note.
   */
  async create(params: {
    userId: string;
    title: string;
    content: string;
    tags?: string[];
  }): Promise<Note> {
    const note = await prisma.note.create({
      data: {
        userId: params.userId,
        title: params.title,
        content: params.content,
        tags: params.tags || [],
      },
    });

    log.info({ noteId: note.id, userId: params.userId }, 'Note created');
    return note;
  }

  /**
   * List all notes for a user, optionally filtered by tag.
   */
  async list(userId: string, tag?: string): Promise<Note[]> {
    const where: Record<string, unknown> = { userId };

    if (tag) {
      where.tags = { has: tag };
    }

    return prisma.note.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a note by its position in the user's list (1-indexed).
   */
  async getByNumber(userId: string, number: number): Promise<Note | null> {
    const notes = await this.list(userId);
    const index = number - 1;

    if (index < 0 || index >= notes.length) {
      return null;
    }

    return notes[index];
  }

  /**
   * Delete a note.
   */
  async delete(noteId: string): Promise<void> {
    await prisma.note.delete({ where: { id: noteId } });
    log.info({ noteId }, 'Note deleted');
  }
}

export const notesService = new NotesService();
