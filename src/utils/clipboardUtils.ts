/**
 * Clipboard Utilities
 * 
 * Provides safe clipboard operations with error handling and user feedback.
 * Prevents crashes when clipboard API is unavailable or fails.
 * 
 * Technical Bug Prevention #7: Clipboard API Failures - Browser Compatibility
 */

import { showSuccess, showError } from './toast'

/**
 * Copy text to clipboard with error handling
 * 
 * @param text - Text to copy
 * @param onSuccess - Optional success callback
 * @param onError - Optional error callback
 * @returns Promise that resolves to true if successful, false otherwise
 * 
 * @example
 * ```tsx
 * await copyToClipboard('Hello World')
 * // Shows success toast automatically
 * ```
 */
export async function copyToClipboard(
  text: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<boolean> {
  if (!navigator.clipboard) {
    const error = new Error('Clipboard API not available')
    onError?.(error)
    showError('Clipboard not supported in this browser')
    return false
  }

  try {
    await navigator.clipboard.writeText(text)
    onSuccess?.()
    showSuccess('Copied to clipboard')
    return true
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to copy to clipboard')
    onError?.(err)
    showError('Failed to copy to clipboard')
    return false
  }
}

/**
 * Copy text to clipboard silently (no toast notifications)
 * 
 * @param text - Text to copy
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboardSilent(text: string): Promise<boolean> {
  if (!navigator.clipboard) {
    return false
  }

  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
