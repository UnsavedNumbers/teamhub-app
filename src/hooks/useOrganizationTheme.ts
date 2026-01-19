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
  }, [tokens])

  // Load and apply organization theme
  useLayoutEffect(() => {
    let cancelled = false

    const loadAndApplyTheme = async () => {
      if (!context || !currentOrganization) {
        // No organization - use default theme (already applied)
        // Theme is ready immediately
        return
      }

      // Only set loading if we're actually going to fetch
      setIsLoading(true)

      try {
        const result = await getOrganizationThemeSettings(context)

        if (cancelled) return

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
        if (cancelled) return
        console.warn('Failed to load organization theme settings:', error)
        // Keep default theme applied
        setThemeId(null)
        setIsLoading(false)
      }
    }

    loadAndApplyTheme()

    return () => {
      cancelled = true
    }
  }, [context, currentOrganization?.id])

  // Return ready state - theme is always ready (default theme is applied immediately)
  // Loading state is only for background updates, doesn't block rendering
  const ready = useMemo(() => {
    // Theme is always ready - default theme is applied immediately
    // Loading only affects background theme updates
    return true
  }, [])

  return { ready }
}
