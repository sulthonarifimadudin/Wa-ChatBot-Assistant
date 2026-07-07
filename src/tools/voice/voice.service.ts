import { createLogger } from '../../config/logger';
import { openRouterService } from '../../ai/openrouter.service';

const log = createLogger('voice-service');

/**
 * Voice Transcription Service
 * Transcribes voice notes to text.
 *
 * Strategy: Uses OpenRouter's Whisper model or falls back to a basic
 * transcription approach. For MVP, we send the audio to the LLM
 * with a transcription request.
 *
 * TODO: Integrate with Groq Whisper API for better quality
 */
export class VoiceService {
  /**
   * Transcribe audio to text.
   * For MVP, this returns a placeholder message since free STT APIs
   * require additional setup. Replace with Groq Whisper when ready.
   */
  async transcribe(audioPath: string): Promise<string> {
    log.info({ audioPath }, 'Transcribing audio');

    // TODO: Implement actual transcription with Groq Whisper or similar
    // For now, we acknowledge receipt and explain the limitation
    try {
      // Attempt to use OpenRouter with audio description
      const response = await openRouterService.simpleChat(
        'Kamu adalah transcriber. User mengirim voice note. Jelaskan bahwa fitur voice note transcription sedang dalam pengembangan.',
        `User mengirim voice note (file: ${audioPath}). Beritahu bahwa fitur ini akan segera tersedia.`
      );

      return response || 'Voice note diterima. Fitur transkripsi sedang dalam pengembangan. 🎙️';
    } catch {
      return 'Voice note diterima. Fitur transkripsi sedang dalam pengembangan. 🎙️';
    }
  }
}

export const voiceService = new VoiceService();
