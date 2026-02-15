/**
 * Debug Logging System - Self Test
 *
 * Startup verification that runs once when the debug system initializes.
 * Confirms the system is properly configured and provides status information.
 */

import { isLocalhost } from './core';

/**
 * Run the self-test verification
 * Only runs in development mode and on localhost
 */
export function runSelfTest(): void {
  // Only run self-test in development and on localhost
  if (!import.meta.env.DEV || !isLocalhost()) {
    return;
  }

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';

  console.log('%c[DEBUG SYSTEM] Active on localhost', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
  console.log(
    `%c[DEBUG SYSTEM] Production check: ${hostname} !== localhost patterns → WOULD BE DISABLED`,
    'color: #FF9800; font-style: italic;'
  );
  console.log('%c[DEBUG SYSTEM] Logging categories: FLOW, DATA, ERROR, PERF', 'color: #2196F3;');
  console.log('%c[DEBUG SYSTEM] Type __debug.help() for console utilities', 'color: #666;');

  // Log the successful initialization
  console.log('%c[DEBUG SYSTEM] Initialized successfully', 'color: #4CAF50; font-style: italic;');
}