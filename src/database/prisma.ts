import { PrismaClient } from '@prisma/client';
import { createLogger } from '../config/logger';

const log = createLogger('database');

/**
 * Singleton Prisma client.
 * In development, we store it on `globalThis` to survive hot-reloads
 * without leaking database connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'stdout' },
          ]
        : [{ level: 'error', emit: 'stdout' }],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Connect to the database and log the result.
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    log.info('✅ Connected to PostgreSQL');
  } catch (error) {
    log.fatal({ error }, '❌ Failed to connect to PostgreSQL');
    process.exit(1);
  }
}

/**
 * Gracefully disconnect from the database.
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  log.info('Database disconnected');
}
