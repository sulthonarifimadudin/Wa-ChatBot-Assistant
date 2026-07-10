import Fastify from 'fastify';
import { env } from './config/env';
import { createLogger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import { healthRoute } from './routes/health.route';
import { registerAllTools } from './tools/registry';
import { initWhatsAppClient } from './whatsapp/client';
import { createMessageHandler } from './whatsapp/message-handler';
import { startSchedulers, stopSchedulers } from './scheduler/worker';
import { setupGlobalErrorHandlers } from './utils/error-handler';

const log = createLogger('app');

/**
 * Application Entry Point
 * Bootstraps all services in the correct order:
 * 1. Global error handlers
 * 2. Database connection
 * 3. Tool registry
 * 4. Fastify HTTP server
 * 5. WhatsApp client
 * 6. Scheduler
 */
async function main(): Promise<void> {
  // ─── Setup global error handlers ───
  setupGlobalErrorHandlers();

  log.info('🚀 Starting WA AI Assistant...');
  log.info({ env: env.NODE_ENV, port: env.PORT, model: env.OPENROUTER_MODEL }, 'Configuration');

  // ─── 1. Connect to database ───
  await connectDatabase();
  
  // ─── 1.5. Fix existing user JIDs ───
  const { prisma } = require('./database/prisma');
  const users = await prisma.user.findMany();
  for (const u of users) {
    if (!u.whatsappNumber.includes('@')) {
      const isLid = u.whatsappNumber.length > 14;
      const jid = u.whatsappNumber + (isLid ? '@lid' : '@s.whatsapp.net');
      await prisma.user.update({ where: { id: u.id }, data: { whatsappNumber: jid } });
      log.info(`Migrated user ${u.whatsappNumber} to ${jid}`);
    }
  }

  // ─── 2. Register all tools ───
  registerAllTools();

  // ─── 3. Initialize Fastify ───
  const app = Fastify({
    logger: false, // We use our own Pino instance
  });

  // Register routes
  await app.register(healthRoute);

  // Start HTTP server
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info({ port: env.PORT }, '🌐 HTTP server started');

  // ─── 4. Initialize WhatsApp ───
  const messageHandler = createMessageHandler();
  await initWhatsAppClient(messageHandler);
  log.info('📱 WhatsApp client initialized');

  // ─── 5. Start schedulers ───
  startSchedulers();

  log.info('✅ WA AI Assistant is fully operational!');

  // ─── Graceful shutdown ───
  const shutdown = async (signal: string) => {
    log.info({ signal }, 'Shutting down...');

    stopSchedulers();
    await app.close();
    await disconnectDatabase();

    log.info('👋 Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  log.fatal({ error }, '💥 Failed to start application');
  process.exit(1);
});
