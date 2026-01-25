import { useState, useEffect } from 'react'
import { MOBILE_MEDIA_QUERY } from '@/config/breakpoints'

/**
 * Hook to detect mobile viewport
 * Returns true when viewport width is below mobile breakpoint (< 1024px)
 * 
 * Handles resize events and SSR safely
 * 
 * @returns boolean - true if mobile viewport, false otherwise
 * 
 * @example
 * ```tsx
 * const isMobile = useMobile()
 * return isMobile ? <MobileMenu /> : <DesktopMenu />
 * ```
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // SSR-safe initial state
    if (typeof window === 'undefined') {
      return false
    }
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches
  })

  useEffect(() => {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
    
    // Handler to update state when media query changes
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches)
    }

    // Set initial value
    handleChange(mediaQuery)

    // Listen for changes (modern browsers)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
      return () => {
        mediaQuery.removeEventListener('change', handleChange)
      }
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
      return () => {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  return isMobile
}
