import { createContext, useState, useEffect, type ReactNode } from 'react'
import { setLocale as setModuleLocale, type Locale, type TranslationKey, format } from './index'
import { translations } from './translations'

/**
 * Context value shape for I18n.
 */
interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

/**
 * React context for i18n state.
 * Do not use directly - use the useT() or useLocale() hooks instead.
 */
export const I18nContext = createContext<I18nContextValue | undefined>(undefined)

interface I18nProviderProps {
  children: ReactNode
}

const STORAGE_KEY = 'teamhub_locale'

/**
 * Detect the user's preferred locale from browser settings.
 * Maps browser language codes to our supported locales.
 * 
 * @returns Detected locale or 'en' as fallback
 */
function detectBrowserLocale(): Locale {
  // Guard against non-browser environments (SSR, tests)
  if (typeof navigator === 'undefined') return 'en'

  const browserLang = navigator.language || 'en'
  
  // Map browser language codes to our supported locales
  // es-ES, es-MX, es-419, etc. -> 'es'
  if (browserLang.startsWith('es')) return 'es'
  
  // Default to English
  return 'en'
}

/**
 * Get the initial locale from localStorage or browser settings.
 * 
 * Precedence:
 * 1. localStorage (user's explicit choice)
 * 2. navigator.language (browser preference)
 * 3. 'en' (default fallback)
 */
function getInitialLocale(): Locale {
  // Guard against non-browser environments
  if (typeof window === 'undefined') return 'en'

  try {
    // Try localStorage first
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored in translations) {
      return stored as Locale
    }
  } catch (error) {
    // localStorage might be unavailable (private browsing, etc.)
    console.warn('Failed to read locale from localStorage:', error)
  }

  // Fall back to browser detection
  return detectBrowserLocale()
}

/**
 * I18nProvider - App-wide localization provider.
 * 
 * Features:
 * - Persists locale to localStorage
 * - Detects browser locale on first visit
 * - Re-renders UI when locale changes
 * - Provides t() function via context
 * 
 * Usage:
 * Wrap your app root with this provider, then use useT() or useLocale() hooks.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale)

  // Sync locale changes to module-level state and localStorage
  useEffect(() => {
    // Update module-level locale (for non-React code)
    setModuleLocale(locale)

    // Persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch (error) {
      console.warn('Failed to persist locale to localStorage:', error)
    }
  }, [locale])

  /**
   * Change the active locale.
   * This will trigger a re-render of all components using i18n hooks.
   */
  const setLocale = (newLocale: Locale) => {
    if (newLocale in translations) {
      setLocaleState(newLocale)
    } else {
      console.warn(`Attempted to set unsupported locale: ${newLocale}`)
    }
  }

  /**
   * Translate function bound to current locale.
   * Automatically re-renders when locale changes.
   */
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = translations[locale]
    const defaultDict = translations['en']

    // Lookup in current locale, fall back to English, then show key
    const segments = key.split('.')
    let current: unknown = dict
    let fallback: unknown = defaultDict

    for (const segment of segments) {
      if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[segment]
      } else {
        current = undefined
      }

      if (fallback && typeof fallback === 'object' && segment in (fallback as Record<string, unknown>)) {
        fallback = (fallback as Record<string, unknown>)[segment]
      } else {
        fallback = undefined
      }
    }

    const template = 
      (typeof current === 'string' ? current : undefined) ??
      (typeof fallback === 'string' ? fallback : undefined) ??
      String(key)

    // Apply parameter interpolation if provided
    if (!params) return template
    return format(template, params)
  }

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
