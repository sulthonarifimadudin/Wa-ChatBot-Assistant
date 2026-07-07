import * as chrono from 'chrono-node';
import { createLogger } from '../config/logger';

const log = createLogger('date-parser');

/**
 * Date Parser Utility
 * Parses natural language date/time expressions using chrono-node.
 * Supports both English and Indonesian date expressions.
 *
 * Examples:
 * - "besok jam 9" → tomorrow at 9:00 AM
 * - "next Monday at 3pm"
 * - "dalam 2 jam" → in 2 hours
 * - "25 Desember jam 10 pagi" → December 25 at 10:00 AM
 */

/**
 * Parse a natural language date/time string into a Date object.
 * Returns null if the string cannot be parsed.
 */
export function parseNaturalDate(text: string, referenceDate?: Date): Date | null {
  const ref = referenceDate || new Date();

  try {
    // Try chrono's casual parser first (handles English naturally)
    const results = chrono.parse(text, ref, { forwardDate: true });

    if (results.length > 0) {
      return results[0].start.date();
    }

    // If chrono fails, try some common Indonesian patterns
    const indonesianDate = parseIndonesianDate(text, ref);
    if (indonesianDate) return indonesianDate;

    return null;
  } catch (error) {
    log.debug({ text, error }, 'Failed to parse date');
    return null;
  }
}

/**
 * Handle common Indonesian date expressions that chrono may not catch.
 */
function parseIndonesianDate(text: string, ref: Date): Date | null {
  const lower = text.toLowerCase();
  const result = new Date(ref);

  // "besok" = tomorrow
  if (lower.includes('besok')) {
    result.setDate(result.getDate() + 1);
  }
  // "lusa" = day after tomorrow
  else if (lower.includes('lusa')) {
    result.setDate(result.getDate() + 2);
  }
  // "hari ini" = today (no date change needed)
  else if (lower.includes('hari ini')) {
    // Keep current date
  }
  // "minggu depan" = next week
  else if (lower.includes('minggu depan')) {
    result.setDate(result.getDate() + 7);
  }
  else {
    return null; // No Indonesian pattern matched
  }

  // Extract time: "jam 9", "jam 14:30", "jam 9 pagi", "jam 3 sore"
  const timeMatch = lower.match(/jam\s+(\d{1,2})(?::(\d{2}))?(?:\s*(pagi|siang|sore|malam))?/);

  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3];

    if (period === 'sore' || period === 'malam') {
      if (hours < 12) hours += 12;
    } else if (period === 'pagi' && hours === 12) {
      hours = 0;
    }

    result.setHours(hours, minutes, 0, 0);
  }

  return result;
}

/**
 * Format a Date object into a human-readable Indonesian string.
 */
export function formatDateIndonesian(date: Date): string {
  return date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
