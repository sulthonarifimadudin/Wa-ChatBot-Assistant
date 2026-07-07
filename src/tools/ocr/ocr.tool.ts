import { z } from 'zod';
import type { ITool } from '../base-tool';
import { zodToJsonSchema } from '../base-tool';
import type { ToolResult } from '../../ai/tool-executor';
import { ocrService } from './ocr.service';

const ocrSchema = z.object({
  imagePath: z.string().describe('Path ke file gambar yang akan di-OCR'),
});

type OcrInput = z.infer<typeof ocrSchema>;

/**
 * OCR Tool
 * Extracts text from images. Called automatically when a user sends an image.
 */
export const ocrTool: ITool = {
  name: 'ocr',
  description: 'Baca dan ekstrak teks dari gambar menggunakan OCR. Dipanggil otomatis saat user mengirim gambar.',
  inputSchema: ocrSchema,
  parameters: zodToJsonSchema(ocrSchema),

  async execute(input: unknown): Promise<ToolResult> {
    const data = input as OcrInput;

    try {
      const text = await ocrService.extractText(data.imagePath);

      return {
        success: true,
        data: {
          extractedText: text,
          message: `Teks berhasil diekstrak dari gambar`,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Gagal membaca gambar: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
