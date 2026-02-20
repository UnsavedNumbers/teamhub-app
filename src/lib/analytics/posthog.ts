/**
 * PostHog Analytics Initialization
 * 
 * Provides PostHog instance and utilities for tracking demo sessions.
 * PostHog is initialized via PostHogProvider in main.tsx.
 */

import posthog from 'posthog-js'

/**
 * Check if PostHog is available and initialized
 */
export function isPostHogAvailable(): boolean {
  return typeof posthog !== 'undefined' && posthog.__loaded === true
}

/**
 * Get PostHog instance (for non-React code)
 * Returns null if PostHog is not available
 */
export function getPostHogInstance(): typeof posthog | null {
  if (!isPostHogAvailable()) {
    return null
  }
  return posthog
}

/**
 * Identify a user in PostHog with demo session properties
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
  const instance = getPostHogInstance()
  if (!instance) return

  instance.identify(userId, {
    user_type: 'demo',
    demo_session: true,
    ...properties,
  })
}

/**
 * Reset PostHog identification (call on logout)
 */
export function resetPostHogIdentification(): void {
  const instance = getPostHogInstance()
  if (!instance) return

  instance.reset()
}
