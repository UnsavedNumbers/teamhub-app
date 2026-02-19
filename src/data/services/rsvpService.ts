/**
 * RSVP Service
 * 
 * Handles both general (head count) and athlete-specific RSVPs
 * with proper validation and error handling
 */

import { supabase } from '../../lib/supabase'
import { t } from '../../i18n'
import type { UserContext } from '../fake/userContext'
import { debug } from '../../lib/debug'
import type { 
  EventRSVPConfig, 
  GeneralRSVP, 
  EventRSVP, 
  RSVPStatus, 
  GeneralRSVPStatus,
  RSVPSummary,
  CalendarEvent
} from '../../types/calendar'

type EventWithRSVP = {
  rsvp_enabled?: boolean
  rsvp_type?: string
  team_id?: string
  season_id?: string
}

// Type guard functions with safe null checks
export function isGeneralRSVP(event: CalendarEvent | null | undefined): boolean {
  if (!event) return false
  return event.rsvp_config?.enabled === true && event.rsvp_config?.type === 'general'
}

export function isAthleteRSVP(event: CalendarEvent | null | undefined): boolean {
  if (!event) return false
  return event.rsvp_config?.enabled === true && event.rsvp_config?.type === 'athlete'
}

// Get RSVP configuration for an event
export async function getEventRSVPConfig(
  _context: UserContext,
  eventId: string
): Promise<{ data: EventRSVPConfig | null; error: Error | null }> {
  console.groupCollapsed(`%cgetEventRSVPConfig: ${eventId}`, 'color: #666; font-weight: bold;');
  debug.data('RSVPService.getEventRSVPConfig', 'Request', { eventId })
  debug.perf.start('rsvpService.getEventRSVPConfig')

  try {
    if (!eventId) {
      debug.perf.end('rsvpService.getEventRSVPConfig')
      debug.error('RSVPService.getEventRSVPConfig', 'eventId is required', { eventId })
      console.groupEnd()
      return {
        data: { enabled: false, type: null },
        error: new Error('Event ID is required')
      }
    }

    const { data, error } = await supabase
      .from('events')
      .select('rsvp_enabled, rsvp_type')
      .eq('id', eventId)
      .single()

    if (error) throw error

    type EventRow = {
      rsvp_enabled: boolean
      rsvp_type: 'general' | 'athlete' | null
    }

    const eventData = data as EventRow
    return {
      data: eventData ? {
        enabled: eventData.rsvp_enabled ?? false,
        type: (eventData.rsvp_enabled && eventData.rsvp_type) ? (eventData.rsvp_type as 'general' | 'athlete') : null
      } : { enabled: false, type: null },
      error: null
    }
  } catch (err) {
    return {
      data: { enabled: false, type: null },
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}

// Get user's general RSVP for an event
export async function getGeneralRSVP(
  _context: UserContext,
  eventId: string,
  userId: string
): Promise<{ data: GeneralRSVP | null; error: Error | null }> {
  console.groupCollapsed(`%cgetGeneralRSVP: ${eventId} - user: ${userId}`, 'color: #666; font-weight: bold;');
  debug.data('RSVPService.getGeneralRSVP', 'Request', { eventId, userId })
  debug.perf.start('rsvpService.getGeneralRSVP')

  try {
    // Validate RSVP type first
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('rsvp_enabled, rsvp_type')
      .eq('id', eventId)
      .single()

    if (!eventId || !userId) {
      return {
        data: null,
        error: new Error('Event ID and User ID are required')
      }
    }

    if (eventError) throw eventError
    const eventData = event as EventWithRSVP
    if (!eventData || !eventData.rsvp_enabled || eventData.rsvp_type !== 'general') {
      return {
        data: null,
        error: new Error('Event does not have general RSVP enabled')
      }
    }

    const { data, error } = await supabase
      .from('event_general_rsvps')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found

    debug.perf.end('rsvpService.getGeneralRSVP')
    debug.data('RSVPService.getGeneralRSVP', 'Response', { eventId, userId, hasRSVP: !!data })
    console.groupEnd()
    return {
      data: data as GeneralRSVP | null,
      error: null
    }
  } catch (err) {
    debug.perf.end('rsvpService.getGeneralRSVP')
    debug.error('RSVPService.getGeneralRSVP', 'Failed to get general RSVP', { error: err, eventId, userId })
    console.groupEnd()
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}

// Set general RSVP (UPSERT pattern)
export async function setGeneralRSVP(
  _context: UserContext,
  eventId: string,
  userId: string,
  status: GeneralRSVPStatus,
  note?: string | null
): Promise<{ data: GeneralRSVP | null; error: Error | null }> {
  console.groupCollapsed(`%csetGeneralRSVP: ${eventId} - user: ${userId} - ${status}`, 'color: #666; font-weight: bold;');
  debug.flow('RSVPService.setGeneralRSVP', 'Setting RSVP', { eventId, userId, status, note })
  debug.perf.start('rsvpService.setGeneralRSVP')

  try {
    if (!eventId || !userId) {
      return {
        data: null,
        error: new Error('Event ID and User ID are required')
      }
    }

    // Validate RSVP type first
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('rsvp_enabled, rsvp_type')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError
    const eventData2 = event as EventWithRSVP
    if (!eventData2 || !eventData2.rsvp_enabled || eventData2.rsvp_type !== 'general') {
      return {
        data: null,
        error: new Error('Event does not have general RSVP enabled')
      }
    }

    const insertData = {
      event_id: eventId,
      user_id: userId,
      status,
      note: note || null,
      responded_at: new Date().toISOString()
    }
    const { data, error } = await supabase
      .from('event_general_rsvps')
      .upsert(insertData, {
        onConflict: 'event_id,user_id'
      })
      .select()
      .single()

    if (error) throw error

    // Notify coaches/admins about RSVP update
    try {
      const { notifyUsers } = await import('./notificationServiceCore')
      
      // Get event and team info
      const { data: eventData } = await supabase
        .from('events')
        .select('id, title, team_id, org_id')
        .eq('id', eventId)
        .single()

      if (eventData && eventData.org_id) {
        // Get coaches and org admins for the team
        const { data: orgMembers } = await supabase
          .from('organization_members')
          .select('user_id, role')
          .eq('org_id', eventData.org_id)
          .in('role', ['coach', 'org_admin'])

        if (orgMembers) {
          const coachUserIds = orgMembers
            .filter(m => m.role === 'coach' || m.role === 'org_admin')
            .map(m => m.user_id)
            .filter((id): id is string => id !== null && id !== userId) // Don't notify the person who RSVP'd

          if (coachUserIds.length > 0) {
            // Get user name for notification
            const { data: user } = await supabase
              .from('users')
              .select('display_name, first_name, last_name')
              .eq('id', userId)
              .single()

            const userName = user?.display_name || 
              (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : 'User')

            await notifyUsers({
              userIds: coachUserIds,
              orgId: eventData.org_id,
              teamId: eventData.team_id || null,
              action: 'event_rsvp_updated',
              roleContext: 'coach',
              title: 'RSVP Updated',
              body: `${userName} RSVP'd ${status} for ${eventData.title || 'event'}`,
              linkUrl: `/portal/calendar/events/${eventId}`,
              entityType: 'event',
              entityId: eventId,
              metadata: {
                user_id: userId,
                status,
                note,
              },
            }).catch(err => console.error('Failed to notify about RSVP update:', err))
          }
        }
      }
    } catch (notifErr) {
      // Don't fail RSVP update if notification fails
      console.error('Error sending RSVP notification:', notifErr)
    }

    debug.perf.end('rsvpService.setGeneralRSVP')
    debug.flow('RSVPService.setGeneralRSVP', 'RSVP set successfully', { eventId, userId, status })
    console.groupEnd()
    return {
      data: data as GeneralRSVP,
      error: null
    }
  } catch (err) {
    debug.perf.end('rsvpService.setGeneralRSVP')
    debug.error('RSVPService.setGeneralRSVP', 'Failed to set RSVP', { error: err, eventId, userId, status })
    console.groupEnd()
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}

// Get all athlete RSVPs for an event
export async function getAthleteRSVPs(
  _context: UserContext,
  eventId: string
): Promise<{ data: EventRSVP[]; error: Error | null }> {
  console.groupCollapsed(`%cgetAthleteRSVPs: ${eventId}`, 'color: #666; font-weight: bold;');
  debug.data('RSVPService.getAthleteRSVPs', 'Request', { eventId })
  debug.perf.start('rsvpService.getAthleteRSVPs')

  try {
    // Validate RSVP type first
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('rsvp_enabled, rsvp_type')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError
    const eventData3 = event as EventWithRSVP
    if (!eventData3?.rsvp_enabled || eventData3.rsvp_type !== 'athlete') {
      return {
        data: [],
        error: new Error('Event does not have athlete RSVP enabled')
      }
    }

    const { data, error } = await supabase
      .from('event_rsvps')
      .select(`
        *,
        athlete:athletes(id, first_name, last_name)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return {
      data: (data || []) as EventRSVP[],
      error: null
    }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}

// Set athlete RSVP (UPSERT pattern with eligibility check)
export async function setAthleteRSVP(
  context: UserContext,
  eventId: string,
  childId: string,
  status: RSVPStatus,
  note?: string | null
): Promise<{ data: EventRSVP | null; error: Error | null }> {
  console.groupCollapsed(`%csetAthleteRSVP: ${eventId} - ${childId} - ${status}`, 'color: #666; font-weight: bold;');
  debug.flow('RSVPService.setAthleteRSVP', 'Setting athlete RSVP', { eventId, childId, status, note })
  debug.perf.start('rsvpService.setAthleteRSVP')

  try {
    if (!eventId || !childId) {
      debug.perf.end('rsvpService.setAthleteRSVP')
      debug.error('RSVPService.setAthleteRSVP', 'eventId and childId are required', { eventId, childId })
      console.groupEnd()
      return {
        data: null,
        error: new Error(t('errors.eventIdAndChildIdRequired'))
      }
    }

    // Validate RSVP type first
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('rsvp_enabled, rsvp_type')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError
    const eventData4 = event as EventWithRSVP
    if (!eventData4 || !eventData4.rsvp_enabled || eventData4.rsvp_type !== 'athlete') {
      return {
        data: null,
        error: new Error('Event does not have athlete RSVP enabled')
      }
    }

    const { data: eligible, error: eligibilityError } = await (supabase as any)
      .rpc('is_child_eligible_for_event', {
        p_child_id: childId,
        p_event_id: eventId
      })

    if (eligibilityError) throw eligibilityError
    if (!eligible) {
      return {
        data: null,
        error: new Error('Child is not eligible for this event')
      }
    }

    const insertData2 = {
      event_id: eventId,
      athlete_id: childId,
      status,
      note: note || null,
      responded_at: status !== 'unknown' ? new Date().toISOString() : null,
      responded_by_user_id: context.userId
    }
    const { data, error } = await supabase
      .from('event_rsvps')
      .upsert(insertData2, {
        onConflict: 'event_id,athlete_id'
      })
      .select()
      .single()

    if (error) throw error

    // Notify coaches/admins about RSVP update
    try {
      const { notifyUsers } = await import('./notificationServiceCore')
      
      // Get event and team info
      const { data: eventData } = await supabase
        .from('events')
        .select('id, title, team_id, org_id')
        .eq('id', eventId)
        .single()

      if (eventData && eventData.org_id) {
        // Get coaches and org admins for the team
        const { data: orgMembers } = await supabase
          .from('organization_members')
          .select('user_id, role')
          .eq('org_id', eventData.org_id)
          .in('role', ['coach', 'org_admin'])

        if (orgMembers) {
          const coachUserIds = orgMembers
            .filter(m => m.role === 'coach' || m.role === 'org_admin')
            .map(m => m.user_id)
            .filter((id): id is string => id !== null && id !== context.userId) // Don't notify the person who RSVP'd

          if (coachUserIds.length > 0) {
            // Get athlete name for notification
            const { data: athlete } = await supabase
              .from('athletes')
              .select('first_name, last_name')
              .eq('id', childId)
              .single()

            const athleteName = athlete 
              ? `${athlete.first_name} ${athlete.last_name}`.trim()
              : 'Athlete'

            await notifyUsers({
              userIds: coachUserIds,
              orgId: eventData.org_id,
              teamId: eventData.team_id || null,
              action: 'event_rsvp_updated',
              roleContext: 'coach',
              title: 'RSVP Updated',
              body: `${athleteName} RSVP'd ${status} for ${eventData.title || 'event'}`,
              linkUrl: `/portal/calendar/events/${eventId}`,
              entityType: 'event',
              entityId: eventId,
              metadata: {
                child_id: childId,
                status,
                note,
              },
            }).catch(err => console.error('Failed to notify about RSVP update:', err))
          }
        }
      }
    } catch (notifErr) {
      // Don't fail RSVP update if notification fails
      console.error('Error sending RSVP notification:', notifErr)
    }

    debug.perf.end('rsvpService.setAthleteRSVP')
    debug.flow('RSVPService.setAthleteRSVP', 'Athlete RSVP set successfully', { eventId, childId, status })
    console.groupEnd()
    return {
      data: data as EventRSVP,
      error: null
    }
  } catch (err) {
    debug.perf.end('rsvpService.setAthleteRSVP')
    debug.error('RSVPService.setAthleteRSVP', 'Failed to set athlete RSVP', { error: err, eventId, childId, status })
    console.groupEnd()
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}

// Validate athlete eligibility for event
export async function validateAthleteEventEligibility(
  _context: UserContext,
  childId: string,
  eventId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { data, error } = await (supabase as any)
      .rpc('is_child_eligible_for_event', {
        p_child_id: childId,
        p_event_id: eventId
      })

    if (error) throw error

    const isEligible = data === true
    debug.perf.end('rsvpService.validateAthleteEventEligibility')
    debug.data('RSVPService.validateAthleteEventEligibility', 'Response', { childId, eventId, isEligible })
    console.groupEnd()
    return {
      data: isEligible,
      error: null
    }
  } catch (err) {
    debug.perf.end('rsvpService.validateAthleteEventEligibility')
    debug.error('RSVPService.validateAthleteEventEligibility', 'Failed to validate eligibility', { error: err, childId, eventId })
    console.groupEnd()
    return {
      data: false,
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}

// Get RSVP summary for coach/admin
export async function getRSVPSummary(
  _context: UserContext,
  eventId: string
): Promise<{ data: RSVPSummary | null; error: Error | null }> {
  console.groupCollapsed(`%cgetRSVPSummary: ${eventId}`, 'color: #666; font-weight: bold;');
  debug.data('RSVPService.getRSVPSummary', 'Request', { eventId })
  debug.perf.start('rsvpService.getRSVPSummary')

  try {
    if (!eventId) {
      debug.perf.end('rsvpService.getRSVPSummary')
      debug.error('RSVPService.getRSVPSummary', 'eventId is required', { eventId })
      console.groupEnd()
      return {
        data: null,
        error: new Error('Event ID is required')
      }
    }

    // Get event RSVP config
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('rsvp_enabled, rsvp_type')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError
    const eventData5 = event as EventWithRSVP
    if (!eventData5 || !eventData5.rsvp_enabled) {
      return {
        data: null,
        error: new Error('RSVP is not enabled for this event')
      }
    }

    if (eventData5.rsvp_type === 'general') {
      // Get general RSVP summary
      const { data: rsvps, error: rsvpError } = await supabase
        .from('event_general_rsvps')
        .select('status')
        .eq('event_id', eventId)

      if (rsvpError) throw rsvpError

      type RsvpRecord = { status: string }
      const rsvpsArray = (rsvps as RsvpRecord[]) || []
      const going_count = rsvpsArray.filter(r => r.status === 'going').length
      const not_going_count = rsvpsArray.filter(r => r.status === 'not_going').length
      const maybe_count = rsvpsArray.filter(r => r.status === 'maybe').length

      // Get total eligible users (parents on the team)
      const { data: eventData, error: eventDataError } = await supabase
        .from('events')
        .select(`
          team_id,
          season_id,
          teams!inner(
            id,
            org_id
          )
        `)
        .eq('id', eventId)
        .single()

      if (eventDataError) throw eventDataError

      const eventDataWithTeam = eventData as EventWithRSVP
      let totalEligible = 0
      if (eventDataWithTeam?.team_id && eventDataWithTeam?.season_id) {
        const { count } = await supabase
          .from('team_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', eventDataWithTeam.team_id)
          .eq('season_id', eventDataWithTeam.season_id)
          .eq('status', 'active')
        totalEligible = count ?? 0
      }

      const result = {
        data: {
          general: {
            going_count,
            not_going_count,
            maybe_count,
            total_responses: rsvpsArray.length,
            total_eligible: totalEligible
          }
        },
        error: null
      }
      debug.perf.end('rsvpService.getRSVPSummary')
      debug.data('RSVPService.getRSVPSummary', 'Response (general)', { eventId, goingCount: going_count, notGoingCount: not_going_count, maybeCount: maybe_count })
      console.groupEnd()
      return result
    } else if (eventData5.rsvp_type === 'athlete') {
      // Get athlete RSVP summary using existing function
      type SummaryData = {
        athlete_going?: number
        athlete_not_going?: number
        athlete_maybe?: number
        athlete_no_response?: number
        general_going?: number
        general_not_going?: number
        general_maybe?: number
        general_no_response?: number
        going_count?: number
        late_count?: number
        not_going_count?: number
        unknown_count?: number
        total_children?: number
        response_rate?: number
      }
      
      const { data: summary, error: summaryError } = await supabase
        .rpc('get_event_rsvp_summary', {
          p_event_id: eventId
        })

      if (summaryError) throw summaryError

      const summaryData = (summary as SummaryData) || {}
      const result = {
        data: {
          athlete: {
            going_count: summaryData.going_count ?? 0,
            late_count: summaryData.late_count ?? 0,
            not_going_count: summaryData.not_going_count ?? 0,
            unknown_count: summaryData.unknown_count ?? 0,
            total_children: summaryData.total_children ?? 0,
            response_rate: summaryData.response_rate ?? 0
          }
        },
        error: null
      }
      debug.perf.end('rsvpService.getRSVPSummary')
      debug.data('RSVPService.getRSVPSummary', 'Response (athlete)', { eventId, goingCount: result.data.athlete.going_count, totalChildren: result.data.athlete.total_children })
      console.groupEnd()
      return result
    }

    return {
      data: null,
      error: new Error('Unknown RSVP type')
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}

// Send RSVP reminder (triggers notification)
export async function sendRSVPReminder(
  _context: UserContext,
  eventId: string
): Promise<{ data: boolean; error: Error | null }> {
  console.groupCollapsed(`%csendRSVPReminder: ${eventId}`, 'color: #666; font-weight: bold;');
  debug.flow('RSVPService.sendRSVPReminder', 'Sending RSVP reminder', { eventId })
  debug.perf.start('rsvpService.sendRSVPReminder')

  try {
    if (!eventId) {
      debug.perf.end('rsvpService.sendRSVPReminder')
      debug.error('RSVPService.sendRSVPReminder', 'eventId is required', { eventId })
      console.groupEnd()
      return {
        data: false,
        error: new Error('Event ID is required')
      }
    }

    // Validate RSVP is enabled
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('rsvp_enabled, rsvp_type, team_id, season_id')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError
    const eventData6 = event as EventWithRSVP
    if (!eventData6 || !eventData6.rsvp_enabled) {
      return {
        data: false,
        error: new Error('RSVP is not enabled for this event')
      }
    }

    // Insert into notification outbox (if it exists)
    // For now, just return success - notification system will be implemented separately
    debug.perf.end('rsvpService.sendRSVPReminder')
    debug.flow('RSVPService.sendRSVPReminder', 'RSVP reminder sent successfully', { eventId })
    console.groupEnd()
    return {
      data: true,
      error: null
    }
  } catch (err) {
    debug.perf.end('rsvpService.sendRSVPReminder')
    debug.error('RSVPService.sendRSVPReminder', 'Failed to send RSVP reminder', { error: err, eventId })
    console.groupEnd()
    return {
      data: false,
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}
