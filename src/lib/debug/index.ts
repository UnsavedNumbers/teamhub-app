/**
 * Debug Logging System - Public API
 *
 * The main entry point for the debug logging system.
 * Provides localhost-only logging with security guarantees.
 */

import type { DebugAPI } from './types';
import { createDebugAPI } from './core';
import { attachConsoleUtils } from './console-utils';
import { runSelfTest } from './self-test';

// No-op functions for production builds
const noop = () => {};
const noopGeneric = <T,>(_label: string, callback: () => T): T => callback();

// Export the debug API - conditionally active based on environment
export const debug: DebugAPI = import.meta.env.DEV
  ? createDebugAPI()
  : {
      flow: noop,
      data: noop,
      error: noop,
      perf: { start: noop, end: noop },
      group: noopGeneric,
    };

// Initialize console utilities and run self-test (only in dev mode)
if (import.meta.env.DEV) {
  attachConsoleUtils();
  runSelfTest();
}