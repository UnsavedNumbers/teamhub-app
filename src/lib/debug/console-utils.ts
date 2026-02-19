/**
 * Debug Logging System - Console Utilities
 *
 * Browser console utilities accessible via window.__debug
 * for inspecting log history and managing the debug system.
 */

import type { ConsoleUtilsAPI, LogCategory } from './types';
import { getLogHistory, clearLogHistory, getLogHistorySize, isLocalhost } from './core';
import { printEntriesSummary, printGroupedEntries } from './formatter';

/**
 * Default number of entries to show in history
 */
const DEFAULT_HISTORY_COUNT = 50;

/**
 * Create the console utilities API
 * @returns ConsoleUtilsAPI instance
 */
function createConsoleUtils(): ConsoleUtilsAPI {
  return {
    history: (count = DEFAULT_HISTORY_COUNT) => {
      if (!isLocalhost()) {
        console.warn('[DEBUG] Console utilities only available on localhost');
        return;
      }

      const history = getLogHistory();
      const entriesToShow = history.slice(-count);
      printEntriesSummary(entriesToShow, `Last ${entriesToShow.length} log entries`);
    },

    filter: (category: LogCategory) => {
      if (!isLocalhost()) {
        console.warn('[DEBUG] Console utilities only available on localhost');
        return;
      }

      const history = getLogHistory();
      const filtered = history.filter(entry => entry.category === category);
      printEntriesSummary(filtered, `${category} logs (${filtered.length} entries)`);
    },

    search: (term: string) => {
      if (!isLocalhost()) {
        console.warn('[DEBUG] Console utilities only available on localhost');
        return;
      }

      const searchTerm = term.toLowerCase();
      const history = getLogHistory();
      const matches = history.filter(entry =>
        entry.message.toLowerCase().includes(searchTerm) ||
        entry.location.toLowerCase().includes(searchTerm)
      );

      printGroupedEntries(matches, `Search results for "${term}"`);
    },

    export: () => {
      if (!isLocalhost()) {
        console.warn('[DEBUG] Console utilities only available on localhost');
        return;
      }

      const history = getLogHistory();
      if (history.length === 0) {
        console.log('[DEBUG] No log entries to export');
        return;
      }

      // Format entries as plain text
      const lines = history.map(entry => {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        const dataStr = entry.data ? ` ${JSON.stringify(entry.data, null, 2)}` : '';
        return `[${timestamp}] [${entry.category}] [${entry.location}] ${entry.message}${dataStr}`;
      });

      const text = lines.join('\n');

      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          console.log(`[DEBUG] Exported ${history.length} log entries to clipboard`);
        }).catch(err => {
          console.error('[DEBUG] Failed to copy to clipboard:', err);
          console.log('[DEBUG] Log data:', text);
        });
      } else {
        // Fallback for older browsers
        console.log(`[DEBUG] Exported ${history.length} log entries (copy from console):`);
        console.log(text);
      }
    },

    clear: () => {
      if (!isLocalhost()) {
        console.warn('[DEBUG] Console utilities only available on localhost');
        return;
      }

      clearLogHistory();
      console.clear();
      console.log('[DEBUG] Log history and console cleared');
    },

    help: () => {
      if (!isLocalhost()) {
        console.warn('[DEBUG] Console utilities only available on localhost');
        return;
      }

      console.log('%c[DEBUG] Console Utilities Help', 'color: #666; font-weight: bold; font-size: 14px;');
      console.log('');
      console.log('%cAvailable commands:', 'font-weight: bold;');
      console.log('  %c__debug.history(count?)%c - Show recent log entries (default: 50)', 'color: #4CAF50;', 'color: inherit;');
      console.log('  %c__debug.filter(category)%c - Show logs filtered by category (FLOW|DATA|ERROR|PERF)', 'color: #2196F3;', 'color: inherit;');
      console.log('  %c__debug.search(term)%c - Search log messages and locations', 'color: #FF9800;', 'color: inherit;');
      console.log('  %c__debug.export()%c - Copy all logs to clipboard as text', 'color: #9C27B0;', 'color: inherit;');
      console.log('  %c__debug.clear()%c - Clear log history and console', 'color: #F44336;', 'color: inherit;');
      console.log('  %c__debug.help()%c - Show this help message', 'color: #666;', 'color: inherit;');
      console.log('');
      console.log('%cExamples:', 'font-weight: bold;');
      console.log('  __debug.history(10)     // Show last 10 entries');
      console.log('  __debug.filter("ERROR") // Show only error logs');
      console.log('  __debug.search("api")   // Search for API-related logs');
      console.log('');
      console.log(`%cCurrent log count: ${getLogHistorySize()}`, 'color: #666;');
    },
  };
}

/**
 * Attach console utilities to the window object
 * Only attaches on localhost to prevent production leakage
 */
export function attachConsoleUtils(): void {
  if (!isLocalhost()) {
    return;
  }

  // Type assertion for window extension
  const windowWithDebug = window as typeof window & {
    __debug?: ConsoleUtilsAPI;
  };

  // Only attach if not already present
  if (!windowWithDebug.__debug) {
    windowWithDebug.__debug = createConsoleUtils();
  }
}

/**
 * Remove console utilities from the window object
 */
export function detachConsoleUtils(): void {
  const windowWithDebug = window as typeof window & {
    __debug?: ConsoleUtilsAPI;
  };

  delete windowWithDebug.__debug;
}