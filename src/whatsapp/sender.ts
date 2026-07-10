import { getWhatsAppSocket } from './client';
import { createLogger } from '../config/logger';

const log = createLogger('wa-sender');

/**
 * WhatsApp Sender
 * Utility functions for sending messages back to WhatsApp users.
 */

/**
 * Send a text message to a WhatsApp JID.
 * @param jid - WhatsApp JID (e.g., "6281234567890@s.whatsapp.net")
 * @param text - Message text
 */
export async function sendText(jid: string, text: string): Promise<void> {
  try {
    const sock = getWhatsAppSocket();
    log.info({ jid, textLength: text.length }, 'Attempting to send text message...');
    await sock.sendMessage(jid, { text });
    log.info({ jid }, 'Text message sent successfully');
  } catch (error) {
    log.error({ error, jid }, 'Failed to send text message');
    throw error;
  }
}

/**
 * Send a "typing" indicator to show the bot is processing.
 */
export async function sendTypingIndicator(jid: string): Promise<void> {
  try {
    const sock = getWhatsAppSocket();
    await sock.sendPresenceUpdate('composing', jid);
  } catch (error) {
    log.debug({ error }, 'Failed to send typing indicator');
  }
}

/**
 * Stop the "typing" indicator.
 */
export async function stopTypingIndicator(jid: string): Promise<void> {
  try {
    const sock = getWhatsAppSocket();
    await sock.sendPresenceUpdate('paused', jid);
  } catch (error) {
    log.debug({ error }, 'Failed to stop typing indicator');
  }
}

/**
 * Send a reaction to a message.
 */
export async function sendReaction(
  jid: string,
  messageKey: { id: string; remoteJid?: string; fromMe?: boolean; participant?: string },
  emoji: string
): Promise<void> {
  try {
    const sock = getWhatsAppSocket();
    await sock.sendMessage(jid, {
      react: { text: emoji, key: messageKey },
    });
  } catch (error) {
    log.debug({ error }, 'Failed to send reaction');
  }
}

/**
 * Convert a phone number to WhatsApp JID format.
 * @param phoneNumber - Phone number (e.g., "6281234567890" or "+6281234567890")
 */
export function phoneToJid(phoneNumber: string): string {
  if (phoneNumber.includes('@')) return phoneNumber;
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Extract phone number from a WhatsApp JID.
 */
export function jidToPhone(jid: string): string {
  return jid; // Keep the domain (@s.whatsapp.net or @lid)
}
