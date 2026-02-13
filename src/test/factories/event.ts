import type { Database } from '@/lib/database.types'
import type { Event } from '@/types/domain/Event'

type EventsRow = Database['public']['Tables']['events']['Row']
type RecurringPatternRow = Database['public']['Tables']['recurring_event_patterns']['Row']

export type EventRow = EventsRow & {
  team?: { id: string; name: string; org_id: string } | null
  season?: { id: string; name: string } | null
  event_location?: unknown
  recurring_pattern?: RecurringPatternRow[] | null
}

const defaultEventRow: EventsRow = {
  id: '750e8400-e29b-41d4-a716-446655440002',
  arrival_time: null,
  cancellation_reason: null,
  cancelled_at: null,
  cancelled_by_user_id: null,
  created_at: '2026-01-01T00:00:00Z',
  created_by_user_id: '550e8400-e29b-41d4-a716-446655440000',
  departure_time: null,
  description: null,
  seat_map_id: null,
  end_time: '2026-01-01T18:00:00Z',
  equipment_notes: null,
  external_link: null,
  hotel_address: null,
  hotel_confirmation: null,
  hotel_name: null,
  hotel_phone: null,
  is_cancelled: false,
  itinerary_file_path: null,
  location: null,
  meeting_locations: null,
  notes: null,
  org_id: '650e8400-e29b-41d4-a716-446655440001',
  overnight: false,
  requires_travel: false,
  return_time: null,
  rsvp_enabled: false,
  rsvp_type: null,
  season_id: '850e8400-e29b-41d4-a716-446655440003',
  start_time: '2026-01-01T17:00:00Z',
  team_id: '950e8400-e29b-41d4-a716-446655440004',
  timezone: 'America/New_York',
  title: 'Test Event',
  transportation_notes: null,
  travel_override: null,
  type: 'practice',
  uniform_notes: null,
  updated_at: '2026-01-01T00:00:00Z',
  venue_id: null,
  visibility: 'members',
  weather_dependent: false,
}

export function createMockEventRow(overrides?: Partial<EventRow>): EventRow {
  return { ...defaultEventRow, ...overrides } as EventRow
}

const defaultRecurringRow: RecurringPatternRow = {
  id: 'a50e8400-e29b-41d4-a716-446655440005',
  created_at: '2026-01-01T00:00:00Z',
  days_of_week: [1],
  end_date: '2026-06-01',
  exception_dates: null,
  frequency: 'weekly',
  interval: 1,
  max_occurrences: null,
  parent_event_id: defaultEventRow.id,
  updated_at: '2026-01-01T00:00:00Z',
}

export function createMockRecurringPattern(overrides?: Partial<RecurringPatternRow>): RecurringPatternRow {
  return { ...defaultRecurringRow, ...overrides }
}

const defaultEvent: Event = {
  id: defaultEventRow.id,
  title: 'Test Event',
  type: 'practice',
  startTime: defaultEventRow.start_time,
  endTime: defaultEventRow.end_time,
  arrivalTime: null,
  isCancelled: false,
  cancelledAt: null,
  cancelledByUserId: null,
  cancellationReason: null,
  createdByUserId: defaultEventRow.created_by_user_id ?? '550e8400-e29b-41d4-a716-446655440000',
  createdAt: defaultEventRow.created_at!,
  updatedAt: defaultEventRow.updated_at!,
  teamId: defaultEventRow.team_id ?? '950e8400-e29b-41d4-a716-446655440004',
  teamName: 'Test Team',
  seasonId: defaultEventRow.season_id,
  seasonName: 'Spring 2026',
  organizationId: defaultEventRow.org_id!,
  location: null,
  rsvpConfig: { enabled: false, type: null },
  recurringPattern: null,
  description: null,
  notes: null,
  requiresTravel: false,
  overnight: false,
  hotelName: null,
  hotelAddress: null,
  uniformNotes: null,
  equipmentNotes: null,
  weatherDependent: false,
}

export function createMockEvent(overrides?: Partial<Event>): Event {
  return { ...defaultEvent, ...overrides }
}

// CalendarEvent type for calendar components (snake_case, matches types/calendar)
import type { CalendarEvent as CalendarEventType } from '@/types/calendar'

const defaultCalendarEvent: CalendarEventType = {
  id: defaultEventRow.id,
  team_id: defaultEventRow.team_id,
  season_id: defaultEventRow.season_id,
  title: 'Test Event',
  type: 'practice',
  start_time: defaultEventRow.start_time!,
  end_time: defaultEventRow.end_time!,
  arrival_time: null,
  timezone: 'America/New_York',
  location: null,
  notes: null,
  uniform_notes: null,
  equipment_notes: null,
  weather_dependent: false,
  external_link: null,
  is_cancelled: false,
  cancellation_reason: null,
  cancelled_at: null,
  cancelled_by_user_id: null,
  created_by_user_id: defaultEventRow.created_by_user_id,
  created_at: defaultEventRow.created_at!,
  updated_at: defaultEventRow.updated_at!,
  team: { id: '950e8400-e29b-41d4-a716-446655440004', name: 'Test Team', org_id: defaultEventRow.org_id! },
  season: { id: defaultEventRow.season_id!, name: 'Spring 2026' },
}

export function createMockCalendarEvent(overrides?: Partial<CalendarEventType>): CalendarEventType {
  return { ...defaultCalendarEvent, ...overrides }
}
