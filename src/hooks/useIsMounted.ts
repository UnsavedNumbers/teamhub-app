import { useEffect, useRef } from 'react'

/**
 * Hook to track if component is mounted.
 * Useful for preventing state updates after component unmounts.
 */
export function useIsMounted() {
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  return isMountedRef
}
