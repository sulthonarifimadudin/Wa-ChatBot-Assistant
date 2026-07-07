import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().describe('Judul catatan'),
  content: z.string().describe('Isi catatan'),
  tags: z.array(z.string()).default([]).describe('Tag/label untuk catatan (opsional)'),
});

export const listNotesSchema = z.object({
  tag: z.string().optional().describe('Filter berdasarkan tag (opsional)'),
});

export const deleteNoteSchema = z.object({
  noteNumber: z.number().int().positive().describe('Nomor urut catatan yang akan dihapus'),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type ListNotesInput = z.infer<typeof listNotesSchema>;
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;
