import { useState, useCallback, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import PortalWorkspaceHeader from '../components/portal/PortalWorkspaceHeader'
import PortalSidebar, { type PortalWorkspaceRole } from '../components/portal/PortalSidebar'
import { useAuth } from '../hooks/useAuth'
import { useMobile } from '../hooks/useMobile'
import { ADMIN_LAYOUT_MOBILE_NAV_QUERY } from '../config/breakpoints'
import { useScrollLock } from '../hooks/useScrollLock'
import { DemoGuideIntegration } from '../components/demo/DemoGuideIntegration'
import { AppPage, PageSection } from '../components/shared/AppPage'
import '../styles/portal.css'

/**
 * Layout for Guardian/Athlete portal: slim header + left sidebar + main workspace.
 * Vimeo-inspired workspace feel. Sidebar is fixed on desktop, collapsible; drawer on mobile.
 */
export default function PortalWorkspaceLayout() {
  const { hasAnyRole } = useAuth()
  
  const role: PortalWorkspaceRole = (() => {
    if (hasAnyRole('parent')) return 'guardian'
    if (hasAnyRole('athlete')) return 'athlete'
    return 'guardian'
  })()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [useMobileNav, setUseMobileNav] = useState(
    typeof window !== 'undefined' ? window.matchMedia(ADMIN_LAYOUT_MOBILE_NAV_QUERY).matches : false
  )
  const isMobile = useMobile()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(ADMIN_LAYOUT_MOBILE_NAV_QUERY)
    const handleChange = (e: MediaQueryListEvent) => setUseMobileNav(e.matches)
    setUseMobileNav(mql.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  useScrollLock(mobileSidebarOpen && useMobileNav)

  const handleMenuClick = useCallback(() => {
    setMobileSidebarOpen((o) => !o)
  }, [])

  const handleCloseSidebar = useCallback(() => {
    setMobileSidebarOpen(false)
  }, [])

  const showSidebarAsDrawer = useMobileNav || isMobile
  const showMenuButton = showSidebarAsDrawer

  return (
    <AppPage className="oa-theme-active portal-neutral min-h-screen bg-gray-50 font-sans text-gray-900 dark:bg-black dark:text-gray-100 antialiased">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-[-1] portal-grid-bg" />

      <PortalWorkspaceHeader
        onMenuClick={handleMenuClick}
        showMenuButton={showMenuButton}
      />

      <div className="flex">
        {showSidebarAsDrawer ? (
          <>
            {mobileSidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/50"
                aria-hidden
                onClick={handleCloseSidebar}
              />
            )}
            <div className={mobileSidebarOpen ? 'fixed inset-y-0 left-0 z-50' : 'hidden'}>
              <PortalSidebar
                role={role}
                isOverlay
                onClose={handleCloseSidebar}
              />
            </div>
          </>
        ) : (
          <PortalSidebar
            role={role}
            collapsed={sidebarCollapsed}
            onCollapse={() => setSidebarCollapsed((c) => !c)}
          />
        )}

        <main className="portal-workspace-main min-w-0 flex-1 overflow-y-auto">
          <PageSection className="w-full p-4 sm:p-6 lg:p-8">
            <Outlet />
          </PageSection>
        </main>
      </div>

      <DemoGuideIntegration />
    </AppPage>
  )
}
