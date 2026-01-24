import { useRef, useEffect } from 'react'

/**
 * Custom hook that returns the previous value of a given value.
 * Useful for comparing previous and current values to detect changes.
 * 
 * @param value - The value to track
 * @returns The previous value (undefined on first render)
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  
  useEffect(() => {
    ref.current = value
  }, [value])
  
  return ref.current
}
