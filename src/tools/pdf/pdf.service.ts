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

    let text = data.text;

    // Fallback to OCR if the PDF seems to be a scanned document (less than 50 chars)
    if (text.trim().length < 50 && data.numpages > 0) {
      log.info('PDF text is empty, attempting OCR via pdf2pic...');
      try {
        const { fromPath } = await import('pdf2pic');
        const path = await import('path');
        const { ocrService } = await import('../ocr/ocr.service');
        
        const savePath = path.dirname(pdfPath);
        const baseName = path.basename(pdfPath, '.pdf') + '_ocr';
        
        const options = {
          density: 150,
          saveFilename: baseName,
          savePath: savePath,
          format: "png",
          width: 1024
        };
        
        const storeAsImage = fromPath(pdfPath, options);
        // Process up to 3 pages to avoid API rate limits and long wait times
        const pagesToProcess = Math.min(data.numpages, 3);
        
        let ocrCombinedText = '';
        
        for (let i = 1; i <= pagesToProcess; i++) {
          try {
            const result = await storeAsImage(i);
            if (result && result.path) {
              log.info({ page: i, imagePath: result.path }, 'Running OCR on PDF page');
              const pageText = await ocrService.extractText(result.path);
              ocrCombinedText += `\n--- Halaman ${i} ---\n${pageText}\n`;
              
              // Clean up the temporary image
              try {
                fs.unlinkSync(result.path);
              } catch (e) {}
            }
          } catch (pageError) {
            log.error({ page: i, error: pageError }, 'Failed to process page');
          }
        }
        
        if (ocrCombinedText.trim().length > 0) {
          text = ocrCombinedText;
        }
      } catch (ocrError) {
        log.error({ error: ocrError }, 'Failed to run OCR on PDF');
      }
    }

    log.info(
      { pdfPath, pages: data.numpages, textLength: text.length },
      'PDF text extracted'
    );

    return text;
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
