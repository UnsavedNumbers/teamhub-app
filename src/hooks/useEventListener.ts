/**
 * useEventListener Hook
 * 
 * Automatically manages event listener lifecycle to prevent memory leaks.
 * Adds event listener on mount and removes it on unmount.
 * 
 * Technical Bug Prevention #2: Memory Leaks - Event Listeners Not Cleaned Up
 */

import { useEffect, useRef } from 'react'

/**
 * Hook that adds an event listener and automatically removes it on unmount
 * 
 * @param eventName - Name of the event to listen to
 * @param handler - Event handler function
 * @param element - Element to attach listener to (default: window)
 * 
 * @example
 * ```tsx
 * useEventListener('online', () => setIsOffline(false))
 * useEventListener('offline', () => setIsOffline(true))
 * ```
 */
export function useEventListener(
  eventName: string,
  handler: (event: Event) => void,
  element: Window | Document | HTMLElement = window
): void {
  // Use ref to store handler to avoid re-adding listener on every render
  const handlerRef = useRef(handler)

  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    // Create wrapper that calls the latest handler
    const eventListener = (event: Event) => {
      handlerRef.current(event)
    }

    element.addEventListener(eventName, eventListener)

    // Cleanup: remove listener on unmount
    return () => {
      element.removeEventListener(eventName, eventListener)
    }
  }, [eventName, element])
}
