/**
 * useCopyToClipboard Hook
 * 
 * Provides copy-to-clipboard functionality with state management and fallback.
 * Returns copy function that accepts value at call time (prevents stale closures).
 * 
 * @example
 * const { copy, copied, error } = useCopyToClipboard()
 * 
 * <button onClick={() => copy(currentUrl)}>
 *   {copied ? 'Copied!' : 'Copy'}
 * </button>
 */

import { useState, useCallback } from 'react'

interface UseCopyToClipboardResult {
  copy: (value: string) => Promise<boolean>
  copied: boolean
  error: Error | null
}

const COPIED_TIMEOUT_MS = 2000

export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const copy = useCallback(async (value: string): Promise<boolean> => {
    if (!value) {
      const err = new Error('Cannot copy empty value')
      setError(err)
      return false
    }

    setError(null)

    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), COPIED_TIMEOUT_MS)
        return true
      } catch (err) {
        // Fall through to fallback
      }
    }

    // Fallback: textarea + execCommand (for non-secure contexts)
    try {
      const textArea = document.createElement('textarea')
      textArea.value = value
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      const success = document.execCommand('copy')
      document.body.removeChild(textArea)

      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), COPIED_TIMEOUT_MS)
        return true
      } else {
        throw new Error('execCommand copy failed')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to copy to clipboard')
      setError(error)
      return false
    }
  }, [])

  return { copy, copied, error }
}
