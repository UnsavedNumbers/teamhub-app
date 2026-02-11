import type { Database } from '@/lib/database.types'

type TeamsRow = Database['public']['Tables']['teams']['Row']
type SeasonsRow = Database['public']['Tables']['seasons']['Row']

const defaultTeam: TeamsRow = {
  id: '950e8400-e29b-41d4-a716-446655440004',
  created_at: '2026-01-01T00:00:00Z',
  invite_code: 'INV123',
  is_active: true,
  level_id: null,
  max_roster_size: null,
  name: 'Test Team',
  org_id: '650e8400-e29b-41d4-a716-446655440001',
  privacy_level: 'private',
  program_id: null,
  sport_id: null,
  updated_at: '2026-01-01T00:00:00Z',
  visible_to_fans: true,
}

export function createMockTeam(overrides?: Partial<TeamsRow>): TeamsRow {
  return { ...defaultTeam, ...overrides }
}

const defaultSeason: SeasonsRow = {
  id: '850e8400-e29b-41d4-a716-446655440003',
  created_at: '2026-01-01T00:00:00Z',
  end_date: '2026-06-30',
  is_active: true,
  name: 'Spring 2026',
  org_id: '650e8400-e29b-41d4-a716-446655440001',
  program_id: null,
  slug: 'spring-2026',
  sport_id: null,
  start_date: '2026-01-01',
  team_id: null,
  updated_at: '2026-01-01T00:00:00Z',
}

export function createMockSeason(overrides?: Partial<SeasonsRow>): SeasonsRow {
  return { ...defaultSeason, ...overrides }
}
