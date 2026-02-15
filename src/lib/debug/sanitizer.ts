/**
 * Debug Logging System - Data Sanitizer
 *
 * Sanitizes sensitive data before logging to prevent accidental exposure
 * of passwords, tokens, credit cards, and other sensitive information.
 */

import type { UnsanitizedData } from './types';

// Pre-compiled regex patterns for performance
const PASSWORD_KEYS = /password|passwd|secret/i;
const TOKEN_KEYS = /token|api_key|apikey|auth|bearer|authorization/i;
const CREDIT_CARD_VALUES = /\b\d{13,19}\b/g; // 13-19 digits for credit cards
const SSN_VALUES = /\b\d{3}-?\d{2}-?\d{4}\b/g; // XXX-XX-XXXX format
const COOKIE_KEYS = /cookie/i;

/**
 * Maximum recursion depth to prevent stack overflow on deeply nested objects
 */
const MAX_DEPTH = 5;

/**
 * Sanitize data by masking sensitive patterns and handling circular references
 * @param data - The data to sanitize
 * @param visited - WeakSet to track circular references (internal use)
 * @param depth - Current recursion depth (internal use)
 * @returns Sanitized copy of the data
 */
export function sanitize(
  data: unknown,
  visited: WeakSet<object> = new WeakSet(),
  depth = 0
): unknown {
  // Prevent infinite recursion
  if (depth > MAX_DEPTH) {
    return '[Max Depth Exceeded]';
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitive types
  if (typeof data !== 'object') {
    // Check for credit card numbers in strings
    if (typeof data === 'string') {
      return sanitizeStringValue(data);
    }
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitize(item, visited, depth + 1));
  }

  // Check for circular references
  if (visited.has(data)) {
    return '[Circular]';
  }

  // Add to visited set for circular reference detection
  visited.add(data);

  try {
    // Handle objects
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Sanitize the key itself (though usually keys aren't sensitive)
      const sanitizedKey = key;

      // Check if this key should be masked
      if (PASSWORD_KEYS.test(key)) {
        sanitized[sanitizedKey] = '[PASSWORD]';
      } else if (TOKEN_KEYS.test(key)) {
        sanitized[sanitizedKey] = maskToken(String(value));
      } else if (COOKIE_KEYS.test(key)) {
        sanitized[sanitizedKey] = summarizeCookies(value);
      } else {
        // Recursively sanitize the value
        sanitized[sanitizedKey] = sanitize(value, visited, depth + 1);
      }
    }

    return sanitized;
  } finally {
    // Remove from visited set when done (for different paths through the object graph)
    visited.delete(data);
  }
}

/**
 * Sanitize string values that might contain sensitive patterns
 * @param value - String to sanitize
 * @returns Sanitized string
 */
function sanitizeStringValue(value: string): string {
  // First mask credit cards
  let sanitized = value.replace(CREDIT_CARD_VALUES, (match) => {
    if (match.length >= 4) {
      return `****${match.slice(-4)}`;
    }
    return '[REDACTED]';
  });

  // Then mask SSNs
  sanitized = sanitized.replace(SSN_VALUES, '[SSN]');

  return sanitized;
}

/**
 * Mask token values, showing first 4 and last 4 characters
 * @param value - Token value to mask
 * @returns Masked token string
 */
function maskToken(value: string): string {
  const str = String(value);
  if (str.length <= 8) {
    return '[REDACTED]';
  }
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

/**
 * Summarize cookie data
 * @param value - Cookie value to summarize
 * @returns Cookie summary string
 */
function summarizeCookies(value: unknown): string {
  if (typeof value === 'string') {
    // Count cookie pairs (key=value separated by semicolons)
    const cookies = value.split(';').filter(cookie => cookie.trim());
    return `[${cookies.length} cookies]`;
  }

  if (typeof value === 'object' && value !== null) {
    // Count properties in cookie object
    const count = Object.keys(value).length;
    return `[${count} cookies]`;
  }

  return '[cookies]';
}

/**
 * Mark data as unsanitized to skip sanitization during logging
 * Use this sparingly when you specifically need to log sensitive data for debugging
 * @param data - The raw data to mark as unsanitized
 * @returns UnsanitizedData wrapper
 */
export function unsanitized(data: unknown): UnsanitizedData {
  return {
    __unsanitized: true,
    data,
  };
}

/**
 * Check if data is wrapped as unsanitized
 * @param data - Data to check
 * @returns True if data should skip sanitization
 */
export function isUnsanitized(data: unknown): data is UnsanitizedData {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__unsanitized' in data &&
    (data as UnsanitizedData).__unsanitized === true
  );
}