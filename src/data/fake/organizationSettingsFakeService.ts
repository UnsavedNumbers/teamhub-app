/**
 * Fake Organization Settings Service
 *
 * Provides org settings data for demo mode with optimistic locking.
 */

import { FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from './userContext'
import {
  getDefaultSettings,
  generalSettingsSchema,
  defaultsSettingsSchema,
  attendanceSettingsSchema,
  registrationSettingsSchema,
  visibilitySettingsSchema,
  notificationSettingsSchema,
  advancedSettingsSchema,
  type OrganizationSettings,
  type GeneralSettings,
  type DefaultsSettings,
  type AttendanceSettings,
  type RegistrationSettings,
  type VisibilitySettings,
  type NotificationSettings,
  type AdvancedSettings,
} from '../../types/organizationSettings'
import { getOrganizationById } from './fakeOrganizations'

const settingsStore = new Map<string, OrganizationSettings>()

async function simulateDelay(): Promise<void> {
  if (FAKE_DATA_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
  }
}

function ensureSettings(context: UserContext): OrganizationSettings {
  const existing = settingsStore.get(context.orgId)
  if (existing) return existing

  const orgName = getOrganizationById(context.orgId)?.name ?? 'My Organization'
  const defaults = getDefaultSettings(context.orgId, orgName)
  settingsStore.set(context.orgId, defaults)
  return defaults
}

function cloneSettings(settings: OrganizationSettings): OrganizationSettings {
  return JSON.parse(JSON.stringify(settings)) as OrganizationSettings
}

function validateOptimisticLock(currentUpdatedAt: string, storedUpdatedAt: string): void {
  if (currentUpdatedAt !== storedUpdatedAt) {
    throw new Error('Settings were modified by another user. Please refresh and try again.')
  }
}

function sanitizeFanVisibilityDefaults(
  defaults: unknown
): VisibilitySettings['fan_visibility_defaults'] | undefined {
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) {
    return undefined
  }

  return Object.entries(defaults as Record<string, unknown>).reduce<Record<string, boolean>>(
    (acc, [key, value]) => {
      acc[key] = typeof value === 'boolean' ? value : false
      return acc
    },
    {}
  )
}

function sanitizeVisibilitySettingsPayload(
  settings: Partial<VisibilitySettings>
): Partial<VisibilitySettings> {
  if (!Object.prototype.hasOwnProperty.call(settings, 'fan_visibility_defaults')) {
    return settings
  }

  return {
    ...settings,
    fan_visibility_defaults: sanitizeFanVisibilityDefaults(settings.fan_visibility_defaults),
  }
}

export async function getOrganizationSettings(
  context: UserContext
): Promise<{ data: OrganizationSettings | null; error: Error | null }> {
  try {
    await simulateDelay()
    const settings = ensureSettings(context)
    return { data: cloneSettings(settings), error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateGeneralSettings(
  context: UserContext,
  settings: Partial<GeneralSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  try {
    await simulateDelay()
    const validated = generalSettingsSchema.partial().parse(settings)
    const current = ensureSettings(context)
    validateOptimisticLock(currentUpdatedAt, current.general.updated_at)

    const updated: GeneralSettings = {
      ...current.general,
      ...validated,
      updated_at: new Date().toISOString(),
    }

    settingsStore.set(context.orgId, { ...current, general: updated })
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateDefaultsSettings(
  context: UserContext,
  settings: Partial<DefaultsSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  try {
    await simulateDelay()
    const validated = defaultsSettingsSchema.partial().parse(settings)
    const current = ensureSettings(context)
    validateOptimisticLock(currentUpdatedAt, current.defaults.updated_at)

    const updated: DefaultsSettings = {
      ...current.defaults,
      ...validated,
      updated_at: new Date().toISOString(),
    }

    settingsStore.set(context.orgId, { ...current, defaults: updated })
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateAttendanceSettings(
  context: UserContext,
  settings: Partial<AttendanceSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  try {
    await simulateDelay()
    const validated = attendanceSettingsSchema.partial().parse(settings)
    const current = ensureSettings(context)
    validateOptimisticLock(currentUpdatedAt, current.attendance.updated_at)

    const updated: AttendanceSettings = {
      ...current.attendance,
      ...validated,
      updated_at: new Date().toISOString(),
    }

    settingsStore.set(context.orgId, { ...current, attendance: updated })
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateRegistrationSettings(
  context: UserContext,
  settings: Partial<RegistrationSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  try {
    await simulateDelay()
    const validated = registrationSettingsSchema.partial().parse(settings)
    const current = ensureSettings(context)
    validateOptimisticLock(currentUpdatedAt, current.registration.updated_at)

    const updated: RegistrationSettings = {
      ...current.registration,
      ...validated,
      updated_at: new Date().toISOString(),
    }

    settingsStore.set(context.orgId, { ...current, registration: updated })
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateVisibilitySettings(
  context: UserContext,
  settings: Partial<VisibilitySettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  try {
    await simulateDelay()
    const sanitizedSettings = sanitizeVisibilitySettingsPayload(settings)
    const validated = visibilitySettingsSchema.partial().parse(sanitizedSettings)
    const current = ensureSettings(context)
    validateOptimisticLock(currentUpdatedAt, current.visibility.updated_at)

    const updated: VisibilitySettings = {
      ...current.visibility,
      ...validated,
      updated_at: new Date().toISOString(),
    }

    settingsStore.set(context.orgId, { ...current, visibility: updated })
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateNotificationSettings(
  context: UserContext,
  settings: Partial<NotificationSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  try {
    await simulateDelay()
    const validated = notificationSettingsSchema.partial().parse(settings)
    const current = ensureSettings(context)
    validateOptimisticLock(currentUpdatedAt, current.notifications.updated_at)

    const updated: NotificationSettings = {
      ...current.notifications,
      ...validated,
      updated_at: new Date().toISOString(),
    }

    settingsStore.set(context.orgId, { ...current, notifications: updated })
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateAdvancedSettings(
  context: UserContext,
  settings: Partial<AdvancedSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  try {
    await simulateDelay()
    const validated = advancedSettingsSchema.partial().parse(settings)
    const current = ensureSettings(context)
    validateOptimisticLock(currentUpdatedAt, current.advanced.updated_at)

    const updated: AdvancedSettings = {
      ...current.advanced,
      ...validated,
      updated_at: new Date().toISOString(),
    }

    settingsStore.set(context.orgId, { ...current, advanced: updated })
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function checkImpactedRecords(
  _context: UserContext,
  _settingType: 'registration' | 'attendance' | 'general',
  _field: string
): Promise<{ count: number; error: Error | null }> {
  try {
    await simulateDelay()
    return { count: 0, error: null }
  } catch (err) {
    return { count: 0, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
