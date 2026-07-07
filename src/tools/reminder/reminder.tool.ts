import { z } from 'zod';
import type { ITool } from '../base-tool';
import { zodToJsonSchema } from '../base-tool';
import type { ToolResult } from '../../ai/tool-executor';
import { reminderService } from './reminder.service';
import {
  createReminderSchema,
  listRemindersSchema,
  updateReminderSchema,
  deleteReminderSchema,
  type CreateReminderInput,
  type ListRemindersInput,
  type UpdateReminderInput,
  type DeleteReminderInput,
} from './reminder.schema';

// ─────────────────────────────────────────────
// Create Reminder Tool
// ─────────────────────────────────────────────
export const createReminderTool: ITool = {
  name: 'create_reminder',
  description: 'Buat reminder/pengingat baru. Gunakan saat user meminta diingatkan sesuatu pada waktu tertentu.',
  inputSchema: createReminderSchema,
  parameters: zodToJsonSchema(createReminderSchema),

  async execute(input: unknown, userId: string): Promise<ToolResult> {
    const data = input as CreateReminderInput;

    const reminderTime = new Date(data.reminderTime);

    if (isNaN(reminderTime.getTime())) {
      return { success: false, data: null, error: 'Format waktu tidak valid' };
    }

    if (reminderTime <= new Date()) {
      return { success: false, data: null, error: 'Waktu reminder harus di masa depan' };
    }

    const reminder = await reminderService.create({
      userId,
      title: data.title,
      message: data.message,
      reminderTime,
      recurrence: data.recurrence as 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY',
    });

    return {
      success: true,
      data: {
        id: reminder.id,
        title: reminder.title,
        reminderTime: reminder.reminderTime.toISOString(),
        recurrence: reminder.recurrence,
        message: `Reminder "${reminder.title}" berhasil dibuat untuk ${reminder.reminderTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
      },
    };
  },
};

// ─────────────────────────────────────────────
// List Reminders Tool
// ─────────────────────────────────────────────
export const listRemindersTool: ITool = {
  name: 'list_reminders',
  description: 'Tampilkan daftar reminder user. Gunakan saat user bertanya tentang reminder mereka.',
  inputSchema: listRemindersSchema,
  parameters: zodToJsonSchema(listRemindersSchema as z.ZodObject<z.ZodRawShape>),

  async execute(input: unknown, userId: string): Promise<ToolResult> {
    const data = input as ListRemindersInput;
    const statusFilter = data.status === 'ALL' ? 'ALL' : (data.status as 'PENDING' | 'SENT' | 'CANCELLED');
    const reminders = await reminderService.list(userId, statusFilter);

    if (reminders.length === 0) {
      return {
        success: true,
        data: { reminders: [], message: 'Tidak ada reminder.' },
      };
    }

    const formattedReminders = reminders.map((r, i) => ({
      number: i + 1,
      title: r.title,
      time: r.reminderTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      status: r.status,
      recurrence: r.recurrence,
    }));

    return {
      success: true,
      data: {
        reminders: formattedReminders,
        total: reminders.length,
      },
    };
  },
};

// ─────────────────────────────────────────────
// Update Reminder Tool
// ─────────────────────────────────────────────
export const updateReminderTool: ITool = {
  name: 'update_reminder',
  description: 'Update reminder yang sudah ada. User mereferensikan reminder berdasarkan nomornya.',
  inputSchema: updateReminderSchema,
  parameters: zodToJsonSchema(updateReminderSchema),

  async execute(input: unknown, userId: string): Promise<ToolResult> {
    const data = input as UpdateReminderInput;
    const reminder = await reminderService.getByNumber(userId, data.reminderNumber);

    if (!reminder) {
      return {
        success: false,
        data: null,
        error: `Reminder nomor ${data.reminderNumber} tidak ditemukan`,
      };
    }

    const updateData: Record<string, unknown> = {};
    if (data.title) updateData.title = data.title;
    if (data.message) updateData.message = data.message;
    if (data.reminderTime) updateData.reminderTime = new Date(data.reminderTime);
    if (data.status) updateData.status = data.status;

    const updated = await reminderService.update(reminder.id, updateData as {
      title?: string;
      message?: string;
      reminderTime?: Date;
      status?: 'PENDING' | 'CANCELLED';
    });

    return {
      success: true,
      data: {
        title: updated.title,
        time: updated.reminderTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        message: `Reminder "${updated.title}" berhasil diupdate`,
      },
    };
  },
};

// ─────────────────────────────────────────────
// Delete Reminder Tool
// ─────────────────────────────────────────────
export const deleteReminderTool: ITool = {
  name: 'delete_reminder',
  description: 'Hapus reminder. User mereferensikan reminder berdasarkan nomornya dari daftar.',
  inputSchema: deleteReminderSchema,
  parameters: zodToJsonSchema(deleteReminderSchema),

  async execute(input: unknown, userId: string): Promise<ToolResult> {
    const data = input as DeleteReminderInput;
    const reminder = await reminderService.getByNumber(userId, data.reminderNumber);

    if (!reminder) {
      return {
        success: false,
        data: null,
        error: `Reminder nomor ${data.reminderNumber} tidak ditemukan`,
      };
    }

    await reminderService.delete(reminder.id);

    return {
      success: true,
      data: {
        message: `Reminder "${reminder.title}" berhasil dihapus`,
      },
    };
  },
};
