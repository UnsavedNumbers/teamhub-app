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
  '--org-badge-primary-bg': string
  '--org-badge-primary-text': string
  '--org-card-accent-border': string
  '--org-card-accent-bg': string
  '--org-highlight-bg': string
  '--org-focus-ring': string
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
  '--org-badge-primary-bg',
  '--org-badge-primary-text',
  '--org-card-accent-border',
  '--org-card-accent-bg',
  '--org-highlight-bg',
  '--org-focus-ring',
] as const

/**
 * Validate that all required tokens are present
 */
function validateTokens(tokens: Record<string, string>): tokens is ThemeTokens {
  return THEME_TOKEN_NAMES.every((key) => key in tokens && tokens[key] !== undefined)
}

/**
 * Calculate relative luminance for contrast checking
 * Based on WCAG 2.1 formula
 */
function getRelativeLuminance(color: Colord): number {
  const rgb = color.toRgb()
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    val = val / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio from 1 (no contrast) to 21 (maximum contrast)
 */
function getContrastRatio(color1: Colord, color2: Colord): number {
  const l1 = getRelativeLuminance(color1)
  const l2 = getRelativeLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Ensure minimum contrast ratio between two colors
 * Adjusts the target color to meet the required contrast
 */
function ensureContrast(
  baseColor: Colord,
  targetColor: Colord,
  minRatio: number,
  depth = 0
): Colord {
  if (depth > 5) {
    // Prevent recursive calls from going too deep
    console.warn('ensureContrast called recursively too deep, using fallback')
    return baseColor.isDark() ? colord('#FFFFFF') : colord('#000000')
  }

  let currentColor = targetColor
  let currentRatio = getContrastRatio(baseColor, currentColor)

  // If already meets requirement, return as-is
  if (currentRatio >= minRatio) {
    return currentColor
  }

  // Warn if in development and ratio is close but insufficient
  if (process.env.NODE_ENV === 'development' && currentRatio >= 4.0 && currentRatio < minRatio) {
    console.warn(`Contrast ratio ${currentRatio.toFixed(2)} is close to minimum ${minRatio}, adjusting slightly.`)
  }

  // Determine if we need to lighten or darken
  const baseLuminance = getRelativeLuminance(baseColor)
  const targetLuminance = getRelativeLuminance(currentColor)
  const needsLightening = targetLuminance < baseLuminance

  // Adjust lightness until contrast is sufficient
  let attempts = 0
  const maxAttempts = 50
  let step = 5

  while (currentRatio < minRatio && attempts < maxAttempts) {
    if (needsLightening) {
      currentColor = currentColor.lighten(step)
    } else {
      currentColor = currentColor.darken(step)
    }

    currentRatio = getContrastRatio(baseColor, currentColor)
    attempts++

    // Reduce step size if we overshoot
    if (currentRatio > minRatio * 1.1) {
      step = step / 2
    }
  }

  // If we still don't meet requirements, use extreme values
  if (currentRatio < minRatio) {
    console.warn(`Could not achieve contrast ${minRatio} after ${maxAttempts} attempts`)
    if (needsLightening) {
      currentColor = colord('#FFFFFF')
    } else {
      currentColor = colord('#000000')
    }
  }

  return currentColor
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
  const defaultPrimary = 'var(--org-btn-primary-bg, #137fec)'
  const defaultText = '#ffffff'
  // ... complete implementation of default tokens to ensure no recursion issues
  // Using simple logic for defaults

  // For defaults, we can just use the same structure as generated but with hardcoded safe values
  // to avoid using the potentially failing logic.
  // However, to keep it DRY and consistent, we'll try to re-use logic BUT with guaranteed safe inputs
  // If that fails, we return a hardcoded object.

  try {
    const defaultTheme = getDefaultTheme()
    // We manually construct to minimize risk
    const primary = colord(defaultTheme.colors.primary)
    const darkPrimary = primary.lighten(10) // Approx adjust
    const activePrimary = isDark ? darkPrimary : primary

    const safeTokens: ThemeTokens = {
      '--pa-theme-action-primary': activePrimary.toHex(),
      '--pa-theme-action-hover': activePrimary.lighten(10).toHex(),
      '--pa-theme-action-active': activePrimary.darken(10).toHex(),
      '--pa-theme-surface-accent': activePrimary.alpha(0.1).toRgbString(),
      '--pa-theme-surface-highlight': activePrimary.alpha(0.15).toRgbString(),
      '--pa-theme-text-accent': activePrimary.toHex(),
      '--pa-theme-text-on-action': '#ffffff',
      '--pa-theme-border-accent': activePrimary.alpha(0.3).toRgbString(),
      '--pa-theme-focus-ring': activePrimary.alpha(0.5).toRgbString(),

      '--org-btn-primary-bg': activePrimary.toHex(),
      '--org-btn-primary-hover': activePrimary.lighten(10).toHex(),
      '--org-btn-primary-active': activePrimary.darken(10).toHex(),
      '--org-btn-primary-text': '#ffffff',
      '--org-btn-secondary-bg': 'transparent',
      '--org-btn-secondary-hover': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      '--org-btn-secondary-text': isDark ? '#ffffff' : '#0F172A', // slate-900
      '--org-btn-secondary-border': isDark ? '#334155' : '#E2E8F0', // slate-700/200
      '--org-link-color': activePrimary.toHex(),
      '--org-link-hover': activePrimary.lighten(10).toHex(),
      '--org-badge-primary-bg': activePrimary.alpha(0.1).toRgbString(),
      '--org-badge-primary-text': activePrimary.toHex(),
      '--org-card-accent-border': activePrimary.alpha(0.3).toRgbString(),
      '--org-card-accent-bg': activePrimary.alpha(0.1).toRgbString(),
      '--org-highlight-bg': activePrimary.alpha(0.15).toRgbString(),
      '--org-focus-ring': activePrimary.alpha(0.5).toRgbString(),
    }
    return safeTokens
  } catch {
    // Ultimate fallback if even defaults fail (unlikely)
    return {
      '--pa-theme-action-primary': 'var(--org-btn-primary-bg, #137fec)',
      '--pa-theme-action-hover': '#0d6bc2',
      '--pa-theme-action-active': '#0b5ba0',
      '--pa-theme-surface-accent': 'rgba(19, 127, 236, 0.1)',
      '--pa-theme-surface-highlight': 'rgba(19, 127, 236, 0.15)',
      '--pa-theme-text-accent': 'var(--org-btn-primary-bg, #137fec)',
      '--pa-theme-text-on-action': '#ffffff',
      '--pa-theme-border-accent': 'rgba(19, 127, 236, 0.3)',
      '--pa-theme-focus-ring': 'rgba(19, 127, 236, 0.5)',

      '--org-btn-primary-bg': 'var(--org-btn-primary-bg, #137fec)',
      '--org-btn-primary-hover': '#0d6bc2',
      '--org-btn-primary-active': '#0b5ba0',
      '--org-btn-primary-text': '#ffffff',
      '--org-btn-secondary-bg': 'transparent',
      '--org-btn-secondary-hover': 'rgba(0,0,0,0.05)',
      '--org-btn-secondary-text': '#0F172A',
      '--org-btn-secondary-border': '#E2E8F0',
      '--org-link-color': 'var(--org-btn-primary-bg, #137fec)',
      '--org-link-hover': '#0d6bc2',
      '--org-badge-primary-bg': 'rgba(19, 127, 236, 0.1)',
      '--org-badge-primary-text': 'var(--org-btn-primary-bg, #137fec)',
      '--org-card-accent-border': 'rgba(19, 127, 236, 0.3)',
      '--org-card-accent-bg': 'rgba(19, 127, 236, 0.1)',
      '--org-highlight-bg': 'rgba(19, 127, 236, 0.15)',
      '--org-focus-ring': 'rgba(19, 127, 236, 0.5)',
    }
  }
}


/**
 * Generate theme tokens from theme definition
 * 
 * @param theme - Theme object with primary, secondary, accent colors
 * @param isDark - Whether dark mode is active
 * @returns Complete set of theme tokens
 */
export function generateTokens(theme: Theme, isDark: boolean): ThemeTokens {
  // Use default theme as fallback for any errors
  const defaultTheme = getDefaultTheme()
  const fallbackPrimary = defaultTheme.colors.primary
  const fallbackSecondary = defaultTheme.colors.secondary

  try {
    // Get theme colors, applying dark mode overrides if available
    let primaryColor = theme.colors.primary
    let secondaryColor = theme.colors.secondary
    let accentColor = theme.colors.accent

    if (isDark && theme.darkModeOverrides) {
      primaryColor = theme.darkModeOverrides.primary || primaryColor
      secondaryColor = theme.darkModeOverrides.secondary || secondaryColor
      accentColor = theme.darkModeOverrides.accent || accentColor
    }

    // Safely parse colors with fallbacks
    const primary = safeParseColor(primaryColor, fallbackPrimary)
    const secondary = safeParseColor(secondaryColor, fallbackSecondary)

    // Adjust colors for dark mode if needed
    // IF overrides were applied, we assume they are already tuned for dark mode
    const shouldAdjust = isDark && !theme.darkModeOverrides
    const adjustedPrimary = shouldAdjust ? adjustForDarkMode(primary) : primary
    const adjustedSecondary = shouldAdjust ? adjustForDarkMode(secondary) : secondary

    // Define base colors for contrast calculations
    // For light mode: use white background, for dark mode: use dark background
    const backgroundBase = isDark ? colord('#0B0F14') : colord('#FFFFFF')
    const textBase = isDark ? colord('#F8FAFC') : colord('#2B343D')

    // Generate action colors
    const actionPrimary = adjustedPrimary
    const actionHover = adjustedPrimary.lighten(0.1) // 10%
    const actionActive = adjustedPrimary.darken(0.1) // 10%

    // Ensure text on action buttons has sufficient contrast
    const textOnAction = ensureContrast(actionPrimary, colord('#FFFFFF'), 4.5)

    // Generate surface colors
    const surfaceAccent = adjustedSecondary.alpha(0.1)
    const surfaceHighlight = adjustedPrimary.alpha(0.15)

    // Generate text accent color with sufficient contrast
    // In dark mode, we might want to ensure it stands out against dark bg
    const textAccent = ensureContrast(backgroundBase, adjustedPrimary, 4.5)

    // Generate border and focus ring colors
    const borderAccent = adjustedPrimary.alpha(0.3)
    const focusRing = adjustedPrimary.alpha(0.5)

    // --- Secondary Button Logic ---
    // Default Secondary styles: Transparent bg, border, text color
    const secondaryBg = colord('transparent')
    const secondaryHover = isDark ? colord('#ffffff').alpha(0.05) : colord('#000000').alpha(0.05)
    const secondaryText = isDark ? colord('#ffffff') : colord('#0F172A')
    const secondaryBorder = isDark ? colord('#334155') : colord('#E2E8F0')

    const tokens: ThemeTokens = {
      // -- Platform Admin Legacy / Core Tokens --
      '--pa-theme-action-primary': actionPrimary.toHex(),
      '--pa-theme-action-hover': actionHover.toHex(),
      '--pa-theme-action-active': actionActive.toHex(),
      '--pa-theme-surface-accent': surfaceAccent.toRgbString(),
      '--pa-theme-surface-highlight': surfaceHighlight.toRgbString(),
      '--pa-theme-text-accent': textAccent.toHex(),
      '--pa-theme-text-on-action': textOnAction.toHex(),
      '--pa-theme-border-accent': borderAccent.toRgbString(),
      '--pa-theme-focus-ring': focusRing.toRgbString(),

      // -- Org / Portal Tokens (Aliases & Semantics) --
      '--org-btn-primary-bg': actionPrimary.toHex(),
      '--org-btn-primary-hover': actionHover.toHex(),
      '--org-btn-primary-active': actionActive.toHex(),
      '--org-btn-primary-text': textOnAction.toHex(),

      '--org-btn-secondary-bg': secondaryBg.toRgbString(),
      '--org-btn-secondary-hover': secondaryHover.toRgbString(),
      '--org-btn-secondary-text': secondaryText.toHex(),
      '--org-btn-secondary-border': secondaryBorder.toHex(),

      '--org-link-color': textAccent.toHex(),
      '--org-link-hover': actionHover.toHex(),

      '--org-badge-primary-bg': surfaceAccent.toRgbString(), // Using secondary/accent signal for badge bg
      '--org-badge-primary-text': textAccent.toHex(),

      '--org-card-accent-border': borderAccent.toRgbString(),
      '--org-card-accent-bg': surfaceAccent.toRgbString(),

      '--org-highlight-bg': surfaceHighlight.toRgbString(),
      '--org-focus-ring': focusRing.toRgbString(),
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
