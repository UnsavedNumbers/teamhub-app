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
import { getFallbackValue, hasFallback } from './featureFlagFallbacks'

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Get current environment from Supabase URL
 * 
 * Pattern: 'dev' if URL contains '-dev', 'staging' if contains '-staging', 'prod' otherwise
 * Defaults to 'dev' if pattern doesn't match (safe default)
 */
export function getEnvironment(): FeatureFlagEnvironment {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  
  if (supabaseUrl.includes('-dev') || supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
    return 'dev'
  }
  
  if (supabaseUrl.includes('-staging')) {
    return 'staging'
  }
  
  return 'prod'
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
    
    // Get current user if not provided
    let finalUserId = userId
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      finalUserId = user?.id || null
    }
    
    // Get environment if not provided
    const finalEnvironment = environment || getEnvironment()
    
    // Call resolution RPC
    const { data, error } = await supabase.rpc('resolve_feature_flag', {
      p_feature_key: key,
      p_user_id: finalUserId ?? undefined,
      p_org_id: orgId ?? undefined,
      p_environment: finalEnvironment,
    } as any)
    
    if (error) {
      console.error(`Error resolving feature flag "${key}":`, error)
      return null
    }
    
    if (!data) {
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
    console.error(`Error resolving feature flag "${key}":`, error)
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
    // Get current user if not provided
    let finalUserId = userId
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      finalUserId = user?.id || null
    }
    
    // Get environment if not provided
    const finalEnvironment = environment || getEnvironment()
    
    // Call batch resolution RPC
    const { data, error } = await supabase.rpc('resolve_feature_flags', {
      p_feature_keys: keys,
      p_user_id: finalUserId ?? undefined,
      p_org_id: orgId ?? undefined,
      p_environment: finalEnvironment,
    } as any)
    
    if (error) {
      console.error('Error resolving feature flags:', error)
      return {}
    }
    
    if (!data) {
      return {}
    }
    
    // Parse and cache results
    const result: Record<string, ResolvedFeatureFlag> = {}
    for (const [key, value] of Object.entries(data)) {
      const resolved: ResolvedFeatureFlag = {
        value: (value as any).value as boolean | number,
        value_type: (value as any).value_type as 'boolean' | 'integer' | 'double',
        resolved_from: (value as any).resolved_from as 'platform' | 'organization' | 'user',
        source_id: (value as any).source_id as string | null,
      }
      setCachedValue(key, resolved)
      result[key] = resolved
    }
    
    return result
  } catch (error) {
    console.error('Error resolving feature flags:', error)
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
  
  // Try to resolve (async, but we'll use fallback immediately)
  // This is best-effort - we don't wait for resolution
  resolveFeatureFlag(key).catch((error) => {
    console.warn(`Failed to resolve feature flag "${key}":`, error)
  })
  
  // Use provided fallback or hardcoded fallback
  if (fallback !== undefined) {
    return fallback
  }
  
  // Try hardcoded fallback
  // We need to know the value type, so we'll try all types
  if (hasFallback(key)) {
    // Try boolean first (most common)
    const boolFallback = getFallbackValue(key, 'boolean')
    if (boolFallback !== undefined) {
      return boolFallback
    }
    
    // Try integer
    const intFallback = getFallbackValue(key, 'integer')
    if (intFallback !== undefined) {
      return intFallback
    }
    
    // Try double
    const doubleFallback = getFallbackValue(key, 'double')
    if (doubleFallback !== undefined) {
      return doubleFallback
    }
  }
  
  // Last resort: default based on common patterns
  if (key.includes('enabled') || key.includes('allow')) {
    console.warn(`Using default fallback false for flag "${key}"`)
    return false
  }
  
  console.warn(`No fallback found for flag "${key}", using default 0`)
  return 0
}

// ============================================================================
// React Hook
// ============================================================================

import { useEffect, useState, useCallback } from 'react'
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
  
  // Resolve flags
  const resolveFlags = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    
    try {
      // If specific keys provided, resolve only those
      // Otherwise, resolve all known flags from fallbacks
      let keysToResolve: string[]
      if (flagKeys) {
        keysToResolve = flagKeys
      } else {
        // Import fallbacks synchronously (they're constants)
        const { FALLBACK_FLAGS } = await import('./featureFlagFallbacks')
        keysToResolve = Object.keys(FALLBACK_FLAGS)
      }
      
      if (keysToResolve.length === 0) {
        setLoading(false)
        return
      }
      
      const resolved = await resolveFeatureFlags(
        keysToResolve,
        user.id,
        currentOrganization?.id || null
      )
      
      setFlags(resolved)
    } catch (error) {
      console.error('Error resolving feature flags:', error)
    } finally {
      setLoading(false)
    }
  }, [user, currentOrganization?.id, flagKeys])
  
  // Resolve flags on mount and when dependencies change
  useEffect(() => {
    resolveFlags()
  }, [resolveFlags])
  
  // Subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = subscribeToFlagChanges()
    
    // Re-resolve flags when cache is invalidated (handled by realtime subscription)
    // We'll also re-resolve when org changes
    return unsubscribe
  }, [currentOrganization?.id])
  
  // Re-resolve when org changes
  useEffect(() => {
    if (user && currentOrganization) {
      resolveFlags()
    }
  }, [currentOrganization?.id, user, resolveFlags])
  
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
    refresh: resolveFlags,
  }
}
