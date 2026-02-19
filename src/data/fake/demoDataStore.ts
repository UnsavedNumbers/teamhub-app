import type { DemoGeneratedData, DemoSessionSnapshot } from '@/types/demoManagement'
import { DEMO_SESSION_STORAGE_KEY } from '@/types/demoManagement'

const generatedDataByOrg = new Map<string, DemoGeneratedData>()

const emptySnapshot: DemoSessionSnapshot = {
  is_demo_session: false,
  demo_org_id: null,
  demo_code: null,
  expires_at: null,
}

function parseSnapshot(raw: string | null): DemoSessionSnapshot {
  if (!raw) return emptySnapshot

  try {
    const parsed = JSON.parse(raw) as Partial<DemoSessionSnapshot>
    const isDemoSession = parsed.is_demo_session === true
    const demoOrgId = typeof parsed.demo_org_id === 'string' ? parsed.demo_org_id : null
    const demoCode = typeof parsed.demo_code === 'string' ? parsed.demo_code : null
    const expiresAt = typeof parsed.expires_at === 'string' ? parsed.expires_at : null

    if (!isDemoSession || !demoOrgId || !demoCode || !expiresAt) {
      return emptySnapshot
    }

    return {
      is_demo_session: true,
      demo_org_id: demoOrgId,
      demo_code: demoCode,
      expires_at: expiresAt,
    }
  } catch {
    return emptySnapshot
  }
}

export function readDemoSessionSnapshot(): DemoSessionSnapshot {
  if (typeof window === 'undefined') return emptySnapshot
  return parseSnapshot(window.sessionStorage.getItem(DEMO_SESSION_STORAGE_KEY))
}

export function writeDemoSessionSnapshot(snapshot: DemoSessionSnapshot): void {
  if (typeof window === 'undefined') return

  if (!snapshot.is_demo_session || !snapshot.demo_org_id || !snapshot.demo_code || !snapshot.expires_at) {
    window.sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(snapshot))
}

export function clearDemoSessionSnapshot(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY)
}

export function getActiveDemoOrgId(): string | null {
  const snapshot = readDemoSessionSnapshot()
  if (!snapshot.is_demo_session || !snapshot.demo_org_id || !snapshot.expires_at) {
    return null
  }

  const expiresMs = new Date(snapshot.expires_at).getTime()
  if (Number.isNaN(expiresMs) || expiresMs <= Date.now()) {
    return null
  }

  return snapshot.demo_org_id
}

export function setGeneratedDemoData(data: DemoGeneratedData): void {
  generatedDataByOrg.set(data.demo_org_id, data)
}

export function getGeneratedDemoData(orgId: string): DemoGeneratedData | undefined {
  return generatedDataByOrg.get(orgId)
}

export function clearGeneratedDemoData(orgId?: string): void {
  if (orgId) {
    generatedDataByOrg.delete(orgId)
    return
  }
  generatedDataByOrg.clear()
}
