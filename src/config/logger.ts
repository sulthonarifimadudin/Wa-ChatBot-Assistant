import pino from 'pino';
import { env } from './env';

/**
 * Structured logger using Pino.
 * - In development: pretty-printed with colors.
 * - In production: raw JSON for log aggregation (ELK, Datadog, etc.).
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

/**
 * Create a child logger scoped to a specific module/feature.
 * Usage: `const log = createLogger('whatsapp');`
 */
export function createLogger(module: string) {
  return logger.child({ module });
}
