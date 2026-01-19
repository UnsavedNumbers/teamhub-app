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
 * College-style contrast athletic color system
 * Platform admins can add new themes here without database changes
 * 
 * THEME RULES:
 * - Exactly three colors per theme
 * - Primary and Secondary must be visually contrasting
 * - Accent must be neutral (white, off-white, charcoal, or black)
 * - Designed for light and dark mode
 */
export const THEMES: Theme[] = [
  // ============================================================
  // DEFAULT
  // ============================================================
  {
    id: 'default',
    name: 'Default Blue',
    colors: {
      primary: '#003A8F',
      secondary: '#B6C9E2',
      accent: '#FFFFFF'
    },
    status: 'active'
  },

  // ============================================================
  // RED + GOLD / YELLOW FAMILY
  // ============================================================
  {
    id: 'crimson_gold',
    name: 'Crimson Gold',
    colors: {
      primary: '#9E1B32',
      secondary: '#F5C400',
      accent: '#FFFFFF'
    },
    status: 'active'
  },
  {
    id: 'scarlet_metallic',
    name: 'Scarlet Metallic',
    colors: {
      primary: '#C1121F',
      secondary: '#B7A57A',
      accent: '#111111'
    },
    status: 'active'
  },

  // ============================================================
  // CRIMSON + GRAY / WHITE
  // ============================================================
  {
    id: 'crimson_slate',
    name: 'Crimson Slate',
    colors: {
      primary: '#7A0019',
      secondary: '#9EA2A2',
      accent: '#FFFFFF'
    },
    status: 'active'
  },
  {
    id: 'deep_red_neutral',
    name: 'Deep Red Neutral',
    colors: {
      primary: '#8B1E1E',
      secondary: '#E5E5E5',
      accent: '#111111'
    },
    status: 'active'
  },

  // ============================================================
  // NAVY + GOLD FAMILY
  // ============================================================
  {
    id: 'navy_gold_classic',
    name: 'Navy Gold Classic',
    colors: {
      primary: '#0B1C2D',
      secondary: '#D4AF37',
      accent: '#FFFFFF'
    },
    status: 'active'
  },
  {
    id: 'midnight_gold',
    name: 'Midnight Gold',
    colors: {
      primary: '#0A2342',
      secondary: '#F2C94C',
      accent: '#111111'
    },
    status: 'active'
  },

  // ============================================================
  // BLUE + ORANGE FAMILY
  // ============================================================
  {
    id: 'royal_burnt',
    name: 'Royal Burnt',
    colors: {
      primary: '#0D47A1',
      secondary: '#EF6C00',
      accent: '#FFFFFF'
    },
    status: 'active'
  },
  {
    id: 'deep_blue_copper',
    name: 'Deep Blue Copper',
    colors: {
      primary: '#002855',
      secondary: '#C46B3C',
      accent: '#FFFFFF'
    },
    status: 'active'
  },

  // ============================================================
  // BLUE + WHITE / SILVER
  // ============================================================
  {
    id: 'true_blue',
    name: 'True Blue',
    colors: {
      primary: '#003A8F',
      secondary: '#E5E5E5',
      accent: '#111111'
    },
    status: 'active'
  },
  {
    id: 'steel_blue_contrast',
    name: 'Steel Blue',
    colors: {
      primary: '#1F4E79',
      secondary: '#B0BEC5',
      accent: '#FFFFFF'
    },
    status: 'active'
  },

  // ============================================================
  // GREEN + GOLD FAMILY
  // ============================================================
  {
    id: 'forest_gold',
    name: 'Forest Gold',
    colors: {
      primary: '#1B5E20',
      secondary: '#F9A825',
      accent: '#FFFFFF'
    },
    status: 'active'
  },
  {
    id: 'dark_green_athletic',
    name: 'Dark Green Athletic',
    colors: {
      primary: '#0B3D2E',
      secondary: '#C9A227',
      accent: '#FFFFFF'
    },
    status: 'active'
  },

  // ============================================================
  // GREEN + WHITE / BLACK
  // ============================================================
  {
    id: 'spartan_green',
    name: 'Spartan Green',
    colors: {
      primary: '#18453B',
      secondary: '#FFFFFF',
      accent: '#111111'
    },
    status: 'active'
  },
  {
    id: 'field_black',
    name: 'Field Black',
    colors: {
      primary: '#1E4D2B',
      secondary: '#111111',
      accent: '#FFFFFF'
    },
    status: 'active'
  },

  // ============================================================
  // PURPLE + GOLD FAMILY
  // ============================================================
  {
    id: 'royal_gold',
    name: 'Royal Gold',
    colors: {
      primary: '#4A148C',
      secondary: '#FBC02D',
      accent: '#FFFFFF'
    },
    status: 'active'
  },
  {
    id: 'deep_purple_classic',
    name: 'Deep Purple Classic',
    colors: {
      primary: '#3A0F6F',
      secondary: '#C9A227',
      accent: '#FFFFFF'
    },
    status: 'active'
  },

  // ============================================================
  // ORANGE + NAVY FAMILY
  // ============================================================
  {
    id: 'burnt_navy',
    name: 'Burnt Navy',
    colors: {
      primary: '#BF360C',
      secondary: '#0D1B2A',
      accent: '#FFFFFF'
    },
    status: 'active'
  },
  {
    id: 'bright_navy',
    name: 'Bright Navy',
    colors: {
      primary: '#EF6C00',
      secondary: '#1F3A5F',
      accent: '#FFFFFF'
    },
    status: 'active'
  },

  // ============================================================
  // BLACK + RED FAMILY
  // ============================================================
  {
    id: 'black_cardinal',
    name: 'Black Cardinal',
    colors: {
      primary: '#111111',
      secondary: '#8C1D18',
      accent: '#FFFFFF'
    },
    status: 'active'
  },
  {
    id: 'charcoal_scarlet',
    name: 'Charcoal Scarlet',
    colors: {
      primary: '#1F2933',
      secondary: '#C1121F',
      accent: '#FFFFFF'
    },
    status: 'active'
  },

  // ============================================================
  // TEAL + ORANGE / GOLD
  // ============================================================
  {
    id: 'teal_sunrise',
    name: 'Teal Sunrise',
    colors: {
      primary: '#005F73',
      secondary: '#F4A261',
      accent: '#FFFFFF'
    },
    status: 'active'
  },
  {
    id: 'teal_gold',
    name: 'Teal Gold',
    colors: {
      primary: '#006064',
      secondary: '#D4AF37',
      accent: '#FFFFFF'
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