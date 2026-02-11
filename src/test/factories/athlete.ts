import type { Database } from '@/lib/database.types'

type AthletesRow = Database['public']['Tables']['athletes']['Row']
type FamiliesRow = Database['public']['Tables']['families']['Row']
type FamilyMembersRow = Database['public']['Tables']['family_members']['Row']

const defaultAthlete: AthletesRow = {
  id: 'c50e8400-e29b-41d4-a716-446655440007',
  allergies: null,
  birthdate: '2010-05-15',
  created_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  dominant_hand: null,
  email: null,
  emergency_contact: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  family_id: null,
  first_name: 'Test',
  gender: null,
  has_profile_photo: false,
  height_cm: null,
  jersey_number: null,
  last_name: 'Athlete',
  medical_notes: null,
  org_id: '650e8400-e29b-41d4-a716-446655440001',
  phone: null,
  preferred_name: null,
  privacy_level: 'private',
  profile_photo_updated_at: null,
  shoe_size_system: null,
  shoe_size_value: null,
  shoe_width: null,
  shorts_size: null,
  tshirt_size: null,
  updated_at: '2026-01-01T00:00:00Z',
  weight_kg: null,
}

export function createMockAthlete(overrides?: Partial<AthletesRow>): AthletesRow {
  return { ...defaultAthlete, ...overrides }
}

const defaultFamily: FamiliesRow = {
  id: 'd50e8400-e29b-41d4-a716-446655440008',
  created_at: '2026-01-01T00:00:00Z',
  name: 'Test Family',
  org_id: '650e8400-e29b-41d4-a716-446655440001',
  updated_at: '2026-01-01T00:00:00Z',
}

export function createMockFamily(overrides?: Partial<FamiliesRow>): FamiliesRow {
  return { ...defaultFamily, ...overrides }
}

const defaultGuardian: FamilyMembersRow = {
  id: 'e50e8400-e29b-41d4-a716-446655440009',
  created_at: '2026-01-01T00:00:00Z',
  family_id: defaultFamily.id,
  is_primary: true,
  role: 'guardian',
  updated_at: '2026-01-01T00:00:00Z',
  user_id: '550e8400-e29b-41d4-a716-446655440000',
}

export function createMockGuardian(overrides?: Partial<FamilyMembersRow>): FamilyMembersRow {
  return { ...defaultGuardian, ...overrides }
}
