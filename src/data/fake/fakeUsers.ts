/**
 * Fake Users Data Module
 *
 * Provides fake data for users, profiles, families, and children.
 * All data is scoped to Organization A and demo users.
 */

import { DEMO_USER_IDS, DEMO_ORG_A_ID, DEMO_ORG_B_ID } from '../config'
import type { OrgMemberRole } from '../../contexts/OrganizationContext'
import { getOrganizationById } from './fakeOrganizations'
import {
    FIRST_NAMES_FEMALE, FIRST_NAMES_MALE, LAST_NAMES,
    pick, generatePhone, generateEmail, generatePastDate, generateBirthdate,
} from './generators'

// Dynamic year helpers
const getCurrentYear = () => new Date().getFullYear()
const getPreviousYear = () => getCurrentYear() - 1

// Helper functions for date generation relative to current year
const getDateInCurrentYear = (month: number, day: number, hour: number = 0, minute: number = 0): string => {
    const year = getCurrentYear()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`
}

const getDateInPreviousYear = (month: number, day: number, hour: number = 0, minute: number = 0): string => {
    const year = getPreviousYear()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`
}

// ============================================================================
// Types
// ============================================================================

export interface FakeUser {
    id: string
    email: string
    phone: string | null
    display_name: string
    created_at: string
    updated_at: string
}

export interface FakeFamily {
    id: string
    name: string
    created_by_user_id: string
    org_id: string
    created_at: string
    updated_at: string
}

export interface FakeChild {
    id: string
    family_id: string
    first_name: string
    last_name: string
    date_of_birth: string
    gender: 'male' | 'female' | 'other' | null
    jersey_number: string | null
    medical_notes: string | null
    allergies: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    photo_url: string | null // Local asset path for demo mode
    // Universal fields
    height_cm: number | null
    weight_kg: number | null
    shoe_size_value: number | null
    shoe_size_system: 'us' | 'eu' | 'uk' | null
    shoe_width: 'narrow' | 'standard' | 'wide' | null
    tshirt_size: string | null
    shorts_size: string | null
    dominant_hand: 'left' | 'right' | 'ambidextrous' | null
    created_at: string
    updated_at: string
}

export interface FakeFamilyMember {
    id: string
    family_id: string
    user_id: string
    role: 'owner' | 'guardian' | 'view_only'
    permissions: string[]
    created_at: string
}

export interface FakeOrganizationMember {
    id: string
    org_id: string
    user_id: string
    roles: OrgMemberRole[]
    status: 'active' | 'invited' | 'suspended'
    created_at: string
    updated_at: string
}

// ============================================================================
// Demo User IDs (stable references)
// ============================================================================

const PARENT_ONLY_ID = DEMO_USER_IDS['parent-only@example.com']
const COACH_ONLY_ID = DEMO_USER_IDS['coach-only@example.com']
const ADMIN_ONLY_ID = DEMO_USER_IDS['admin-only@example.com']
const PARENT_ADMIN_ID = DEMO_USER_IDS['parent-admin@example.com']
const PARENT_COACH_ID = DEMO_USER_IDS['parent-coach@example.com']

// ============================================================================
// Generated IDs (stable for relationships)
// ============================================================================

// Families
export const FAMILY_JOHNSON_ID = 'family-johnson-001'
export const FAMILY_SMITH_ID = 'family-smith-002'
export const FAMILY_WILLIAMS_ID = 'family-williams-003'
export const FAMILY_CHEN_ID = 'family-chen-004'
export const FAMILY_RODRIGUEZ_ID = 'family-rodriguez-005'
export const FAMILY_PATEL_ID = 'family-patel-006'

// Children
export const CHILD_EMMA_JOHNSON_ID = 'child-emma-johnson-001'
export const CHILD_LIAM_JOHNSON_ID = 'child-liam-johnson-002'
export const CHILD_OLIVIA_SMITH_ID = 'child-olivia-smith-003'
export const CHILD_NOAH_SMITH_ID = 'child-noah-smith-004'
export const CHILD_AVA_WILLIAMS_ID = 'child-ava-williams-005'
export const CHILD_ETHAN_WILLIAMS_ID = 'child-ethan-williams-006'
export const CHILD_SOPHIA_CHEN_ID = 'child-sophia-chen-007'
export const CHILD_MASON_RODRIGUEZ_ID = 'child-mason-rodriguez-008'
export const CHILD_ISABELLA_RODRIGUEZ_ID = 'child-isabella-rodriguez-009'
export const CHILD_AIDEN_PATEL_ID = 'child-aiden-patel-010'

// Additional users (not demo login users)
export const USER_SARAH_JOHNSON_ID = 'user-sarah-johnson-001'
export const USER_MIKE_SMITH_ID = 'user-mike-smith-002'
export const USER_COACH_MARTINEZ_ID = 'user-coach-martinez-003'
export const USER_COACH_THOMPSON_ID = 'user-coach-thompson-004'
export const USER_PRIYA_PATEL_ID = 'user-other-parent-001'

// ============================================================================
// Fake Users Data
// ============================================================================

export const fakeUsers: FakeUser[] = [
    // Demo login users
    {
        id: PARENT_ONLY_ID,
        email: 'parent-only@example.com',
        phone: '+1 (555) 123-4567',
        display_name: 'Jennifer Johnson',
        created_at: getDateInCurrentYear(1, 15, 10),
        updated_at: getDateInCurrentYear(1, 15, 10),
    },
    {
        id: COACH_ONLY_ID,
        email: 'coach-only@example.com',
        phone: '+1 (555) 234-5678',
        display_name: 'Coach Michael Davis',
        created_at: '2024-01-10T09:00:00Z',
        updated_at: '2024-01-10T09:00:00Z',
    },
    {
        id: ADMIN_ONLY_ID,
        email: 'admin-only@example.com',
        phone: '+1 (555) 345-6789',
        display_name: 'Admin Sarah Wilson',
        created_at: getDateInPreviousYear(12, 1, 8),
        updated_at: getDateInPreviousYear(12, 1, 8),
    },
    {
        id: PARENT_ADMIN_ID,
        email: 'parent-admin@example.com',
        phone: '+1 (555) 456-7890',
        display_name: 'Robert Chen',
        created_at: '2023-11-15T10:00:00Z',
        updated_at: '2023-11-15T10:00:00Z',
    },
    {
        id: PARENT_COACH_ID,
        email: 'parent-coach@example.com',
        phone: '+1 (555) 567-8901',
        display_name: 'Maria Rodriguez',
        created_at: getDateInCurrentYear(2, 1, 11),
        updated_at: getDateInCurrentYear(2, 1, 11),
    },
    // Additional users in system
    {
        id: USER_SARAH_JOHNSON_ID,
        email: 'sarah.johnson@example.com',
        phone: '+1 (555) 111-2222',
        display_name: 'Sarah Johnson',
        created_at: getDateInCurrentYear(1, 15, 10, 30),
        updated_at: getDateInCurrentYear(1, 15, 10, 30),
    },
    {
        id: USER_MIKE_SMITH_ID,
        email: 'mike.smith@example.com',
        phone: '+1 (555) 333-4444',
        display_name: 'Mike Smith',
        created_at: '2024-02-10T14:00:00Z',
        updated_at: '2024-02-10T14:00:00Z',
    },
    {
        id: USER_COACH_MARTINEZ_ID,
        email: 'coach.martinez@example.com',
        phone: '+1 (555) 555-6666',
        display_name: 'Coach Alex Martinez',
        created_at: getDateInPreviousYear(9, 1, 9),
        updated_at: getDateInPreviousYear(9, 1, 9),
    },
    {
        id: USER_COACH_THOMPSON_ID,
        email: 'coach.thompson@example.com',
        phone: '+1 (555) 777-8888',
        display_name: 'Coach Emily Thompson',
        created_at: '2023-10-15T10:00:00Z',
        updated_at: '2023-10-15T10:00:00Z',
    },
    {
        id: USER_PRIYA_PATEL_ID,
        email: 'priya.patel@example.com',
        phone: '+1 (555) 999-0000',
        display_name: 'Priya Patel',
        created_at: '2024-03-01T09:00:00Z',
        updated_at: '2024-03-01T09:00:00Z',
    },
]

// ============================================================================
// Fake Families Data
// ============================================================================

export const fakeFamilies: FakeFamily[] = [
    {
        id: FAMILY_JOHNSON_ID,
        name: 'Johnson Family',
        created_by_user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        created_at: getDateInCurrentYear(1, 15, 10),
        updated_at: getDateInCurrentYear(1, 15, 10),
    },
    {
        id: FAMILY_SMITH_ID,
        name: 'Smith Family',
        created_by_user_id: USER_MIKE_SMITH_ID,
        org_id: DEMO_ORG_A_ID,
        created_at: '2024-02-10T14:00:00Z',
        updated_at: '2024-02-10T14:00:00Z',
    },
    {
        id: FAMILY_WILLIAMS_ID,
        name: 'Williams Family',
        created_by_user_id: PARENT_ADMIN_ID, // Parent-admin has a different family too
        org_id: DEMO_ORG_A_ID,
        created_at: getDateInCurrentYear(1, 20, 11),
        updated_at: getDateInCurrentYear(1, 20, 11),
    },
    {
        id: FAMILY_CHEN_ID,
        name: 'Chen Family',
        created_by_user_id: PARENT_ADMIN_ID,
        org_id: DEMO_ORG_A_ID,
        created_at: '2023-11-15T10:00:00Z',
        updated_at: '2023-11-15T10:00:00Z',
    },
    {
        id: FAMILY_RODRIGUEZ_ID,
        name: 'Rodriguez Family',
        created_by_user_id: PARENT_COACH_ID,
        org_id: DEMO_ORG_A_ID,
        created_at: getDateInCurrentYear(2, 1, 11),
        updated_at: getDateInCurrentYear(2, 1, 11),
    },
    {
        id: FAMILY_PATEL_ID,
        name: 'Patel Family',
        created_by_user_id: USER_PRIYA_PATEL_ID, // Another parent in system
        org_id: DEMO_ORG_A_ID,
        created_at: '2024-03-01T09:00:00Z',
        updated_at: '2024-03-01T09:00:00Z',
    },
]

// ============================================================================
// Fake Children Data
// ============================================================================

// Helper: Get local athlete photo asset URL
function getAthletePhotoUrl(filename: string): string {
  return `/demo-assets/athlete-photos/${filename}`
}

// Gender-matched demo athlete photo filenames (for generated children and fallbacks)
const FEMALE_ATHLETE_PHOTO_FILES = ['emma-johnson.jpg', 'olivia-smith.jpg', 'ava-williams.jpg', 'sophia-chen.jpg', 'isabella-rodriguez.jpg'] as const
const MALE_ATHLETE_PHOTO_FILES = ['liam-johnson.jpg', 'noah-smith.jpg', 'ethan-williams.jpg', 'mason-rodriguez.jpg', 'aiden-patel.jpg'] as const

export const fakeChildren: FakeChild[] = [
    // Johnson Family (parent-only@example.com)
    {
        id: CHILD_EMMA_JOHNSON_ID,
        family_id: FAMILY_JOHNSON_ID,
        first_name: 'Emma',
        last_name: 'Johnson',
        date_of_birth: '2014-03-15',
        gender: 'female',
        jersey_number: '7',
        medical_notes: null,
        allergies: 'Peanuts',
        emergency_contact_name: 'Jennifer Johnson',
        emergency_contact_phone: '+1 (555) 123-4567',
        photo_url: getAthletePhotoUrl('emma-johnson.jpg'),
        height_cm: 140,
        weight_kg: 32,
        shoe_size_value: 3.5,
        shoe_size_system: 'us',
        shoe_width: 'standard',
        tshirt_size: 'YS',
        shorts_size: 'YS',
        dominant_hand: 'right',
        created_at: getDateInCurrentYear(1, 15, 10),
        updated_at: getDateInCurrentYear(1, 15, 10),
    },
    {
        id: CHILD_LIAM_JOHNSON_ID,
        family_id: FAMILY_JOHNSON_ID,
        first_name: 'Liam',
        last_name: 'Johnson',
        date_of_birth: '2016-08-22',
        gender: 'male',
        jersey_number: '12',
        medical_notes: 'Asthma - carries inhaler',
        allergies: null,
        emergency_contact_name: 'Jennifer Johnson',
        emergency_contact_phone: '+1 (555) 123-4567',
        photo_url: getAthletePhotoUrl('liam-johnson.jpg'),
        height_cm: 120,
        weight_kg: 24,
        shoe_size_value: 2,
        shoe_size_system: 'us',
        shoe_width: 'standard',
        tshirt_size: 'YS',
        shorts_size: 'YS',
        dominant_hand: 'right',
        created_at: getDateInCurrentYear(1, 15, 10),
        updated_at: getDateInCurrentYear(1, 15, 10),
    },
    // Smith Family
    {
        id: CHILD_OLIVIA_SMITH_ID,
        family_id: FAMILY_SMITH_ID,
        first_name: 'Olivia',
        last_name: 'Smith',
        date_of_birth: '2013-11-08',
        gender: 'female',
        jersey_number: '23',
        medical_notes: null,
        allergies: null,
        emergency_contact_name: 'Mike Smith',
        emergency_contact_phone: '+1 (555) 333-4444',
        photo_url: getAthletePhotoUrl('olivia-smith.jpg'),
        height_cm: 148,
        weight_kg: 38,
        shoe_size_value: 4,
        shoe_size_system: 'us',
        shoe_width: 'standard',
        tshirt_size: 'YM',
        shorts_size: 'YM',
        dominant_hand: 'right',
        created_at: '2024-02-10T14:00:00Z',
        updated_at: '2024-02-10T14:00:00Z',
    },
    {
        id: CHILD_NOAH_SMITH_ID,
        family_id: FAMILY_SMITH_ID,
        first_name: 'Noah',
        last_name: 'Smith',
        date_of_birth: '2015-05-17',
        gender: 'male',
        jersey_number: '8',
        medical_notes: null,
        allergies: 'Shellfish',
        emergency_contact_name: 'Mike Smith',
        emergency_contact_phone: '+1 (555) 333-4444',
        photo_url: getAthletePhotoUrl('noah-smith.jpg'),
        height_cm: 135,
        weight_kg: 30,
        shoe_size_value: 3,
        shoe_size_system: 'us',
        shoe_width: 'wide',
        tshirt_size: 'YM',
        shorts_size: 'YM',
        dominant_hand: 'right',
        created_at: '2024-02-10T14:00:00Z',
        updated_at: '2024-02-10T14:00:00Z',
    },
    // Williams Family (parent-admin additional family)
    {
        id: CHILD_AVA_WILLIAMS_ID,
        family_id: FAMILY_WILLIAMS_ID,
        first_name: 'Ava',
        last_name: 'Williams',
        date_of_birth: '2014-07-30',
        gender: 'female',
        jersey_number: '15',
        medical_notes: null,
        allergies: null,
        emergency_contact_name: 'Robert Chen',
        emergency_contact_phone: '+1 (555) 456-7890',
        photo_url: getAthletePhotoUrl('ava-williams.jpg'),
        height_cm: 152,
        weight_kg: 42,
        shoe_size_value: 5,
        shoe_size_system: 'us',
        shoe_width: 'standard',
        tshirt_size: 'YL',
        shorts_size: 'YL',
        dominant_hand: 'right',
        created_at: getDateInCurrentYear(1, 20, 11),
        updated_at: getDateInCurrentYear(1, 20, 11),
    },
    {
        id: CHILD_ETHAN_WILLIAMS_ID,
        family_id: FAMILY_WILLIAMS_ID,
        first_name: 'Ethan',
        last_name: 'Williams',
        date_of_birth: '2017-01-12',
        gender: 'male',
        jersey_number: '3',
        medical_notes: null,
        allergies: 'Dairy',
        emergency_contact_name: 'Robert Chen',
        emergency_contact_phone: '+1 (555) 456-7890',
        photo_url: getAthletePhotoUrl('ethan-williams.jpg'),
        height_cm: 115,
        weight_kg: 22,
        shoe_size_value: 1.5,
        shoe_size_system: 'us',
        shoe_width: 'standard',
        tshirt_size: 'YS',
        shorts_size: 'YS',
        dominant_hand: 'right',
        created_at: getDateInCurrentYear(1, 20, 11),
        updated_at: getDateInCurrentYear(1, 20, 11),
    },
    // Chen Family (parent-admin@example.com - primary family)
    {
        id: CHILD_SOPHIA_CHEN_ID,
        family_id: FAMILY_CHEN_ID,
        first_name: 'Sophia',
        last_name: 'Chen',
        date_of_birth: '2015-09-25',
        gender: 'female',
        jersey_number: '10',
        medical_notes: null,
        allergies: null,
        emergency_contact_name: 'Robert Chen',
        emergency_contact_phone: '+1 (555) 456-7890',
        photo_url: getAthletePhotoUrl('sophia-chen.jpg'),
        height_cm: 140,
        weight_kg: 32,
        shoe_size_value: 3.5,
        shoe_size_system: 'us',
        shoe_width: 'standard',
        tshirt_size: 'YM',
        shorts_size: 'YM',
        dominant_hand: 'right',
        created_at: '2023-11-15T10:00:00Z',
        updated_at: '2023-11-15T10:00:00Z',
    },
    // Rodriguez Family (parent-coach@example.com)
    {
        id: CHILD_MASON_RODRIGUEZ_ID,
        family_id: FAMILY_RODRIGUEZ_ID,
        first_name: 'Mason',
        last_name: 'Rodriguez',
        date_of_birth: '2014-12-03',
        gender: 'male',
        jersey_number: '22',
        medical_notes: null,
        allergies: null,
        emergency_contact_name: 'Maria Rodriguez',
        emergency_contact_phone: '+1 (555) 567-8901',
        photo_url: getAthletePhotoUrl('mason-rodriguez.jpg'),
        height_cm: 145,
        weight_kg: 36,
        shoe_size_value: 4,
        shoe_size_system: 'us',
        shoe_width: 'standard',
        tshirt_size: 'YM',
        shorts_size: 'YM',
        dominant_hand: 'right',
        created_at: getDateInCurrentYear(2, 1, 11),
        updated_at: getDateInCurrentYear(2, 1, 11),
    },
    {
        id: CHILD_ISABELLA_RODRIGUEZ_ID,
        family_id: FAMILY_RODRIGUEZ_ID,
        first_name: 'Isabella',
        last_name: 'Rodriguez',
        date_of_birth: '2016-04-18',
        gender: 'female',
        jersey_number: '17',
        medical_notes: null,
        allergies: null,
        emergency_contact_name: 'Maria Rodriguez',
        emergency_contact_phone: '+1 (555) 567-8901',
        photo_url: getAthletePhotoUrl('isabella-rodriguez.jpg'),
        height_cm: 125,
        weight_kg: 26,
        shoe_size_value: 2.5,
        shoe_size_system: 'us',
        shoe_width: 'standard',
        tshirt_size: 'YS',
        shorts_size: 'YS',
        dominant_hand: 'right',
        created_at: getDateInCurrentYear(2, 1, 11),
        updated_at: getDateInCurrentYear(2, 1, 11),
    },
    // Patel Family (another parent)
    {
        id: CHILD_AIDEN_PATEL_ID,
        family_id: FAMILY_PATEL_ID,
        first_name: 'Aiden',
        last_name: 'Patel',
        date_of_birth: '2015-02-14',
        gender: 'male',
        jersey_number: '5',
        medical_notes: null,
        allergies: 'Tree nuts',
        emergency_contact_name: 'Priya Patel',
        emergency_contact_phone: '+1 (555) 999-0000',
        photo_url: getAthletePhotoUrl('aiden-patel.jpg'),
        height_cm: 130,
        weight_kg: 29,
        shoe_size_value: 3,
        shoe_size_system: 'us',
        shoe_width: 'standard',
        tshirt_size: 'YS',
        shorts_size: 'YS',
        dominant_hand: 'right',
        created_at: '2024-03-01T09:00:00Z',
        updated_at: '2024-03-01T09:00:00Z',
    },
]

// ============================================================================
// Fake Family Members Data
// ============================================================================

export const fakeFamilyMembers: FakeFamilyMember[] = [
    // Johnson Family
    {
        id: 'fm-johnson-001',
        family_id: FAMILY_JOHNSON_ID,
        user_id: PARENT_ONLY_ID,
        role: 'owner',
        permissions: ['rsvp', 'payments', 'edit_children'],
        created_at: getDateInCurrentYear(1, 15, 10),
    },
    {
        id: 'fm-johnson-002',
        family_id: FAMILY_JOHNSON_ID,
        user_id: USER_SARAH_JOHNSON_ID,
        role: 'guardian',
        permissions: ['rsvp', 'payments'],
        created_at: getDateInCurrentYear(1, 15, 10, 30),
    },
    // Smith Family
    {
        id: 'fm-smith-001',
        family_id: FAMILY_SMITH_ID,
        user_id: USER_MIKE_SMITH_ID,
        role: 'owner',
        permissions: ['rsvp', 'payments', 'edit_children'],
        created_at: '2024-02-10T14:00:00Z',
    },
    // Chen Family
    {
        id: 'fm-chen-001',
        family_id: FAMILY_CHEN_ID,
        user_id: PARENT_ADMIN_ID,
        role: 'owner',
        permissions: ['rsvp', 'payments', 'edit_children'],
        created_at: '2023-11-15T10:00:00Z',
    },
    // Williams Family (parent-admin as guardian of another family)
    {
        id: 'fm-williams-001',
        family_id: FAMILY_WILLIAMS_ID,
        user_id: PARENT_ADMIN_ID,
        role: 'guardian',
        permissions: ['rsvp'],
        created_at: getDateInCurrentYear(1, 20, 11),
    },
    // Rodriguez Family
    {
        id: 'fm-rodriguez-001',
        family_id: FAMILY_RODRIGUEZ_ID,
        user_id: PARENT_COACH_ID,
        role: 'owner',
        permissions: ['rsvp', 'payments', 'edit_children'],
        created_at: getDateInCurrentYear(2, 1, 11),
    },
    // Patel Family
    {
        id: 'fm-patel-001',
        family_id: FAMILY_PATEL_ID,
        user_id: USER_PRIYA_PATEL_ID,
        role: 'owner',
        permissions: ['rsvp', 'payments', 'edit_children'],
        created_at: '2024-03-01T09:00:00Z',
    },
]

// ============================================================================
// Fake Organization Members Data
// ============================================================================

export const fakeOrganizationMembers: FakeOrganizationMember[] = [
    // Organization A - Demo users
    {
        id: 'om-001',
        org_id: DEMO_ORG_A_ID,
        user_id: PARENT_ONLY_ID,
        roles: ['parent'],
        status: 'active',
        created_at: getDateInCurrentYear(1, 15, 10),
        updated_at: getDateInCurrentYear(1, 15, 10),
    },
    {
        id: 'om-002',
        org_id: DEMO_ORG_A_ID,
        user_id: COACH_ONLY_ID,
        roles: ['coach'],
        status: 'active',
        created_at: '2024-01-10T09:00:00Z',
        updated_at: '2024-01-10T09:00:00Z',
    },
    {
        id: 'om-003',
        org_id: DEMO_ORG_A_ID,
        user_id: ADMIN_ONLY_ID,
        roles: ['org_admin'],
        status: 'active',
        created_at: getDateInPreviousYear(12, 1, 8),
        updated_at: getDateInPreviousYear(12, 1, 8),
    },
    {
        id: 'om-004',
        org_id: DEMO_ORG_A_ID,
        user_id: PARENT_ADMIN_ID,
        roles: ['parent', 'org_admin'],
        status: 'active',
        created_at: '2023-11-15T10:00:00Z',
        updated_at: '2023-11-15T10:00:00Z',
    },
    {
        id: 'om-005',
        org_id: DEMO_ORG_A_ID,
        user_id: PARENT_COACH_ID,
        roles: ['parent', 'coach'],
        status: 'active',
        created_at: getDateInCurrentYear(2, 1, 11),
        updated_at: getDateInCurrentYear(2, 1, 11),
    },
    // Organization A - Other users
    {
        id: 'om-006',
        org_id: DEMO_ORG_A_ID,
        user_id: USER_MIKE_SMITH_ID,
        roles: ['parent'],
        status: 'active',
        created_at: '2024-02-10T14:00:00Z',
        updated_at: '2024-02-10T14:00:00Z',
    },
    {
        id: 'om-007',
        org_id: DEMO_ORG_A_ID,
        user_id: USER_COACH_MARTINEZ_ID,
        roles: ['coach'],
        status: 'active',
        created_at: getDateInPreviousYear(9, 1, 9),
        updated_at: getDateInPreviousYear(9, 1, 9),
    },
    {
        id: 'om-008',
        org_id: DEMO_ORG_A_ID,
        user_id: USER_COACH_THOMPSON_ID,
        roles: ['coach'],
        status: 'active',
        created_at: '2023-10-15T10:00:00Z',
        updated_at: '2023-10-15T10:00:00Z',
    },
    {
        id: 'om-010',
        org_id: DEMO_ORG_A_ID,
        user_id: USER_PRIYA_PATEL_ID,
        roles: ['parent'],
        status: 'active',
        created_at: '2024-03-01T09:00:00Z',
        updated_at: '2024-03-01T09:00:00Z',
    },
    // Organization B - Multi-org parent
    {
        id: 'om-009',
        org_id: DEMO_ORG_B_ID,
        user_id: PARENT_ONLY_ID,
        roles: ['parent'],
        status: 'active',
        created_at: '2024-03-01T09:00:00Z',
        updated_at: '2024-03-01T09:00:00Z',
    },
]

// ============================================================================
// Programmatic Generation: 200+ Users at Scale
// ============================================================================

const GEN_ORG_IDS = [
    DEMO_ORG_A_ID, DEMO_ORG_A_ID, DEMO_ORG_A_ID, // 60% Org A
    DEMO_ORG_B_ID, // 20% Org B
    'org-community-001', 'org-tournament-001', 'org-club-002', 'org-academy-002', // 20% others
]

// --- Generate 100 Fan accounts ---
for (let i = 0; i < 100; i++) {
    const isFemale = i % 2 === 0
    const firstName = isFemale ? pick(FIRST_NAMES_FEMALE, i) : pick(FIRST_NAMES_MALE, i)
    const lastName = pick(LAST_NAMES, i + 50)
    const createdAt = generatePastDate(i, 180) // within last 6 months

    const userId = `user-fan-${String(i + 1).padStart(3, '0')}`
    fakeUsers.push({
        id: userId,
        email: generateEmail(firstName, lastName, i),
        phone: generatePhone(1000 + i),
        display_name: `${firstName} ${lastName}`,
        created_at: createdAt,
        updated_at: createdAt,
    })

    // Mix: 30 new users (no purchases), 50 active, 20 lapsed - memberships added for all
    const orgId = pick(GEN_ORG_IDS, i)
    fakeOrganizationMembers.push({
        id: `om-fan-${String(i + 1).padStart(3, '0')}`,
        org_id: orgId,
        user_id: userId,
        roles: ['parent'] as OrgMemberRole[],
        status: i % 20 === 0 ? 'invited' : 'active',
        created_at: createdAt,
        updated_at: createdAt,
    })
}

// --- Generate 50 Guardian accounts with families and 150 children ---
for (let i = 0; i < 50; i++) {
    const isFemale = i % 3 !== 0
    const firstName = isFemale ? pick(FIRST_NAMES_FEMALE, i + 200) : pick(FIRST_NAMES_MALE, i + 200)
    const lastName = pick(LAST_NAMES, i + 10)
    const createdAt = generatePastDate(i + 300, 365) // within last year

    const userId = `user-guardian-${String(i + 1).padStart(3, '0')}`
    const familyId = `family-gen-${String(i + 1).padStart(3, '0')}`
    const orgId = pick(GEN_ORG_IDS, i + 5)

    fakeUsers.push({
        id: userId,
        email: generateEmail(firstName, lastName, i + 200),
        phone: generatePhone(2000 + i),
        display_name: `${firstName} ${lastName}`,
        created_at: createdAt,
        updated_at: createdAt,
    })

    fakeOrganizationMembers.push({
        id: `om-guardian-${String(i + 1).padStart(3, '0')}`,
        org_id: orgId,
        user_id: userId,
        roles: ['parent'] as OrgMemberRole[],
        status: 'active',
        created_at: createdAt,
        updated_at: createdAt,
    })

    fakeFamilies.push({
        id: familyId,
        name: `${lastName} Family`,
        created_by_user_id: userId,
        org_id: orgId,
        created_at: createdAt,
        updated_at: createdAt,
    })

    fakeFamilyMembers.push({
        id: `fm-gen-${String(i + 1).padStart(3, '0')}`,
        family_id: familyId,
        user_id: userId,
        role: 'owner',
        permissions: ['rsvp', 'payments', 'edit_children'],
        created_at: createdAt,
    })

    // Each guardian has 1-4 children
    const childCount = 1 + (i % 4)
    for (let c = 0; c < childCount; c++) {
        const childIsFemale = c % 2 === 0
        const childFirstName = childIsFemale
            ? pick(FIRST_NAMES_FEMALE, i * 4 + c + 500)
            : pick(FIRST_NAMES_MALE, i * 4 + c + 500)
        const childIdx = i * 4 + c
        const jersey = String(1 + (childIdx % 30))

        fakeChildren.push({
            id: `child-gen-${String(childIdx + 1).padStart(4, '0')}`,
            family_id: familyId,
            first_name: childFirstName,
            last_name: lastName,
            date_of_birth: generateBirthdate(childIdx, 6, 17),
            gender: childIsFemale ? 'female' : 'male',
            jersey_number: jersey,
            medical_notes: childIdx % 8 === 0 ? 'Asthma - carries inhaler' : null,
            allergies: childIdx % 12 === 0 ? pick(['Peanuts', 'Tree nuts', 'Dairy', 'Shellfish', 'Gluten'], childIdx) : null,
            emergency_contact_name: `${firstName} ${lastName}`,
            emergency_contact_phone: generatePhone(2000 + i),
            photo_url: getAthletePhotoUrl(pick(childIsFemale ? [...FEMALE_ATHLETE_PHOTO_FILES] : [...MALE_ATHLETE_PHOTO_FILES], childIdx)),
            height_cm: null,
            weight_kg: null,
            shoe_size_value: null,
            shoe_size_system: null,
            shoe_width: null,
            tshirt_size: null,
            shorts_size: null,
            dominant_hand: null,
            created_at: createdAt,
            updated_at: createdAt,
        })
    }

    // 40% of guardians have a second guardian (partner) linked
    if (i % 5 < 2) {
        const partnerIsFemale = !isFemale
        const partnerFirstName = partnerIsFemale
            ? pick(FIRST_NAMES_FEMALE, i + 400)
            : pick(FIRST_NAMES_MALE, i + 400)
        const partnerUserId = `user-guardian-partner-${String(i + 1).padStart(3, '0')}`

        fakeUsers.push({
            id: partnerUserId,
            email: generateEmail(partnerFirstName, lastName, i + 500),
            phone: generatePhone(5000 + i),
            display_name: `${partnerFirstName} ${lastName}`,
            created_at: createdAt,
            updated_at: createdAt,
        })

        fakeFamilyMembers.push({
            id: `fm-partner-${String(i + 1).padStart(3, '0')}`,
            family_id: familyId,
            user_id: partnerUserId,
            role: i % 10 === 0 ? 'view_only' : 'guardian',
            permissions: i % 10 === 0 ? ['rsvp'] : ['rsvp', 'payments'],
            created_at: createdAt,
        })
    }
}

// --- Generate 20 Admin accounts ---
const adminRolePatterns: Array<{ roles: OrgMemberRole[]; label: string }> = [
    { roles: ['org_admin'], label: 'Super Admin' },
    { roles: ['org_admin'], label: 'Event Manager' },
    { roles: ['org_admin'], label: 'Finance Admin' },
    { roles: ['org_admin', 'coach'], label: 'Admin Coach' },
    { roles: ['org_admin'], label: 'Support Admin' },
]

for (let i = 0; i < 20; i++) {
    const isFemale = i % 2 === 0
    const firstName = isFemale ? pick(FIRST_NAMES_FEMALE, i + 700) : pick(FIRST_NAMES_MALE, i + 700)
    const lastName = pick(LAST_NAMES, i + 80)
    const createdAt = generatePastDate(i + 800, 400)
    const pattern = adminRolePatterns[i % adminRolePatterns.length]

    const userId = `user-admin-${String(i + 1).padStart(3, '0')}`
    const orgId = pick(GEN_ORG_IDS, i + 2)

    fakeUsers.push({
        id: userId,
        email: generateEmail(firstName, lastName, i + 700),
        phone: generatePhone(3000 + i),
        display_name: `${firstName} ${lastName}`,
        created_at: createdAt,
        updated_at: createdAt,
    })

    fakeOrganizationMembers.push({
        id: `om-admin-${String(i + 1).padStart(3, '0')}`,
        org_id: orgId,
        user_id: userId,
        roles: pattern.roles,
        status: 'active',
        created_at: createdAt,
        updated_at: createdAt,
    })
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getUserById(userId: string): FakeUser | undefined {
    return fakeUsers.find((u) => u.id === userId)
}

export function getUserByEmail(email: string): FakeUser | undefined {
    return fakeUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function getFamiliesForUser(userId: string): FakeFamily[] {
    const membershipFamilyIds = fakeFamilyMembers
        .filter((fm) => fm.user_id === userId)
        .map((fm) => fm.family_id)
    return fakeFamilies.filter((f) => membershipFamilyIds.includes(f.id))
}

export function getChildrenForUser(userId: string): FakeChild[] {
    const familyIds = getFamiliesForUser(userId).map((f) => f.id)
    return fakeChildren.filter((c) => familyIds.includes(c.family_id))
}

export function getChildrenForFamily(familyId: string): FakeChild[] {
    return fakeChildren.filter((c) => c.family_id === familyId)
}

export function getChildById(childId: string): FakeChild | undefined {
    return fakeChildren.find((c) => c.id === childId)
}

export function getFamilyById(familyId: string): FakeFamily | undefined {
    return fakeFamilies.find((f) => f.id === familyId)
}

export function getFamilyMembersForFamily(familyId: string): FakeFamilyMember[] {
    return fakeFamilyMembers.filter((fm) => fm.family_id === familyId)
}

export function getOrganizationMembersForOrg(orgId: string): FakeOrganizationMember[] {
    return fakeOrganizationMembers.filter((om) => om.org_id === orgId)
}

export function getOrganizationMembershipForUser(
    userId: string,
    orgId: string
): FakeOrganizationMember | undefined {
    return fakeOrganizationMembers.find((om) => om.user_id === userId && om.org_id === orgId)
}

export function getUserRolesInOrg(userId: string, orgId: string): OrgMemberRole[] {
    const membership = getOrganizationMembershipForUser(userId, orgId)
    return membership?.roles ?? []
}

/**
 * Get all organizations for a user (mimics get_user_organizations RPC)
 * Returns organizations with their roles, matching the RPC return type
 */
export function getUserOrganizations(userId: string): Array<{
    org_id: string
    org_name: string
    roles: OrgMemberRole[]
}> {
    const memberships = fakeOrganizationMembers.filter((om) => om.user_id === userId)

    // Group by org_id and aggregate roles
    const orgMap = new Map<string, OrgMemberRole[]>()

    for (const membership of memberships) {
        const existing = orgMap.get(membership.org_id) || []
        // Merge roles, avoiding duplicates
        const combined = [...new Set([...existing, ...membership.roles])]
        orgMap.set(membership.org_id, combined)
    }

    // Get organization names from fakeOrganizations
    return Array.from(orgMap.entries())
        .map(([orgId, roles]) => {
            const org = getOrganizationById(orgId)
            return {
                org_id: orgId,
                org_name: org?.name || 'Unknown Organization',
                roles: roles.sort(), // Sort for consistency
            }
        })
        .sort((a, b) => a.org_name.localeCompare(b.org_name)) // Sort by name
}

export function getAllChildIds(): string[] {
    return fakeChildren.map((c) => c.id)
}

export function getChildIdsForUser(userId: string): string[] {
    return getChildrenForUser(userId).map((c) => c.id)
}

export function getFamilyIdsForUser(userId: string): string[] {
    return getFamiliesForUser(userId).map((f) => f.id)
}

/**
 * Get child with family and team info (for display)
 */
export function getChildWithDetails(childId: string): (FakeChild & { family?: FakeFamily }) | undefined {
    const child = getChildById(childId)
    if (!child) return undefined

    const family = getFamilyById(child.family_id)
    return { ...child, family }
}
