import { useContext } from 'react'
import { I18nContext } from './I18nProvider'
import type { Locale, TranslationKey } from './index'

/**
 * Hook to access the translation function.
 * 
 * Returns a `t()` function bound to the current locale.
 * The component will automatically re-render when the locale changes.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const t = useT()
 *   return <h1>{t('portal.settings.title')}</h1>
 * }
 * ```
 * 
 * @throws Error if used outside of I18nProvider
 */
export function useT(): (key: TranslationKey, params?: Record<string, string | number>) => string {
    const context = useContext(I18nContext)

    if (!context) {
        throw new Error('useT must be used within an I18nProvider')
    }

    return context.t
}

/**
 * Hook to access and change the current locale.
 * 
 * Returns an object with:
 * - `locale`: The current active locale
 * - `setLocale`: Function to change the locale
 * 
 * The component will automatically re-render when the locale changes.
 * 
 * @example
 * ```tsx
 * function LanguageSwitcher() {
 *   const { locale, setLocale } = useLocale()
 *   return (
 *     <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
 *       <option value="en">English</option>
 *       <option value="es">Spanish</option>
 *     </select>
 *   )
 * }
 * ```
 * 
 * @throws Error if used outside of I18nProvider
 */
export function useLocale(): {
    locale: Locale
    setLocale: (locale: Locale) => void
} {
    const context = useContext(I18nContext)

    if (!context) {
        throw new Error('useLocale must be used within an I18nProvider')
    }

    return {
        locale: context.locale,
        setLocale: context.setLocale,
    }
}

/**
 * Hook to access the full i18n context.
 * 
 * Returns an object with:
 * - `locale`: The current active locale
 * - `setLocale`: Function to change the locale
 * - `t`: Translation function
 * 
 * Most components should use `useT()` or `useLocale()` instead.
 * This hook is useful when you need both locale state and translation function.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { locale, setLocale, t } = useI18n()
 *   return (
 *     <div>
 *       <h1>{t('portal.settings.title')}</h1>
 *       <p>Current locale: {locale}</p>
 *     </div>
 *   )
 * }
 * ```
 * 
 * @throws Error if used outside of I18nProvider
 */
export function useI18n(): {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: TranslationKey, params?: Record<string, string | number>) => string
} {
    const context = useContext(I18nContext)

    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider')
    }

    return context
}
