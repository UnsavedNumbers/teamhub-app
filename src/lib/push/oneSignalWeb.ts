import { STORAGE_KEYS } from '../../constants/storage'
import { debug } from '../debug'

const ONE_SIGNAL_SCRIPT_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

interface OneSignalPushSubscription {
  id?: string | null
  optedIn?: boolean
}

interface OneSignalClient {
  init: (options: Record<string, unknown>) => Promise<void>
  login?: (externalId: string) => Promise<void>
  logout?: () => Promise<void>
  Notifications?: {
    requestPermission?: () => Promise<void>
  }
  User?: {
    PushSubscription?: OneSignalPushSubscription
  }
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalClient) => void | Promise<void>>
  }
}

let scriptLoadPromise: Promise<void> | null = null
let initPromise: Promise<void> | null = null

export interface OneSignalPushState {
  configured: boolean
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  subscriptionId: string | null
  optedIn: boolean
}

export function isOneSignalConfigured(): boolean {
  return typeof import.meta.env.VITE_ONESIGNAL_APP_ID === 'string' && import.meta.env.VITE_ONESIGNAL_APP_ID.trim().length > 0
}

export function isBrowserPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  if (!window.isSecureContext && window.location.hostname !== 'localhost') return false
  return 'Notification' in window && 'serviceWorker' in navigator
}

export function getOrCreatePushDeviceId(): string {
  if (typeof window === 'undefined') return 'server'

  const existing = window.localStorage.getItem(STORAGE_KEYS.PUSH_DEVICE_ID)
  if (existing) return existing

  const nextId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `push-${Date.now()}-${Math.random().toString(16).slice(2)}`

  window.localStorage.setItem(STORAGE_KEYS.PUSH_DEVICE_ID, nextId)
  return nextId
}

async function loadOneSignalScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Document is not available in this environment'))
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${ONE_SIGNAL_SCRIPT_URL}"]`)
    if (existing) {
      if ((existing as HTMLScriptElement).dataset.loaded === 'true') {
        resolve()
        return
      }

      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load OneSignal SDK script')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = ONE_SIGNAL_SCRIPT_URL
    script.async = true
    script.dataset.loaded = 'false'
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => {
      reject(new Error('Failed to load OneSignal SDK script'))
    }
    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

async function runWithOneSignal<T>(callback: (oneSignal: OneSignalClient) => Promise<T> | T): Promise<T> {
  await loadOneSignalScript()

  return await new Promise<T>((resolve, reject) => {
    const deferred = window.OneSignalDeferred ?? []
    deferred.push(async (oneSignal: OneSignalClient) => {
      try {
        const value = await callback(oneSignal)
        resolve(value)
      } catch (error) {
        reject(error)
      }
    })
    window.OneSignalDeferred = deferred
  })
}

export async function initializeOneSignalForUser(userId: string): Promise<{ success: boolean; error: Error | null }> {
  if (!isOneSignalConfigured()) {
    return { success: false, error: new Error('OneSignal app ID is not configured') }
  }

  if (!isBrowserPushSupported()) {
    return { success: false, error: new Error('Browser push is not supported in this environment') }
  }

  if (!userId || userId.trim().length === 0) {
    return { success: false, error: new Error('User ID is required to initialize push') }
  }

  if (!initPromise) {
    const appId = import.meta.env.VITE_ONESIGNAL_APP_ID!.trim()
    initPromise = runWithOneSignal(async (oneSignal) => {
      await oneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: import.meta.env.DEV,
      })
    })
  }

  try {
    await initPromise

    await runWithOneSignal(async (oneSignal) => {
      if (typeof oneSignal.login === 'function') {
        await oneSignal.login(userId)
      }
    })

    return { success: true, error: null }
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('Failed to initialize OneSignal')
    debug.error('Push.OneSignal.initializeOneSignalForUser', 'Initialization failed', {
      error: normalized,
      userId,
    })
    return { success: false, error: normalized }
  }
}

export async function requestPushPermission(): Promise<{ granted: boolean; error: Error | null }> {
  if (!isBrowserPushSupported()) {
    return { granted: false, error: new Error('Browser push is not supported in this environment') }
  }

  try {
    await runWithOneSignal(async (oneSignal) => {
      await oneSignal.Notifications?.requestPermission?.()
    })

    return { granted: Notification.permission === 'granted', error: null }
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('Failed to request push permission')
    return { granted: false, error: normalized }
  }
}

export async function getOneSignalPushState(): Promise<OneSignalPushState> {
  const configured = isOneSignalConfigured()
  const supported = isBrowserPushSupported()

  if (!configured || !supported) {
    return {
      configured,
      supported,
      permission: supported ? Notification.permission : 'unsupported',
      subscriptionId: null,
      optedIn: false,
    }
  }

  try {
    const subscriptionId = await runWithOneSignal(async (oneSignal) => {
      return oneSignal.User?.PushSubscription?.id ?? null
    })

    return {
      configured,
      supported,
      permission: Notification.permission,
      subscriptionId,
      optedIn: Notification.permission === 'granted' && !!subscriptionId,
    }
  } catch {
    return {
      configured,
      supported,
      permission: Notification.permission,
      subscriptionId: null,
      optedIn: false,
    }
  }
}
