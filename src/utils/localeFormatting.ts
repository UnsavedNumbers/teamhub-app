/**
 * Locale-specific formatting utilities for athlete profiles
 * Handles measurement conversions, number formatting, and date formatting
 * based on user locale preferences
 */

import type { Locale } from '../i18n'

// ============================================================================
// MEASUREMENT CONVERSIONS
// ============================================================================

/**
 * Convert centimeters to feet and inches
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
    const totalInches = cm / 2.54
    const feet = Math.floor(totalInches / 12)
    const inches = Math.round(totalInches % 12)
    return { feet, inches }
}

/**
 * Convert feet and inches to centimeters
 */
export function feetInchesToCm(feet: number, inches: number): number {
    const totalInches = feet * 12 + inches
    return Math.round(totalInches * 2.54)
}

/**
 * Convert kilograms to pounds
 */
export function kgToLbs(kg: number): number {
    return Math.round(kg * 2.20462)
}

/**
 * Convert pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
    return Math.round(lbs / 2.20462)
}

// ============================================================================
// MEASUREMENT FORMATTING
// ============================================================================

export type MeasurementSystem = 'metric' | 'imperial'

/**
 * Get the default measurement system for a locale
 */
export function getDefaultMeasurementSystem(locale: Locale): MeasurementSystem {
    // US uses imperial, most other countries use metric
    return locale === 'en' ? 'imperial' : 'metric'
}

/**
 * Format height based on measurement system
 */
export function formatHeight(
    cm: number,
    system: MeasurementSystem,
    _locale: Locale
): string {
    if (system === 'imperial') {
        const { feet, inches } = cmToFeetInches(cm)
        return `${feet}' ${inches}"`
    }
    return `${cm} cm`
}

/**
 * Format weight based on measurement system
 */
export function formatWeight(
    kg: number,
    system: MeasurementSystem,
    _locale: Locale
): string {
    if (system === 'imperial') {
        const lbs = kgToLbs(kg)
        return `${lbs} lbs`
    }
    return `${kg} kg`
}

// ============================================================================
// SHOE SIZE CONVERSIONS
// ============================================================================

export type ShoeSizeSystem = 'us' | 'eu' | 'uk'

/**
 * Approximate shoe size conversion (US to EU)
 * Note: These are approximations and may vary by manufacturer
 */
export function convertShoeSize(
    size: number,
    fromSystem: ShoeSizeSystem,
    toSystem: ShoeSizeSystem
): number {
    if (fromSystem === toSystem) return size

    // Convert to US first (as base)
    let usSize = size
    if (fromSystem === 'eu') {
        usSize = size - 33 // Approximate
    } else if (fromSystem === 'uk') {
        usSize = size + 1 // Approximate
    }

    // Convert from US to target
    if (toSystem === 'eu') {
        return Math.round(usSize + 33)
    } else if (toSystem === 'uk') {
        return Math.round(usSize - 1)
    }

    return Math.round(usSize)
}

/**
 * Get the default shoe size system for a locale
 */
export function getDefaultShoeSizeSystem(locale: Locale): ShoeSizeSystem {
    switch (locale) {
        case 'en':
            return 'us'
        case 'es':
            return 'eu'
        default:
            return 'us'
    }
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format a number according to locale conventions
 */
export function formatNumber(
    value: number,
    locale: Locale,
    options?: Intl.NumberFormatOptions
): string {
    const localeCode = locale === 'es' ? 'es-ES' : 'en-US'
    return new Intl.NumberFormat(localeCode, options).format(value)
}

/**
 * Format a decimal number with locale-specific separators
 */
export function formatDecimal(value: number, locale: Locale, decimals: number = 1): string {
    return formatNumber(value, locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

export type DateFormat = 'short' | 'long' | 'time'

/**
 * Format a date according to locale conventions
 */
export function formatDate(
    date: Date | string,
    locale: Locale,
    format: DateFormat = 'short'
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const localeCode = locale === 'es' ? 'es-ES' : 'en-US'

    switch (format) {
        case 'short':
            return new Intl.DateTimeFormat(localeCode, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(dateObj)

        case 'long':
            return new Intl.DateTimeFormat(localeCode, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }).format(dateObj)

        case 'time':
            return new Intl.DateTimeFormat(localeCode, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: locale === 'en',
            }).format(dateObj)

        default:
            return dateObj.toLocaleDateString(localeCode)
    }
}

/**
 * Get the date format pattern for a locale
 */
export function getDateFormatPattern(locale: Locale, format: DateFormat = 'short'): string {
    switch (format) {
        case 'short':
            return locale === 'en' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'
        case 'long':
            return locale === 'en' ? 'MMMM D, YYYY' : 'D [de] MMMM [de] YYYY'
        case 'time':
            return locale === 'en' ? 'h:mm A' : 'HH:mm'
        default:
            return locale === 'en' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'
    }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate height input based on measurement system
 */
export function validateHeight(
    value: number,
    system: MeasurementSystem
): { valid: boolean; message?: string } {
    if (system === 'metric') {
        // Reasonable range: 50cm - 250cm
        if (value < 50) return { valid: false, message: 'Height must be at least 50 cm' }
        if (value > 250) return { valid: false, message: 'Height cannot exceed 250 cm' }
    } else {
        // Convert to cm for validation
        const cm = value
        if (cm < 50) return { valid: false, message: 'Height must be at least 50 cm' }
        if (cm > 250) return { valid: false, message: 'Height cannot exceed 250 cm' }
    }
    return { valid: true }
}

/**
 * Validate weight input based on measurement system
 */
export function validateWeight(
    value: number,
    system: MeasurementSystem
): { valid: boolean; message?: string } {
    if (system === 'metric') {
        // Reasonable range: 10kg - 200kg
        if (value < 10) return { valid: false, message: 'Weight must be at least 10 kg' }
        if (value > 200) return { valid: false, message: 'Weight cannot exceed 200 kg' }
    } else {
        // Convert to kg for validation
        const kg = lbsToKg(value)
        if (kg < 10) return { valid: false, message: 'Weight must be at least 10 kg' }
        if (kg > 200) return { valid: false, message: 'Weight cannot exceed 200 kg' }
    }
    return { valid: true }
}

// ============================================================================
// TEXT EXPANSION UTILITIES
// ============================================================================

/**
 * Calculate the approximate text expansion factor for a locale
 * Used to ensure UI components can accommodate longer translated strings
 */
export function getTextExpansionFactor(locale: Locale): number {
    switch (locale) {
        case 'es':
            return 1.3 // Spanish text is typically 30% longer
        case 'en':
        default:
            return 1.0
    }
}

/**
 * Estimate the width needed for a translated string
 */
export function estimateTranslatedWidth(
    englishText: string,
    locale: Locale
): number {
    const baseWidth = englishText.length
    const expansionFactor = getTextExpansionFactor(locale)
    return Math.ceil(baseWidth * expansionFactor)
}

// ============================================================================
// LOCALE PREFERENCE STORAGE
// ============================================================================

const LOCALE_STORAGE_KEY = 'athlete_profile_locale_prefs'

export interface LocalePreferences {
    measurementSystem: MeasurementSystem
    shoeSizeSystem: ShoeSizeSystem
    dateFormat: DateFormat
}

/**
 * Get user's locale preferences from storage
 */
export function getLocalePreferences(locale: Locale): LocalePreferences {
    try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (error) {
        console.warn('Failed to load locale preferences:', error)
    }

    // Return defaults based on locale
    return {
        measurementSystem: getDefaultMeasurementSystem(locale),
        shoeSizeSystem: getDefaultShoeSizeSystem(locale),
        dateFormat: 'short',
    }
}

/**
 * Save user's locale preferences to storage
 */
export function saveLocalePreferences(preferences: LocalePreferences): void {
    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, JSON.stringify(preferences))
    } catch (error) {
        console.warn('Failed to save locale preferences:', error)
    }
}

/**
 * Update a specific locale preference
 */
export function updateLocalePreference<K extends keyof LocalePreferences>(
    key: K,
    value: LocalePreferences[K],
    locale: Locale
): void {
    const current = getLocalePreferences(locale)
    saveLocalePreferences({ ...current, [key]: value })
}
