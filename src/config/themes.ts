/**
 * Organization Theme Configuration
 *
 * Central source of truth for all available organization themes.
 * Themes are stored in code (not database) for easy management and updates.
 */

export interface Theme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  lightModeOverrides?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  darkModeOverrides?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  status: 'active' | 'hidden'
}

/**
 * Available organization themes
 * Platform admins can add new themes here without database changes
 */
export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Default Blue',
    colors: {
      primary: '#1e40af',    // Blue-800
      secondary: '#3b82f6',  // Blue-500
      accent: '#d946ef'      // Fuchsia-500
    },
    status: 'active'
  },
  {
    id: 'forest',
    name: 'Forest Green',
    colors: {
      primary: '#166534',    // Green-800
      secondary: '#16a34a',  // Green-600
      accent: '#f59e0b'      // Amber-500
    },
    status: 'active'
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    colors: {
      primary: '#9a3412',    // Orange-800
      secondary: '#ea580c',  // Orange-600
      accent: '#7c3aed'     // Violet-600
    },
    status: 'active'
  },
  {
    id: 'ocean',
    name: 'Ocean Teal',
    colors: {
      primary: '#115e59',    // Teal-800
      secondary: '#0d9488',  // Teal-600
      accent: '#ec4899'     // Pink-500
    },
    status: 'active'
  },
  {
    id: 'royal',
    name: 'Royal Purple',
    colors: {
      primary: '#581c87',    // Purple-800
      secondary: '#9333ea',  // Purple-600
      accent: '#f97316'     // Orange-500
    },
    status: 'active'
  }
]

/**
 * Get all active themes (available for selection)
 */
export function getActiveThemes(): Theme[] {
  return THEMES.filter(theme => theme.status === 'active')
}

/**
 * Get platform default theme (first theme with id 'default' or first active theme)
 */
export function getDefaultTheme(): Theme {
  const defaultTheme = THEMES.find(theme => theme.id === 'default')
  if (defaultTheme) return defaultTheme

  const firstActive = THEMES.find(theme => theme.status === 'active')
  if (firstActive) return firstActive

  // Fallback to first theme if no active themes (shouldn't happen)
  return THEMES[0]
}

/**
 * Get theme by ID with validation and fallback
 * @param themeId - Theme ID to find, or null for default
 * @returns Theme object or null if not found (falls back to default)
 */
export function getTheme(themeId: string | null): Theme {
  if (!themeId) return getDefaultTheme()

  const theme = THEMES.find(t => t.id === themeId)
  if (!theme) {
    console.warn(`Theme "${themeId}" not found, using default`)
    return getDefaultTheme()
  }

  return theme
}