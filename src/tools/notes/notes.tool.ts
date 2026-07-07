import { z } from 'zod';
import type { ITool } from '../base-tool';
import { zodToJsonSchema } from '../base-tool';
import type { ToolResult } from '../../ai/tool-executor';
import { notesService } from './notes.service';
import {
  createNoteSchema,
  listNotesSchema,
  deleteNoteSchema,
  type CreateNoteInput,
  type ListNotesInput,
  type DeleteNoteInput,
} from './notes.schema';

// ─────────────────────────────────────────────
// Create Note Tool
// ─────────────────────────────────────────────
export const createNoteTool: ITool = {
  name: 'create_note',
  description: 'Buat catatan baru. Gunakan saat user meminta untuk mencatat atau menyimpan informasi.',
  inputSchema: createNoteSchema,
  parameters: zodToJsonSchema(createNoteSchema),

  async execute(input: unknown, userId: string): Promise<ToolResult> {
    const data = input as CreateNoteInput;

    const note = await notesService.create({
      userId,
      title: data.title,
      content: data.content,
      tags: data.tags,
    });

    return {
      success: true,
      data: {
        id: note.id,
        title: note.title,
        message: `Catatan "${note.title}" berhasil disimpan`,
      },
    };
  },
};

// ─────────────────────────────────────────────
// List Notes Tool
// ─────────────────────────────────────────────
export const listNotesTool: ITool = {
  name: 'list_notes',
  description: 'Tampilkan daftar catatan user. Gunakan saat user ingin melihat catatan mereka.',
  inputSchema: listNotesSchema,
  parameters: zodToJsonSchema(listNotesSchema as z.ZodObject<z.ZodRawShape>),

  async execute(input: unknown, userId: string): Promise<ToolResult> {
    const data = input as ListNotesInput;
    const notes = await notesService.list(userId, data.tag);

    if (notes.length === 0) {
      return {
        success: true,
        data: { notes: [], message: 'Tidak ada catatan.' },
      };
    }

    const formattedNotes = notes.map((n, i) => ({
      number: i + 1,
      title: n.title,
      content: n.content,
      tags: n.tags,
      createdAt: n.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    }));

    return {
      success: true,
      data: {
        notes: formattedNotes,
        total: notes.length,
      },
    };
  },
};

// ─────────────────────────────────────────────
// Delete Note Tool
// ─────────────────────────────────────────────
export const deleteNoteTool: ITool = {
  name: 'delete_note',
  description: 'Hapus catatan. User mereferensikan catatan berdasarkan nomornya.',
  inputSchema: deleteNoteSchema,
  parameters: zodToJsonSchema(deleteNoteSchema),

  async execute(input: unknown, userId: string): Promise<ToolResult> {
    const data = input as DeleteNoteInput;
    const note = await notesService.getByNumber(userId, data.noteNumber);

    if (!note) {
      return {
        success: false,
        data: null,
        error: `Catatan nomor ${data.noteNumber} tidak ditemukan`,
      };
    }

    await notesService.delete(note.id);

    return {
      success: true,
      data: {
        message: `Catatan "${note.title}" berhasil dihapus`,
      },
    };
  },
};
