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
  '--org-surface-page': string
  '--org-surface-section': string
  '--org-surface-card': string
  '--org-surface-card-header': string
  '--org-surface-hover': string
  '--org-surface-active': string
  '--org-border-default': string
  '--org-border-subtle': string
  '--org-border-active': string
  '--org-btn-disabled-bg': string
  '--org-btn-disabled-text': string
  '--org-status-success': string
  '--org-status-warning': string
  '--org-status-error': string
  '--org-status-info': string
}

export const THEME_TOKEN_NAMES = [
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
  '--org-surface-page',
  '--org-surface-section',
  '--org-surface-card',
  '--org-surface-card-header',
  '--org-surface-hover',
  '--org-surface-active',
  '--org-border-default',
  '--org-border-subtle',
  '--org-border-active',
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
      '--org-btn-secondary-bg': 'transparent',
      '--org-btn-secondary-hover': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      '--org-btn-secondary-text': fallbackText,
      '--org-btn-secondary-border': fallbackBorder,
      '--org-btn-disabled-bg': '#E1E6ED',
      '--org-btn-disabled-text': '#9AA4B2',
      '--org-link-color': fallbackColor,
      '--org-link-hover': '#0d6bc2',
      '--org-link-muted': '#6b7280',
      '--org-badge-primary-bg': 'rgba(19, 127, 236, 0.1)',
      '--org-badge-primary-text': fallbackColor,
      '--org-card-accent-border': 'rgba(19, 127, 236, 0.3)',
      '--org-card-accent-bg': 'rgba(19, 127, 236, 0.1)',
      '--org-highlight-bg': 'rgba(19, 127, 236, 0.15)',
      '--org-focus-ring': 'rgba(19, 127, 236, 0.5)',

      '--org-text-primary': fallbackText,
      '--org-text-secondary': isDark ? '#9CA3AF' : '#6B7280',
      '--org-text-muted': isDark ? '#6B7280' : '#9CA3AF',
      '--org-text-inverse': isDark ? '#0F172A' : '#FFFFFF',
      '--org-surface-page': isDark ? '#0B0F14' : '#F7F9FC',
      '--org-surface-section': isDark ? '#111827' : '#EEF2F7',
      '--org-surface-card': isDark ? '#1F2937' : '#FFFFFF',
      '--org-surface-card-header': isDark ? '#374151' : '#F3F4F6',
      '--org-surface-hover': isDark ? '#374151' : '#F9FAFB',
      '--org-surface-active': isDark ? '#4B5563' : '#F3F4F6',
      '--org-border-default': fallbackBorder,
      '--org-border-subtle': isDark ? '#1F2937' : '#F3F4F6',
      '--org-border-active': fallbackColor,
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

    // For dark mode, adjust primary/secondary if no dark mode overrides exist
    const shouldAdjust = isDark && !theme.darkModeOverrides
    const adjustedPrimary = shouldAdjust ? adjustForDarkMode(primary) : primary
    
    // Generate derived colors for compatibility tokens
    const actionActive = adjustedPrimary.darken(0.1)
    const surfaceAccent = secondary.alpha(0.1)
    const surfaceHighlight = adjustedPrimary.alpha(0.15)
    const borderAccent = adjustedPrimary.alpha(0.3)
    const focusRing = adjustedPrimary.alpha(0.5)

    const tokens: ThemeTokens = {
      // -- Platform Admin Legacy / Core Tokens (for backward compatibility) --
      '--pa-theme-action-primary': button.primary.bg,
      '--pa-theme-action-hover': button.primary.hover,
      '--pa-theme-action-active': actionActive.toHex(),
      '--pa-theme-surface-accent': surfaceAccent.toRgbString(),
      '--pa-theme-surface-highlight': surfaceHighlight.toRgbString(),
      '--pa-theme-text-accent': isDark ? colors.text.primary : ui.text.primary,
      '--pa-theme-text-on-action': button.primary.text,
      '--pa-theme-border-accent': borderAccent.toRgbString(),
      '--pa-theme-focus-ring': focusRing.toRgbString(),

      // -- Org / Portal Button Tokens --
      '--org-btn-primary-bg': button.primary.bg,
      '--org-btn-primary-hover': button.primary.hover,
      '--org-btn-primary-active': actionActive.toHex(),
      '--org-btn-primary-text': button.primary.text,

      '--org-btn-secondary-bg': button.secondary.bg,
      '--org-btn-secondary-hover': button.secondary.hover,
      '--org-btn-secondary-text': button.secondary.text,
      '--org-btn-secondary-border': colors.border.default,

      '--org-btn-disabled-bg': button.disabled.bg,
      '--org-btn-disabled-text': button.disabled.text,

      // -- Link Tokens --
      '--org-link-color': isDark ? colors.text.primary : ui.text.primary,
      '--org-link-hover': button.primary.hover,
      '--org-link-muted': isDark ? colors.text.secondary : ui.text.muted,

      // -- Badge Tokens --
      '--org-badge-primary-bg': surfaceAccent.toRgbString(),
      '--org-badge-primary-text': isDark ? colors.text.primary : ui.text.primary,

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

      '--org-surface-page': colors.surface.page,
      '--org-surface-section': colors.surface.section,
      '--org-surface-card': colors.surface.card,
      '--org-surface-card-header': colors.surface.cardHeader,
      '--org-surface-hover': colors.surface.hover,
      '--org-surface-active': colors.surface.active,

      '--org-border-default': colors.border.default,
      '--org-border-subtle': colors.border.subtle,
      '--org-border-active': colors.border.active,

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
