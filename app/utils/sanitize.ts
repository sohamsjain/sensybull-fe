// app/utils/sanitize.ts

const MAX_INPUT_LENGTH = 500;

/**
 * Sanitizes user input by trimming, removing control characters,
 * and enforcing a max length.
 */
export function sanitizeInput(text: string, maxLength = MAX_INPUT_LENGTH): string {
  return text
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}
