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
  '--pa-theme-action-primary': string
  '--pa-theme-action-hover': string
  '--pa-theme-action-active': string
  '--pa-theme-surface-accent': string
  '--pa-theme-surface-highlight': string
  '--pa-theme-text-accent': string
  '--pa-theme-text-on-action': string
  '--pa-theme-border-accent': string
  '--pa-theme-focus-ring': string
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
  minRatio: number
): Colord {
  let currentColor = targetColor
  let currentRatio = getContrastRatio(baseColor, currentColor)

  // If already meets requirement, return as-is
  if (currentRatio >= minRatio) {
    return currentColor
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

  // If color is already light (for dark backgrounds), make it lighter
  // If color is dark (for light backgrounds), make it lighter for dark mode
  if (lightness < 50) {
    // Dark color - lighten by 20-30%
    return color.lighten(25)
  } else {
    // Light color - darken slightly for better contrast on dark backgrounds
    return color.darken(10)
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
  const fallbackAccent = defaultTheme.colors.accent

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
    const accent = safeParseColor(accentColor, fallbackAccent)

    // Adjust colors for dark mode if needed
    const adjustedPrimary = isDark ? adjustForDarkMode(primary) : primary
    const adjustedSecondary = isDark ? adjustForDarkMode(secondary) : secondary

    // Define base colors for contrast calculations
    // For light mode: use white background, for dark mode: use dark background
    const backgroundBase = isDark ? colord('#0B0F14') : colord('#FFFFFF')
    const surfaceBase = isDark ? colord('#1A202C') : colord('#F5F6F7')
    const textBase = isDark ? colord('#F8FAFC') : colord('#2B343D')

    // Generate action colors
    const actionPrimary = adjustedPrimary
    const actionHover = adjustedPrimary.lighten(10)
    const actionActive = adjustedPrimary.darken(10)

    // Ensure text on action buttons has sufficient contrast
    const textOnAction = ensureContrast(actionPrimary, textBase, 4.5)

    // Generate surface colors
    const surfaceAccent = adjustedSecondary.alpha(0.1)
    const surfaceHighlight = adjustedPrimary.alpha(0.15)

    // Generate text accent color with sufficient contrast
    const textAccent = ensureContrast(backgroundBase, adjustedPrimary, 4.5)

    // Generate border and focus ring colors
    const borderAccent = adjustedPrimary.alpha(0.3)
    const focusRing = adjustedPrimary.alpha(0.5)

    return {
      '--pa-theme-action-primary': actionPrimary.toHex(),
      '--pa-theme-action-hover': actionHover.toHex(),
      '--pa-theme-action-active': actionActive.toHex(),
      '--pa-theme-surface-accent': surfaceAccent.toRgbString(),
      '--pa-theme-surface-highlight': surfaceHighlight.toRgbString(),
      '--pa-theme-text-accent': textAccent.toHex(),
      '--pa-theme-text-on-action': textOnAction.toHex(),
      '--pa-theme-border-accent': borderAccent.toRgbString(),
      '--pa-theme-focus-ring': focusRing.toRgbString(),
    }
  } catch (error) {
    console.error('Error generating theme tokens:', error)
    // Return default theme tokens on any error
    return generateTokens(defaultTheme, isDark)
  }
}
