import * as fs from 'fs';
import * as path from 'path';
import { downloadMediaMessage, type WAMessage } from '@whiskeysockets/baileys';
import { env } from '../config/env';
import { createLogger } from '../config/logger';
import { getWhatsAppSocket } from './client';
import * as mime from 'mime-types';

const log = createLogger('media-handler');

/**
 * Media Handler
 * Downloads and saves media attachments (images, audio, documents)
 * from WhatsApp messages to the local filesystem.
 */

/**
 * Ensure the media directory exists.
 */
function ensureMediaDir(subDir?: string): string {
  const dir = subDir
    ? path.resolve(env.MEDIA_DIR, subDir)
    : path.resolve(env.MEDIA_DIR);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

/**
 * Download media from a WhatsApp message and save it to disk.
 * Returns the file path of the saved media.
 */
export async function downloadAndSaveMedia(
  message: WAMessage,
  type: 'image' | 'audio' | 'document' | 'video'
): Promise<string | null> {
  try {
    const sock = getWhatsAppSocket();
    const buffer = await downloadMediaMessage(
      message,
      'buffer',
      {},
      {
        logger: log as any,
        reuploadRequest: sock.updateMediaMessage,
      }
    );

    if (!buffer) {
      log.warn('No media buffer received');
      return null;
    }

    const dir = ensureMediaDir(type);
    const timestamp = Date.now();
    const msgContent = message.message;

    // Determine file extension from mimetype
    let extension = 'bin';
    let mimeType: string | undefined;

    if (type === 'image' && msgContent?.imageMessage) {
      mimeType = msgContent.imageMessage.mimetype || 'image/jpeg';
    } else if (type === 'audio' && msgContent?.audioMessage) {
      mimeType = msgContent.audioMessage.mimetype || 'audio/ogg';
    } else if (type === 'document' && msgContent?.documentMessage) {
      mimeType = msgContent.documentMessage.mimetype || 'application/pdf';
      // Use original filename if available
      const originalName = msgContent.documentMessage.fileName;
      if (originalName) {
        const filePath = path.join(dir, `${timestamp}_${originalName}`);
        fs.writeFileSync(filePath, buffer as Buffer);
        log.info({ filePath, type }, 'Media saved');
        return filePath;
      }
    }

    if (mimeType) {
      extension = mime.extension(mimeType) || extension;
    }

    const fileName = `${timestamp}_${type}.${extension}`;
    const filePath = path.join(dir, fileName);

    fs.writeFileSync(filePath, buffer as Buffer);
    log.info({ filePath, type, size: (buffer as Buffer).length }, 'Media saved');

    return filePath;
  } catch (error) {
    log.error({ error, type }, 'Failed to download media');
    return null;
  }
}

/**
 * Determine the message type from a WAMessage.
 */
export function getMessageType(
  message: WAMessage
): 'text' | 'image' | 'audio' | 'document' | 'video' | 'unknown' {
  const msg = message.message;
  if (!msg) return 'unknown';

  if (msg.conversation || msg.extendedTextMessage) return 'text';
  if (msg.imageMessage) return 'image';
  if (msg.audioMessage) return 'audio';
  if (msg.documentMessage) return 'document';
  if (msg.videoMessage) return 'video';

  return 'unknown';
}

/**
 * Extract text content from a message.
 */
export function extractTextContent(message: WAMessage): string | null {
  const msg = message.message;
  if (!msg) return null;

  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  if (msg.documentMessage?.caption) return msg.documentMessage.caption;

  return null;
}
