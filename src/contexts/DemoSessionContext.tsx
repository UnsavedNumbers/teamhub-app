import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from 'react'
import type { DemoSessionSnapshot } from '@/types/demoManagement'
import { normalizeDemoCode } from '@/types/demoManagement'
import {
  clearStoredDemoCode,
  getCurrentDemoSessionSnapshot,
  getDemoSession,
  setStoredDemoCode,
} from '@/data/services/demoSessionService'
import { clearDemoSessionSnapshot } from '@/data/fake/demoDataStore'
import { useOptionalAuth } from '@/hooks/useAuth'
import { USE_FAKE_DATA } from '@/data/config'
import { generateDemoData } from '@/data/fake/demoDataEngine'
import { getDemoOrg } from '@/data/services/demoOrgService'
import { identifyDemoUser } from '@/lib/analytics/posthog'
import { resetAnalytics } from '@/lib/analytics/analytics'
import { getPrimaryRole } from '@/utils/roleHelpers'
import { useOrganization } from '@/contexts/OrganizationContext'
import type { DemoAllowedRole } from '@/types/demoManagement'

interface DemoSessionContextValue {
  session: DemoSessionSnapshot
  loading: boolean
  setPendingDemoCode: (code: string) => void
  clearPendingDemoCode: () => void
  refreshSession: () => Promise<void>
}

const emptySnapshot: DemoSessionSnapshot = {
  is_demo_session: false,
  demo_org_id: null,
  organization_id: null,
  demo_code: null,
  expires_at: null,
}

const DemoSessionContext = createContext<DemoSessionContextValue | undefined>(undefined)

/**
 * Map standard roles to demo roles
 */
function mapRoleToDemoRole(role: string | null | undefined): DemoAllowedRole {
  if (role === 'org_admin') return 'org_admin'
  if (role === 'coach') return 'coach'
  if (role === 'parent') return 'parent'
  if (role === 'athlete') return 'athlete'
  if (role === 'staff') return 'staff'
  return 'parent' // Default fallback
}

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSessionSnapshot>(emptySnapshot)
  const [loading, setLoading] = useState(true)
  const authContext = useOptionalAuth()
  const user = authContext?.user ?? null
  const { currentOrganization } = useOrganization()
  const previousSessionRef = useRef<DemoSessionSnapshot>(emptySnapshot)

  const refreshSession = useCallback(async () => {
    // First check localStorage snapshot
    let snapshot = getCurrentDemoSessionSnapshot()

    // If no snapshot but user is logged in, try fetching from database
    if (!snapshot.is_demo_session && user?.id) {
      try {
        const dbSession = await getDemoSession(user.id)
        if (dbSession) {
          snapshot = getCurrentDemoSessionSnapshot()
        }
      } catch (err) {
        console.error('[DemoSessionContext] Failed to fetch demo session:', err)
      }
    }

    // When USE_FAKE_DATA is true and we have a demo session, ensure fake data is generated
    // This should happen for ALL roles (org_admin, coach, guardian, athlete, etc.)
    if (USE_FAKE_DATA && snapshot.is_demo_session && snapshot.demo_org_id && snapshot.demo_code && user?.id) {
      try {
        const demoOrg = await getDemoOrg(snapshot.demo_org_id)
        await generateDemoData(demoOrg, demoOrg.sports_sponsored, snapshot.demo_code)
      } catch (err) {
        console.error('[DemoSessionContext] Failed to generate demo data:', err)
      }
    }

    if (!snapshot.is_demo_session || !snapshot.expires_at) {
      // Session ended - reset PostHog identification if we had a session before
      if (previousSessionRef.current.is_demo_session && user?.id) {
        resetAnalytics()
      }
      setSession(emptySnapshot)
      previousSessionRef.current = emptySnapshot
      return
    }

    const expiresMs = new Date(snapshot.expires_at).getTime()
    if (Number.isNaN(expiresMs) || expiresMs <= Date.now()) {
      // Session expired - reset PostHog identification
      if (previousSessionRef.current.is_demo_session && user?.id) {
        resetAnalytics()
      }
      clearStoredDemoCode()
      clearDemoSessionSnapshot()
      setSession(emptySnapshot)
      previousSessionRef.current = emptySnapshot
      return
    }

    // Identify user in PostHog if this is a new demo session
    if (user?.id && snapshot.is_demo_session && snapshot.demo_code && snapshot.demo_org_id) {
      const wasDemoSession = previousSessionRef.current.is_demo_session
      const sessionChanged = 
        previousSessionRef.current.demo_code !== snapshot.demo_code ||
        previousSessionRef.current.demo_org_id !== snapshot.demo_org_id

      // Identify if this is a new session or session changed
      if (!wasDemoSession || sessionChanged) {
        // Determine user's role
        const primaryRole = currentOrganization ? getPrimaryRole(currentOrganization) : 'parent'
        const demoRole = mapRoleToDemoRole(primaryRole || 'parent')

        try {
          identifyDemoUser(user.id, {
            demo_code: snapshot.demo_code,
            demo_role: demoRole,
            demo_org_id: snapshot.demo_org_id,
            organization_id: snapshot.organization_id || null,
          })
        } catch (err) {
          console.error('[DemoSessionContext] Failed to identify user in PostHog:', err)
        }
      }
    }

    setSession(snapshot)
    previousSessionRef.current = snapshot
  }, [user?.id, currentOrganization])

  useEffect(() => {
    refreshSession().then(() => setLoading(false))
  }, [refreshSession])

  const setPendingDemoCode = useCallback((code: string) => {
    const normalized = normalizeDemoCode(code)
    if (!normalized) {
      clearStoredDemoCode()
      return
    }

    setStoredDemoCode(normalized)
  }, [])

  const clearPendingDemoCode = useCallback(() => {
    // Reset PostHog identification when clearing demo session
    if (user?.id && session.is_demo_session) {
      resetAnalytics()
    }
    clearStoredDemoCode()
    clearDemoSessionSnapshot()
    setSession(emptySnapshot)
    previousSessionRef.current = emptySnapshot
  }, [user?.id, session.is_demo_session])

  const value = useMemo<DemoSessionContextValue>(
    () => ({
      session,
      loading,
      setPendingDemoCode,
      clearPendingDemoCode,
      refreshSession,
    }),
    [session, loading, setPendingDemoCode, clearPendingDemoCode, refreshSession],
  )

  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>
}

export function useDemoSession(): DemoSessionContextValue {
  const context = useContext(DemoSessionContext)
  if (!context) {
    throw new Error('useDemoSession must be used within a DemoSessionProvider')
  }
  return context
}
