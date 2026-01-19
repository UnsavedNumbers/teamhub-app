/**
 * RSVP Service
 * 
 * Handles both general (head count) and athlete-specific RSVPs
 * with proper validation and error handling
 */

import { supabase } from '../../lib/supabase'
import { t } from '../../i18n'
import type { UserContext } from '../fake/userContext'
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
  try {
    if (!eventId) {
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

    return {
      data: data as GeneralRSVP | null,
      error: null
    }
  } catch (err) {
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

    return {
      data: data as GeneralRSVP,
      error: null
    }
  } catch (err) {
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
        child:children(id, first_name, last_name)
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
  try {
    if (!eventId || !childId) {
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

    const { data: eligible, error: eligibilityError } = await supabase
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
      child_id: childId,
      status,
      note: note || null,
      responded_at: status !== 'unknown' ? new Date().toISOString() : null,
      responded_by_user_id: context.userId
    }
    const { data, error } = await supabase
      .from('event_rsvps')
      .upsert(insertData2, {
        onConflict: 'event_id,child_id'
      })
      .select()
      .single()

    if (error) throw error

    return {
      data: data as EventRSVP,
      error: null
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}

// Validate child eligibility for event
export async function validateChildEventEligibility(
  _context: UserContext,
  childId: string,
  eventId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .rpc('is_child_eligible_for_event', {
        p_child_id: childId,
        p_event_id: eventId
      })

    if (error) throw error

    return {
      data: data === true,
      error: null
    }
  } catch (err) {
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
  try {
    if (!eventId) {
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

      return {
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
      return {
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
  try {
    if (!eventId) {
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
    return {
      data: true,
      error: null
    }
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err : new Error(String(err))
    }
  }
}
