import { z } from 'zod';

export const webSearchSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe('Kata kunci pencarian yang ingin dicari di internet'),
  maxResults: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .describe('Jumlah maksimum hasil pencarian yang diinginkan (default: 5)'),
});

export type WebSearchInput = z.infer<typeof webSearchSchema>;
