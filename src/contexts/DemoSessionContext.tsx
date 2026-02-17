import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { DemoSessionSnapshot } from '@/types/demoManagement'
import { normalizeDemoCode } from '@/types/demoManagement'
import {
  clearStoredDemoCode,
  getCurrentDemoSessionSnapshot,
  setStoredDemoCode,
} from '@/data/services/demoSessionService'
import { clearDemoSessionSnapshot } from '@/data/fake/demoDataStore'

interface DemoSessionContextValue {
  session: DemoSessionSnapshot
  loading: boolean
  setPendingDemoCode: (code: string) => void
  clearPendingDemoCode: () => void
  refreshSession: () => void
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

  const refreshSession = useCallback(() => {
    const snapshot = getCurrentDemoSessionSnapshot()

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
  }, [])

  useEffect(() => {
    refreshSession()
    setLoading(false)
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
