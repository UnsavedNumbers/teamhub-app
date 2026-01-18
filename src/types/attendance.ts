import { Database } from '../lib/database.types'

// Safe access to event_attendance table type (will be available after type regeneration)
type EventAttendanceTable = Database['public']['Tables']['event_attendance']
export type AttendanceStatus = EventAttendanceTable extends { Row: { status: infer S } } 
  ? S 
  : 'present' | 'absent' | 'late' | 'excused'

export interface AttendanceRecord {
    id: string
    event_id: string
    child_id: string
    status: AttendanceStatus
    notes: string | null
    recorded_by_user_id: string | null
    created_at: string
    updated_at: string
    // Joined fields
    child?: {
        id: string
        first_name: string
        last_name: string
        details?: any
    }
    recorder?: {
        display_name: string
    }
}

export interface AttendanceSettings {
    org_id: string
    reminder_enabled: boolean
    lock_after_hours: number
    required_for_practice: boolean
    required_for_game: boolean
    required_for_meeting: boolean
    created_at: string
    updated_at: string
}

export interface AttendanceEventSummary {
    event_id: string
    team_name: string
    event_type: string
    start_time: string
    location_name: string
    total_expected: number
    present_count: number
    absent_count: number
    late_count: number
    excused_count: number
    unknown_count: number
    status: 'complete' | 'partial' | 'missing'
}

export interface AttendancePersonSummary {
    child_id: string
    first_name: string
    last_name: string
    team_names: string[]
    total_events: number
    present_count: number
    absent_count: number
    late_count: number
    excused_count: number
    attendance_rate: number
    last_attended_date: string | null
    risk_level: 'good' | 'watch' | 'at_risk'
}

export interface AttendanceStats {
    overall_rate: number
    total_events: number
    missing_attendance_count: number
    late_submission_count: number // Logic might need refinement
    highest_no_show_team: {
        id: string
        name: string
        rate: number
    } | null
    trend: {
        date: string // week/month
        rate: number
    }[]
}
