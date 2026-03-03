/**
 * Theme Token Generation Utility
 * 
 * Converts organization theme colors into semantic UI tokens.
 * Handles color manipulation, contrast checking, and dark mode adjustments.
 */

import { colord, Colord } from 'colord'
import type { Theme } from '../config/themes'
import { getDefaultTheme } from '../config/themes'

/**
 * Token interface defining all theme-derived CSS custom properties
 */
export interface ThemeTokens {
  // Explicit color-role tokens
  '--org-color-primary': string
  '--org-color-secondary': string
  '--org-color-tertiary': string

  // Existing action tokens (platform admin compatibility)
  '--pa-theme-action-primary': string
  '--pa-theme-action-hover': string
  '--pa-theme-action-active': string
  '--pa-theme-surface-accent': string
  '--pa-theme-surface-highlight': string
  '--pa-theme-text-accent': string
  '--pa-theme-text-on-action': string
  '--pa-theme-border-accent': string
  '--pa-theme-focus-ring': string

  // Portal/Org-specific aliases and tokens
  '--org-btn-primary-bg': string
  '--org-btn-primary-hover': string
  '--org-btn-primary-active': string
  '--org-btn-primary-text': string
  '--org-btn-secondary-bg': string
  '--org-btn-secondary-hover': string
  '--org-btn-secondary-active': string
  '--org-btn-secondary-text': string
  '--org-btn-secondary-border': string
  '--org-link-color': string
  '--org-link-hover': string
  '--org-link-muted': string
  '--org-badge-primary-bg': string
  '--org-badge-primary-text': string
  '--org-card-accent-border': string
  '--org-card-accent-bg': string
  '--org-highlight-bg': string
  '--org-focus-ring': string

  // Extended UI tokens from theme.ui
  '--org-text-primary': string
  '--org-text-secondary': string
  '--org-text-muted': string
  '--org-text-inverse': string
  '--org-surface-primary': string
  '--org-surface-secondary': string
  '--org-surface-tertiary': string
  '--org-surface-page': string
  '--org-surface-section': string
  '--org-surface-card': string
  '--org-surface-card-header': string
  '--org-surface-hover': string
  '--org-surface-active': string
  '--org-surface-tint': string
  '--org-border-default': string
  '--org-border-subtle': string
  '--org-border-active': string
  '--org-border-strong': string
  '--org-btn-disabled-bg': string
  '--org-btn-disabled-text': string
  '--org-status-success': string
  '--org-status-warning': string
  '--org-status-error': string
  '--org-status-info': string
}

export const THEME_TOKEN_NAMES = [
  '--org-color-primary',
  '--org-color-secondary',
  '--org-color-tertiary',
  '--pa-theme-action-primary',
  '--pa-theme-action-hover',
  '--pa-theme-action-active',
  '--pa-theme-surface-accent',
  '--pa-theme-surface-highlight',
  '--pa-theme-text-accent',
  '--pa-theme-text-on-action',
  '--pa-theme-border-accent',
  '--pa-theme-focus-ring',
  '--org-btn-primary-bg',
  '--org-btn-primary-hover',
  '--org-btn-primary-active',
  '--org-btn-primary-text',
  '--org-btn-secondary-bg',
  '--org-btn-secondary-hover',
  '--org-btn-secondary-active',
  '--org-btn-secondary-text',
  '--org-btn-secondary-border',
  '--org-link-color',
  '--org-link-hover',
  '--org-link-muted',
  '--org-badge-primary-bg',
  '--org-badge-primary-text',
  '--org-card-accent-border',
  '--org-card-accent-bg',
  '--org-highlight-bg',
  '--org-focus-ring',
  '--org-text-primary',
  '--org-text-secondary',
  '--org-text-muted',
  '--org-text-inverse',
  '--org-surface-primary',
  '--org-surface-secondary',
  '--org-surface-tertiary',
  '--org-surface-page',
  '--org-surface-section',
  '--org-surface-card',
  '--org-surface-card-header',
  '--org-surface-hover',
  '--org-surface-active',
  '--org-surface-tint',
  '--org-border-default',
  '--org-border-subtle',
  '--org-border-active',
  '--org-border-strong',
  '--org-btn-disabled-bg',
  '--org-btn-disabled-text',
  '--org-status-success',
  '--org-status-warning',
  '--org-status-error',
  '--org-status-info',
] as const

/**
 * Validate that all required tokens are present
 */
function validateTokens(tokens: ThemeTokens): boolean {
  const tokenRecord = tokens as unknown as Record<string, string>
  return THEME_TOKEN_NAMES.every((key) => key in tokenRecord && tokenRecord[key] !== undefined)
}

/**
 * Fixed Platform Admin design system tokens (no org customization).
 * Used when the user is on a platform admin route so org admin theme colors are never applied.
 * Values match platformAdmin.css .pa-theme-active defaults.
 */
export function getPlatformAdminFixedTokens(): ThemeTokens {
  const primary = '#003A8F'
  const primaryHover = '#0052C7'
  const primaryActive = '#002866'
  const secondary = '#5C6773'
  const tertiary = '#8A94A6'
  const surfaceAccent = 'rgba(182, 201, 226, 0.1)'
  const textOnAction = '#FFFFFF'
  const borderAccent = 'rgba(0, 58, 143, 0.3)'
  const focusRing = 'rgba(0, 58, 143, 0.5)'
  const textPrimary = '#0B0F14'
  const textSecondary = '#6B7280'
  const textMuted = '#9CA3AF'
  const borderDefault = '#E2E8F0'
  const surfacePage = '#F7F9FC'
  const surfaceSection = '#EEF2F7'
  const surfaceCard = '#FFFFFF'
  const surfaceCardHeader = '#F3F4F6'
  const surfaceHover = '#F9FAFB'
  const borderSubtle = '#F3F4F6'
  const disabledBg = '#E1E6ED'
  const disabledText = '#9AA4B2'

  return {
    '--org-color-primary': primary,
    '--org-color-secondary': secondary,
    '--org-color-tertiary': tertiary,

    '--pa-theme-action-primary': primary,
    '--pa-theme-action-hover': primaryHover,
    '--pa-theme-action-active': primaryActive,
    '--pa-theme-surface-accent': 'rgba(182, 201, 226, 0.12)',
    '--pa-theme-surface-highlight': 'rgba(138, 148, 166, 0.14)',
    '--pa-theme-text-accent': secondary,
    '--pa-theme-text-on-action': textOnAction,
    '--pa-theme-border-accent': borderAccent,
    '--pa-theme-focus-ring': focusRing,

    '--org-btn-primary-bg': primary,
    '--org-btn-primary-hover': primaryHover,
    '--org-btn-primary-active': primaryActive,
    '--org-btn-primary-text': textOnAction,
    '--org-btn-secondary-bg': 'rgba(182, 201, 226, 0.16)',
    '--org-btn-secondary-hover': 'rgba(182, 201, 226, 0.28)',
    '--org-btn-secondary-active': 'rgba(182, 201, 226, 0.36)',
    '--org-btn-secondary-text': secondary,
    '--org-btn-secondary-border': 'rgba(182, 201, 226, 0.72)',
    '--org-link-color': secondary,
    '--org-link-hover': tertiary,
    '--org-link-muted': '#6b7280',
    '--org-badge-primary-bg': surfaceAccent,
    '--org-badge-primary-text': primary,
    '--org-card-accent-border': 'rgba(182, 201, 226, 0.72)',
    '--org-card-accent-bg': 'rgba(182, 201, 226, 0.14)',
    '--org-highlight-bg': 'rgba(138, 148, 166, 0.14)',
    '--org-focus-ring': 'rgba(138, 148, 166, 0.34)',

    '--org-text-primary': textPrimary,
    '--org-text-secondary': textSecondary,
    '--org-text-muted': textMuted,
    '--org-text-inverse': '#FFFFFF',
    '--org-surface-primary': surfaceCard,
    '--org-surface-secondary': surfaceSection,
    '--org-surface-tertiary': surfaceHover,
    '--org-surface-page': surfacePage,
    '--org-surface-section': surfaceSection,
    '--org-surface-card': surfaceCard,
    '--org-surface-card-header': surfaceCardHeader,
    '--org-surface-hover': 'rgba(138, 148, 166, 0.08)',
    '--org-surface-active': 'rgba(182, 201, 226, 0.16)',
    '--org-surface-tint': 'rgba(182, 201, 226, 0.12)',
    '--org-border-default': borderDefault,
    '--org-border-subtle': borderSubtle,
    '--org-border-active': 'rgba(182, 201, 226, 0.72)',
    '--org-border-strong': secondary,
    '--org-btn-disabled-bg': disabledBg,
    '--org-btn-disabled-text': disabledText,
    '--org-status-success': '#10B981',
    '--org-status-warning': '#F59E0B',
    '--org-status-error': '#EF4444',
    '--org-status-info': '#3B82F6',
  }
}

/**
 * Adjust color for dark mode
 * Lightens dark colors and darkens light colors for better visibility
 */
function adjustForDarkMode(color: Colord): Colord {
  const hsl = color.toHsl()
  const lightness = hsl.l

  // For dark mode, we need colors that are vibrant but not too light
  // Target lightness range: 45-65% for good visibility on dark backgrounds
  if (lightness < 40) {
    // Dark color - lighten to make visible, but cap at 55%
    const lightenAmount = Math.min(55 - lightness, 30)
    return color.lighten(lightenAmount)
  } else if (lightness > 70) {
    // Very light color - darken significantly for dark mode
    const darkenAmount = Math.min(lightness - 55, 35)
    return color.darken(darkenAmount)
  } else {
    // Already in good range - slight adjustment
    return color
  }
}

/**
 * Validate hex color format
 */
function isValidHexColor(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

/**
 * Safely parse color with fallback
 */
function safeParseColor(color: string, fallback: string): Colord {
  try {
    if (!isValidHexColor(color)) {
      console.warn(`Invalid hex color: ${color}, using fallback`)
      return colord(fallback)
    }
    const parsed = colord(color)
    if (!parsed.isValid()) {
      console.warn(`Invalid color: ${color}, using fallback`)
      return colord(fallback)
    }
    return parsed
  } catch (error) {
    console.warn(`Error parsing color ${color}:`, error)
    return colord(fallback)
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map((part) => `${part}${part}`).join('')
    : normalized

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const channelToLinear = (channel: number) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  const red = channelToLinear(r)
  const green = channelToLinear(g)
  const blue = channelToLinear(b)

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function getContrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = getRelativeLuminance(foreground)
  const backgroundLuminance = getRelativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

function ensureAccessibleTextColor(color: Colord, backgroundHex: string, minimumContrast = 4.5): Colord {
  let candidate = color
  const background = colord(backgroundHex)
  const backgroundIsLight = background.isLight()

  for (let index = 0; index < 12; index++) {
    if (getContrastRatio(candidate.toHex(), backgroundHex) >= minimumContrast) {
      return candidate
    }
    candidate = backgroundIsLight ? candidate.darken(0.08) : candidate.lighten(0.08)
  }

  return candidate
}

function resolveTertiaryColor(primary: Colord, secondary: Colord, tertiary: Colord, isDark: boolean): Colord {
  const { s, l } = tertiary.toHsl()
  void primary

  if (s < 0.12 || l > 0.94 || l < 0.08) {
    return isDark ? secondary.lighten(0.08) : secondary.darken(0.08)
  }

  return tertiary
}

/**
 * Generate default tokens safely (fallback)
 */
function generateDefaultTokens(isDark: boolean): ThemeTokens {
  try {
    const defaultTheme = getDefaultTheme()
    return generateTokens(defaultTheme, isDark)
  } catch {
    // Ultimate fallback if even defaults fail (unlikely)
    const fallbackColor = isDark ? '#60A5FA' : '#137fec'
    const fallbackTextOnAction = '#ffffff'
    const fallbackText = isDark ? '#F8FAFC' : '#0F172A'
    const fallbackBorder = isDark ? '#334155' : '#E2E8F0'
    
    return {
      '--org-color-primary': fallbackColor,
      '--org-color-secondary': '#0d6bc2',
      '--org-color-tertiary': isDark ? '#94A3B8' : '#64748B',

      '--pa-theme-action-primary': fallbackColor,
      '--pa-theme-action-hover': '#0d6bc2',
      '--pa-theme-action-active': '#0b5ba0',
      '--pa-theme-surface-accent': 'rgba(19, 127, 236, 0.1)',
      '--pa-theme-surface-highlight': 'rgba(19, 127, 236, 0.15)',
      '--pa-theme-text-accent': fallbackColor,
      '--pa-theme-text-on-action': fallbackTextOnAction,
      '--pa-theme-border-accent': 'rgba(19, 127, 236, 0.3)',
      '--pa-theme-focus-ring': 'rgba(19, 127, 236, 0.5)',

      '--org-btn-primary-bg': fallbackColor,
      '--org-btn-primary-hover': '#0d6bc2',
      '--org-btn-primary-active': '#0b5ba0',
      '--org-btn-primary-text': fallbackTextOnAction,
      '--org-btn-secondary-bg': isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(100, 116, 139, 0.12)',
      '--org-btn-secondary-hover': isDark ? 'rgba(148, 163, 184, 0.24)' : 'rgba(100, 116, 139, 0.18)',
      '--org-btn-secondary-active': isDark ? 'rgba(148, 163, 184, 0.32)' : 'rgba(100, 116, 139, 0.24)',
      '--org-btn-secondary-text': isDark ? '#E2E8F0' : '#475569',
      '--org-btn-secondary-border': isDark ? '#64748B' : '#94A3B8',
      '--org-btn-disabled-bg': '#E1E6ED',
      '--org-btn-disabled-text': '#9AA4B2',
      '--org-link-color': isDark ? '#CBD5E1' : '#475569',
      '--org-link-hover': isDark ? '#94A3B8' : '#64748B',
      '--org-link-muted': '#6b7280',
      '--org-badge-primary-bg': 'rgba(19, 127, 236, 0.1)',
      '--org-badge-primary-text': fallbackColor,
      '--org-card-accent-border': 'rgba(19, 127, 236, 0.3)',
      '--org-card-accent-bg': 'rgba(19, 127, 236, 0.1)',
      '--org-highlight-bg': 'rgba(19, 127, 236, 0.15)',
      '--org-focus-ring': isDark ? 'rgba(148, 163, 184, 0.38)' : 'rgba(100, 116, 139, 0.28)',

      '--org-text-primary': fallbackText,
      '--org-text-secondary': isDark ? '#9CA3AF' : '#6B7280',
      '--org-text-muted': isDark ? '#6B7280' : '#9CA3AF',
      '--org-text-inverse': isDark ? '#0F172A' : '#FFFFFF',
      '--org-surface-primary': isDark ? '#1F2937' : '#FFFFFF',
      '--org-surface-secondary': isDark ? '#111827' : '#EEF2F7',
      '--org-surface-tertiary': isDark ? '#374151' : '#F9FAFB',
      '--org-surface-page': isDark ? '#0B0F14' : '#F7F9FC',
      '--org-surface-section': isDark ? '#111827' : '#EEF2F7',
      '--org-surface-card': isDark ? '#1F2937' : '#FFFFFF',
      '--org-surface-card-header': isDark ? '#374151' : '#F3F4F6',
      '--org-surface-hover': isDark ? 'rgba(148, 163, 184, 0.10)' : 'rgba(100, 116, 139, 0.06)',
      '--org-surface-active': isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(100, 116, 139, 0.10)',
      '--org-surface-tint': isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.08)',
      '--org-border-default': fallbackBorder,
      '--org-border-subtle': isDark ? '#1F2937' : '#F3F4F6',
      '--org-border-active': isDark ? '#94A3B8' : '#64748B',
      '--org-border-strong': isDark ? '#CBD5E1' : '#475569',
      '--org-status-success': '#10B981',
      '--org-status-warning': '#F59E0B',
      '--org-status-error': '#EF4444',
      '--org-status-info': '#3B82F6',
    }
  }
}


/**
 * Generate theme tokens from theme definition
 * 
 * @param theme - Theme object with primary, secondary, accent colors and UI tokens
 * @param isDark - Whether dark mode is active
 * @returns Complete set of theme tokens
 */
export function generateTokens(theme: Theme, isDark: boolean): ThemeTokens {
  // Use default theme as fallback for any errors
  const defaultTheme = getDefaultTheme()

  try {
    // Get the appropriate UI tokens based on dark mode
    const ui = theme.ui
    const colors = isDark && ui.dark ? {
      text: ui.dark.text,
      surface: {
        page: ui.dark.surface.page,
        section: ui.dark.surface.page, // Use page for section in dark mode
        card: ui.dark.surface.card,
        cardHeader: ui.dark.surface.cardHeader,
        hover: ui.dark.hover,
        active: ui.dark.hover, // Use hover for active in dark mode
      },
      border: {
        default: ui.dark.border,
        subtle: ui.dark.border,
        active: ui.border.active, // Keep active border from light mode
      },
    } : {
      text: ui.text,
      surface: ui.surface,
      border: ui.border,
    }

    // Use button colors from theme.ui (these are mode-independent)
    const button = ui.button

    // Safely parse primary color for derived tokens
    const primary = safeParseColor(theme.colors.primary, defaultTheme.colors.primary)
    const secondary = safeParseColor(theme.colors.secondary, defaultTheme.colors.secondary)
    const tertiary = safeParseColor(theme.colors.accent, defaultTheme.colors.accent)

    // For dark mode, adjust primary/secondary if no dark mode overrides exist
    const shouldAdjust = isDark && !theme.darkModeOverrides
    const adjustedPrimary = shouldAdjust ? adjustForDarkMode(primary) : primary
    const adjustedSecondary = shouldAdjust ? adjustForDarkMode(secondary) : secondary
    const tertiaryBase = shouldAdjust ? adjustForDarkMode(tertiary) : tertiary
    const adjustedTertiary = resolveTertiaryColor(adjustedPrimary, adjustedSecondary, tertiaryBase, isDark)
    
    // Generate derived colors for compatibility tokens
    const actionActive = adjustedPrimary.darken(0.1)
    const secondaryText = ensureAccessibleTextColor(adjustedSecondary, colors.surface.card)
    const tertiaryText = ensureAccessibleTextColor(adjustedTertiary, colors.surface.card, 3.8)
    const surfaceAccent = adjustedSecondary.alpha(isDark ? 0.18 : 0.14)
    const surfaceHighlight = adjustedTertiary.alpha(isDark ? 0.20 : 0.12)
    const surfaceHover = adjustedTertiary.alpha(isDark ? 0.16 : 0.08)
    const surfaceActive = adjustedSecondary.alpha(isDark ? 0.20 : 0.14)
    const borderAccent = adjustedSecondary.alpha(isDark ? 0.42 : 0.34)
    const focusRing = adjustedTertiary.alpha(isDark ? 0.42 : 0.28)

    const tokens: ThemeTokens = {
      // -- Explicit Color Roles --
      '--org-color-primary': adjustedPrimary.toHex(),
      '--org-color-secondary': adjustedSecondary.toHex(),
      '--org-color-tertiary': adjustedTertiary.toHex(),

      // -- Platform Admin Legacy / Core Tokens (for backward compatibility) --
      '--pa-theme-action-primary': button.primary.bg,
      '--pa-theme-action-hover': button.primary.hover,
      '--pa-theme-action-active': actionActive.toHex(),
      '--pa-theme-surface-accent': surfaceAccent.toRgbString(),
      '--pa-theme-surface-highlight': surfaceHighlight.toRgbString(),
      '--pa-theme-text-accent': secondaryText.toHex(),
      '--pa-theme-text-on-action': button.primary.text,
      '--pa-theme-border-accent': borderAccent.toRgbString(),
      '--pa-theme-focus-ring': focusRing.toRgbString(),

      // -- Org / Portal Button Tokens --
      '--org-btn-primary-bg': button.primary.bg,
      '--org-btn-primary-hover': button.primary.hover,
      '--org-btn-primary-active': actionActive.toHex(),
      '--org-btn-primary-text': button.primary.text,

      '--org-btn-secondary-bg': surfaceAccent.toRgbString(),
      '--org-btn-secondary-hover': surfaceActive.toRgbString(),
      '--org-btn-secondary-active': adjustedSecondary.alpha(isDark ? 0.26 : 0.18).toRgbString(),
      '--org-btn-secondary-text': secondaryText.toHex(),
      '--org-btn-secondary-border': borderAccent.toRgbString(),

      '--org-btn-disabled-bg': button.disabled.bg,
      '--org-btn-disabled-text': button.disabled.text,

      // -- Link Tokens --
      '--org-link-color': secondaryText.toHex(),
      '--org-link-hover': tertiaryText.toHex(),
      '--org-link-muted': isDark ? colors.text.secondary : ui.text.muted,

      // -- Badge Tokens --
      '--org-badge-primary-bg': surfaceAccent.toRgbString(),
      '--org-badge-primary-text': adjustedPrimary.toHex(),

      // -- Card Tokens --
      '--org-card-accent-border': borderAccent.toRgbString(),
      '--org-card-accent-bg': surfaceAccent.toRgbString(),

      // -- Highlight & Focus --
      '--org-highlight-bg': surfaceHighlight.toRgbString(),
      '--org-focus-ring': focusRing.toRgbString(),

      // -- Extended UI Tokens from theme.ui --
      '--org-text-primary': isDark ? colors.text.primary : ui.text.primary,
      '--org-text-secondary': isDark ? colors.text.secondary : ui.text.secondary,
      '--org-text-muted': isDark ? colors.text.secondary : ui.text.muted,
      '--org-text-inverse': ui.text.inverse,

      '--org-surface-primary': colors.surface.card,
      '--org-surface-secondary': colors.surface.section,
      '--org-surface-tertiary': colors.surface.hover,
      '--org-surface-page': colors.surface.page,
      '--org-surface-section': colors.surface.section,
      '--org-surface-card': colors.surface.card,
      '--org-surface-card-header': colors.surface.cardHeader,
      '--org-surface-hover': surfaceHover.toRgbString(),
      '--org-surface-active': surfaceActive.toRgbString(),
      '--org-surface-tint': surfaceAccent.toRgbString(),

      '--org-border-default': colors.border.default,
      '--org-border-subtle': colors.border.subtle,
      '--org-border-active': borderAccent.toRgbString(),
      '--org-border-strong': secondaryText.toHex(),

      '--org-status-success': ui.status.success,
      '--org-status-warning': ui.status.warning,
      '--org-status-error': ui.status.error,
      '--org-status-info': ui.status.info,
    }

    if (!validateTokens(tokens)) {
      console.error('Generated tokens missing required properties')
      return generateDefaultTokens(isDark)
    }

    return tokens
  } catch (error) {
    console.error('Error generating theme tokens:', error)
    // Return default theme tokens on any error
    return generateDefaultTokens(isDark)
  }
}
