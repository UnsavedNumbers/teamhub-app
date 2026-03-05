import { supabase } from '../../lib/supabase'
import {
  getOneSignalPushState,
  getOrCreatePushDeviceId,
  initializeOneSignalForUser,
  requestPushPermission,
} from '../../lib/push/oneSignalWeb'

export interface PushSyncResult {
  success: boolean
  reason:
    | 'ok'
    | 'not_configured'
    | 'not_supported'
    | 'permission_denied'
    | 'permission_default'
    | 'sync_failed'
  permission: NotificationPermission | 'unsupported'
  subscriptionId: string | null
  error: Error | null
}

interface SyncPushSubscriptionParams {
  userId: string
  orgId: string | null
}

interface PushSubscriptionPayload {
  orgId: string | null
  deviceId: string
  provider: 'onesignal'
  providerSubscriptionId: string | null
  permission: NotificationPermission | 'unsupported'
  isActive: boolean
  metadata: {
    userAgent: string
    platform: string
    language: string
  }
}

function createPayload(params: SyncPushSubscriptionParams): Promise<PushSubscriptionPayload> {
  return getOneSignalPushState().then((state) => ({
    orgId: params.orgId,
    deviceId: getOrCreatePushDeviceId(),
    provider: 'onesignal',
    providerSubscriptionId: state.subscriptionId,
    permission: state.permission,
    isActive: state.permission === 'granted' && state.optedIn,
    metadata: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
    },
  }))
}

export async function syncPushSubscription(params: SyncPushSubscriptionParams): Promise<PushSyncResult> {
  if (!params.userId || params.userId.trim().length === 0) {
    return {
      success: false,
      reason: 'sync_failed',
      permission: 'unsupported',
      subscriptionId: null,
      error: new Error('User ID is required to sync push subscriptions'),
    }
  }

  const state = await getOneSignalPushState()

  if (!state.configured) {
    return {
      success: false,
      reason: 'not_configured',
      permission: state.permission,
      subscriptionId: state.subscriptionId,
      error: null,
    }
  }

  if (!state.supported) {
    return {
      success: false,
      reason: 'not_supported',
      permission: state.permission,
      subscriptionId: state.subscriptionId,
      error: null,
    }
  }

  const payload = await createPayload(params)

  const { error } = await supabase.functions.invoke('push-subscription-upsert', {
    body: payload,
  })

  if (error) {
    return {
      success: false,
      reason: 'sync_failed',
      permission: state.permission,
      subscriptionId: state.subscriptionId,
      error,
    }
  }

  if (state.permission === 'denied') {
    return {
      success: false,
      reason: 'permission_denied',
      permission: state.permission,
      subscriptionId: state.subscriptionId,
      error: null,
    }
  }

  if (state.permission !== 'granted') {
    return {
      success: false,
      reason: 'permission_default',
      permission: state.permission,
      subscriptionId: state.subscriptionId,
      error: null,
    }
  }

  return {
    success: true,
    reason: 'ok',
    permission: state.permission,
    subscriptionId: state.subscriptionId,
    error: null,
  }
}

export async function enablePushForUser(params: SyncPushSubscriptionParams): Promise<PushSyncResult> {
  const initialized = await initializeOneSignalForUser(params.userId)
  if (!initialized.success) {
    return {
      success: false,
      reason: 'sync_failed',
      permission: 'unsupported',
      subscriptionId: null,
      error: initialized.error,
    }
  }

  const permissionResult = await requestPushPermission()
  if (permissionResult.error) {
    return {
      success: false,
      reason: 'sync_failed',
      permission: Notification.permission,
      subscriptionId: null,
      error: permissionResult.error,
    }
  }

  return await syncPushSubscription(params)
}

export async function revokePushForUser(params: SyncPushSubscriptionParams): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase.functions.invoke('push-subscription-revoke', {
    body: {
      orgId: params.orgId,
      deviceId: getOrCreatePushDeviceId(),
      provider: 'onesignal',
    },
  })

  if (error) {
    return { success: false, error }
  }

  return { success: true, error: null }
}
