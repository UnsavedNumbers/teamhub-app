/**
 * Organization Theme Hook
 *
 * Applies organization-specific theme colors to CSS variables.
 * Loads theme from organization settings and applies semantic tokens to :root element.
 */

import { useLayoutEffect, useMemo, useState } from 'react'
import { useOrganization } from '../contexts/OrganizationContext'
import { useUserContext } from './useUserContext'
import { useTheme } from './useTheme'
import { getOrganizationThemeSettings } from '../data/services/organizationSettingsService'
import { getTheme, getDefaultTheme } from '../config/themes'
import { generateTokens, type ThemeTokens } from '../utils/themeTokens'

// Global theme version counter for triggering refetches
let globalThemeVersion = 0

/**
 * Trigger a refetch of the organization theme
 * Call this after updating theme settings to apply changes immediately
 */
export function refreshOrganizationTheme(): void {
  globalThemeVersion++
  // Dispatch custom event to notify all hooks
  window.dispatchEvent(new CustomEvent('organization-theme-changed'))
}

/**
 * Apply theme tokens to CSS variables on :root element
 * Batches all updates in a single DOM operation to prevent flicker
 */
function applyThemeTokens(tokens: ThemeTokens): void {
  const root = document.documentElement
  // Apply all tokens in a single synchronous operation
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

/**
 * Hook to apply organization theme
 *
 * Loads organization's theme_id from settings and applies semantic tokens.
 * Falls back to platform default theme if no theme selected or theme not found.
 * Applies default theme immediately on mount to prevent FOUC.
 * 
 * @returns { ready: boolean } - Indicates when theme is loaded and ready
 */
export function useOrganizationTheme(): { ready: boolean } {
  const { currentOrganization } = useOrganization()
  const { context } = useUserContext()
  const { resolvedTheme } = useTheme()
  const [themeId, setThemeId] = useState<string | null>(null)
  const [_, setIsLoading] = useState(false) // Start as false - theme is ready by default
  const [themeVersion, setThemeVersion] = useState(0)

  // Listen for theme change events
  useLayoutEffect(() => {
    const handleThemeChanged = () => {
      setThemeVersion(v => v + 1)
    }
    window.addEventListener('organization-theme-changed', handleThemeChanged)
    return () => window.removeEventListener('organization-theme-changed', handleThemeChanged)
  }, [])

  // Memoize token generation - only recalculate when theme ID or mode changes
  const tokens = useMemo(() => {
    const theme = themeId ? getTheme(themeId) : getDefaultTheme()
    return generateTokens(theme, resolvedTheme === 'dark')
  }, [themeId, resolvedTheme])

  // Apply default theme synchronously on mount to prevent FOUC
  useLayoutEffect(() => {
    const defaultTheme = getDefaultTheme()
    const defaultTokens = generateTokens(defaultTheme, resolvedTheme === 'dark')
    applyThemeTokens(defaultTokens)
  }, []) // Only run once on mount

  // Apply tokens whenever they change
  useLayoutEffect(() => {
    applyThemeTokens(tokens)

    // Re-apply tokens when tab becomes visible (fixes potential loss during background checks)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        applyThemeTokens(tokens)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [tokens])

  // Load and apply organization theme
  useLayoutEffect(() => {
    const abortController = new AbortController()

    const loadAndApplyTheme = async () => {
      if (!context || !currentOrganization) {
        // No organization - use default theme
        setIsLoading(false)
        return
      }

      // Only set loading if we're actually going to fetch
      setIsLoading(true)

      try {
        const start = performance.now()
        const result = await getOrganizationThemeSettings(context)

        if (abortController.signal.aborted) return

        if (process.env.NODE_ENV === 'development') {
          const duration = performance.now() - start
          if (duration > 500) {
            console.warn(`Theme fetch took ${duration.toFixed(2)}ms`)
          }
        }

        if (result.error) {
          console.warn('Failed to load organization theme settings:', result.error)
          // Keep default theme applied
          setThemeId(null)
          setIsLoading(false)
          return
        }

        // Get theme ID from settings
        const orgThemeId = result.data?.theme_id || null
        setThemeId(orgThemeId)
        setIsLoading(false)
      } catch (error) {
        if (abortController.signal.aborted) return
        console.warn('Failed to load organization theme settings:', error)
        // Keep default theme applied
        setThemeId(null)
        setIsLoading(false)
      }
    }

    loadAndApplyTheme()

    return () => {
      abortController.abort()
    }
  }, [context, currentOrganization?.id, themeVersion]) // Added themeVersion dependency

  // Return ready state - theme is always ready (default theme is applied immediately)
  // Loading state is only for background updates, doesn't block rendering
  const ready = useMemo(() => {
    // Theme is always ready - default theme is applied immediately
    // Loading only affects background theme updates
    return true
  }, [])

  return { ready }
}
