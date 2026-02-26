
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_USER_IDS } from '../config'
import type { UserContext } from '../fake/userContext'
import { debug } from '../../lib/debug'
import { collectTeamManagers } from './notificationHelpers'
import type {
    AttendanceRecord,
    AttendanceSettings,
    AttendanceEventSummary,
    AttendancePersonSummary,
    AttendanceStatus
} from '../../types/attendance'
import { fakeEvents } from '../fake/fakeEvents'
import { getTeamMembersForSeason, SEASON_SPRING_CURRENT_ID } from '../fake/fakeTeams'
import { fakeChildren } from '../fake/fakeUsers'

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
            const coachId = DEMO_USER_IDS['coach-only@example.com']
            const recordedAt = new Date().toISOString()

            // Find the event to get its team_id
            const event = fakeEvents.find((e) => e.id === eventId)
            const teamId = event?.team_id ?? null

            // Build attendance from team roster when we have a team
            const ATTENDANCE_STATUSES: AttendanceStatus[] = [
                'present', 'present', 'present', 'present', 'present',
                'present', 'present', 'absent', 'absent', 'late',
            ]
            const ABSENCE_NOTES = ['Family conflict', 'Sick', null, 'Out of town', null]

            let fakeRecords: AttendanceRecord[] = []

            if (teamId) {
                const members = getTeamMembersForSeason(teamId, SEASON_SPRING_CURRENT_ID)
                fakeRecords = members.map((member, idx) => {
                    const child = fakeChildren.find((c) => c.id === member.athlete_id)
                    const status = ATTENDANCE_STATUSES[idx % ATTENDANCE_STATUSES.length]
                    const isAbsent = status === 'absent' || status === 'late'
                    return {
                        id: `attendance-${eventId}-${member.athlete_id}`,
                        event_id: eventId,
                        athlete_id: member.athlete_id,
                        status,
                        notes: isAbsent ? ABSENCE_NOTES[idx % ABSENCE_NOTES.length] : null,
                        recorded_by_user_id: idx < 8 ? coachId : null,
                        created_at: recordedAt,
                        updated_at: recordedAt,
                        child: child
                            ? { id: child.id, first_name: child.first_name, last_name: child.last_name }
                            : { id: member.athlete_id, first_name: 'Athlete', last_name: `#${idx + 1}` },
                    }
                })
            }

            // Fallback: generic records when no team found
            if (fakeRecords.length === 0) {
                const fallbackAthletes = [
                    { id: 'child-emma-johnson-001', first_name: 'Emma', last_name: 'Johnson' },
                    { id: 'child-liam-johnson-002', first_name: 'Liam', last_name: 'Johnson' },
                    { id: 'child-sophia-chen-007', first_name: 'Sophia', last_name: 'Chen' },
                    { id: 'child-mason-rodriguez-008', first_name: 'Mason', last_name: 'Rodriguez' },
                    { id: 'child-aiden-patel-010', first_name: 'Aiden', last_name: 'Patel' },
                ]
                fakeRecords = fallbackAthletes.map((athlete, idx) => ({
                    id: `attendance-${eventId}-${athlete.id}`,
                    event_id: eventId,
                    athlete_id: athlete.id,
                    status: ATTENDANCE_STATUSES[idx % ATTENDANCE_STATUSES.length],
                    notes: idx === 1 ? 'Family conflict' : null,
                    recorded_by_user_id: coachId,
                    created_at: recordedAt,
                    updated_at: recordedAt,
                    child: athlete,
                }))
            }

            debug.perf.end('attendanceService.getEventAttendance')
            debug.data('AttendanceService.getEventAttendance', 'Response (fake)', { eventId, recordCount: fakeRecords.length })
            console.groupEnd()
            return { data: fakeRecords, error: null }
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
            // Notify coaches/admins about attendance update
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
                            .filter((id): id is string => id !== null && id !== context.userId) // Don't notify the person who updated

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
                                action: 'event_attendance_updated',
                                roleContext: 'coach',
                                title: 'Attendance Updated',
                                body: `${athleteName} attendance marked as ${status} for ${eventData.title || 'event'}`,
                                linkUrl: `/portal/calendar/events/${eventId}`,
                                entityType: 'event',
                                entityId: eventId,
                                metadata: {
                                    child_id: childId,
                                    status,
                                    notes,
                                },
                            }).catch(err => console.error('Failed to notify about attendance update:', err))

                            // Also notify team managers
                            if (eventData.team_id) {
                                const teamManagerIds = await collectTeamManagers(eventData.team_id, context.userId)
                                if (teamManagerIds.length > 0) {
                                    await notifyUsers({
                                        userIds: teamManagerIds,
                                        orgId: eventData.org_id,
                                        teamId: eventData.team_id,
                                        action: 'event_attendance_updated',
                                        roleContext: 'team_manager',
                                        title: 'Attendance Updated',
                                        body: `${athleteName} attendance marked as ${status} for ${eventData.title || 'event'}`,
                                        linkUrl: `/portal/calendar/events/${eventId}`,
                                        entityType: 'event',
                                        entityId: eventId,
                                        metadata: {
                                            child_id: childId,
                                            status,
                                            notes,
                                        },
                                    }).catch(err => console.error('Failed to notify team managers about attendance update:', err))
                                }
                            }
                        }
                    }
                }
            } catch (notifErr) {
                // Don't fail attendance update if notification fails
                console.error('Error sending attendance notification:', notifErr)
            }

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
            const now = new Date()
            const mockEvents: AttendanceEventSummary[] = [
            {
                event_id: 'event-u10-soccer-practice-001',
                team_name: 'U10 Lightning',
                event_type: 'practice',
                start_time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                location_name: 'Riverside Sports Complex - Field 4',
                total_expected: 15,
                present_count: 12,
                absent_count: 2,
                late_count: 1,
                excused_count: 0,
                unknown_count: 0,
                status: 'complete'
            },
            {
                event_id: 'event-u10-soccer-game-001',
                team_name: 'U10 Lightning',
                event_type: 'game',
                start_time: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                location_name: 'Eastside Park',
                total_expected: 15,
                present_count: 14,
                absent_count: 1,
                late_count: 0,
                excused_count: 0,
                unknown_count: 0,
                status: 'complete'
            },
            {
                event_id: 'event-u12-soccer-practice-001',
                team_name: 'U12 Thunder',
                event_type: 'practice',
                start_time: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
                location_name: 'Riverside Sports Complex - Field 2',
                total_expected: 18,
                present_count: 0,
                absent_count: 0,
                late_count: 0,
                excused_count: 0,
                unknown_count: 18,
                status: 'missing'
            },
            {
                event_id: 'event-u10-bb-practice-001',
                team_name: 'U10 Hoops',
                event_type: 'practice',
                start_time: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                location_name: 'Riverside Sports Complex - Court 1',
                total_expected: 12,
                present_count: 0,
                absent_count: 0,
                late_count: 0,
                excused_count: 0,
                unknown_count: 12,
                status: 'missing'
            },
            {
                event_id: 'event-u12-soccer-tournament-001',
                team_name: 'U12 Thunder',
                event_type: 'tournament',
                start_time: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                location_name: 'Regional Tournament Complex',
                total_expected: 18,
                present_count: 0,
                absent_count: 0,
                late_count: 0,
                excused_count: 0,
                unknown_count: 18,
                status: 'missing'
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

    if (USE_FAKE_DATA) {
        await delay()
        const fakePeople: AttendancePersonSummary[] = [
            {
                athlete_id: 'demo-athlete-1',
                first_name: 'Alex',
                last_name: 'Johnson',
                team_names: ['U10 Lightning'],
                total_events: 12,
                present_count: 10,
                absent_count: 1,
                late_count: 1,
                excused_count: 0,
                attendance_rate: 91.7,
                last_attended_date: new Date().toISOString(),
                risk_level: 'good',
            },
            {
                athlete_id: 'demo-athlete-2',
                first_name: 'Jordan',
                last_name: 'Smith',
                team_names: ['U10 Lightning'],
                total_events: 12,
                present_count: 8,
                absent_count: 3,
                late_count: 1,
                excused_count: 0,
                attendance_rate: 75.0,
                last_attended_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                risk_level: 'watch',
            },
            {
                athlete_id: 'demo-athlete-3',
                first_name: 'Sam',
                last_name: 'Davis',
                team_names: ['U12 Thunder'],
                total_events: 15,
                present_count: 14,
                absent_count: 0,
                late_count: 1,
                excused_count: 0,
                attendance_rate: 100.0,
                last_attended_date: new Date().toISOString(),
                risk_level: 'good',
            },
            {
                athlete_id: 'demo-athlete-4',
                first_name: 'Taylor',
                last_name: 'Brown',
                team_names: ['U12 Thunder'],
                total_events: 15,
                present_count: 9,
                absent_count: 5,
                late_count: 1,
                excused_count: 0,
                attendance_rate: 66.7,
                last_attended_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                risk_level: 'at_risk',
            },
            {
                athlete_id: 'demo-athlete-5',
                first_name: 'Casey',
                last_name: 'Miller',
                team_names: ['U10 Hoops'],
                total_events: 10,
                present_count: 9,
                absent_count: 0,
                late_count: 1,
                excused_count: 0,
                attendance_rate: 100.0,
                last_attended_date: new Date().toISOString(),
                risk_level: 'good',
            },
        ]
        return { data: fakePeople, error: null }
    }

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
