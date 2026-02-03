import { supabase } from '../lib/supabase'
import type { UserContext } from '../data/fake/userContext'
import { hasAnyRole } from './roleHelpers'
import type { Organization } from '../contexts/OrganizationContext'

export const EVENT_ERRORS = {
  DELETE_BLOCKED_TICKETS_SOLD: "Cannot delete event: tickets have been sold",
  DELETE_BLOCKED_EVENT_STARTED: "Cannot delete event: event has already started",
  DELETE_BLOCKED_PAYMENTS_EXIST: "Cannot delete event: payment transactions exist",
  DELETE_BLOCKED_PUBLISHED: "Cannot delete event: event has been published",
  DELETE_BLOCKED_RECURRING: "Cannot delete event: event is part of recurring series",
  DELETE_BLOCKED_PERMISSION: "User does not have permission to delete this event",
  CANCEL_BLOCKED_EVENT_STARTED: "Cannot cancel event: event has already started",
  CANCEL_BLOCKED_ALREADY_CANCELLED: "Cannot cancel event: event is already cancelled",
  CANCEL_BLOCKED_COMPLETED: "Cannot cancel event: event is already completed",
  CANCEL_BLOCKED_INSUFFICIENT_TIME: "Cannot cancel event: less than 24 hours until event",
  CANCEL_BLOCKED_CHAMPIONSHIP: "Cannot cancel event: championship/playoff games cannot be cancelled",
  CANCEL_BLOCKED_PERMISSION: "User does not have permission to cancel this event",
  CANCEL_BLOCKED_ORG_SETTING: "Organization does not allow cancellations",
  UPDATE_BLOCKED_INSUFFICIENT_TIME: "Cannot make major changes: less than 48 hours until event",
  UPDATE_BLOCKED_TICKETS_SOLD: "Cannot make major changes: tickets have been sold",
  UPDATE_BLOCKED_CAPACITY: "Cannot decrease capacity below tickets already sold",
  UPDATE_BLOCKED_PRICE_INCREASE: "Cannot increase price after tickets have been sold",
  UPDATE_BLOCKED_COMPLETED: "Cannot update event: event is completed",
  PERMISSION_DENIED: "User does not have permission for this operation",
  REFUND_PROCESSING_FAILED: "Cancellation failed: unable to process refunds"
} as const

interface EventData {
  id: string
  start_time: string
  is_cancelled?: boolean
  status?: string
  type?: string
  created_at?: string
  org_id?: string
  team_id?: string
  parent_tournament_id?: string | null
}

interface TicketedEventData {
  id: string
  status: 'draft' | 'published' | 'cancelled' | 'completed'
  starts_at: string
  event_type?: string
  org_id: string
}

async function getTicketCount(eventId: string, isTicketedEvent: boolean = false): Promise<number> {
  const eventIdColumn = isTicketedEvent ? 'ticketed_event_id' : 'event_id'
  
  const { data: orders, error } = await supabase
    .from('ticket_orders')
    .select('ticket_order_items(quantity)')
    .eq(eventIdColumn, eventId)
    .in('status', ['paid', 'pending_payment'])

  if (error) {
    console.error('Error fetching ticket count:', error)
    return 0
  }

  if (!orders) return 0

  let totalTickets = 0
  for (const order of orders) {
    const items = (order.ticket_order_items as any[]) || []
    const qty = items.reduce((sum: number, item: any) => sum + (item?.quantity ?? 0), 0)
    totalTickets += qty
  }

  return totalTickets
}

async function hasPaymentRecords(eventId: string, isTicketedEvent: boolean = false): Promise<boolean> {
  const eventIdColumn = isTicketedEvent ? 'ticketed_event_id' : 'event_id'
  
  const { data, error } = await supabase
    .from('ticket_orders')
    .select('id')
    .eq(eventIdColumn, eventId)
    .limit(1)

  if (error) {
    console.error('Error checking payment records:', error)
    return false
  }

  return (data?.length ?? 0) > 0
}

async function checkOrganizationAllowsCancellations(orgId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('organizations')
    .select('refund_policy')
    .eq('id', orgId)
    .single()

  if (error || !data) return true

  return data.refund_policy !== null && data.refund_policy.trim() !== ''
}

export async function validateDeleteEvent(
  _context: UserContext,
  event: EventData | TicketedEventData,
  organization: Organization | null,
  isTicketedEvent: boolean = false
): Promise<{ allowed: boolean; error: string | null }> {
  const now = new Date()
  const eventDate = new Date(isTicketedEvent ? (event as TicketedEventData).starts_at : (event as EventData).start_time)
  const eventStatus = isTicketedEvent ? (event as TicketedEventData).status : undefined
  const isPublished = isTicketedEvent ? eventStatus === 'published' : false

  if (!organization) {
    return { allowed: false, error: EVENT_ERRORS.DELETE_BLOCKED_PERMISSION }
  }

  const hasAdminRole = hasAnyRole(organization, ['org_admin'])
  if (!hasAdminRole) {
    return { allowed: false, error: EVENT_ERRORS.DELETE_BLOCKED_PERMISSION }
  }

  const ticketCount = await getTicketCount(event.id, isTicketedEvent)
  if (ticketCount > 0) {
    return { allowed: false, error: EVENT_ERRORS.DELETE_BLOCKED_TICKETS_SOLD }
  }

  const hasPayments = await hasPaymentRecords(event.id, isTicketedEvent)
  if (hasPayments) {
    return { allowed: false, error: EVENT_ERRORS.DELETE_BLOCKED_PAYMENTS_EXIST }
  }

  if (eventDate <= now) {
    return { allowed: false, error: EVENT_ERRORS.DELETE_BLOCKED_EVENT_STARTED }
  }

  if (isTicketedEvent && isPublished) {
    return { allowed: false, error: EVENT_ERRORS.DELETE_BLOCKED_PUBLISHED }
  }

  if (!isTicketedEvent) {
    const eventData = event as EventData
    const { data: recurringPattern } = await supabase
      .from('recurring_event_patterns')
      .select('id')
      .eq('parent_event_id', event.id)
      .limit(1)
    
    if (recurringPattern && recurringPattern.length > 0) {
      return { allowed: false, error: EVENT_ERRORS.DELETE_BLOCKED_RECURRING }
    }
    if (eventData.parent_tournament_id) {
      return { allowed: false, error: "Cannot delete event: event is part of a tournament series" }
    }
  }

  const createdAt = isTicketedEvent ? undefined : (event as EventData).created_at
  if (createdAt) {
    const createdDate = new Date(createdAt)
    const hoursSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60)
    if (hoursSinceCreation > 24 && ticketCount === 0) {
      return { allowed: true, error: null }
    }
  }

  return { allowed: true, error: null }
}

export async function validateCancelEvent(
  _context: UserContext,
  event: EventData | TicketedEventData,
  organization: Organization | null,
  isTicketedEvent: boolean = false
): Promise<{ allowed: boolean; error: string | null; requiresApproval: boolean }> {
  const now = new Date()
  const eventDate = new Date(isTicketedEvent ? (event as TicketedEventData).starts_at : (event as EventData).start_time)
  const eventStatus = isTicketedEvent ? (event as TicketedEventData).status : undefined
  const eventType = isTicketedEvent ? (event as TicketedEventData).event_type : (event as EventData).type
  const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (!organization) {
    return { allowed: false, error: EVENT_ERRORS.CANCEL_BLOCKED_PERMISSION, requiresApproval: false }
  }

  const hasRequiredRole = hasAnyRole(organization, ['org_admin', 'coach'])
  if (!hasRequiredRole) {
    return { allowed: false, error: EVENT_ERRORS.CANCEL_BLOCKED_PERMISSION, requiresApproval: false }
  }

  if (eventDate <= now) {
    return { allowed: false, error: EVENT_ERRORS.CANCEL_BLOCKED_EVENT_STARTED, requiresApproval: false }
  }

  const isCancelled = isTicketedEvent ? eventStatus === 'cancelled' : (event as EventData).is_cancelled
  if (isCancelled) {
    return { allowed: false, error: EVENT_ERRORS.CANCEL_BLOCKED_ALREADY_CANCELLED, requiresApproval: false }
  }

  if (isTicketedEvent && eventStatus === 'completed') {
    return { allowed: false, error: EVENT_ERRORS.CANCEL_BLOCKED_COMPLETED, requiresApproval: false }
  }

  if (eventType === 'championship' || eventType === 'playoff') {
    return { allowed: false, error: EVENT_ERRORS.CANCEL_BLOCKED_CHAMPIONSHIP, requiresApproval: false }
  }

  const orgAllowsCancellations = await checkOrganizationAllowsCancellations(organization.id)
  if (!orgAllowsCancellations) {
    return { allowed: false, error: EVENT_ERRORS.CANCEL_BLOCKED_ORG_SETTING, requiresApproval: false }
  }

  const ticketCount = await getTicketCount(event.id, isTicketedEvent)
  const requiresApproval = hoursUntilEvent < 24 || ticketCount > 50

  if (hoursUntilEvent < 24 && !hasAnyRole(organization, ['org_admin'])) {
    return { allowed: false, error: EVENT_ERRORS.CANCEL_BLOCKED_INSUFFICIENT_TIME, requiresApproval: true }
  }

  return { allowed: true, error: null, requiresApproval }
}

export async function validateUpdateEvent(
  _context: UserContext,
  event: EventData | TicketedEventData,
  organization: Organization | null,
  updates: {
    start_time?: string
    venue_name?: string
    price_cents?: number
    capacity_total?: number
  },
  isTicketedEvent: boolean = false
): Promise<{ allowed: boolean; error: string | null; isMajorUpdate: boolean }> {
  const now = new Date()
  const currentEventDate = new Date(isTicketedEvent ? (event as TicketedEventData).starts_at : (event as EventData).start_time)
  const eventStatus = isTicketedEvent ? (event as TicketedEventData).status : undefined
  const hoursUntilEvent = (currentEventDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  const daysUntilEvent = hoursUntilEvent / 24

  if (!organization) {
    return { allowed: false, error: EVENT_ERRORS.PERMISSION_DENIED, isMajorUpdate: false }
  }

  if (isTicketedEvent && eventStatus === 'completed') {
    return { allowed: false, error: EVENT_ERRORS.UPDATE_BLOCKED_COMPLETED, isMajorUpdate: false }
  }

  const hasUpdatePermission = hasAnyRole(organization, ['org_admin', 'coach'])
  if (!hasUpdatePermission) {
    return { allowed: false, error: EVENT_ERRORS.PERMISSION_DENIED, isMajorUpdate: false }
  }

  const ticketCount = await getTicketCount(event.id, isTicketedEvent)
  const isMajorUpdate = !!(updates.start_time || updates.venue_name || updates.price_cents !== undefined || updates.capacity_total !== undefined)

  if (isMajorUpdate) {
    if (hoursUntilEvent < 48) {
      return { allowed: false, error: EVENT_ERRORS.UPDATE_BLOCKED_INSUFFICIENT_TIME, isMajorUpdate: true }
    }

    if (ticketCount > 0) {
      if (updates.price_cents !== undefined) {
        return { allowed: false, error: EVENT_ERRORS.UPDATE_BLOCKED_PRICE_INCREASE, isMajorUpdate: true }
      }

      if (updates.capacity_total !== undefined) {
        const { data: ticketTypes } = await supabase
          .from('ticket_types')
          .select('capacity_total')
          .eq('ticketed_event_id', event.id)
          .limit(1)

        const currentCapacity = ticketTypes?.[0]?.capacity_total ?? null
        if (currentCapacity !== null && updates.capacity_total < ticketCount) {
          return { allowed: false, error: EVENT_ERRORS.UPDATE_BLOCKED_CAPACITY, isMajorUpdate: true }
        }
      }

      if (daysUntilEvent < 7) {
        return { allowed: false, error: EVENT_ERRORS.UPDATE_BLOCKED_INSUFFICIENT_TIME, isMajorUpdate: true }
      }
    }
  }

  return { allowed: true, error: null, isMajorUpdate }
}
