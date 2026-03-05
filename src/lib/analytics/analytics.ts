/**
 * Central analytics API — all PostHog usage goes through here.
 * - Disabled in development; enabled only in production when PostHog is configured.
 * - All calls are wrapped in try/catch so failures never break the app.
 * - Event names and property keys use snake_case.
 */

import { getPostHogInstance } from './posthog'

/** Normalize string to snake_case for event/property keys */
function toSnakeCase(value: string): string {
  return value
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * Capture an event. Safe to call from anywhere; no-op if PostHog is unavailable or throws.
 * Adds timestamp automatically. Pass user_id and organization_id when available.
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  try {
    const instance = getPostHogInstance()
    if (!instance) return

    const name = toSnakeCase(eventName)
    const payload: Record<string, unknown> = {
      ...properties,
      timestamp: new Date().toISOString(),
    }
    instance.capture(name, payload)
  } catch {
    // Failures must never break the app
  }
}

/**
 * Identify the current user (call after login).
 * Safe to call from anywhere; no-op if PostHog is unavailable or throws.
 */
export function identifyUser(
  userId: string,
  traits: {
    email?: string | null
    name?: string | null
    organization_id?: string | null
    [key: string]: unknown
  }
): void {
  try {
    const instance = getPostHogInstance()
    if (!instance) return

    const normalized: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(traits)) {
      if (v !== undefined && v !== null) normalized[toSnakeCase(k)] = v
    }
    instance.identify(userId, normalized)
  } catch {
    // Failures must never break the app
  }
}

/**
 * Reset identification (call on logout).
 * Safe to call from anywhere; no-op if PostHog is unavailable or throws.
 */
export function resetAnalytics(): void {
  try {
    const instance = getPostHogInstance()
    if (!instance) return
    instance.reset()
  } catch {
    // Failures must never break the app
  }
}
