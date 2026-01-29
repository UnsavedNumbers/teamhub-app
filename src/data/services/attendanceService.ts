
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import type {
    AttendanceRecord,
    AttendanceSettings,
    AttendanceEventSummary,
    AttendancePersonSummary,
    AttendanceStatus
} from '../../types/attendance'

// Fake data stores (internal to module for demo mode)
let FAKE_SETTINGS: AttendanceSettings = {
    org_id: 'org-1',
    enable_coach_reminders: true,
    submission_deadline_hours: 24,
    lock_after_days: 7,
    required_for_practice: true,
    required_for_game: true,
    required_for_meeting: false,
    parent_visibility: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
}

// Helper for delays
const delay = () => new Promise(resolve => setTimeout(resolve, FAKE_DATA_DELAY_MS))

// ============================================================================
// Settings
// ============================================================================

export async function getAttendanceSettings(context: UserContext): Promise<{ data: AttendanceSettings | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await delay()
        return { data: FAKE_SETTINGS, error: null }
    }

    try {
        type AttendanceSettingsRow = Database['public']['Tables']['organization_attendance_settings']['Row'];

        const { data, error } = await supabase
            .from('organization_attendance_settings')
            .select('*')
            .eq('org_id', context.orgId)
            .single<AttendanceSettingsRow>()

        if (error && error.code === 'PGRST116') {
            // Not found - return default
            return {
                data: {
                    org_id: context.orgId,
                    enable_coach_reminders: false,
                    submission_deadline_hours: 24,
                    lock_after_days: null,
                    required_for_practice: true,
                    required_for_game: true,
                    required_for_meeting: false,
                    parent_visibility: {
                        can_view_own_child: true,
                        can_view_team_attendance: false,
                        can_submit_attendance: false
                    },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                error: null
            }
        }

        return { data: data as AttendanceSettings, error: error ? new Error(error.message) : null }
    } catch (e: any) {
        return { data: null, error: e }
    }
}

export async function updateAttendanceSettings(context: UserContext, settings: Partial<AttendanceSettings>): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await delay()
        FAKE_SETTINGS = { ...FAKE_SETTINGS, ...settings, updated_at: new Date().toISOString() }
        return { error: null }
    }

    try {
        type AttendanceSettingsUpsert = Database['public']['Tables']['attendance_settings']['Insert']
        const upsertData = {
            org_id: context.orgId,
            ...settings,
            updated_at: new Date().toISOString()
        } satisfies AttendanceSettingsUpsert
        const { error } = await supabase
            .from('attendance_settings')
            .upsert(upsertData)
        return { error: error ? new Error(error.message) : null }
    } catch (e: any) {
        return { error: e }
    }
}

// ============================================================================
// Event Attendance (Roster Level)
// ============================================================================

export async function getEventAttendance(
    _context: UserContext,
    eventId: string
): Promise<{ data: AttendanceRecord[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await delay()
        // Generate mock records based on event existing
        // This is simplified; in a real fake implementation we'd store these
        return { data: [], error: null }
    }

    try {
        // Fetch existing records joined with children
        const { data: records, error } = await supabase
            .from('event_attendance')
            .select(`
                *,
                athlete:athletes(id, first_name, last_name),
                recorder:users!recorded_by_user_id(display_name)
            `)
            .eq('event_id', eventId)

        if (error) throw error
        return { data: records as unknown as AttendanceRecord[], error: null }
    } catch (e: any) {
        return { data: [], error: e }
    }
}

export async function updateAttendance(
    context: UserContext,
    eventId: string,
    childId: string,
    status: AttendanceStatus,
    notes?: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await delay()
        return { error: null }
    }

    try {
        type EventAttendanceUpsert = Database['public']['Tables']['event_attendance']['Insert']
        const upsertData2 = {
            event_id: eventId,
            child_id: childId,
            status,
            notes,
            recorded_by_user_id: context.userId,
            updated_at: new Date().toISOString()
        } satisfies EventAttendanceUpsert
        const { error } = await supabase
            .from('event_attendance')
            .upsert(upsertData2, { onConflict: 'event_id,child_id' })

        return { error: error ? new Error(error.message) : null }
    } catch (e: any) {
        return { error: e }
    }
}

// ============================================================================
// Dashboard & Aggregation
// ============================================================================

export async function getAttendanceEvents(
    _context: UserContext,
    filters: { startDate: Date; endDate: Date; teamId?: string }
): Promise<{ data: AttendanceEventSummary[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await delay()
        const mockEvents: AttendanceEventSummary[] = [
            {
                event_id: 'evt-1',
                team_name: 'U12 Boys',
                event_type: 'practice',
                start_time: new Date().toISOString(),
                location_name: 'Main Field',
                total_expected: 15,
                present_count: 12,
                absent_count: 2,
                late_count: 1,
                excused_count: 0,
                unknown_count: 0,
                status: 'complete'
            }
        ]
        return { data: mockEvents, error: null }
    }

    try {
        // query events + rsvps + attendance
        // Logic:
        // 1. Get events in range
        // 2. Get attendance records for these events
        // 3. Aggregate in JS (since we lack backend views)

        let query = supabase
            .from('events')
            .select(`
                id, type, start_time, team_id,
                team:teams(name),
                event_location:event_locations(venue_name),
                attendance:event_attendance(status)
            `)
            .gte('start_time', filters.startDate.toISOString())
            .lte('start_time', filters.endDate.toISOString())
            .eq('is_cancelled', false)

        if (filters.teamId) {
            query = query.eq('team_id', filters.teamId)
        }
        // Ensure org filter via team? Supabase RLS policies usually handle this if we join teams, 
        // but 'events' might not have org_id directly. It is on team.
        // Assuming RLS handles visibility.

        const { data: events, error } = await query

        if (error) throw error

        const summaries: AttendanceEventSummary[] = events.map((e: any) => {
            const records = e.attendance || []
            const present = records.filter((r: AttendanceRecord) => r.status === 'present').length
            const absent = records.filter((r: AttendanceRecord) => r.status === 'absent').length
            const late = records.filter((r: AttendanceRecord) => r.status === 'late').length
            const excused = records.filter((r: AttendanceRecord) => r.status === 'excused').length

            // "Unknown" is tricky without knowing total roster size. 
            // We'll estimate "total expected" = records.length for now, or 0 if no records.
            // Ideally we fetch roster size. For now, strict count of records.

            const total = records.length

            let status: AttendanceEventSummary['status'] = 'missing'
            if (total > 0) {
                // Heuristic: if we have records, is it complete?
                // Hard to know without roster count. Let's assume partial if low count?
                // For simplicity: Any records > 0 = 'complete' (or at least 'taken')
                // A better approach would be to compare vs team size.
                status = 'complete'
            }

            return {
                event_id: e.id,
                team_name: e.team?.name || 'Unknown Team',
                event_type: e.type,
                start_time: e.start_time,
                location_name: e.event_location?.venue_name || 'TBD',
                total_expected: total, // Placeholder limit
                present_count: present,
                absent_count: absent,
                late_count: late,
                excused_count: excused,
                unknown_count: 0,
                status
            }
        })

        return { data: summaries, error: null }

    } catch (e: any) {
        return { data: [], error: e }
    }
}

export async function getAttendancePeople(
    _context: UserContext,
    _filters: { seasonId?: string, teamId?: string }
): Promise<{ data: AttendancePersonSummary[]; error: Error | null }> {
    // This is expensive without a dedicated stats table.
    // Strategy: Fetch all relevant attendance records and aggregate in JS.

    if (USE_FAKE_DATA) return { data: [], error: null }

    try {
        // 1. Get all children in org (or filtered team)
        // 2. Get all attendance records for these children

        // Simplified: Query attendance records directly for the org's teams
        // relying on RLS to filter to current org

        type EventAttendanceRow = {
            child_id: string
            status: AttendanceStatus
            event: { start_time: string }
            child: { id: string, first_name: string, last_name: string }
        }

        const { data: records, error } = await supabase
            .from('event_attendance')
            .select(`
                child_id,
                status,
                event:events(start_time),
                child:athletes(id, first_name, last_name)
            `)
            .limit(1000)
            .returns<EventAttendanceRow[]>() // Safety cap

        if (error) throw error

        // Aggregate
        const statsMap = new Map<string, AttendancePersonSummary>()

        records.forEach((r: EventAttendanceRow) => {
            const cid = r.child_id
            if (!statsMap.has(cid)) {
                statsMap.set(cid, {
                    athlete_id: cid,
                    first_name: r.child?.first_name || 'Unknown',
                    last_name: r.child?.last_name || 'Child',
                    team_names: [], // Populate if we fetch assignments
                    total_events: 0,
                    present_count: 0,
                    absent_count: 0,
                    late_count: 0,
                    excused_count: 0,
                    attendance_rate: 0,
                    last_attended_date: null,
                    risk_level: 'good'
                })
            }

            const stat = statsMap.get(cid)!
            stat.total_events++
            if (r.status === 'present') stat.present_count++
            if (r.status === 'absent') stat.absent_count++
            if (r.status === 'late') stat.late_count++
            if (r.status === 'excused') stat.excused_count++

            if (r.status === 'present' || r.status === 'late') {
                if (!stat.last_attended_date || new Date(r.event.start_time) > new Date(stat.last_attended_date)) {
                    stat.last_attended_date = r.event.start_time
                }
            }
        })

        // Calc rates
        const result = Array.from(statsMap.values()).map(s => {
            s.attendance_rate = s.total_events > 0
                ? ((s.present_count + s.late_count) / s.total_events) * 100
                : 100

            if (s.attendance_rate < 70) s.risk_level = 'at_risk'
            else if (s.attendance_rate < 85) s.risk_level = 'watch'

            return s
        })

        return { data: result, error: null }
    } catch (e: any) {
        return { data: [], error: e }
    }
}
