import { z } from 'zod';
import type { ITool } from '../base-tool';
import { zodToJsonSchema } from '../base-tool';
import type { ToolResult } from '../../ai/tool-executor';
import { voiceService } from './voice.service';

const voiceSchema = z.object({
  audioPath: z.string().describe('Path ke file audio voice note'),
});

type VoiceInput = z.infer<typeof voiceSchema>;

/**
 * Voice Transcription Tool
 * Converts voice notes to text.
 */
export const voiceTool: ITool = {
  name: 'transcribe_voice',
  description: 'Transkripsi voice note menjadi teks. Dipanggil otomatis saat user mengirim voice note.',
  inputSchema: voiceSchema,
  parameters: zodToJsonSchema(voiceSchema),

  async execute(input: unknown): Promise<ToolResult> {
    const data = input as VoiceInput;

    try {
      const text = await voiceService.transcribe(data.audioPath);

      return {
        success: true,
        data: {
          transcription: text,
          message: 'Voice note berhasil ditranskripsi',
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Gagal transkripsi voice note: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
