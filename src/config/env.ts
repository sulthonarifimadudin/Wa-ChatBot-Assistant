import { z } from 'zod';

/**
 * Zod schema for validating all environment variables at startup.
 * If any required variable is missing or invalid, the app crashes fast
 * with a clear error message — no silent failures in production.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // OpenRouter AI
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
  OPENROUTER_MODEL: z.string().default('qwen/qwen3-235b-a22b:free'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),

  // Groq AI (For Voice Transcription)
  GROQ_API_KEY: z.string().optional(),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // WhatsApp
  WA_SESSION_NAME: z.string().default('wa-assistant'),

  // Media
  MEDIA_DIR: z.string().default('./media'),

  // Scheduler
  REMINDER_CHECK_INTERVAL_SECONDS: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 * Called once at startup — the result is cached and reused everywhere.
 */
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
