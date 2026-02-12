/**
 * Event Logger Utility
 * 
 * Provides type-safe event logging with automatic sanitization,
 * context extraction, and circular logging prevention.
 */

import { supabase } from '../lib/supabase'
import { sanitizeMetadataForAudit } from './platformAdminMasking'
import type { Json } from '../lib/supabase.extended.types'
import type {
  EventCategory,
  EventLogParams,
  EventLogResponse,
  EventActorRole,
} from '../types/eventLog.types'

// Flag to prevent circular logging
let isLoggingContext = false

/**
 * Derive event actor role from app role list.
 * `staff` is mapped to `coach` because event_actor_role does not include `staff`.
 */
export function deriveActorRoleFromRoles(roles?: Array<string | null | undefined>): EventActorRole {
  const normalized = new Set(
    (roles || [])
      .filter((role): role is string => Boolean(role))
      .map((role) => role.toLowerCase())
  )

  if (normalized.has('platform_admin')) return 'platform_admin'
  if (normalized.has('org_admin')) return 'org_admin'
  if (normalized.has('coach') || normalized.has('staff')) return 'coach'
  return 'parent'
}

/**
 * Extract IP address from request headers
 */
function extractIpAddress(headers: Headers | Record<string, string>): string | null {
  if (headers instanceof Headers) {
    // Edge Function or Fetch API
    const forwardedFor = headers.get('x-forwarded-for')
    if (forwardedFor) {
      // Take first IP if multiple
      return forwardedFor.split(',')[0].trim()
    }
    const realIp = headers.get('x-real-ip')
    if (realIp) {
      return realIp
    }
  } else {
    // Plain object
    const forwardedFor = headers['x-forwarded-for']
    if (forwardedFor) {
      return String(forwardedFor).split(',')[0].trim()
    }
    const realIp = headers['x-real-ip']
    if (realIp) {
      return String(realIp)
    }
  }
  return null
}

/**
 * Extract user agent from request headers
 */
function extractUserAgent(headers: Headers | Record<string, string>): string | null {
  if (headers instanceof Headers) {
    return headers.get('user-agent')
  } else {
    return headers['user-agent'] || null
  }
}

/**
 * Core event logging function
 * 
 * @param params - Event log parameters (type-safe based on category)
 * @returns Event ID or null if logging failed
 */
export async function logEvent<C extends EventCategory>(
  params: EventLogParams<C>
): Promise<EventLogResponse> {
  if (String(params.eventType).includes('__rls__')) {
    return { id: null }
  }

  // Prevent circular logging
  if (isLoggingContext) {
    console.warn('Event logging skipped: already in logging context (circular prevention)')
    return { id: null, error: 'Circular logging prevented' }
  }

  try {
    isLoggingContext = true

    // Sanitize metadata
    const sanitizedMetadata = params.metadata
      ? sanitizeMetadataForAudit(params.metadata)
      : {}

    // Check metadata size (100KB limit)
    const metadataSize = new Blob([JSON.stringify(sanitizedMetadata)]).size
    if (metadataSize > 102400) {
      return {
        id: null,
        error: `Metadata size ${metadataSize} bytes exceeds 100KB limit`,
      }
    }

    // Get current user ID if not provided
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const actorUserId = params.actorUserId || user?.id || null

    // Call database function
    const { data, error } = await supabase.rpc('log_event', {
      p_category: params.category,
      p_event_type: params.eventType,
      p_actor_user_id: actorUserId ?? undefined,
      p_actor_role: params.actorRole,
      p_org_id: params.orgId ?? undefined,
      p_target_entity_type: params.targetEntityType ?? undefined,
      p_target_entity_id: params.targetEntityId ?? undefined,
      p_metadata: sanitizedMetadata as Json,
      p_ip_address: params.ipAddress ?? undefined,
      p_user_agent: params.userAgent ?? undefined,
      p_idempotency_key: params.idempotencyKey ?? undefined,
    } as any)

    if (error) {
      console.error('Event logging failed:', error)
      return { id: null, error: error.message }
    }

    return { id: data || null }
  } catch (error) {
    console.error('Event logging error:', error)
    return {
      id: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  } finally {
    isLoggingContext = false
  }
}

/**
 * Log event from a Request object (Edge Functions, API routes)
 * Automatically extracts IP address and user agent
 */
export async function logEventFromRequest<C extends EventCategory>(
  request: Request,
  params: Omit<EventLogParams<C>, 'ipAddress' | 'userAgent'>
): Promise<EventLogResponse> {
  const headers = request.headers
  const ipAddress = extractIpAddress(headers)
  const userAgent = extractUserAgent(headers)

  return logEvent({
    ...params,
    ipAddress,
    userAgent,
  })
}

/**
 * Helper: Log authentication events
 */
export async function logAuthEvent(
  eventType: 'USER_SIGNED_UP' | 'USER_LOGGED_IN' | 'USER_LOGGED_OUT' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_COMPLETED' | 'EMAIL_VERIFIED' | 'EMAIL_VERIFICATION_SENT' | 'ACCOUNT_DISABLED' | 'ACCOUNT_ENABLED',
  actorUserId?: string,
  actorRole: EventActorRole = 'parent',
  metadata?: Record<string, unknown>
): Promise<EventLogResponse> {
  return logEvent({
    category: 'AUTH',
    eventType,
    actorUserId,
    actorRole,
    metadata,
  })
}

/**
 * Helper: Log organization events
 */
export async function logOrganizationEvent(
  eventType: 'ORG_CREATED' | 'ORG_UPDATED' | 'ORG_ACTIVATED' | 'ORG_SUSPENDED' | 'ORG_DELETED' | 'ORG_STRIPE_CONNECTED' | 'ORG_STRIPE_DISCONNECTED' | 'ORG_LICENSE_UPDATED',
  orgId: string,
  actorUserId?: string,
  actorRole: EventActorRole = 'org_admin',
  metadata?: Record<string, unknown>
): Promise<EventLogResponse> {
  return logEvent({
    category: 'ORGANIZATION',
    eventType,
    actorUserId,
    actorRole,
    orgId,
    targetEntityType: 'organization',
    targetEntityId: orgId,
    metadata,
  })
}

/**
 * Helper: Log payment events
 */
export async function logPaymentEvent(
  eventType: 'FEE_CREATED' | 'FEE_UPDATED' | 'FEE_DELETED' | 'FEE_ASSIGNED' | 'FEE_UNASSIGNED' | 'PAYMENT_STARTED' | 'PAYMENT_SUCCEEDED' | 'PAYMENT_FAILED' | 'PAYMENT_REFUNDED' | 'PAYMENT_PARTIALLY_REFUNDED' | 'OFFLINE_PAYMENT_RECORDED' | 'OFFLINE_PAYMENT_VOIDED' | 'DISCOUNT_APPLIED' | 'WAIVER_APPLIED' | 'SCHOLARSHIP_APPLIED',
  orgId: string,
  targetEntityType: 'fee' | 'fee_assignment' | 'payment' | 'checkout_session',
  targetEntityId: string,
  actorUserId?: string,
  actorRole: EventActorRole = 'parent',
  metadata?: Record<string, unknown>
): Promise<EventLogResponse> {
  return logEvent({
    category: 'PAYMENT',
    eventType,
    actorUserId,
    actorRole,
    orgId,
    targetEntityType,
    targetEntityId,
    metadata,
  })
}

/**
 * Helper: Log admin events
 */
export async function logAdminEvent(
  eventType: 'ACTIVATE_ORGANIZATION' | 'SUSPEND_ORGANIZATION' | 'DISABLE_USER' | 'ENABLE_USER' | 'SET_FEATURE_FLAG' | 'ADD_PLATFORM_ADMIN' | 'REMOVE_PLATFORM_ADMIN' | 'UPDATE_PLATFORM_ADMIN' | 'PII_VIEWED' | 'ISSUE_REFUND' | 'MARK_DISPUTE' | 'RESEND_VERIFICATION' | 'FORCE_LOGOUT',
  targetEntityType: string,
  targetEntityId: string,
  actorUserId?: string,
  metadata?: Record<string, unknown>
): Promise<EventLogResponse> {
  return logEvent({
    category: 'ADMIN',
    eventType,
    actorUserId,
    actorRole: 'platform_admin',
    targetEntityType,
    targetEntityId,
    metadata,
  })
}

/**
 * Helper: Log system events
 */
export async function logSystemEvent(
  eventType:
    | 'SCHEDULED_JOB_STARTED'
    | 'SCHEDULED_JOB_COMPLETED'
    | 'SCHEDULED_JOB_FAILED'
    | 'WEBHOOK_RECEIVED'
    | 'WEBHOOK_PROCESSED'
    | 'WEBHOOK_FAILED'
    | 'DATABASE_BACKUP'
    | 'SYSTEM_ALERT'
    | 'PHOTO_UPLOADED'
    | 'ATHLETE_PHOTO_UPLOADED'
    | 'VIDEO_UPLOAD_STARTED'
    | 'VIDEO_UPLOAD_COMPLETED'
    | 'VIDEO_UPLOAD_FAILED'
    | 'VIDEO_UPLOAD_CANCELLED'
    | 'ORG_LOGO_UPLOADED'
    | 'EVENT_BANNER_UPLOADED',
  metadata?: Record<string, unknown>
): Promise<EventLogResponse> {
  return logEvent({
    category: 'SYSTEM',
    eventType,
    actorRole: 'system',
    metadata,
  })
}

/**
 * Helper: Log sport events
 */
export async function logSportEvent(
  eventType: 'SPORT_LINKED' | 'SPORT_UNLINKED' | 'SPORT_CUSTOMIZED' | 'SPORT_CUSTOMIZATION_UPDATED' | 'SPORT_CUSTOMIZATION_REMOVED' | 'SPORT_ICON_UPLOADED' | 'SPORT_ICON_DELETED',
  orgId: string,
  targetEntityId: string,
  actorUserId?: string,
  actorRole: EventActorRole = 'org_admin',
  metadata?: Record<string, unknown>
): Promise<EventLogResponse> {
  return logEvent({
    category: 'SPORT',
    eventType,
    actorUserId,
    actorRole,
    orgId,
    targetEntityType: 'sport',
    targetEntityId,
    metadata,
  })
}
