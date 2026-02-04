/**
 * Demo Mode Utilities
 * 
 * Handles demo mode detection and blocking of write operations
 */

import { isSupabaseConfigured } from '../lib/supabase'
import { USE_FAKE_DATA } from '../data/config'

/**
 * Check if we're in demo mode (Supabase not configured)
 */
export function isDemoMode(): boolean {
  return USE_FAKE_DATA
}

/**
 * Get demo mode error message
 */
export function getDemoModeError(action: string = 'perform this action'): string {
  return `Demo mode: Cannot ${action}. Please configure Supabase to enable write operations.`
}

/**
 * Check if an operation should be blocked in demo mode
 */
export function shouldBlockInDemoMode(operation: 'read' | 'write'): boolean {
  if (operation === 'read') {
    return false // Reads can work in demo mode with mock data
  }
  return USE_FAKE_DATA // Writes are blocked
}

/**
 * Throw error if in demo mode and operation is a write
 */
export function assertNotDemoMode(operation: string = 'perform this action'): void {
  if (shouldBlockInDemoMode('write')) {
    throw new Error(getDemoModeError(operation))
  }
}
