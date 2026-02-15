
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import { debug } from '../../lib/debug'
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
    console.groupCollapsed(`%cgetAttendanceSettings: ${context.orgId}`, 'color: #666; font-weight: bold;');
    debug.data('AttendanceService.getAttendanceSettings', 'Request', { context: { userId: context.userId, orgId: context.orgId } })
    debug.perf.start('attendanceService.getAttendanceSettings')

    try {
        if (USE_FAKE_DATA) {
            await delay()
            debug.perf.end('attendanceService.getAttendanceSettings')
            debug.data('AttendanceService.getAttendanceSettings', 'Response (fake)', { orgId: context.orgId })
            console.groupEnd()
            return { data: FAKE_SETTINGS, error: null }
        }
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

        debug.perf.end('attendanceService.getAttendanceSettings')
        debug.data('AttendanceService.getAttendanceSettings', 'Response', { orgId: context.orgId, hasData: !!data })
        console.groupEnd()
        return { data: data as AttendanceSettings, error: error ? new Error(error.message) : null }
    } catch (e: any) {
        debug.perf.end('attendanceService.getAttendanceSettings')
        debug.error('AttendanceService.getAttendanceSettings', 'Failed to get attendance settings', { error: e, context: { userId: context.userId, orgId: context.orgId } })
        console.groupEnd()
        return { data: null, error: e }
    }
}

export async function updateAttendanceSettings(context: UserContext, settings: Partial<AttendanceSettings>): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cupdateAttendanceSettings: ${context.orgId}`, 'color: #666; font-weight: bold;');
    debug.flow('AttendanceService.updateAttendanceSettings', 'Updating settings', { context: { userId: context.userId, orgId: context.orgId }, settings })
    debug.perf.start('attendanceService.updateAttendanceSettings')

    try {
        if (USE_FAKE_DATA) {
            await delay()
            FAKE_SETTINGS = { ...FAKE_SETTINGS, ...settings, updated_at: new Date().toISOString() }
            debug.perf.end('attendanceService.updateAttendanceSettings')
            debug.flow('AttendanceService.updateAttendanceSettings', 'Settings updated (fake)', { settings: Object.keys(settings) })
            console.groupEnd()
            return { error: null }
        }
        type AttendanceSettingsUpsert = Database['public']['Tables']['attendance_settings']['Insert']
        const upsertData = {
            org_id: context.orgId,
            ...settings,
            updated_at: new Date().toISOString()
        } satisfies AttendanceSettingsUpsert
        const { error } = await supabase
            .from('attendance_settings')
            .upsert(upsertData)

        debug.perf.end('attendanceService.updateAttendanceSettings')
        if (error) {
            debug.error('AttendanceService.updateAttendanceSettings', 'Failed to update settings', { error: error.message, settings: Object.keys(settings) })
            console.groupEnd()
            return { error: new Error(error.message) }
        } else {
            debug.flow('AttendanceService.updateAttendanceSettings', 'Settings updated successfully', { settings: Object.keys(settings) })
            console.groupEnd()
            return { error: null }
        }
    } catch (e: any) {
        debug.perf.end('attendanceService.updateAttendanceSettings')
        debug.error('AttendanceService.updateAttendanceSettings', 'Exception updating settings', { error: e, settings: Object.keys(settings) })
        console.groupEnd()
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
    console.groupCollapsed(`%cgetEventAttendance: ${eventId}`, 'color: #666; font-weight: bold;');
    debug.data('AttendanceService.getEventAttendance', 'Request', { eventId })
    debug.perf.start('attendanceService.getEventAttendance')

    try {
        if (USE_FAKE_DATA) {
            await delay()
            // Generate mock records based on event existing
            // This is simplified; in a real fake implementation we'd store these
            debug.perf.end('attendanceService.getEventAttendance')
            debug.data('AttendanceService.getEventAttendance', 'Response (fake)', { eventId, recordCount: 0 })
            console.groupEnd()
            return { data: [], error: null }
        }

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

        debug.perf.end('attendanceService.getEventAttendance')
        debug.data('AttendanceService.getEventAttendance', 'Response', { eventId, recordCount: records?.length || 0 })
        console.groupEnd()
        return { data: records as unknown as AttendanceRecord[], error: null }
    } catch (e: any) {
        debug.perf.end('attendanceService.getEventAttendance')
        debug.error('AttendanceService.getEventAttendance', 'Failed to get event attendance', { error: e, eventId })
        console.groupEnd()
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
    console.groupCollapsed(`%cupdateAttendance: ${eventId} - ${childId} - ${status}`, 'color: #666; font-weight: bold;');
    debug.flow('AttendanceService.updateAttendance', 'Updating attendance', { eventId, childId, status, hasNotes: !!notes })
    debug.perf.start('attendanceService.updateAttendance')

    try {
        if (USE_FAKE_DATA) {
            await delay()
            debug.perf.end('attendanceService.updateAttendance')
            debug.flow('AttendanceService.updateAttendance', 'Attendance updated (fake)', { eventId, childId, status })
            console.groupEnd()
            return { error: null }
        }
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

        debug.perf.end('attendanceService.updateAttendance')
        if (error) {
            debug.error('AttendanceService.updateAttendance', 'Failed to update attendance', { error: error.message, eventId, childId, status })
            console.groupEnd()
            return { error: error ? new Error(error.message) : null }
        } else {
            debug.flow('AttendanceService.updateAttendance', 'Attendance updated successfully', { eventId, childId, status })
            console.groupEnd()
            return { error: null }
        }
    } catch (e: any) {
        debug.perf.end('attendanceService.updateAttendance')
        debug.error('AttendanceService.updateAttendance', 'Exception updating attendance', { error: e, eventId, childId, status })
        console.groupEnd()
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
    console.groupCollapsed(`%cgetAttendanceEvents: ${filters.startDate.toISOString()} to ${filters.endDate.toISOString()}`, 'color: #666; font-weight: bold;');
    debug.data('AttendanceService.getAttendanceEvents', 'Request', { startDate: filters.startDate.toISOString(), endDate: filters.endDate.toISOString(), teamId: filters.teamId })
    debug.perf.start('attendanceService.getAttendanceEvents')

    try {
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
        debug.perf.end('attendanceService.getAttendanceEvents')
        debug.data('AttendanceService.getAttendanceEvents', 'Response (fake)', { eventCount: mockEvents.length })
        console.groupEnd()
        return { data: mockEvents, error: null }
    }
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

        debug.perf.end('attendanceService.getAttendanceEvents')
        debug.data('AttendanceService.getAttendanceEvents', 'Response', { eventCount: summaries.length })
        console.groupEnd()
        return { data: summaries, error: null }

    } catch (e: any) {
        debug.perf.end('attendanceService.getAttendanceEvents')
        debug.error('AttendanceService.getAttendanceEvents', 'Failed to get attendance events', { error: e, filters })
        console.groupEnd()
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

        debug.perf.end('attendanceService.getAttendancePeople')
        debug.data('AttendanceService.getAttendancePeople', 'Response', { personCount: result.length })
        console.groupEnd()
        return { data: result, error: null }
    } catch (e: any) {
        debug.perf.end('attendanceService.getAttendancePeople')
        debug.error('AttendanceService.getAttendancePeople', 'Failed to get attendance people', { error: e, filters: _filters })
        console.groupEnd()
        return { data: [], error: e }
    }
}
