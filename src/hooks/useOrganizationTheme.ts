/**
 * Organization Theme Hook
 *
 * Applies organization-specific theme colors to CSS variables.
 * Loads theme from organization settings and applies to :root element.
 */

import { useEffect } from 'react'
import { useOrganization } from '../contexts/OrganizationContext'
import { useUserContext } from './useUserContext'
import { useTheme } from './useTheme'
import { getOrganizationSettings } from '../data/services/organizationSettingsService'
import { getTheme, getDefaultTheme, type Theme } from '../config/themes'

/**
 * Apply theme colors to CSS variables on :root element
 */
function applyThemeVariables(theme: Theme, isDark: boolean) {
  const root = document.documentElement

  // Get colors, applying dark mode overrides if in dark mode
  const colors = isDark && theme.darkModeOverrides
    ? { ...theme.colors, ...theme.darkModeOverrides }
    : theme.colors

  // Apply organization theme variables (prefixed to avoid conflicts)
  root.style.setProperty('--org-primary', colors.primary)
  root.style.setProperty('--org-secondary', colors.secondary)
  root.style.setProperty('--org-accent', colors.accent)
}

/**
 * Hook to apply organization theme
 *
 * Loads organization's theme_id from settings and applies CSS variables.
 * Falls back to platform default theme if no theme selected or theme not found.
 * Applies theme immediately on mount, then updates when settings load.
 */
export function useOrganizationTheme() {
  const { currentOrganization } = useOrganization()
  const { context } = useUserContext()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    // Apply default theme immediately to prevent FOUC
    const defaultTheme = getDefaultTheme()
    applyThemeVariables(defaultTheme, resolvedTheme === 'dark')

    // Load organization settings and apply theme
    const loadAndApplyTheme = async () => {
      if (!context || !currentOrganization) return

      try {
        const result = await getOrganizationSettings(context)
        
        if (result.data?.general) {
          // Get theme, with validation and fallback
          const themeId = result.data.general.theme_id
          const theme = getTheme(themeId)

          // Apply the theme
          applyThemeVariables(theme, resolvedTheme === 'dark')
        }
      } catch (error) {
        console.warn('Failed to load organization theme settings:', error)
        // Keep default theme applied
      }
    }

    loadAndApplyTheme()
  }, [context, currentOrganization?.id, resolvedTheme])

  // No return value - this hook only applies side effects
}