/**
 * Debug Logging System - Types
 *
 * TypeScript types for the localhost-only debug logging system
 * that provides structured console output with security guarantees.
 */

/**
 * Log categories for different types of debugging information
 */
export type LogCategory =
  | 'FLOW'   // Execution flow: function calls, navigation, lifecycle
  | 'DATA'   // Data state: API calls, state changes, props
  | 'ERROR'  // Errors: exceptions, API failures, validation issues
  | 'PERF';  // Performance: timing, render counts, bottlenecks

/**
 * Individual log entry structure
 */
export interface LogEntry {
  /** Unique identifier for the log entry */
  readonly id: string;
  /** Timestamp when the log was created (ISO string) */
  readonly timestamp: string;
  /** Category of the log entry */
  readonly category: LogCategory;
  /** Location identifier (component, function, API endpoint) */
  readonly location: string;
  /** Human-readable message */
  readonly message: string;
  /** Optional structured data associated with the log */
  readonly data?: unknown;
}

/**
 * Public API for the debug logging system
 */
export interface DebugAPI {
  /** Log execution flow events */
  flow(location: string, message: string, data?: unknown): void;
  /** Log data state changes and API calls */
  data(location: string, message: string, data?: unknown): void;
  /** Log errors and failures */
  error(location: string, message: string, data?: unknown): void;
  /** Performance timing utilities */
  perf: {
    /** Start timing an operation */
    start(label: string): void;
    /** End timing and log elapsed time */
    end(label: string): void;
  };
  /** Group related logs together in console */
  group<T>(label: string, callback: () => T): T;
}

/**
 * Console utility functions available via window.__debug
 */
export interface ConsoleUtilsAPI {
  /** Show recent log history */
  history(count?: number): void;
  /** Show logs filtered by category */
  filter(category: LogCategory): void;
  /** Search log history by term */
  search(term: string): void;
  /** Copy log history to clipboard as text */
  export(): void;
  /** Clear log history and console */
  clear(): void;
  /** Show help text for available commands */
  help(): void;
}

/**
 * Extended data wrapper for unsanitized logging
 */
export interface UnsanitizedData {
  /** Marker to skip sanitization */
  readonly __unsanitized: true;
  /** The raw data to log */
  readonly data: unknown;
}