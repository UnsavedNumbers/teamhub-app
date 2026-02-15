/**
 * Debug Logging System - Core Engine
 *
 * Core logging functionality with localhost validation,
 * history buffer, and performance timing.
 */

import type { DebugAPI, LogEntry, LogCategory } from './types';
import { sanitize } from './sanitizer';
import { printEntry } from './formatter';

/**
 * Maximum number of log entries to keep in history buffer
 */
const MAX_HISTORY_SIZE = 1000;

/**
 * Allowed hostnames for debug logging activation
 */
const ALLOWED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Global history buffer for log entries
 */
const history: LogEntry[] = [];

/**
 * Performance timing map (label -> start timestamp)
 */
const perfTimers = new Map<string, number>();

/**
 * Check if the current environment allows debug logging
 * Only returns true on localhost hostnames and when window is available
 * @returns True if debug logging should be active
 */
export function isLocalhost(): boolean {
  // Must be running in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  // Must be one of the allowed hostnames
  return ALLOWED_HOSTNAMES.has(window.location.hostname);
}

/**
 * Generate a unique ID for log entries
 * @returns Unique string identifier
 */
function generateLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a log entry to the history buffer
 * @param entry - Log entry to add
 */
function addToHistory(entry: LogEntry): void {
  history.push(entry);

  // Evict oldest entries if buffer is full
  if (history.length > MAX_HISTORY_SIZE) {
    history.shift();
  }
}

/**
 * Create a log entry and add it to history
 * @param category - Log category
 * @param location - Location identifier
 * @param message - Log message
 * @param data - Optional structured data
 * @returns The created log entry
 */
function createLogEntry(
  category: LogCategory,
  location: string,
  message: string,
  data?: unknown
): LogEntry {
  const entry: LogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    category,
    location,
    message,
    data: data !== undefined ? sanitize(data) : undefined,
  };

  addToHistory(entry);
  return entry;
}

/**
 * Log a message with the specified category
 * @param category - Log category
 * @param location - Location identifier
 * @param message - Log message
 * @param data - Optional structured data
 */
function logMessage(
  category: LogCategory,
  location: string,
  message: string,
  data?: unknown
): void {
  // Always check localhost first - no cached boolean allowed
  if (!isLocalhost()) {
    return;
  }

  const entry = createLogEntry(category, location, message, data);
  printEntry(entry);
}

/**
 * Start timing a performance operation
 * @param label - Unique label for the timing operation
 */
function startPerfTimer(label: string): void {
  if (!isLocalhost()) {
    return;
  }

  perfTimers.set(label, performance.now());
}

/**
 * End timing and log elapsed time for a performance operation
 * @param label - Label for the timing operation
 */
function endPerfTimer(label: string): void {
  if (!isLocalhost()) {
    return;
  }

  const startTime = perfTimers.get(label);
  if (startTime === undefined) {
    logMessage('ERROR', 'Debug.perf', `Timer '${label}' was never started`);
    return;
  }

  const elapsed = performance.now() - startTime;
  const elapsedMs = Math.round(elapsed * 100) / 100; // Round to 2 decimal places

  perfTimers.delete(label);
  logMessage('PERF', 'Debug.perf', `Timer '${label}' completed`, {
    elapsedMs,
    elapsedFormatted: `${elapsedMs}ms`,
  });
}

/**
 * Execute a callback within a console group
 * @param label - Group label
 * @param callback - Function to execute within the group
 * @returns Return value of the callback
 */
function groupLog<T>(label: string, callback: () => T): T {
  if (!isLocalhost()) {
    return callback();
  }

  console.groupCollapsed(`%c${label}`, 'color: #666; font-weight: bold;');

  try {
    return callback();
  } finally {
    console.groupEnd();
  }
}

/**
 * Create the debug API object
 * @returns DebugAPI instance
 */
export function createDebugAPI(): DebugAPI {
  return {
    flow: (location: string, message: string, data?: unknown) => {
      logMessage('FLOW', location, message, data);
    },

    data: (location: string, message: string, data?: unknown) => {
      logMessage('DATA', location, message, data);
    },

    error: (location: string, message: string, data?: unknown) => {
      logMessage('ERROR', location, message, data);
    },

    perf: {
      start: startPerfTimer,
      end: endPerfTimer,
    },

    group: groupLog,
  };
}

/**
 * Get the current log history
 * @returns Readonly array of log entries
 */
export function getLogHistory(): readonly LogEntry[] {
  return history.slice();
}

/**
 * Clear the log history buffer
 */
export function clearLogHistory(): void {
  history.length = 0;
}

/**
 * Get the current number of log entries in history
 * @returns Number of entries
 */
export function getLogHistorySize(): number {
  return history.length;
}