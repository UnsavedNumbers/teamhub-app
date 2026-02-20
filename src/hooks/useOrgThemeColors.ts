/**
 * Hook to get organization theme colors from CSS variables
 * 
 * Returns the primary, secondary, and tertiary colors from the organization theme
 * for use in charts and other components.
 */

import { useMemo } from 'react'

export interface OrgThemeColors {
  primary: string
  secondary: string
  tertiary: string
  // Additional colors for charts
  success: string
  warning: string
  error: string
  info: string
}

/**
 * Get a CSS variable value from the document root
 */
function getCSSVariable(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

/**
 * Hook to get organization theme colors
 * 
 * Reads CSS variables from :root and returns them as an object.
 * Falls back to default colors if variables are not set.
 */
export function useOrgThemeColors(): OrgThemeColors {
  return useMemo(() => {
    return {
      primary: getCSSVariable('--org-color-primary', '#3b82f6'),
      secondary: getCSSVariable('--org-color-secondary', '#10b981'),
      tertiary: getCSSVariable('--org-color-tertiary', '#8b5cf6'),
      success: getCSSVariable('--org-status-success', '#10b981'),
      warning: getCSSVariable('--org-status-warning', '#f59e0b'),
      error: getCSSVariable('--org-status-error', '#ef4444'),
      info: getCSSVariable('--org-status-info', '#3b82f6'),
    }
  }, [])
}

/**
 * Generate a color palette from organization theme colors
 * 
 * Creates an array of colors suitable for charts, cycling through
 * primary, secondary, tertiary, and status colors.
 */
export function useOrgColorPalette(count: number = 6): string[] {
  const colors = useOrgThemeColors()
  
  return useMemo(() => {
    const palette = [
      colors.primary,
      colors.secondary,
      colors.tertiary,
      colors.info,
      colors.success,
      colors.warning,
      colors.error,
    ]
    
    // If we need more colors, cycle through the palette
    const result: string[] = []
    for (let i = 0; i < count; i++) {
      result.push(palette[i % palette.length])
    }
    
    return result
  }, [colors, count])
}
