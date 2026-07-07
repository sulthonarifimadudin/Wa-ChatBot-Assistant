import { z } from 'zod';
import type { ITool } from '../base-tool';
import { zodToJsonSchema } from '../base-tool';
import type { ToolResult } from '../../ai/tool-executor';
import { memoryService } from '../../ai/memory.service';

const saveMemorySchema = z.object({
  summary: z.string().describe('Informasi penting yang perlu diingat tentang user'),
  importance: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Tingkat kepentingan (1-10). 10 = sangat penting'),
});

type SaveMemoryInput = z.infer<typeof saveMemorySchema>;

/**
 * Save Memory Tool
 * Allows the LLM to store important facts about the user.
 * This is how the bot "remembers" things across conversations.
 */
export const saveMemoryTool: ITool = {
  name: 'save_memory',
  description:
    'Simpan informasi penting tentang user ke memory. Gunakan saat user memberitahu fakta tentang dirinya (nama, kuliah, hobi, password, preferensi, dll).',
  inputSchema: saveMemorySchema,
  parameters: zodToJsonSchema(saveMemorySchema),

  async execute(input: unknown, userId: string): Promise<ToolResult> {
    const data = input as SaveMemoryInput;

    const memory = await memoryService.createMemory({
      userId,
      summary: data.summary,
      importance: data.importance,
    });

    return {
      success: true,
      data: {
        id: memory.id,
        summary: memory.summary,
        message: 'Informasi berhasil disimpan ke memory',
      },
    };
  },
};
