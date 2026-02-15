/**
 * Debug Logging System - Fetch Wrapper
 *
 * Wraps the native fetch API to automatically log HTTP requests and responses
 * for Supabase API calls with performance timing and sanitized data.
 */

import { debug } from '../index';
import { sanitize } from '../sanitizer';

/**
 * Extract a readable path from a Supabase URL
 * @param url - Full Supabase URL
 * @returns Readable path component
 */
function extractReadablePath(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove the base Supabase domain to show just the API path
    const path = urlObj.pathname + urlObj.search;
    return path || url;
  } catch {
    // If URL parsing fails, return a sanitized version
    return url.replace(/https?:\/\/[^/]+\//, '/');
  }
}

/**
 * Create a summary of request body for logging
 * @param body - Request body (string, FormData, etc.)
 * @param contentType - Content-Type header
 * @returns Summary string or sanitized body preview
 */
function summarizeRequestBody(body: unknown, _contentType?: string): string {
  if (!body) {
    return 'no body';
  }

  if (typeof body === 'string') {
    try {
      // Try to parse as JSON for better summary
      const parsed = JSON.parse(body);
      const sanitized = sanitize(parsed);
      return `JSON: ${JSON.stringify(sanitized).slice(0, 100)}${JSON.stringify(sanitized).length > 100 ? '...' : ''}`;
    } catch {
      // Not JSON, show as string
      return `text: ${body.slice(0, 50)}${body.length > 50 ? '...' : ''}`;
    }
  }

  if (body instanceof FormData) {
    const keys = Array.from(body.keys());
    return `FormData: [${keys.length} fields]`;
  }

  if (body instanceof URLSearchParams) {
    return `URLSearchParams: ${body.toString().slice(0, 50)}${body.toString().length > 50 ? '...' : ''}`;
  }

  // Fallback for other types
  return `body: ${typeof body}`;
}

/**
 * Create a debug-enabled fetch wrapper
 * @returns Wrapped fetch function that logs requests/responses
 */
export function createDebugFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';

    // Extract readable path for logging
    const readablePath = extractReadablePath(url);

    // Start performance timer
    const timerLabel = `fetch-${method}-${readablePath}`;
    debug.perf.start(timerLabel);

    try {
      // Log the outgoing request
      const contentType = init?.headers && typeof init.headers === 'object' && 'content-type' in init.headers
        ? (init.headers as any)['content-type']
        : undefined;

      debug.data('API.request', `${method} ${readablePath}`, {
        method,
        url: readablePath,
        body: init?.body ? summarizeRequestBody(init.body, contentType) : undefined,
      });

      // Make the actual request
      const response = await fetch(input, init);

      // Calculate elapsed time
      debug.perf.end(timerLabel);

      // Log the response
      const statusText = `${response.status} ${response.statusText || ''}`.trim();
      const contentLength = response.headers.get('content-length');
      const responseContentType = response.headers.get('content-type');

      debug.data('API.response', `${method} ${readablePath} → ${statusText}`, {
        status: response.status,
        statusText: response.statusText,
        contentType: responseContentType,
        contentLength: contentLength ? `${contentLength} bytes` : undefined,
      });

      return response;
    } catch (error) {
      // End timer on error
      debug.perf.end(timerLabel);

      // Log the error
      debug.error('API.error', `${method} ${readablePath} failed`, {
        error: error instanceof Error ? error.message : String(error),
        url: readablePath,
      });

      // Re-throw the error
      throw error;
    }
  };
}