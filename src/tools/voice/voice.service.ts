import fs from 'fs';
import Groq from 'groq-sdk';
import { env } from '../../config/env';
import { createLogger } from '../../config/logger';
import { openRouterService } from '../../ai/openrouter.service';

const log = createLogger('voice-service');

export class VoiceService {
  private groq: Groq | null = null;

  constructor() {
    if (env.GROQ_API_KEY) {
      this.groq = new Groq({ apiKey: env.GROQ_API_KEY });
      log.info('✅ Groq API initialized for Voice Notes');
    } else {
      log.warn('⚠️ GROQ_API_KEY is not set. Voice Note transcription is disabled.');
    }
  }

  /**
   * Transcribe audio to text using Groq Whisper.
   */
  async transcribe(audioPath: string): Promise<string> {
    log.info({ audioPath }, 'Transcribing audio');

    if (!this.groq) {
      return 'Voice note diterima. Namun, fitur transkripsi sedang tidak aktif karena API Key belum dipasang. 🎙️🚫';
    }

    try {
      // Use Groq Whisper to transcribe the audio file
      const transcription = await this.groq.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-large-v3',
        response_format: 'json',
        language: 'id', // Force Indonesian for better accuracy
      });

      if (!transcription.text) {
        throw new Error('Empty transcription returned');
      }

      return transcription.text;
    } catch (error: any) {
      log.error({ error: error.message || error }, 'Voice transcription failed');
      return `Voice note diterima, namun terjadi kesalahan saat mencoba mendengarkan isinya: ${error.message || 'Unknown error'}. 🎙️❌`;
    }
  }
}

export const voiceService = new VoiceService();
