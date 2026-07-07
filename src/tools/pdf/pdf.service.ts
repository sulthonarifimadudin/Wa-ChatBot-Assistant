import * as fs from 'fs';
import { createLogger } from '../../config/logger';
import { openRouterService } from '../../ai/openrouter.service';

const log = createLogger('pdf-service');

/**
 * PDF Service
 * Extracts text from PDF files and summarizes them using the LLM.
 */
export class PdfService {
  /**
   * Extract text content from a PDF file.
   */
  async extractText(pdfPath: string): Promise<string> {
    log.debug({ pdfPath }, 'Extracting text from PDF');

    const pdfParse = (await import('pdf-parse')).default;
    const buffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(buffer);

    log.info(
      { pdfPath, pages: data.numpages, textLength: data.text.length },
      'PDF text extracted'
    );

    return data.text;
  }

  /**
   * Extract text and generate an AI summary of the PDF.
   */
  async summarize(pdfPath: string): Promise<{ text: string; summary: string }> {
    const text = await this.extractText(pdfPath);

    // Truncate very long PDFs to avoid exceeding token limits
    const maxChars = 10000;
    const truncatedText = text.length > maxChars
      ? text.substring(0, maxChars) + '\n\n... (teks dipotong karena terlalu panjang)'
      : text;

    const summary = await openRouterService.simpleChat(
      'Kamu adalah asisten yang ahli meringkas dokumen. Buat ringkasan yang jelas dan terstruktur dalam bahasa Indonesia.',
      `Ringkas dokumen PDF berikut:\n\n${truncatedText}`
    );

    return { text: truncatedText, summary };
  }
}

export const pdfService = new PdfService();
