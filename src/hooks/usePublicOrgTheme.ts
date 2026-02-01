import { useLayoutEffect, useState } from 'react'
import { getOrganizationThemeSettingsByOrgId } from '../data/services/organizationSettingsService'
import { getTheme, getDefaultTheme } from '../config/themes'
import { generateTokens, type ThemeTokens } from '../utils/themeTokens'
import { useTheme } from './useTheme'

/**
 * Apply theme tokens to CSS variables on :root element
 */
function applyThemeTokens(tokens: ThemeTokens): void {
    const root = document.documentElement
    Object.entries(tokens).forEach(([key, value]) => {
        root.style.setProperty(key, value)
    })
}

/**
 * Hook to apply organization theme on public routes (unauthenticated or isolated)
 * 
 * Fetches theme settings by orgId (using public RPC) and applies tokens.
 * Falls back to default theme if org has no theme or error occurs.
 */
export function usePublicOrgTheme(orgId: string | null) {
    const { resolvedTheme } = useTheme() // 'light' | 'dark'
    const [hasAppliedTheme, setHasAppliedTheme] = useState(false)

    useLayoutEffect(() => {
        if (!orgId) {
            const defaultTokens = generateTokens(getDefaultTheme(), resolvedTheme === 'dark')
            applyThemeTokens(defaultTokens)
            return
        }

        let cancelled = false

        async function fetchAndApplyTheme() {
            try {
                const { theme_id, error } = await getOrganizationThemeSettingsByOrgId(orgId!)

                if (cancelled) return

                if (error) {
                    console.warn('Error fetching public theme:', error)
                }

                const theme = theme_id ? getTheme(theme_id) : getDefaultTheme()
                const tokens = generateTokens(theme, resolvedTheme === 'dark')

                applyThemeTokens(tokens)
                setHasAppliedTheme(true)
            } catch (err) {
                if (cancelled) return
                console.error('Failed to apply public org theme:', err)
                // Fallback to default
                const defaultTokens = generateTokens(getDefaultTheme(), resolvedTheme === 'dark')
                applyThemeTokens(defaultTokens)
            }
        }

        fetchAndApplyTheme()

        return () => {
            cancelled = true
        }
    }, [orgId, resolvedTheme])

    return { hasAppliedTheme }
}
