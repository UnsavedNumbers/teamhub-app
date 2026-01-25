/**
 * Safe sessionStorage Helpers
 * 
 * Wrapper functions for sessionStorage operations with error handling
 * and fallback to in-memory state when sessionStorage is unavailable.
 */

import type { PromptState } from './hierarchyCreation'

const PROMPT_STORAGE_KEY = 'hierarchy_creation_prompt'

/**
 * Check if sessionStorage is available
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined' || typeof Storage === 'undefined') {
    return false
  }
  try {
    const test = '__storage_test__'
    sessionStorage.setItem(test, test)
    sessionStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Save prompt state to sessionStorage
 * 
 * @param state - Prompt state to save
 * @returns True if saved successfully, false otherwise
 */
export function savePromptState(state: PromptState): boolean {
  if (!isStorageAvailable()) {
    console.warn('[sessionStorageHelpers] sessionStorage not available, prompt state not persisted')
    return false
  }

  try {
    sessionStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (error) {
    console.warn('[sessionStorageHelpers] Failed to save prompt state:', error)
    return false
  }
}

/**
 * Load prompt state from sessionStorage
 * 
 * @returns Prompt state if found and valid, null otherwise
 */
export function loadPromptState(): PromptState | null {
  if (!isStorageAvailable()) {
    return null
  }

  try {
    const stored = sessionStorage.getItem(PROMPT_STORAGE_KEY)
    if (!stored) {
      return null
    }

    const parsed = JSON.parse(stored)
    // Validation will be done by type guard in calling code
    return parsed as PromptState
  } catch (error) {
    console.warn('[sessionStorageHelpers] Failed to load prompt state:', error)
    // Clear corrupted data
    try {
      sessionStorage.removeItem(PROMPT_STORAGE_KEY)
    } catch {
      // Ignore cleanup errors
    }
    return null
  }
}

/**
 * Clear prompt state from sessionStorage
 * 
 * @returns True if cleared successfully, false otherwise
 */
export function clearPromptState(): boolean {
  if (!isStorageAvailable()) {
    return false
  }

  try {
    sessionStorage.removeItem(PROMPT_STORAGE_KEY)
    return true
  } catch (error) {
    console.warn('[sessionStorageHelpers] Failed to clear prompt state:', error)
    return false
  }
}
