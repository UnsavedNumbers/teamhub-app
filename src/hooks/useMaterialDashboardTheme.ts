import { useEffect, useRef, useState } from 'react'

type MaterialDashboardThemeState = {
  loaded: boolean
}

// Element IDs for tracking/cleanup
const MD_CSS_ID = 'material-dashboard-css'
const NUCLEO_ICONS_CSS_ID = 'nucleo-icons-css'
const NUCLEO_SVG_CSS_ID = 'nucleo-svg-css'
const MATERIAL_ICONS_CSS_ID = 'material-icons-round-css'
const FA_CSS_ID = 'font-awesome-css'
const FONTS_CSS_ID = 'material-dashboard-fonts'
const BOOTSTRAP_SCRIPT_ID = 'material-dashboard-bootstrap-js'
const PERFECT_SCROLLBAR_SCRIPT_ID = 'material-dashboard-perfect-scrollbar-js'
const SMOOTH_SCROLLBAR_SCRIPT_ID = 'material-dashboard-smooth-scrollbar-js'
const MD_SCRIPT_ID = 'material-dashboard-js'

// Load a stylesheet dynamically
function loadStylesheet(href: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.getElementById(id)) {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.id = id
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${href}`))
    document.head.appendChild(link)
  })
}

// Load a script dynamically
function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.getElementById(id)) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.id = id
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.body.appendChild(script)
  })
}

export function useMaterialDashboardTheme(): MaterialDashboardThemeState {
  const [loaded, setLoaded] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    // If already present (e.g., navigating between /admin and /platform-admin), reuse it.
    const existing = document.getElementById(MD_CSS_ID)
    if (existing) {
      setLoaded(true)
      document.body.classList.add('g-sidenav-show', 'bg-gray-100', 'md-admin-root')
      return () => {
        mountedRef.current = false
        document.body.classList.remove('g-sidenav-show', 'bg-gray-100', 'md-admin-root')
      }
    }

    // Load all Material Dashboard assets from CDN
    ;(async () => {
      try {
        // Load CSS from CDN (more reliable than npm package @imports)
        await Promise.all([
          // Nucleo icon sets used by the template
          loadStylesheet(
            'https://cdn.jsdelivr.net/npm/material-dashboard@3.1.0/assets/css/nucleo-icons.css',
            NUCLEO_ICONS_CSS_ID
          ),
          loadStylesheet(
            'https://cdn.jsdelivr.net/npm/material-dashboard@3.1.0/assets/css/nucleo-svg.css',
            NUCLEO_SVG_CSS_ID
          ),
          // Material Icons (Round) used throughout the template
          loadStylesheet(
            'https://fonts.googleapis.com/icon?family=Material+Icons+Round',
            MATERIAL_ICONS_CSS_ID
          ),
          // Google Fonts - Open Sans
          loadStylesheet(
            'https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700',
            FONTS_CSS_ID
          ),
          // Font Awesome
          loadStylesheet(
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
            FA_CSS_ID
          ),
          // Material Dashboard CSS (includes Bootstrap CSS)
          loadStylesheet(
            'https://cdn.jsdelivr.net/npm/material-dashboard@3.1.0/assets/css/material-dashboard.min.css',
            MD_CSS_ID
          ),
        ])
        
        // Load Bootstrap bundle (includes Popper) from CDN
        await loadScript(
          'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js',
          BOOTSTRAP_SCRIPT_ID
        )

        // Optional plugins used by the theme (improves sidenav scrolling/behavior)
        await loadScript(
          'https://cdn.jsdelivr.net/npm/material-dashboard@3.1.0/assets/js/plugins/perfect-scrollbar.min.js',
          PERFECT_SCROLLBAR_SCRIPT_ID
        )
        await loadScript(
          'https://cdn.jsdelivr.net/npm/material-dashboard@3.1.0/assets/js/plugins/smooth-scrollbar.min.js',
          SMOOTH_SCROLLBAR_SCRIPT_ID
        )
        
        // Load Material Dashboard JS from CDN (after Bootstrap)
        await loadScript(
          'https://cdn.jsdelivr.net/npm/material-dashboard@3.1.0/assets/js/material-dashboard.min.js',
          MD_SCRIPT_ID
        )
      } catch (err) {
        console.warn('Failed to load Material Dashboard assets:', err)
      }
      
      // Check if still mounted before updating state
      if (!mountedRef.current) return

      setLoaded(true)
    })()

    document.body.classList.add('g-sidenav-show', 'bg-gray-100', 'md-admin-root')

    return () => {
      mountedRef.current = false
      document.body.classList.remove('g-sidenav-show', 'bg-gray-100', 'md-admin-root')
      
      // Note: We don't remove the stylesheets/scripts as they may be needed on subsequent navigations
      // and removing them could cause FOUC
    }
  }, [])

  return { loaded }
}

