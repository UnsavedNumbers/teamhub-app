/**
 * Event Log Types
 * 
 * These types are auto-generated from the database schema.
 * Run `npm run generate-types` to regenerate after schema changes.
 */

export type EventCategory =
  | 'AUTH'
  | 'ORGANIZATION'
  | 'USER'
  | 'PARENT'
  | 'CHILD'
  | 'TEAM'
  | 'SEASON'
  | 'EVENT'
  | 'PAYMENT'
  | 'TRYOUT'
  | 'TRAVEL'
  | 'UNIFORM'
  | 'FEATURE_FLAG'
  | 'ADMIN'
  | 'SYSTEM'
  | 'SPORT'

export type EventActorRole =
  | 'platform_admin'
  | 'org_admin'
  | 'coach'
  | 'parent'
  | 'system'

// Event types by category
export type AuthEventType =
  | 'USER_SIGNED_UP'
  | 'USER_LOGGED_IN'
  | 'USER_LOGGED_OUT'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'EMAIL_VERIFIED'
  | 'EMAIL_VERIFICATION_SENT'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_ENABLED'

export type OrganizationEventType =
  | 'ORG_CREATED'
  | 'ORG_UPDATED'
  | 'ORG_ACTIVATED'
  | 'ORG_SUSPENDED'
  | 'ORG_DELETED'
  | 'ORG_STRIPE_CONNECTED'
  | 'ORG_STRIPE_DISCONNECTED'
  | 'ORG_LICENSE_UPDATED'
  // Multi-role events
  | 'ROLE_ADDED'
  | 'ROLE_REMOVED'
  | 'ORG_JOINED'
  | 'ORG_LEFT'
  // Parent onboarding events
  | 'PARENT_INVITED'
  | 'PARENT_ATTACHED'
  | 'JOIN_LINK_CREATED'
  | 'JOIN_REQUEST_SUBMITTED'
  | 'JOIN_REQUEST_APPROVED'
  | 'JOIN_REQUEST_DENIED'
  | 'CHILD_CLAIM_TOKEN_CREATED'
  | 'CHILD_CLAIMED'

export type UserEventType =
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_ROLE_CHANGED'
  | 'USER_ORG_JOINED'
  | 'USER_ORG_LEFT'

export type ParentEventType =
  | 'PARENT_PROFILE_UPDATED'
  | 'PARENT_EMAIL_CHANGED'
  | 'PARENT_PHONE_CHANGED'

export type ChildEventType =
  | 'CHILD_CREATED'
  | 'CHILD_UPDATED'
  | 'CHILD_DELETED'
  | 'CHILD_PROFILE_UPDATED'

export type TeamEventType =
  | 'TEAM_CREATED'
  | 'TEAM_UPDATED'
  | 'TEAM_DELETED'
  | 'TEAM_MEMBER_ADDED'
  | 'TEAM_MEMBER_REMOVED'
  | 'TEAM_INVITE_SENT'
  | 'TEAM_INVITE_ACCEPTED'

export type SeasonEventType =
  | 'SEASON_CREATED'
  | 'SEASON_UPDATED'
  | 'SEASON_DELETED'
  | 'SEASON_ACTIVATED'
  | 'SEASON_ARCHIVED'

export type CalendarEventType =
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_DELETED'
  | 'EVENT_CANCELLED'
  | 'EVENT_RSVP_SUBMITTED'
  | 'EVENT_RSVP_UPDATED'

export type PaymentEventType =
  | 'FEE_CREATED'
  | 'FEE_UPDATED'
  | 'FEE_DELETED'
  | 'FEE_ASSIGNED'
  | 'FEE_UNASSIGNED'
  | 'PAYMENT_STARTED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_PARTIALLY_REFUNDED'
  | 'OFFLINE_PAYMENT_RECORDED'
  | 'OFFLINE_PAYMENT_VOIDED'
  | 'DISCOUNT_APPLIED'
  | 'WAIVER_APPLIED'
  | 'SCHOLARSHIP_APPLIED'

export type TryoutEventType =
  | 'TRYOUT_CREATED'
  | 'TRYOUT_UPDATED'
  | 'TRYOUT_DELETED'
  | 'TRYOUT_REGISTRATION_STARTED'
  | 'TRYOUT_REGISTRATION_COMPLETED'
  | 'TRYOUT_CHECKED_IN'
  | 'TRYOUT_EVALUATED'
  | 'TRYOUT_OFFERED'
  | 'TRYOUT_ACCEPTED'
  | 'TRYOUT_DECLINED'
  | 'TRYOUT_REJECTED'

export type TravelEventType =
  | 'TRAVEL_PLAN_CREATED'
  | 'TRAVEL_PLAN_UPDATED'
  | 'TRAVEL_PLAN_DELETED'
  | 'TRAVEL_ITINERARY_UPDATED'
  | 'TRAVEL_BOOKING_CONFIRMED'

export type UniformEventType =
  | 'UNIFORM_KIT_CREATED'
  | 'UNIFORM_KIT_UPDATED'
  | 'UNIFORM_ORDER_SUBMITTED'
  | 'UNIFORM_ORDER_UPDATED'
  | 'UNIFORM_ORDER_FULFILLED'

export type FeatureFlagEventType =
  | 'FEATURE_FLAG_ENABLED'
  | 'FEATURE_FLAG_DISABLED'
  | 'FEATURE_FLAG_OVERRIDE_CREATED'
  | 'FEATURE_FLAG_OVERRIDE_DELETED'

export type AdminEventType =
  | 'ACTIVATE_ORGANIZATION'
  | 'SUSPEND_ORGANIZATION'
  | 'DISABLE_USER'
  | 'ENABLE_USER'
  | 'SET_FEATURE_FLAG'
  | 'ADD_PLATFORM_ADMIN'
  | 'REMOVE_PLATFORM_ADMIN'
  | 'UPDATE_PLATFORM_ADMIN'
  | 'PII_VIEWED'
  | 'ISSUE_REFUND'
  | 'MARK_DISPUTE'
  | 'RESEND_VERIFICATION'
  | 'FORCE_LOGOUT'

export type SystemEventType =
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
  | 'EVENT_BANNER_UPLOADED'

export type SportEventType =
  | 'SPORT_LINKED'
  | 'SPORT_UNLINKED'
  | 'SPORT_CUSTOMIZED'
  | 'SPORT_CUSTOMIZATION_UPDATED'
  | 'SPORT_CUSTOMIZATION_REMOVED'
  | 'SPORT_ICON_UPLOADED'
  | 'SPORT_ICON_DELETED'

// Discriminated union for type-safe event logging
export type EventTypeMap = {
  AUTH: AuthEventType
  ORGANIZATION: OrganizationEventType
  USER: UserEventType
  PARENT: ParentEventType
  CHILD: ChildEventType
  TEAM: TeamEventType
  SEASON: SeasonEventType
  EVENT: CalendarEventType
  PAYMENT: PaymentEventType
  TRYOUT: TryoutEventType
  TRAVEL: TravelEventType
  UNIFORM: UniformEventType
  FEATURE_FLAG: FeatureFlagEventType
  ADMIN: AdminEventType
  SYSTEM: SystemEventType
  SPORT: SportEventType
}

// Base event log parameters
export interface BaseEventLogParams {
  actorUserId?: string
  actorRole: EventActorRole
  orgId?: string
  targetEntityType?: string
  targetEntityId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
  idempotencyKey?: string
}

// Type-safe event log parameters
export type EventLogParams<C extends EventCategory> = BaseEventLogParams & {
  category: C
  eventType: EventTypeMap[C]
}

// Event log response
export interface EventLogResponse {
  id: string | null
  error?: string
}

// Admin event log view type
export interface AdminEventLog {
  id: string
  created_at: string
  category: EventCategory
  event_type: string
  actor_user_id: string | null
  actor_email: string | null
  actor_name: string | null
  actor_role: EventActorRole
  org_id: string | null
  organization_name: string | null
  target_entity_type: string | null
  target_entity_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
}
