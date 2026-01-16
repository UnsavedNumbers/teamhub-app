import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'

export interface AttendanceRecord {
    id: string
    event_id: string
    child_id: string
    status: 'present' | 'absent' | 'excused' | 'late'
    notes: string | null
}

export async function getEventAttendance(
    context: UserContext,
    eventId: string
): Promise<{ data: AttendanceRecord[]; error: Error | null }> {
    if (FAKE_DATA_DELAY_MS > 0) await new Promise(r => setTimeout(r, FAKE_DATA_DELAY_MS))
    if (!USE_FAKE_DATA) return { data: [], error: null }
    return { data: [], error: null }
}

export async function updateAttendance(
    context: UserContext,
    eventId: string,
    childId: string,
    status: string
): Promise<{ error: Error | null }> {
    if (FAKE_DATA_DELAY_MS > 0) await new Promise(r => setTimeout(r, FAKE_DATA_DELAY_MS))
    if (!USE_FAKE_DATA) return { error: null }
    return { error: null }
}
