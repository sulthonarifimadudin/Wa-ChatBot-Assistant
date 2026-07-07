import { createLogger } from '../config/logger';

const log = createLogger('error-handler');

/**
 * Centralized error handler.
 * Provides consistent error logging and formatting.
 */

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Handle uncaught exceptions and unhandled rejections.
 */
export function setupGlobalErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    log.fatal({ error }, '💥 Uncaught Exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    log.fatal({ reason }, '💥 Unhandled Rejection');
    process.exit(1);
  });
}

/**
 * Format an error for logging.
 */
export function formatError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}
