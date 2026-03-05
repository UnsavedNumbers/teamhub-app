/**
 * Demo Welcome Guard Component
 * 
 * Redirects demo users to the welcome page on first login.
 * Should be used as a wrapper around protected routes.
 */

import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDemoSession } from '@/contexts/DemoSessionContext'
import { isFirstDemoLogin } from '@/utils/demoMode'
import { getLink, RouteKeys } from '@/utils/routes'

interface DemoWelcomeGuardProps {
  children: React.ReactNode
}

export function DemoWelcomeGuard({ children }: DemoWelcomeGuardProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, loading } = useDemoSession()

  useEffect(() => {
    // Don't redirect if still loading or not in demo session
    if (loading || !session.is_demo_session) {
      return
    }

    // Don't redirect if already on welcome page
    if (location.pathname === getLink(RouteKeys.DEMO_WELCOME)) {
      return
    }

    // Don't redirect from auth pages or demo entry
    if (
      location.pathname.startsWith('/portal/auth/') ||
      location.pathname === '/demo' ||
      location.pathname === '/demo-request'
    ) {
      return
    }

    // Redirect to welcome if first demo login
    if (isFirstDemoLogin()) {
      navigate(getLink(RouteKeys.DEMO_WELCOME), { replace: true })
    }
  }, [loading, session.is_demo_session, location.pathname, navigate])

  // Show children while checking (prevents flash)
  return <>{children}</>
}
