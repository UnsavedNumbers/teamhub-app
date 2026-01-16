import { useEffect, useRef, useState } from 'react'

type PlatformAdminThemeState = {
    loaded: boolean
}

// Element IDs for tracking
const FONTS_CSS_ID = 'pa-google-fonts'

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
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&family=Roboto+Mono:wght@400;500&display=swap'
        link.onload = () => resolve()
        link.onerror = () => {
            console.warn('Failed to load Google Fonts for platform admin theme')
            resolve() // Continue anyway with fallback fonts
        }
        document.head.appendChild(link)
    })
}

/**
 * Hook to load the Platform Admin design system (Nike + Google aesthetic).
 * 
 * - Loads Google Fonts (Oswald, Inter, Roboto Mono)
 * - Imports the platformAdmin.css styles
 * - Adds body class for theme activation
 * 
 * @returns { loaded: boolean } indicating when assets are ready
 */
export function usePlatformAdminTheme(): PlatformAdminThemeState {
    const [loaded, setLoaded] = useState(false)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true

            ; (async () => {
                try {
                    // Load Google Fonts
                    await loadGoogleFonts()

                    // Import platform admin CSS (Vite will bundle this)
                    await import('../styles/platformAdmin.css')
                } catch (err) {
                    console.warn('Failed to load platform admin theme assets:', err)
                }

                if (!mountedRef.current) return

                // Add theme class to body
                document.body.classList.add('pa-theme-active')
                setLoaded(true)
            })()

        return () => {
            mountedRef.current = false
            document.body.classList.remove('pa-theme-active')
        }
    }, [])

    return { loaded }
}
