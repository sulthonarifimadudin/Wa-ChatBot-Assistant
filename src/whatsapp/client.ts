import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
  type BaileysEventMap,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import * as qrcode from 'qrcode-terminal';
import * as path from 'path';
import { Boom } from '@hapi/boom';
import { createLogger } from '../config/logger';
import { env } from '../config/env';

const log = createLogger('whatsapp-client');

let sock: WASocket | null = null;

/**
 * Get the current WhatsApp socket instance.
 * Throws if not connected yet.
 */
export function getWhatsAppSocket(): WASocket {
  if (!sock) {
    throw new Error('WhatsApp client not initialized');
  }
  return sock;
}

/**
 * Initialize the Baileys WhatsApp client.
 * - Handles QR code display for first-time setup
 * - Auto-reconnects on disconnection
 * - Persists auth state to the filesystem
 *
 * @param onMessage - Callback for incoming messages
 */
export async function initWhatsAppClient(
  onMessage: (event: BaileysEventMap['messages.upsert']) => void
): Promise<WASocket> {
  const authDir = path.resolve('./auth', env.WA_SESSION_NAME);

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const socket = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, log as any),
    },
    printQRInTerminal: false,
    logger: log as any,
    browser: ['WA AI Assistant', 'Chrome', '1.0.0'],
    // Receive message content in events
    generateHighQualityLinkPreview: false,
  });

  // ─── Connection Updates ───
  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Display QR code in terminal for pairing
    if (qr) {
      log.info('📱 Scan QR code to connect WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      log.warn(
        { statusCode, shouldReconnect },
        'WhatsApp connection closed'
      );

      if (shouldReconnect) {
        log.info('Reconnecting to WhatsApp...');
        // Recursive reconnect
        initWhatsAppClient(onMessage).catch((err) => {
          log.error({ err }, 'Failed to reconnect');
        });
      } else {
        log.fatal('WhatsApp logged out. Please re-scan QR code.');
      }
    }

    if (connection === 'open') {
      log.info('✅ Connected to WhatsApp');
    }
  });

  // ─── Save Credentials ───
  socket.ev.on('creds.update', saveCreds);

  // ─── Incoming Messages ───
  socket.ev.on('messages.upsert', (event) => {
    onMessage(event);
  });

  sock = socket;
  return socket;
}
