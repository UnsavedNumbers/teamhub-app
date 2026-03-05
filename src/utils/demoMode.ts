/**
 * Demo Mode Utilities
 * 
 * Handles demo mode detection and blocking of write operations
 */

import { USE_FAKE_DATA } from '../data/config'
import { getCurrentDemoSessionSnapshot } from '../data/services/demoSessionService'

const DEMO_WELCOME_COMPLETED_KEY = 'ys_demo_welcome_completed'

/**
 * Check if we're in demo mode (Supabase not configured)
 */
export function isDemoMode(): boolean {
  return USE_FAKE_DATA
}

/**
 * Check if user is in an active demo session
 */
export function isInDemoSession(): boolean {
  const snapshot = getCurrentDemoSessionSnapshot()
  return snapshot.is_demo_session === true && Boolean(snapshot.demo_org_id)
}

/**
 * Check if this is the user's first demo login (welcome page not yet shown)
 */
export function isFirstDemoLogin(): boolean {
  if (!isInDemoSession()) {
    return false
  }

  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return false
  }

  const welcomeCompleted = sessionStorage.getItem(DEMO_WELCOME_COMPLETED_KEY)
  return welcomeCompleted !== 'true'
}

/**
 * Mark demo welcome as completed
 */
export function markDemoWelcomeCompleted(): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return
  }

  try {
    sessionStorage.setItem(DEMO_WELCOME_COMPLETED_KEY, 'true')
  } catch (error) {
    // Ignore storage errors (e.g., private browsing mode)
    console.warn('[demoMode] Failed to mark welcome as completed:', error)
  }
}

/**
 * Clear demo welcome completion flag (useful for testing or re-showing welcome)
 */
export function clearDemoWelcomeCompleted(): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return
  }

  try {
    sessionStorage.removeItem(DEMO_WELCOME_COMPLETED_KEY)
  } catch (error) {
    // Ignore storage errors
    console.warn('[demoMode] Failed to clear welcome completion:', error)
  }
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

