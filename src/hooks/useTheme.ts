/**
 * Theme Management Hook
 * 
 * Provides theme state management with:
 * - localStorage persistence (instant, works offline)
 * - Supabase sync (for cross-device consistency)
 * - System preference detection
 * - Demo mode support
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { updateUserPreference, getUserPreferences } from '../data/services/preferencesService'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  mode: ThemeMode
  resolvedTheme: 'light' | 'dark' // Actual theme being applied
  loading: boolean
  error: Error | null
}

const THEME_CHANGE_EVENT = 'app-theme-change'

/**
 * Get system preference (light/dark)
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Get theme from localStorage
 */
function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('theme-preference')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored as ThemeMode
    }
  } catch (_error) {
    // Silently fail
  }
  
  return null
}

/**
 * Store theme to localStorage
 */
function setStoredTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem('theme-preference', theme)
  } catch (_error) {
    // Silently fail
  }
}

function emitThemeChange(mode: ThemeMode): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { mode } }))
}

/**
 * Apply theme class to document
 */
function applyTheme(theme: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return
  
  const html = document.documentElement
  if (theme === 'dark') {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
}

/**
 * Resolve actual theme from mode
 */
function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return getSystemTheme()
  }
  return mode
}

export function useTheme() {
  const { user, profile } = useAuth()
  const [state, setState] = useState<ThemeState>(() => {
    // Initialize from localStorage (instant)
    const stored = getStoredTheme()
    const initialMode = stored || 'system'
    const resolved = resolveTheme(initialMode)
    
    // Apply immediately (before React hydration)
    if (typeof document !== 'undefined') {
      applyTheme(resolved)
    }
    
    return {
      mode: initialMode,
      resolvedTheme: resolved,
      loading: true, // Will load from Supabase if authenticated
      error: null,
    }
  })

  // Load from Supabase on mount (if authenticated)
  // CRITICAL: localStorage is the source of truth - only use Supabase if localStorage is empty
  useEffect(() => {
    if (!user || !profile) {
      // Not authenticated - use localStorage only
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    let cancelled = false

    const loadFromSupabase = async () => {
      try {
        // Check localStorage first - it's the source of truth for user's current preference
        const storedLocal = getStoredTheme()
        
        // If localStorage has a value, use it and sync to Supabase (localStorage wins)
        if (storedLocal) {
          // Sync localStorage value to Supabase in background (non-blocking)
          updateUserPreference(user.id, 'theme', storedLocal).catch(() => {
            // Silently fail - non-critical
          })
          
          // Keep using localStorage value
          setState(prev => ({ ...prev, loading: false }))
          return
        }

        // localStorage is empty - try Supabase (first-time user or cleared storage)
        const { data, error } = await getUserPreferences(user.id)
        
        if (cancelled) return

        if (error) {
          setState(prev => ({ ...prev, loading: false }))
          return
        }

        // If Supabase has a preference and localStorage is empty, use Supabase
        if (data?.theme) {
          const supabaseTheme = data.theme as ThemeMode
          if (supabaseTheme === 'light' || supabaseTheme === 'dark' || supabaseTheme === 'system') {
            setStoredTheme(supabaseTheme)
            const resolved = resolveTheme(supabaseTheme)
            applyTheme(resolved)
            setState({
              mode: supabaseTheme,
              resolvedTheme: resolved,
              loading: false,
              error: null,
            })
            return
          }
        }

        // No preference anywhere - keep current state (system default)
        setState(prev => ({ ...prev, loading: false }))
      } catch (err) {
        if (cancelled) return
        setState(prev => ({ ...prev, loading: false, error: err instanceof Error ? err : new Error('Unknown error') }))
      }
    }

    loadFromSupabase()

    return () => {
      cancelled = true
    }
  }, [user, profile])

  // Keep all hook instances in sync within the same tab and across tabs.
  useEffect(() => {
    const syncTheme = (nextMode: ThemeMode) => {
      const resolved = resolveTheme(nextMode)
      applyTheme(resolved)
      setState((prev) => ({
        ...prev,
        mode: nextMode,
        resolvedTheme: resolved,
        loading: false,
      }))
    }

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode?: ThemeMode }>
      if (!customEvent.detail?.mode) return
      syncTheme(customEvent.detail.mode)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'theme-preference') return
      const stored = getStoredTheme()
      if (!stored) return
      syncTheme(stored)
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Listen to system preference changes (when mode is 'system')
  useEffect(() => {
    if (state.mode !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = () => {
      const resolved = resolveTheme('system')
      applyTheme(resolved)
      setState(prev => ({ ...prev, resolvedTheme: resolved }))
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    
    // Fallback for older browsers
    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [state.mode])

  // Toggle theme
  const setTheme = useCallback(async (mode: ThemeMode) => {
    // Update local state immediately
    const resolved = resolveTheme(mode)
    applyTheme(resolved)
    setStoredTheme(mode)
    emitThemeChange(mode)
    
    setState({
      mode,
      resolvedTheme: resolved,
      loading: false,
      error: null,
    })

    // Sync to Supabase (if authenticated, non-blocking)
    if (user && profile) {
      try {
        await updateUserPreference(user.id, 'theme', mode)
      } catch (error) {
        // Don't update state - localStorage is already updated
        setState(prev => ({ ...prev, error: error instanceof Error ? error : new Error('Unknown error') }))
      }
    }
  }, [user, profile])

  return {
    mode: state.mode,
    resolvedTheme: state.resolvedTheme,
    loading: state.loading,
    error: state.error,
    setTheme,
    toggle: useCallback(() => {
      // Toggle between light and dark (skip system)
      const nextMode = state.resolvedTheme === 'dark' ? 'light' : 'dark'
      setTheme(nextMode)
    }, [state.resolvedTheme, setTheme]),
  }
}
