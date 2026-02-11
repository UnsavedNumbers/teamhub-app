import { describe, test, expect } from 'vitest'
import {
  getHotelInfo,
  getMeetingLocations,
  detectTravelEvent,
  groupEventsIntoTrips,
  getGoogleMapsLink,
  formatHotelAddress,
} from '@/utils/travelDetection'

const baseEvent: {
  id: string
  start_time: string
  end_time: string
  type: string
  team_id: string
  season_id: string
  created_at: string
  updated_at: string
  timezone: string
  [key: string]: unknown
} = {
  id: 'e1',
  start_time: '2026-02-10T10:00:00Z',
  end_time: '2026-02-10T12:00:00Z',
  type: 'game',
  team_id: 't1',
  season_id: 's1',
  created_at: '2026-02-10T00:00:00Z',
  updated_at: '2026-02-10T00:00:00Z',
  timezone: 'America/New_York',
  title: 'Event',
  location: null,
  notes: null,
  uniform_notes: null,
  equipment_notes: null,
  weather_dependent: false,
  arrival_time: null,
  is_cancelled: false,
  cancellation_reason: null,
  cancelled_at: null,
  cancelled_by_user_id: null,
  created_by_user_id: 'u1',
  external_link: null,
  requires_travel: false,
  overnight: false,
  hotel_name: null,
  hotel_address: null,
}

describe('getHotelInfo', () => {
  test('returns null when no hotel fields', () => {
    expect(getHotelInfo(baseEvent as never)).toBeNull()
  })

  test('returns info when hotel name present', () => {
    const result = getHotelInfo({ ...baseEvent, hotel_name: 'Hilton' } as never)
    expect(result).toBeTruthy()
    expect(result?.name).toBe('Hilton')
  })
})

describe('getMeetingLocations', () => {
  test('returns empty when no meeting_locations', () => {
    expect(getMeetingLocations(baseEvent as never)).toEqual([])
  })
})

describe('detectTravelEvent', () => {
  test('returns isTravel false when requires_travel false and no hotel', () => {
    expect(detectTravelEvent(baseEvent as never).isTravel).toBe(false)
  })

  test('returns isTravel true when requires_travel true', () => {
    expect(detectTravelEvent({ ...baseEvent, requires_travel: true } as never).isTravel).toBe(true)
  })

  test('returns isTravel true when hotel info present', () => {
    expect(detectTravelEvent({ ...baseEvent, hotel_name: 'Hilton' } as never).isTravel).toBe(true)
  })
})

describe('groupEventsIntoTrips', () => {
  test('returns empty for empty array', () => {
    expect(groupEventsIntoTrips([])).toEqual([])
  })

  test('handles single event', () => {
    const events = [baseEvent] as never[]
    const trips = groupEventsIntoTrips(events)
    expect(Array.isArray(trips)).toBe(true)
  })
})

describe('getGoogleMapsLink', () => {
  test('encodes address', () => {
    const url = getGoogleMapsLink('123 Main St')
    expect(url).toContain('123')
    expect(url).toContain('maps')
  })
})

describe('formatHotelAddress', () => {
  test('returns name only when address empty', () => {
    expect(formatHotelAddress({ name: 'Hilton', address: null, phone: null, confirmation: null })).toContain('Hilton')
  })

  test('returns address when name empty', () => {
    expect(formatHotelAddress({ name: null, address: '123 Main', phone: null, confirmation: null })).toContain('123 Main')
  })

  test('returns both when present', () => {
    const result = formatHotelAddress({ name: 'Hilton', address: '123 Main', phone: null, confirmation: null })
    expect(result).toContain('Hilton')
    expect(result).toContain('123 Main')
  })
})
