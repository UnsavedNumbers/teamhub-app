/**
 * Debug Logging System - Console Formatter
 *
 * Formats and outputs log entries to the browser console with
 * category-specific styling and structured data display.
 */

import type { LogEntry, LogCategory } from './types';

// CSS styles for each log category
const CATEGORY_STYLES: Record<LogCategory, string> = {
  FLOW: 'color: #5B9BD5; font-weight: bold;', // Blue
  DATA: 'color: #6BBF6B; font-weight: bold;', // Green for requests, will be overridden for responses
  ERROR: 'color: #E74C3C; font-weight: bold;', // Red
  PERF: 'color: #F39C12; font-weight: bold;', // Orange
};

// Special style for DATA responses
const DATA_RESPONSE_STYLE = 'color: #4EC9C9; font-weight: bold;'; // Cyan

/**
 * Format a timestamp into HH:MM:SS.mmm format
 * @param date - Date to format
 * @returns Formatted timestamp string
 */
function formatTimestamp(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * Format a log entry into a console log line
 * @param entry - Log entry to format
 * @returns Formatted log line
 */
export function formatLogLine(entry: LogEntry): string {
  const timestamp = formatTimestamp(new Date(entry.timestamp));
  return `[${timestamp}] [${entry.category}] [${entry.location}] ${entry.message}`;
}

/**
 * Get the appropriate CSS style for a log entry
 * @param entry - Log entry
 * @returns CSS style string
 */
function getStyleForEntry(entry: LogEntry): string {
  // Special handling for DATA responses (contain timing info)
  if (entry.category === 'DATA' && entry.message.includes('→')) {
    return DATA_RESPONSE_STYLE;
  }

  return CATEGORY_STYLES[entry.category];
}

/**
 * Print a log entry to the console with appropriate styling
 * @param entry - Log entry to print
 */
export function printEntry(entry: LogEntry): void {
  const logLine = formatLogLine(entry);
  const style = getStyleForEntry(entry);

  // Use appropriate console method based on category
  if (entry.category === 'ERROR') {
    console.error(`%c${logLine}`, style);
  } else {
    console.log(`%c${logLine}`, style);
  }

  // Print structured data if present
  if (entry.data !== undefined) {
    console.log('└─', entry.data);
  }
}

/**
 * Print multiple log entries to the console
 * @param entries - Array of log entries to print
 */
export function printEntries(entries: readonly LogEntry[]): void {
  for (const entry of entries) {
    printEntry(entry);
  }
}

/**
 * Print a summary of log entries with count
 * @param entries - Array of log entries
 * @param label - Label for the summary
 */
export function printEntriesSummary(entries: readonly LogEntry[], label: string): void {
  if (entries.length === 0) {
    console.log(`%c${label}: No entries`, 'color: #666; font-style: italic;');
    return;
  }

  console.log(`%c${label}: ${entries.length} entries`, 'color: #666; font-weight: bold;');
  printEntries(entries);
}

/**
 * Print a grouped collection of log entries
 * @param entries - Array of log entries
 * @param groupLabel - Label for the console group
 */
export function printGroupedEntries(entries: readonly LogEntry[], groupLabel: string): void {
  if (entries.length === 0) {
    return;
  }

  console.groupCollapsed(`%c${groupLabel} (${entries.length} entries)`, 'color: #666;');
  printEntries(entries);
  console.groupEnd();
}