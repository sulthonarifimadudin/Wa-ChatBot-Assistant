import { createLogger } from '../../config/logger';

const log = createLogger('ocr-service');

/**
 * OCR Service
 * Extracts text from images using Tesseract.js.
 * Runs entirely locally — no external API needed.
 */
export class OcrService {
  private worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | null = null;

  /**
   * Initialize the Tesseract worker.
   * Called lazily on first OCR request.
   */
  private async getWorker() {
    if (!this.worker) {
      const Tesseract = await import('tesseract.js');
      this.worker = await Tesseract.createWorker('ind+eng');
      log.info('Tesseract worker initialized (ind+eng)');
    }
    return this.worker;
  }

  /**
   * Extract text from an image file.
   * @param imagePath - Absolute path to the image file
   */
  async extractText(imagePath: string): Promise<string> {
    const worker = await this.getWorker();

    log.debug({ imagePath }, 'Running OCR');

    const {
      data: { text },
    } = await worker.recognize(imagePath);

    const cleanedText = text.trim();

    log.info(
      { imagePath, textLength: cleanedText.length },
      'OCR complete'
    );

    return cleanedText || 'Tidak ada teks yang terdeteksi dalam gambar.';
  }

  /**
   * Cleanup: terminate the Tesseract worker.
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      log.info('Tesseract worker terminated');
    }
  }
}

export const ocrService = new OcrService();
