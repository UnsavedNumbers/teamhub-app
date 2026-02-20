import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
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
  demo_code: null,
  expires_at: null,
}

const DemoSessionContext = createContext<DemoSessionContextValue | undefined>(undefined)

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSessionSnapshot>(emptySnapshot)
  const [loading, setLoading] = useState(true)
  const authContext = useOptionalAuth()
  const user = authContext?.user ?? null

  const refreshSession = useCallback(async () => {
    // First check localStorage snapshot
    let snapshot = getCurrentDemoSessionSnapshot()

    // If no snapshot but user is logged in, try fetching from database
    if (!snapshot.is_demo_session && user?.id) {
      try {
        const dbSession = await getDemoSession(user.id)
        if (dbSession) {
          snapshot = getCurrentDemoSessionSnapshot()
          
          // When USE_FAKE_DATA is true and we have a demo session, ensure fake data is generated
          if (USE_FAKE_DATA && snapshot.is_demo_session && snapshot.demo_org_id && snapshot.demo_code) {
            try {
              const demoOrg = await getDemoOrg(snapshot.demo_org_id)
              await generateDemoData(demoOrg, demoOrg.sports_sponsored, snapshot.demo_code)
            } catch (err) {
              console.error('[DemoSessionContext] Failed to generate demo data:', err)
            }
          }
        }
      } catch (err) {
        console.error('[DemoSessionContext] Failed to fetch demo session:', err)
      }
    }

    if (!snapshot.is_demo_session || !snapshot.expires_at) {
      setSession(emptySnapshot)
      return
    }

    const expiresMs = new Date(snapshot.expires_at).getTime()
    if (Number.isNaN(expiresMs) || expiresMs <= Date.now()) {
      clearStoredDemoCode()
      clearDemoSessionSnapshot()
      setSession(emptySnapshot)
      return
    }

    setSession(snapshot)
  }, [user?.id])

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
    clearStoredDemoCode()
    clearDemoSessionSnapshot()
    setSession(emptySnapshot)
  }, [])

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
