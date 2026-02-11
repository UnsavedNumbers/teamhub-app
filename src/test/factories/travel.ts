import type { FakeTravelPlan } from '@/data/services/travelService'

const defaultPlan: FakeTravelPlan = {
  id: 'tp-1',
  org_id: 'org-1',
  team_id: 'team-1',
  season_id: 'season-1',
  title: 'Spring Tournament',
  location: 'Riverside Gym',
  destination_city: 'Riverside',
  destination_state: 'CA',
  venue_name: 'Riverside Gym',
  venue_address: null,
  venue_place_id: null,
  venue_lat: null,
  venue_lng: null,
  start_date: '2026-03-15T00:00:00Z',
  end_date: '2026-03-17T00:00:00Z',
  hotel_name: 'Holiday Inn',
  hotel_address: null,
  hotel_phone: null,
  hotel_confirmation: null,
  check_in_time: null,
  check_out_time: null,
  maps_url: null,
  notes: null,
  itinerary_file_path: null,
  meeting_locations: null,
  status: 'published',
  published_at: '2026-03-01T00:00:00Z',
  cancelled_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  team: { id: 'team-1', name: 'U10 Basketball' },
  season: { id: 'season-1', name: 'Spring 2026' },
}

export function createMockTravelPlan(overrides?: Partial<FakeTravelPlan>): FakeTravelPlan {
  return { ...defaultPlan, ...overrides }
}

