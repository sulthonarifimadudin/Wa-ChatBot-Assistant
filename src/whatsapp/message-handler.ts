import type { BaileysEventMap, WAMessage } from '@whiskeysockets/baileys';
import { createLogger } from '../config/logger';
import { userService } from '../services/user.service';
import { chatService } from '../services/chat.service';
import { memoryService } from '../ai/memory.service';
import { openRouterService, type ChatMessage } from '../ai/openrouter.service';
import { toolExecutor } from '../ai/tool-executor';
import { toolRegistry } from '../tools/registry';
import { buildSystemPrompt } from '../ai/prompts';
import { ocrService } from '../tools/ocr/ocr.service';
import { pdfService } from '../tools/pdf/pdf.service';
import { voiceService } from '../tools/voice/voice.service';
import {
  getMessageType,
  extractTextContent,
  downloadAndSaveMedia,
} from './media-handler';
import {
  sendText,
  sendTypingIndicator,
  stopTypingIndicator,
  sendReaction,
  jidToPhone,
} from './sender';

const log = createLogger('message-handler');

/**
 * Message Handler
 * The core orchestrator that processes incoming WhatsApp messages.
 *
 * Flow:
 * 1. Receive message → identify sender → upsert user
 * 2. Detect message type (text/image/audio/document)
 * 3. Process media if needed (OCR, STT, PDF extract)
 * 4. Build context (system prompt + memory + recent history)
 * 5. Send to OpenRouter LLM
 * 6. If LLM requests tools → validate → execute → send results back
 * 7. LLM produces final answer
 * 8. Send response to WhatsApp
 */
export function createMessageHandler() {
  return async function handleMessagesUpsert(
    event: BaileysEventMap['messages.upsert']
  ): Promise<void> {
    const { messages, type } = event;

    // Only process new messages (not history sync)
    if (type !== 'notify') return;

    for (const message of messages) {
      try {
        await processMessage(message);
      } catch (error) {
        log.error({ error, messageId: message.key.id }, 'Failed to process message');
      }
    }
  };
}

async function processMessage(message: WAMessage): Promise<void> {
  // Skip messages from self
  if (message.key.fromMe) return;

  // Skip status broadcasts
  if (message.key.remoteJid === 'status@broadcast') return;

  // Skip group messages for now (only handle private chats)
  if (message.key.remoteJid?.endsWith('@g.us')) return;

  const jid = message.key.remoteJid;
  if (!jid) return;

  const phoneNumber = jidToPhone(jid);
  const msgType = getMessageType(message);

  if (msgType === 'unknown') return;

  log.info({ phoneNumber, msgType, messageId: message.key.id }, 'Processing message');

  // Show typing indicator while processing
  await sendTypingIndicator(jid);

  try {
    // 1. Upsert user
    const pushName = message.pushName || undefined;
    const user = await userService.findOrCreate(phoneNumber, pushName);

    // 2. Process based on message type
    let userContent = '';
    let mediaContext = '';

    switch (msgType) {
      case 'text': {
        userContent = extractTextContent(message) || '';
        break;
      }

      case 'image': {
        // Download image and run OCR
        const imagePath = await downloadAndSaveMedia(message, 'image');
        const caption = extractTextContent(message) || '';

        if (imagePath) {
          try {
            const ocrText = await ocrService.extractText(imagePath);
            mediaContext = `[User mengirim gambar]\nHasil OCR dari gambar: "${ocrText}"`;
          } catch {
            mediaContext = '[User mengirim gambar, namun OCR gagal]';
          }
        }

        userContent = caption
          ? `${caption}\n\n${mediaContext}`
          : mediaContext || 'User mengirim gambar';
        break;
      }

      case 'audio': {
        // Download audio and transcribe
        const audioPath = await downloadAndSaveMedia(message, 'audio');

        if (audioPath) {
          const transcription = await voiceService.transcribe(audioPath);
          userContent = `[Voice Note]\n${transcription}`;
        } else {
          userContent = '[User mengirim voice note, namun gagal diunduh]';
        }
        break;
      }

      case 'document': {
        // Download document and extract text
        const docPath = await downloadAndSaveMedia(message, 'document');
        const docCaption = extractTextContent(message) || '';

        if (docPath && docPath.toLowerCase().endsWith('.pdf')) {
          try {
            const { summary } = await pdfService.summarize(docPath);
            mediaContext = `[User mengirim PDF]\nRingkasan: ${summary}`;
          } catch {
            mediaContext = '[User mengirim PDF, namun gagal dibaca]';
          }
        } else {
          mediaContext = '[User mengirim dokumen]';
        }

        userContent = docCaption
          ? `${docCaption}\n\n${mediaContext}`
          : mediaContext;
        break;
      }

      default:
        userContent = 'User mengirim pesan yang tidak dapat diproses';
    }

    if (!userContent.trim()) return;

    // 3. Save user message to chat history
    await chatService.saveMessage({
      userId: user.id,
      role: 'USER',
      content: userContent,
      messageType: msgType === 'text' ? 'TEXT'
        : msgType === 'image' ? 'IMAGE'
        : msgType === 'audio' ? 'VOICE'
        : msgType === 'document' ? 'DOCUMENT'
        : 'TEXT',
    });

    // 4. Build LLM context
    const memoryContext = await memoryService.buildMemoryContext(user.id);
    const recentHistory = await chatService.getRecentHistory(user.id, 20);

    const now = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const systemPrompt = buildSystemPrompt({
      memoryContext,
      userName: user.displayName || undefined,
      currentTime: now,
    });

    // Build messages array for the LLM
    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add recent chat history
    for (const msg of recentHistory) {
      // Skip the current message (we'll add it at the end)
      if (msg.content === userContent && msg.role === 'USER') continue;

      llmMessages.push({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content,
      });
    }

    // Add the current user message
    llmMessages.push({ role: 'user', content: userContent });

    // 5. Send to OpenRouter with tool definitions
    const tools = toolRegistry.getToolDefinitions();
    let response = await openRouterService.chat({
      messages: llmMessages,
      tools,
      reasoning: { enabled: true }, // Enable reasoning tokens for supported models
    });

    let assistantMessage = response.choices[0]?.message;

    // 6. Handle tool calls (loop until LLM produces a final text response)
    let iterations = 0;
    const maxIterations = 5; // Safety limit

    while (assistantMessage?.tool_calls && iterations < maxIterations) {
      iterations++;

      log.info(
        { toolCalls: assistantMessage.tool_calls.map((tc) => tc.function.name) },
        'LLM requested tools'
      );

      // Add the assistant's tool-call message to the conversation
      llmMessages.push({
        role: 'assistant',
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls,
        reasoning_details: assistantMessage.reasoning_details, // Preserve reasoning state
      });

      // Execute all requested tools
      const toolResults = await toolExecutor.executeToolCalls(
        assistantMessage.tool_calls,
        user.id
      );

      // Add tool results to the conversation
      for (const { toolCallId, result } of toolResults) {
        llmMessages.push({
          role: 'tool',
          tool_call_id: toolCallId,
          content: JSON.stringify(result),
        });
      }

      // Send back to LLM with tool results
      response = await openRouterService.chat({
        messages: llmMessages,
        tools,
        reasoning: { enabled: true },
      });

      assistantMessage = response.choices[0]?.message;
    }

    // 7. Extract final text response
    const replyText = assistantMessage?.content || 'Maaf, saya tidak bisa memproses permintaan kamu saat ini. 🙏';

    // 8. Save assistant response to chat history
    await chatService.saveMessage({
      userId: user.id,
      role: 'ASSISTANT',
      content: replyText,
    });

    // 9. Send response to WhatsApp
    await stopTypingIndicator(jid);
    await sendText(jid, replyText);

    // React with ✅ to show the message was processed
    if (message.key) {
      await sendReaction(jid, message.key as any, '✅');
    }

    log.info({ phoneNumber, responseLength: replyText.length }, 'Response sent');
  } catch (error) {
    await stopTypingIndicator(jid);

    log.error({ error, phoneNumber }, 'Error processing message');

    // Send error message to user
    await sendText(jid, 'Maaf, terjadi kesalahan saat memproses pesanmu. Coba lagi ya! 🙏');
  }
}
