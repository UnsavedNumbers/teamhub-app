/**
 * useOrganizationSports Hook
 * 
 * Reusable hook for loading organization sports with error handling.
 * Implements bug prevention measures for memory leaks, race conditions, and proper cleanup.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUserContext } from './useUserContext'
import { useIsMounted } from './useIsMounted'
import { getSports } from '../data/services/sportsService'
import type { Sport } from '../data/types/organization'

interface UseOrganizationSportsResult {
  sports: Sport[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch and manage organization sports
 * 
 * @returns {UseOrganizationSportsResult} Object containing sports array, loading state, error, and refetch function
 */
export function useOrganizationSports(): UseOrganizationSportsResult {
  const { context, isReady } = useUserContext()
  const isMounted = useIsMounted()
  
  const [sports, setSports] = useState<Sport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [trigger, setTrigger] = useState(0)
  
  // Bug Prevention #2: AbortController for race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null)

  // Bug Prevention #6: Stable refetch function using trigger pattern
  const refetch = useCallback(() => {
    setTrigger(prev => prev + 1)
  }, [])

  // Bug Prevention #3: Include all dependencies in useEffect
  useEffect(() => {
    // Bug Prevention #9: Check isReady and context inside hook, not conditionally
    if (!isReady || !context?.orgId) {
      if (isMounted.current) {
        setLoading(false)
        setSports([])
        setError(null)
      }
      return
    }

    // Bug Prevention #2: Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this request
    const controller = new AbortController()
    abortControllerRef.current = controller

    // Bug Prevention #1: Check isMounted before state updates
    if (!isMounted.current) return

    setLoading(true)
    setError(null)

    const loadSports = async () => {
      try {
        const result = await getSports(context)

        // Bug Prevention #2: Check if request was aborted
        if (controller.signal.aborted) return

        // Bug Prevention #1: Check isMounted before state updates
        if (!isMounted.current) return

        if (result.error) {
          throw result.error
        }

        // Bug Prevention #4: Type guard for Sport[] vs FakeSport[]
        const sportsData = Array.isArray(result.data) ? (result.data as Sport[]) : []

        // Bug Prevention #2: Check again if aborted before final state update
        if (controller.signal.aborted) return

        // Bug Prevention #1: Check isMounted before state updates
        if (!isMounted.current) return

        setSports(sportsData)
        setError(null)
      } catch (err) {
        // Bug Prevention #2: Don't update state if request was aborted
        if (controller.signal.aborted) return

        // Bug Prevention #1: Check isMounted before state updates
        if (!isMounted.current) return

        const error = err instanceof Error ? err : new Error('Unknown error loading sports')
        setError(error)
        setSports([]) // Graceful degradation: return empty array on error
      } finally {
        // Bug Prevention #2: Check if aborted before setting loading to false
        if (controller.signal.aborted) return

        // Bug Prevention #1: Check isMounted before state updates
        if (!isMounted.current) return

        setLoading(false)
      }
    }

    loadSports()

    // Bug Prevention #10: Cleanup AbortController in useEffect return function
    return () => {
      controller.abort()
      abortControllerRef.current = null
    }
  }, [context, isReady, trigger, isMounted])

  return {
    sports,
    loading,
    error,
    refetch,
  }
}
