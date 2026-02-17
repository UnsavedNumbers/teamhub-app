import { supabase } from '@/lib/supabase'
import type { DemoSession, DemoSessionSnapshot } from '@/types/demoManagement'
import {
  DEMO_CODE_STORAGE_KEY,
  normalizeDemoCode,
} from '@/types/demoManagement'
import { USE_FAKE_DATA } from '../config'
import { getDemoCodeDetails, validateDemoCode } from './demoCodeService'
import { readDemoManagementStore, writeDemoManagementStore } from './demoOrgService'
import {
  clearDemoSessionSnapshot,
  readDemoSessionSnapshot,
  writeDemoSessionSnapshot,
} from '../fake/demoDataStore'
const supabaseAny = supabase as any

function nowIso(): string {
  return new Date().toISOString()
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function toSnapshot(session: DemoSession | null): DemoSessionSnapshot {
  if (!session) {
    return {
      is_demo_session: false,
      demo_org_id: null,
      demo_code: null,
      expires_at: null,
    }
  }

  return {
    is_demo_session: true,
    demo_org_id: session.demo_org_id,
    demo_code: session.demo_code,
    expires_at: session.expires_at,
  }
}

export function getStoredDemoCode(): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(DEMO_CODE_STORAGE_KEY)
  if (!raw) return null
  const normalized = normalizeDemoCode(raw)
  return normalized.length > 0 ? normalized : null
}

export function setStoredDemoCode(code: string | null): void {
  if (typeof window === 'undefined') return

  if (!code) {
    window.sessionStorage.removeItem(DEMO_CODE_STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(DEMO_CODE_STORAGE_KEY, normalizeDemoCode(code))
}

export function clearStoredDemoCode(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(DEMO_CODE_STORAGE_KEY)
}

export function getCurrentDemoSessionSnapshot(): DemoSessionSnapshot {
  return readDemoSessionSnapshot()
}

export async function createDemoSession(demoCode: string, userId: string): Promise<DemoSession> {
  if (!userId.trim()) {
    throw new Error('User ID is required.')
  }

  const normalizedCode = normalizeDemoCode(demoCode)
  const validation = await validateDemoCode(normalizedCode)
  if (!validation.valid) {
    throw new Error('The demo code is invalid or expired.')
  }

  const codeDetails = await getDemoCodeDetails(normalizedCode)
  const session: DemoSession = {
    id: createId('demo-session'),
    demo_code: normalizedCode,
    user_id: userId,
    demo_org_id: codeDetails.demo_org_id,
    started_at: nowIso(),
    last_activity_at: nowIso(),
    expires_at: codeDetails.expires_at,
  }

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    store.sessions = store.sessions.filter((entry) => entry.user_id !== userId)
    store.sessions.unshift(session)
    writeDemoManagementStore(store)
  } else {
    const { error } = await supabaseAny
      .from('demo_sessions')
      .upsert(
        {
          demo_code: session.demo_code,
          user_id: session.user_id,
          demo_org_id: session.demo_org_id,
          started_at: session.started_at,
          last_activity_at: session.last_activity_at,
          expires_at: session.expires_at,
        },
        { onConflict: 'user_id,demo_code' },
      )

    if (error) {
      throw new Error(`Failed to create demo session: ${error.message}`)
    }
  }

  writeDemoSessionSnapshot(toSnapshot(session))
  return session
}

export async function getDemoSession(userId: string): Promise<DemoSession | null> {
  if (!userId.trim()) return null

  let session: DemoSession | null = null

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    session =
      store.sessions
        .filter((entry) => entry.user_id === userId)
        .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at))[0] ?? null
  } else {
    const { data, error } = await supabaseAny
      .from('demo_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to read demo session: ${error.message}`)
    }

    if (data) {
      session = {
        id: String(data.id),
        demo_code: String(data.demo_code),
        user_id: String(data.user_id),
        demo_org_id: String(data.demo_org_id),
        started_at: String(data.started_at),
        last_activity_at: String(data.last_activity_at),
        expires_at: String(data.expires_at),
      }
    }
  }

  if (!session) {
    clearDemoSessionSnapshot()
    return null
  }

  const expiresMs = new Date(session.expires_at).getTime()
  if (Number.isNaN(expiresMs) || expiresMs <= Date.now()) {
    await endDemoSession(userId)
    return null
  }

  writeDemoSessionSnapshot(toSnapshot(session))
  return session
}

export async function updateDemoSessionActivity(userId: string): Promise<void> {
  if (!userId.trim()) return

  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    const index = store.sessions.findIndex((entry) => entry.user_id === userId)
    if (index < 0) return

    store.sessions[index] = {
      ...store.sessions[index],
      last_activity_at: nowIso(),
    }
    writeDemoManagementStore(store)

    const snapshot = readDemoSessionSnapshot()
    if (snapshot.is_demo_session && snapshot.demo_org_id === store.sessions[index].demo_org_id) {
      writeDemoSessionSnapshot({
        ...snapshot,
        expires_at: store.sessions[index].expires_at,
      })
    }
    return
  }

  const { error } = await supabaseAny
    .from('demo_sessions')
    .update({ last_activity_at: nowIso() })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to update demo session activity: ${error.message}`)
  }
}

export async function endDemoSession(userId: string): Promise<void> {
  if (USE_FAKE_DATA) {
    const store = readDemoManagementStore()
    store.sessions = store.sessions.filter((entry) => entry.user_id !== userId)
    writeDemoManagementStore(store)
  } else {
    const { error } = await supabaseAny.from('demo_sessions').delete().eq('user_id', userId)
    if (error) {
      throw new Error(`Failed to end demo session: ${error.message}`)
    }
  }

  clearStoredDemoCode()
  clearDemoSessionSnapshot()
}
