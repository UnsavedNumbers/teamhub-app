import { useEffect, useRef, useState } from 'react'
import { EXTERNAL_URLS } from '../constants/api'

type OrgAdminThemeState = {
    loaded: boolean
}

// Element IDs for tracking
const FONTS_CSS_ID = 'oa-google-fonts'

// Load Google Fonts (Oswald for display, Inter for body, Roboto Mono for code)
function loadGoogleFonts(): Promise<void> {
    return new Promise((resolve) => {
        if (document.getElementById(FONTS_CSS_ID)) {
            resolve()
            return
        }

        const link = document.createElement('link')
        link.id = FONTS_CSS_ID
        link.rel = 'stylesheet'
        link.href = EXTERNAL_URLS.GOOGLE_FONTS
        link.onload = () => resolve()
        link.onerror = () => {
            console.warn('Failed to load Google Fonts for org admin theme')
            resolve() // Continue anyway with fallback fonts
        }
        document.head.appendChild(link)
    })
}

/**
 * Hook to load the Org Admin design system.
 * 
 * - Loads Google Fonts (Oswald, Inter, Roboto Mono)
 * - Imports the orgAdmin.css styles
 * - Adds body class for theme activation
 * 
 * @returns { loaded: boolean } indicating when assets are ready
 */
export function useOrgAdminTheme(): OrgAdminThemeState {
    const [loaded, setLoaded] = useState(false)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true

            ; (async () => {
                try {
                    // Load Google Fonts
                    await loadGoogleFonts()

                    // Import org admin CSS (Vite will bundle this)
                    await import('../styles/orgAdmin.css')
                } catch (err) {
                    console.warn('Failed to load org admin theme assets:', err)
                }

                if (!mountedRef.current) return

                // Add theme class to body
                document.body.classList.add('oa-theme-active')
                setLoaded(true)
            })()

        return () => {
            mountedRef.current = false
            document.body.classList.remove('oa-theme-active')
        }
    }, [])

    return { loaded }
}
