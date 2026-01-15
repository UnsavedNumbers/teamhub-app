import { translations, type Locale, type Translations } from './translations'

const DEFAULT_LOCALE: Locale = 'en'
let activeLocale: Locale = DEFAULT_LOCALE

export type TranslationKey = FlattenObject<Translations>

type FlattenObject<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
  ? `${Prefix}${K}`
  : T[K] extends Record<string, unknown>
  ? FlattenObject<T[K], `${Prefix}${K}.`>
  : never
}[keyof T & string]

/**
 * Lookup a translation key in a specific locale's dictionary.
 * Returns undefined if the key is not found.
 */
function lookup(key: string, locale: Locale): string | undefined {
  const dict = translations[locale]
  if (!dict) return undefined

  const segments = key.split('.')
  let current: unknown = dict

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Get the currently active locale.
 */
export function getLocale(): Locale {
  return activeLocale
}

/**
 * Set the active locale. Only valid locales are accepted.
 * This is a module-level setter - for React components, use the I18nProvider instead.
 */
export function setLocale(locale: Locale) {
  if (translations[locale]) {
    activeLocale = locale
  }
}

/**
 * Check if a key exists in a specific locale.
 * Useful for debugging and conditional rendering.
 */
export function hasKey(locale: Locale, key: string): boolean {
  return lookup(key, locale) !== undefined
}

/**
 * Format a template string with parameters.
 * Replaces {{paramName}} with the corresponding value.
 * All values are converted to strings.
 */
export function format(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce((acc, [paramKey, value]) => {
    return acc.split(`{{${paramKey}}}`).join(String(value))
  }, template)
}

/**
 * Translate a key to the active locale.
 * Falls back to DEFAULT_LOCALE if the key is not found in the active locale.
 * Falls back to the key itself if not found in either locale.
 * 
 * Supports parameter interpolation via {{paramName}} syntax.
 * 
 * This function is backward compatible with existing usage.
 * For React components, prefer using the `useT()` hook from I18nProvider.
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  // Try active locale first, then default locale, then return the key
  const template = lookup(key, activeLocale) ?? lookup(key, DEFAULT_LOCALE) ?? String(key)

  // If no params, return template as-is
  if (!params) return template

  // Apply parameter interpolation
  return format(template, params)
}

// Re-export types for convenience
export type { Locale, Translations } from './translations'
