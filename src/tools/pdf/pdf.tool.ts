import { z } from 'zod';
import type { ITool } from '../base-tool';
import { zodToJsonSchema } from '../base-tool';
import type { ToolResult } from '../../ai/tool-executor';
import { pdfService } from './pdf.service';

const pdfSchema = z.object({
  pdfPath: z.string().describe('Path ke file PDF yang akan diringkas'),
});

type PdfInput = z.infer<typeof pdfSchema>;

/**
 * PDF Summarization Tool
 * Reads and summarizes PDF documents.
 */
export const summarizePdfTool: ITool = {
  name: 'summarize_pdf',
  description: 'Baca dan ringkas isi dokumen PDF. Dipanggil otomatis saat user mengirim file PDF.',
  inputSchema: pdfSchema,
  parameters: zodToJsonSchema(pdfSchema),

  async execute(input: unknown): Promise<ToolResult> {
    const data = input as PdfInput;

    try {
      const { summary } = await pdfService.summarize(data.pdfPath);

      return {
        success: true,
        data: {
          summary,
          message: 'PDF berhasil diringkas',
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Gagal membaca PDF: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
