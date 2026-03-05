/**
 * PostHog Analytics Initialization
 *
 * Provides PostHog instance and utilities. PostHog is only initialized in production
 * via PostHogProvider in main.tsx. All calls should go through lib/analytics/analytics.ts
 * for try/catch safety and consistent snake_case naming.
 */

import posthog from 'posthog-js'

/**
 * Check if PostHog is available and initialized
 */
export function isPostHogAvailable(): boolean {
  try {
    return typeof posthog !== 'undefined' && (posthog as unknown as { __loaded?: boolean }).__loaded === true
  } catch {
    return false
  }
}

/**
 * Get PostHog instance (for non-React code).
 * Returns null if PostHog is not available. Prefer captureEvent/identifyUser/resetAnalytics from analytics.ts.
 */
export function getPostHogInstance(): typeof posthog | null {
  if (!isPostHogAvailable()) {
    return null
  }
  return posthog
}

/**
 * Identify a user in PostHog with demo session properties.
 * Wrapped in try/catch so failures never break the app.
 */
export function identifyDemoUser(
  userId: string,
  properties: {
    demo_code: string
    demo_role: string
    demo_org_id: string
    organization_id?: string | null
  }
): void {
  try {
    const instance = getPostHogInstance()
    if (!instance) return
    instance.identify(userId, {
      user_type: 'demo',
      demo_session: true,
      ...properties,
    })
  } catch {
    // Failures must never break the app
  }
}

/**
 * Reset PostHog identification (call on logout).
 * Prefer resetAnalytics() from analytics.ts for a single entry point.
 */
export function resetPostHogIdentification(): void {
  try {
    const instance = getPostHogInstance()
    if (!instance) return
    instance.reset()
  } catch {
    // Failures must never break the app
  }
}
