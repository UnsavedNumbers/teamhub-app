/**
 * Contact Service
 * 
 * Handles webhook submission for contact forms across different surfaces.
 * Builds rich payloads with user and client metadata.
 */

import type { ContactSurface } from '../types/contact'
import { getEnvironment } from '../utils/featureFlags'
import { invokeApiOperation } from './apiManagerService'

// ============================================================================
// Webhook URL Resolution
// ============================================================================

/**
 * Get webhook URL for a specific surface
 * Checks surface-specific env var first, then falls back to default
 */
export function getWebhookUrl(surface: ContactSurface): string | null {
  void surface
  return null
}

// ============================================================================
// Payload Types
// ============================================================================

export interface ContactPayload {
  // Core fields
  surface: ContactSurface
  subject_enum: string
  subject_label: string
  message: string
  submitted_at: string

  // User identity
  user_id?: string | null
  email?: string | null
  name?: string | null
  role_context?: 'guardian' | 'coach' | 'org_admin' | 'public'
  org_id?: string | null
  org_name?: string | null
  team_ids?: string[]
  athlete_ids?: string[]

  // Client metadata
  app_version?: string
  environment?: 'dev' | 'staging' | 'prod'
  page_url?: string
  route_path?: string
  user_agent?: string
  timezone?: string
  locale?: string
  theme?: 'light' | 'dark'
  active_org_id?: string | null
  active_role?: string | null

  // Diagnostics (optional)
  feature_flags_snapshot?: Record<string, boolean>
}

export interface ContactSubmissionParams {
  surface: ContactSurface
  subjectEnum: string
  subjectLabel: string
  message: string
  name?: string
  email?: string
  userContext?: {
    userId?: string | null
    email?: string | null
    name?: string | null
    roleContext?: 'guardian' | 'coach' | 'org_admin' | 'public'
    orgId?: string | null
    orgName?: string | null
    teamIds?: string[]
    athleteIds?: string[]
  }
  clientMetadata?: {
    appVersion?: string
    environment?: 'dev' | 'staging' | 'prod'
    pageUrl?: string
    routePath?: string
    userAgent?: string
    timezone?: string
    locale?: string
    theme?: 'light' | 'dark'
    activeOrgId?: string | null
    activeRole?: string | null
    featureFlagsSnapshot?: Record<string, boolean>
  }
}

// ============================================================================
// Payload Builder
// ============================================================================

/**
 * Build contact payload with user and client metadata
 */
export function buildContactPayload(params: ContactSubmissionParams): ContactPayload {
  const {
    surface,
    subjectEnum,
    subjectLabel,
    message,
    name,
    email,
    userContext = {},
    clientMetadata = {},
  } = params

  // Sanitize message (strip HTML tags, limit length)
  const sanitizedMessage = sanitizeMessage(message)

  const payload: ContactPayload = {
    // Core fields
    surface,
    subject_enum: subjectEnum,
    subject_label: subjectLabel,
    message: sanitizedMessage,
    submitted_at: new Date().toISOString(),

    // User identity (prefer userContext, fallback to params)
    user_id: userContext.userId ?? null,
    email: userContext.email ?? email ?? null,
    name: userContext.name ?? name ?? null,
    role_context: userContext.roleContext ?? 'public',
    org_id: userContext.orgId ?? null,
    org_name: userContext.orgName ?? null,
    team_ids: userContext.teamIds && userContext.teamIds.length > 0 
      ? userContext.teamIds.slice(0, 50) // Limit to 50 items
      : undefined,
    athlete_ids: userContext.athleteIds && userContext.athleteIds.length > 0
      ? userContext.athleteIds.slice(0, 50) // Limit to 50 items
      : undefined,

    // Client metadata
    app_version: clientMetadata.appVersion ?? import.meta.env.VITE_APP_VERSION ?? 'unknown',
    environment: clientMetadata.environment ?? getEnvironment(),
    page_url: clientMetadata.pageUrl ?? (typeof window !== 'undefined' ? window.location.href : undefined),
    route_path: clientMetadata.routePath ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
    user_agent: clientMetadata.userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
    timezone: clientMetadata.timezone ?? getTimezone(),
    locale: clientMetadata.locale ?? 'en',
    theme: clientMetadata.theme,
    active_org_id: clientMetadata.activeOrgId ?? null,
    active_role: clientMetadata.activeRole ?? null,

    // Diagnostics
    feature_flags_snapshot: clientMetadata.featureFlagsSnapshot 
      ? filterSafeFeatureFlags(clientMetadata.featureFlagsSnapshot)
      : undefined,
  }

  return payload
}

/**
 * Sanitize message: strip HTML tags and limit length
 */
function sanitizeMessage(message: string): string {
  // Strip HTML tags
  const stripped = message.replace(/<[^>]*>/g, '')
  
  // Limit to 5000 characters
  const limited = stripped.length > 5000 ? stripped.substring(0, 5000) : stripped
  
  return limited.trim()
}

/**
 * Get timezone, with fallbacks
 */
function getTimezone(): string {
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  } catch {
    // Fall through to UTC
  }
  return 'UTC'
}

/**
 * Filter feature flags to only include safe, non-sensitive flags
 */
function filterSafeFeatureFlags(flags: Record<string, boolean>): Record<string, boolean> {
  const safe: Record<string, boolean> = {}
  
  for (const [key, value] of Object.entries(flags)) {
    // Exclude internal/admin flags
    if (key.startsWith('internal_') || key.startsWith('admin_')) {
      continue
    }
    safe[key] = value
  }
  
  return safe
}

// ============================================================================
// Submission
// ============================================================================

export interface ContactSubmissionResult {
  success: boolean
  error?: Error
}

/**
 * Submit contact form to webhook and store in database
 */
export async function submitContact(
  payload: ContactPayload,
  surface: ContactSurface
): Promise<ContactSubmissionResult> {
  const webhookUrl = null
  
  // Check offline mode
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      error: new Error('You appear to be offline. Please check your connection and try again.'),
    }
  }

  let webhookSuccess = false
  let webhookResponseStatus: number | null = null
  let webhookErrorMessage: string | null = null

  try {
    const response = await invokeApiOperation<{ statusCode: number }>({
      operation: 'automation.submitContact',
      input: {
        ...payload,
        surface,
      } as unknown as Record<string, unknown>,
    })

    if (response.ok) {
      webhookSuccess = true
      webhookResponseStatus = response.data.statusCode
      webhookErrorMessage = null
    } else {
      webhookSuccess = false
      webhookResponseStatus = null
      webhookErrorMessage = `${response.error.message} [${response.error.code}]`
    }
  } catch (error) {
    webhookSuccess = false
    webhookResponseStatus = null
    webhookErrorMessage = error instanceof Error ? error.message : 'Unknown error'
  }

  // Store submission in database (always, even if webhook fails)
  try {
    const { createContactSubmission } = await import('../data/services/contactSubmissionsService')
    
    const dbPayload = {
      surface: payload.surface,
      subject_enum: payload.subject_enum,
      subject_label: payload.subject_label,
      message: payload.message,
      submitted_at: payload.submitted_at,
      user_id: payload.user_id || null,
      email: payload.email || null,
      name: payload.name || null,
      role_context: payload.role_context || null,
      org_id: payload.org_id || null,
      org_name: payload.org_name || null,
      team_ids: payload.team_ids || [],
      athlete_ids: payload.athlete_ids || [],
      app_version: payload.app_version || null,
      environment: payload.environment || null,
      page_url: payload.page_url || null,
      route_path: payload.route_path || null,
      user_agent: payload.user_agent || null,
      timezone: payload.timezone || null,
      locale: payload.locale || null,
      theme: payload.theme || null,
      active_org_id: payload.active_org_id || null,
      active_role: payload.active_role || null,
      feature_flags_snapshot: payload.feature_flags_snapshot || null,
      webhook_url: webhookUrl || null,
      webhook_success: webhookSuccess,
      webhook_response_status: webhookResponseStatus,
      webhook_error_message: webhookErrorMessage,
      webhook_sent_at: webhookUrl ? new Date().toISOString() : null,
      viewed_by_platform_admin_id: null,
      viewed_at: null,
      status: 'new' as const,
      admin_notes: null,
    }

    const { error: dbError } = await createContactSubmission(dbPayload)
    
    if (dbError) {
      console.error('Failed to store contact submission in database:', dbError)
      // Don't fail the whole operation if DB storage fails
    }
  } catch (dbErr) {
    console.error('Error storing contact submission:', dbErr)
    // Continue - webhook submission is primary, DB storage is secondary
  }

  if (webhookSuccess) {
    return { success: true }
  }

  return {
    success: false,
    error: new Error(webhookErrorMessage || 'Failed to submit contact form. Please try again.'),
  }
}
