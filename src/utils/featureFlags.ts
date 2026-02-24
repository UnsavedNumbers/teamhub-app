/**
 * Feature Flags Utilities
 * 
 * Frontend utilities for resolving and caching feature flags.
 * Includes environment detection, resolution functions, caching, and React hooks.
 */

import { supabase } from '../lib/supabase'
import type {
  FeatureFlagEnvironment,
  ResolvedFeatureFlag,
  CachedFlagValue,
} from '../types/featureFlags.types'

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Get current environment from VITE_APP_ENV
 *
 * Only 'prod' is treated as production; anything else (including missing/empty) is 'dev'.
 * Explicit 'staging' is supported when VITE_APP_ENV=staging.
 */
export function getEnvironment(): FeatureFlagEnvironment {
  const appEnv = (import.meta.env.VITE_APP_ENV || '').toLowerCase().trim()

  if (appEnv === 'prod') return 'prod'
  if (appEnv === 'staging') return 'staging'
  return 'dev'
}

// ============================================================================
// Flag Cache
// ============================================================================

/**
 * In-memory cache for resolved feature flags
 * Key: flag key, Value: cached flag value with metadata
 */
const flagCache = new Map<string, CachedFlagValue>()

/**
 * Cache TTL in milliseconds (5 minutes)
 */
// Removed - unused constant
// const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Check if cached value is still valid
 */
// Removed - unused helper
// function isCacheValid(cached: CachedFlagValue): boolean {
//   const age = Date.now() - cached.timestamp
//   return age < CACHE_TTL_MS
// }

/**
 * Get cached flag value if available and valid
 */
function getCachedValue(key: string): CachedFlagValue | null {
  const cached = flagCache.get(key)
  if (!cached) {
    return null
  }
  
  // Use cached value even if stale (graceful degradation)
  // TTL is just a safety net, realtime keeps it fresh
  return cached
}

/**
 * Set cached flag value
 */
function setCachedValue(key: string, resolved: ResolvedFeatureFlag): void {
  flagCache.set(key, {
    ...resolved,
    timestamp: Date.now(),
  })
}

/**
 * Invalidate cache for a flag key
 */
export function invalidateFlagCache(key?: string): void {
  if (key) {
    flagCache.delete(key)
  } else {
    flagCache.clear()
  }
  // Also clear negative cache on explicit invalidation
  _lastBatchFailure = 0
}

/**
 * Negative cache: prevent retry storms when the RPC is unreachable (CORS, network).
 * After a batch failure we skip new RPCs for NEGATIVE_CACHE_TTL_MS.
 */
const NEGATIVE_CACHE_TTL_MS = 30_000 // 30 seconds
let _lastBatchFailure = 0

function isInNegativeCooldown(): boolean {
  return _lastBatchFailure > 0 && Date.now() - _lastBatchFailure < NEGATIVE_CACHE_TTL_MS
}

function markBatchFailure(): void {
  _lastBatchFailure = Date.now()
}

// ============================================================================
// Realtime Subscription
// ============================================================================

let realtimeSubscription: ReturnType<typeof supabase.channel> | null = null
let subscriptionActive = false

/**
 * Subscribe to feature flag changes via Supabase Realtime
 * Automatically invalidates cache when flags change
 */
export function subscribeToFlagChanges(): () => void {
  if (subscriptionActive) {
    // Already subscribed, return cleanup function
    return () => {
      if (realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription)
        realtimeSubscription = null
        subscriptionActive = false
      }
    }
  }
  
  subscriptionActive = true
  
  // Subscribe to all feature flag tables
  realtimeSubscription = supabase
    .channel('feature_flags_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feature_flags',
      },
      (payload) => {
        // Invalidate cache for this flag
        if (payload.new && 'key' in payload.new) {
          invalidateFlagCache(payload.new.key as string)
        }
        if (payload.old && 'key' in payload.old) {
          invalidateFlagCache(payload.old.key as string)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feature_flag_platform_defaults',
      },
      () => {
        // Invalidate all cache (platform default affects all flags)
        invalidateFlagCache()
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feature_flag_org_overrides',
      },
      (_payload) => {
        // Invalidate all cache (org override affects resolution)
        invalidateFlagCache()
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'feature_flag_user_overrides',
      },
      (_payload) => {
        // Invalidate all cache (user override affects resolution)
        invalidateFlagCache()
      }
    )
    .subscribe()
  
  return () => {
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription)
      realtimeSubscription = null
      subscriptionActive = false
    }
  }
}

// ============================================================================
// Flag Resolution
// ============================================================================

/**
 * Resolve a single feature flag
 * 
 * @param key - Feature flag key
 * @param userId - Optional user ID (auto-detected from auth if not provided)
 * @param orgId - Optional org ID (auto-detected from OrganizationContext if not provided)
 * @param environment - Optional environment (auto-detected if not provided)
 * @returns Resolved flag value or null if not found
 */
export async function resolveFeatureFlag(
  key: string,
  userId?: string | null,
  orgId?: string | null,
  environment?: FeatureFlagEnvironment
): Promise<ResolvedFeatureFlag | null> {
  try {
    // Check cache first
    const cached = getCachedValue(key)
    if (cached) {
      return {
        value: cached.value,
        value_type: cached.value_type,
        resolved_from: cached.resolved_from,
        source_id: cached.source_id,
      }
    }
    
    // Skip RPC if we recently had a batch failure (CORS / network)
    if (isInNegativeCooldown()) {
      return null
    }

    // Get current user if not provided
    let finalUserId = userId
    if (!finalUserId) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        finalUserId = user?.id || null
      } catch (err) {
        // Session lock timeout, AbortError, or other auth error - use null
        // This is safe for admin pages without org context
        finalUserId = null
      }
    }
    
    // Get environment if not provided
    const finalEnvironment = environment || getEnvironment()
    
    // Call resolution RPC
    let data: any
    let error: any
    try {
      const response = await supabase.rpc('resolve_feature_flag', {
        p_feature_key: key,
        p_user_id: finalUserId ?? undefined,
        p_org_id: orgId ?? undefined,
        p_environment: finalEnvironment,
      } as any)
      data = response.data
      error = response.error
    } catch (rpcErr) {
      // AbortError from navigator lock contention is benign - return null
      if (rpcErr instanceof DOMException && rpcErr.name === 'AbortError') {
        return null
      }
      // RPC call failed - mark negative cache to prevent retry storm
      markBatchFailure()
      error = rpcErr
    }
    
    if (error) {
      markBatchFailure()
      console.error(`Error resolving feature flag "${key}":`, error)
      return null
    }
    
    if (!data) {
      // Flag not found - default boolean flags to false
      const isBooleanFlag = key.includes('enabled') || 
                           key.includes('allow') || 
                           key.includes('enable')
      
      if (isBooleanFlag) {
        const defaultResolved: ResolvedFeatureFlag = {
          value: false,
          value_type: 'boolean',
          resolved_from: 'platform',
          source_id: null,
        }
        setCachedValue(key, defaultResolved)
        return defaultResolved
      }
      
      return null
    }
    
    // Parse resolved value
    const resolved: ResolvedFeatureFlag = {
      value: (data as any).value as boolean | number,
      value_type: (data as any).value_type as 'boolean' | 'integer' | 'double',
      resolved_from: (data as any).resolved_from as 'platform' | 'organization' | 'user',
      source_id: (data as any).source_id as string | null,
    }
    
    // Cache the result
    setCachedValue(key, resolved)
    
    return resolved
  } catch (error) {
    // Suppress AbortError from navigator lock contention (benign race condition)
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.error(`Error resolving feature flag "${key}":`, error)
    }
    return null
  }
}

/**
 * Resolve multiple feature flags in batch
 * 
 * @param keys - Array of feature flag keys
 * @param userId - Optional user ID
 * @param orgId - Optional org ID
 * @param environment - Optional environment
 * @returns Object with flag keys as keys and resolved values as values
 */
export async function resolveFeatureFlags(
  keys: string[],
  userId?: string | null,
  orgId?: string | null,
  environment?: FeatureFlagEnvironment
): Promise<Record<string, ResolvedFeatureFlag>> {
  try {
    // Skip RPC if we recently had a batch failure (CORS / network)
    if (isInNegativeCooldown()) {
      return {}
    }

    // Get current user if not provided
    let finalUserId = userId
    if (!finalUserId) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        finalUserId = user?.id || null
      } catch (err) {
        // Session lock timeout, AbortError, or other auth error - use null
        finalUserId = null
      }
    }
    
    // Get environment if not provided
    const finalEnvironment = environment || getEnvironment()
    
    // Call batch resolution RPC
    let data: any
    let error: any
    try {
      const response = await supabase.rpc('resolve_feature_flags', {
        p_feature_keys: keys,
        p_user_id: finalUserId ?? undefined,
        p_org_id: orgId ?? undefined,
        p_environment: finalEnvironment,
      } as any)
      data = response.data
      error = response.error
    } catch (rpcErr) {
      // AbortError from navigator lock contention is benign - return empty
      if (rpcErr instanceof DOMException && rpcErr.name === 'AbortError') {
        return {}
      }
      // RPC call failed - mark negative cache to prevent retry storm
      markBatchFailure()
      error = rpcErr
    }
    
    if (error) {
      markBatchFailure()
      console.error('Error resolving feature flags:', error)
      return {}
    }
    
    if (!data) {
      return {}
    }
    
    // Parse and cache results
    const result: Record<string, ResolvedFeatureFlag> = {}
    const resolvedKeys = new Set<string>()
    
    for (const [key, value] of Object.entries(data)) {
      const resolved: ResolvedFeatureFlag = {
        value: (value as any).value as boolean | number,
        value_type: (value as any).value_type as 'boolean' | 'integer' | 'double',
        resolved_from: (value as any).resolved_from as 'platform' | 'organization' | 'user',
        source_id: (value as any).source_id as string | null,
      }
      setCachedValue(key, resolved)
      result[key] = resolved
      resolvedKeys.add(key)
    }
    
    // For any requested keys that weren't resolved, default boolean flags to false
    for (const key of keys) {
      if (!resolvedKeys.has(key)) {
        // Check if this looks like a boolean flag (common patterns)
        const isBooleanFlag = key.includes('enabled') || 
                             key.includes('allow') || 
                             key.includes('enable')
        
        if (isBooleanFlag) {
          const defaultResolved: ResolvedFeatureFlag = {
            value: false,
            value_type: 'boolean',
            resolved_from: 'platform',
            source_id: null,
          }
          setCachedValue(key, defaultResolved)
          result[key] = defaultResolved
        }
      }
    }
    
    return result
  } catch (error) {
    // Suppress AbortError from navigator lock contention (benign race condition)
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.error('Error resolving feature flags:', error)
    }
    return {}
  }
}

/**
 * Get feature flag value synchronously from cache
 * Falls back to hardcoded fallback if cache miss and resolution fails
 * 
 * @param key - Feature flag key
 * @param fallback - Optional fallback value (overrides hardcoded fallback)
 * @returns Flag value or fallback
 */
export function getFeatureFlagValue(
  key: string,
  fallback?: boolean | number
): boolean | number {
  // Check cache first
  const cached = getCachedValue(key)
  if (cached) {
    return cached.value
  }
  
  // NOTE: Do NOT fire an async resolveFeatureFlag() here.
  // This function is called synchronously during React render
  // (e.g. from useFeatureFlags().isEnabled()). Firing an async
  // supabase.auth.getUser() call from inside render causes
  // navigator-lock contention and AbortErrors when multiple flags
  // are checked in parallel. The useFeatureFlags hook already
  // resolves flags asynchronously on mount; a cache miss here
  // simply means the hook hasn't finished yet, so return the
  // fallback.
  
  // Use provided fallback
  if (fallback !== undefined) {
    return fallback
  }
  
  // Last resort: default based on common patterns for boolean flags
  // If the key suggests it's a boolean flag, default to false
  if (key.includes('enabled') || 
      key.includes('allow') || 
      key.includes('enable') ||
      key.includes('_flag') ||
      key.endsWith('_on') ||
      key.endsWith('_off')) {
    return false
  }
  
  // For other types, default to 0
  return 0
}

// ============================================================================
// React Hook
// ============================================================================

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from '../hooks/useAuth'

/**
 * React hook for feature flags
 * 
 * Automatically:
 * - Reads currentOrganization from OrganizationContext
 * - Reads current user ID from auth context
 * - Resolves all flags once on mount
 * - Subscribes to realtime updates
 * - Provides cached flag values
 * 
 * @param flagKeys - Optional array of flag keys to resolve (if not provided, resolves all known flags)
 * @returns Object with flag values and loading state
 */
export function useFeatureFlags(flagKeys?: string[]) {
  const { currentOrganization } = useOrganization()
  const { user } = useAuth()
  const [flags, setFlags] = useState<Record<string, ResolvedFeatureFlag>>({})
  const [loading, setLoading] = useState(true)

  // Track mount state for safe async setState
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Stabilise the flagKeys array: compare by sorted join instead of reference
  const keysString = useMemo(
    () => (flagKeys ? [...flagKeys].sort().join(',') : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flagKeys?.join(',')]
  )

  // Resolve flags — depends only on primitives, not on array references
  const resolveFlags = useCallback(async (signal?: AbortSignal) => {
    if (!user) {
      if (isMountedRef.current) setLoading(false)
      return
    }

    if (isMountedRef.current) setLoading(true)

    try {
      // Determine keys to resolve
      let keysToResolve: string[]
      if (keysString) {
        keysToResolve = keysString.split(',')
      } else {
        // If no keys specified, don't resolve anything
        keysToResolve = []
      }

      if (keysToResolve.length === 0) {
        if (isMountedRef.current) setLoading(false)
        return
      }

      // Bail if already aborted
      if (signal?.aborted) return

      const resolved = await resolveFeatureFlags(
        keysToResolve,
        user.id,
        currentOrganization?.id || null
      )

      if (isMountedRef.current && !signal?.aborted) {
        setFlags(resolved)
      }
    } catch (error) {
      // Silently ignore AbortError (component unmounted or deps changed)
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('Error resolving feature flags:', error)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [user?.id, currentOrganization?.id, keysString]) // eslint-disable-line react-hooks/exhaustive-deps

  // Single effect that fetches on mount / deps change with abort support
  useEffect(() => {
    const ac = new AbortController()
    resolveFlags(ac.signal)
    return () => { ac.abort() }
  }, [resolveFlags])

  // Subscribe to realtime updates (once per org)
  useEffect(() => {
    return subscribeToFlagChanges()
  }, [currentOrganization?.id])

  /**
   * Get flag value (synchronous, from cache)
   */
  const getFlag = useCallback((key: string, fallback?: boolean | number): boolean | number => {
    const resolved = flags[key]
    if (resolved) {
      return resolved.value
    }
    return getFeatureFlagValue(key, fallback)
  }, [flags])

  /**
   * Check if flag is enabled (for boolean flags)
   */
  const isEnabled = useCallback((key: string): boolean => {
    return getFlag(key, false) === true
  }, [getFlag])

  return {
    flags,
    loading,
    getFlag,
    isEnabled,
    refresh: () => resolveFlags(),
  }
}
