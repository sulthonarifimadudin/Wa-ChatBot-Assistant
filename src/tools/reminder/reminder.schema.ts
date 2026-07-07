import { z } from 'zod';

/**
 * Zod schemas for Reminder tool inputs.
 */
export const createReminderSchema = z.object({
  title: z.string().describe('Judul atau deskripsi singkat reminder'),
  message: z.string().optional().describe('Pesan detail untuk reminder (opsional)'),
  reminderTime: z.string().describe('Waktu reminder dalam format ISO 8601 (contoh: 2024-12-25T09:00:00+07:00)'),
  recurrence: z
    .enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'])
    .default('NONE')
    .describe('Pengulangan reminder'),
});

export const listRemindersSchema = z.object({
  status: z
    .enum(['PENDING', 'SENT', 'CANCELLED', 'ALL'])
    .default('PENDING')
    .describe('Filter berdasarkan status reminder'),
});

export const updateReminderSchema = z.object({
  reminderNumber: z.number().int().positive().describe('Nomor urut reminder (dari daftar reminder)'),
  title: z.string().optional().describe('Judul baru (opsional)'),
  message: z.string().optional().describe('Pesan baru (opsional)'),
  reminderTime: z.string().optional().describe('Waktu baru dalam format ISO 8601 (opsional)'),
  status: z.enum(['PENDING', 'CANCELLED']).optional().describe('Status baru (opsional)'),
});

export const deleteReminderSchema = z.object({
  reminderNumber: z.number().int().positive().describe('Nomor urut reminder yang akan dihapus (dari daftar reminder)'),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type ListRemindersInput = z.infer<typeof listRemindersSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
export type DeleteReminderInput = z.infer<typeof deleteReminderSchema>;
