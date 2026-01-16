/**
 * Fake Tryouts Data Module
 *
 * Provides fake data for tryouts, registrations, and evaluations.
 * All tryouts are linked to Organization A.
 */

import { DEMO_ORG_A_ID, DEMO_USER_IDS } from '../config'
import {
    SPORT_SOCCER_ID,
    SPORT_BASKETBALL_ID,
    PROGRAM_SOCCER_COMP_ID,
    PROGRAM_BASKETBALL_ELITE_ID,
} from './fakeTeams'
import {
    CHILD_EMMA_JOHNSON_ID,
    CHILD_SOPHIA_CHEN_ID,
    CHILD_MASON_RODRIGUEZ_ID,
    CHILD_AVA_WILLIAMS_ID,
    CHILD_NOAH_SMITH_ID,
} from './fakeUsers'

// ============================================================================
// Types
// ============================================================================

export type TryoutStatus = 'upcoming' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
export type RegistrationStatus = 'pending' | 'confirmed' | 'waitlisted' | 'cancelled'
export type EvaluationDecision = 'offer' | 'waitlist' | 'no_offer' | 'pending'

export interface FakeTryout {
    id: string
    org_id: string
    sport_id: string
    program_id: string | null
    title: string
    description: string | null
    age_group: string
    gender: 'male' | 'female' | 'coed'
    tryout_date: string
    start_time: string
    end_time: string
    location: string
    max_participants: number
    status: TryoutStatus
    registration_deadline: string | null
    evaluation_criteria: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface FakeTryoutRegistration {
    id: string
    tryout_id: string
    child_id: string
    status: RegistrationStatus
    registered_by_user_id: string
    experience_level: string | null
    notes_from_parent: string | null
    check_in_time: string | null
    created_at: string
    updated_at: string
}

export interface FakeTryoutEvaluation {
    id: string
    registration_id: string
    evaluated_by_user_id: string
    decision: EvaluationDecision
    skill_score: number | null // 1-10
    athleticism_score: number | null // 1-10
    attitude_score: number | null // 1-10
    notes: string | null
    created_at: string
    updated_at: string
}

// ============================================================================
// Tryout IDs
// ============================================================================

export const TRYOUT_U14_SOCCER_ELITE_ID = 'tryout-u14-soccer-elite-001'
export const TRYOUT_U12_BASKETBALL_ELITE_ID = 'tryout-u12-bb-elite-002'
export const TRYOUT_U12_SOCCER_COMP_ID = 'tryout-u12-soccer-comp-003'

// ============================================================================
// Helper for dates
// ============================================================================

const now = new Date()

function addDays(days: number): string {
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function daysAgo(days: number): string {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

// ============================================================================
// User References
// ============================================================================

const PARENT_ONLY_ID = DEMO_USER_IDS['parent-only@example.com']
const PARENT_ADMIN_ID = DEMO_USER_IDS['parent-admin@example.com']
const COACH_ONLY_ID = DEMO_USER_IDS['coach-only@example.com']

// ============================================================================
// Fake Tryouts Data
// ============================================================================

export const fakeTryouts: FakeTryout[] = [
    {
        id: TRYOUT_U14_SOCCER_ELITE_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_SOCCER_ID,
        program_id: PROGRAM_SOCCER_COMP_ID,
        title: 'U14 Elite Soccer Tryouts',
        description: `Tryouts for the U14 Elite Storm competitive travel team. 

Players should come prepared for:
- Technical skills assessment
- Scrimmage game play
- Fitness evaluation

Parents are welcome to observe from the sideline.`,
        age_group: 'U14',
        gender: 'coed',
        tryout_date: addDays(7),
        start_time: '09:00',
        end_time: '12:00',
        location: 'Riverside Sports Complex - Field 1',
        max_participants: 40,
        status: 'registration_open',
        registration_deadline: addDays(5),
        evaluation_criteria: 'Technical skills, game awareness, athleticism, teamwork, attitude',
        notes: 'Bring both cleats and indoor shoes in case of weather. Water and snacks provided.',
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
    },
    {
        id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_BASKETBALL_ID,
        program_id: PROGRAM_BASKETBALL_ELITE_ID,
        title: 'Elite Basketball Academy Tryouts',
        description: `Join our Elite Basketball Academy! Looking for committed players who want to take their game to the next level.

Tryout Format:
- Warm-up and drills (30 min)
- Skills stations (45 min)
- 5v5 scrimmages (45 min)`,
        age_group: 'U12',
        gender: 'coed',
        tryout_date: addDays(14),
        start_time: '10:00',
        end_time: '13:00',
        location: 'Riverside Community Center - Main Gym',
        max_participants: 30,
        status: 'registration_open',
        registration_deadline: addDays(12),
        evaluation_criteria: 'Ball handling, shooting, defense, basketball IQ, hustle',
        notes: 'Indoor shoes required. No outdoor shoes allowed in gym.',
        created_at: '2024-02-10T00:00:00Z',
        updated_at: '2024-02-10T00:00:00Z',
    },
    {
        id: TRYOUT_U12_SOCCER_COMP_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_SOCCER_ID,
        program_id: PROGRAM_SOCCER_COMP_ID,
        title: 'U12 Competitive Soccer Tryouts',
        description: 'Tryouts for U12 competitive travel soccer program.',
        age_group: 'U12',
        gender: 'coed',
        tryout_date: addDays(21),
        start_time: '14:00',
        end_time: '17:00',
        location: 'Eastside Park - Field 2',
        max_participants: 35,
        status: 'upcoming',
        registration_deadline: addDays(19),
        evaluation_criteria: 'Technical ability, positional awareness, physical development',
        notes: null,
        created_at: '2024-02-15T00:00:00Z',
        updated_at: '2024-02-15T00:00:00Z',
    },
]

// ============================================================================
// Fake Tryout Registrations Data
// ============================================================================

export const fakeTryoutRegistrations: FakeTryoutRegistration[] = [
    // U14 Soccer Elite Tryout registrations
    {
        id: 'reg-001',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        child_id: CHILD_EMMA_JOHNSON_ID,
        status: 'confirmed',
        registered_by_user_id: PARENT_ONLY_ID,
        experience_level: '3 years competitive soccer, currently on U10 rec team',
        notes_from_parent: 'Emma is very excited about this opportunity. She plays forward typically.',
        check_in_time: null,
        created_at: daysAgo(5),
        updated_at: daysAgo(5),
    },
    {
        id: 'reg-002',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        child_id: CHILD_SOPHIA_CHEN_ID,
        status: 'confirmed',
        registered_by_user_id: PARENT_ADMIN_ID,
        experience_level: '4 years soccer, team captain on current U10 team',
        notes_from_parent: 'Sophia is a natural leader and plays midfield.',
        check_in_time: null,
        created_at: daysAgo(4),
        updated_at: daysAgo(4),
    },
    {
        id: 'reg-003',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        child_id: CHILD_MASON_RODRIGUEZ_ID,
        status: 'confirmed',
        registered_by_user_id: DEMO_USER_IDS['parent-coach@example.com'],
        experience_level: '5 years playing, 2 years competitive',
        notes_from_parent: null,
        check_in_time: null,
        created_at: daysAgo(3),
        updated_at: daysAgo(3),
    },
    {
        id: 'reg-004',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        child_id: CHILD_AVA_WILLIAMS_ID,
        status: 'pending',
        registered_by_user_id: PARENT_ADMIN_ID,
        experience_level: '2 years rec soccer',
        notes_from_parent: 'First time trying out for competitive team.',
        check_in_time: null,
        created_at: daysAgo(1),
        updated_at: daysAgo(1),
    },

    // U12 Basketball Elite Tryout registrations
    {
        id: 'reg-005',
        tryout_id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        child_id: CHILD_NOAH_SMITH_ID,
        status: 'confirmed',
        registered_by_user_id: 'user-mike-smith-002', // Mike Smith
        experience_level: '2 years basketball, school team',
        notes_from_parent: 'Noah loves basketball and practices every day.',
        check_in_time: null,
        created_at: daysAgo(2),
        updated_at: daysAgo(2),
    },
]

// ============================================================================
// Fake Tryout Evaluations Data (for completed tryouts - example)
// ============================================================================

export const fakeTryoutEvaluations: FakeTryoutEvaluation[] = [
    // These would be populated after a tryout is completed
    // For demo, leaving mostly empty as tryouts are upcoming
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getTryoutById(tryoutId: string): FakeTryout | undefined {
    return fakeTryouts.find((t) => t.id === tryoutId)
}

export function getTryoutsForOrg(orgId: string): FakeTryout[] {
    return fakeTryouts.filter((t) => t.org_id === orgId)
}

export function getUpcomingTryoutsForOrg(orgId: string): FakeTryout[] {
    return fakeTryouts.filter(
        (t) => t.org_id === orgId && (t.status === 'upcoming' || t.status === 'registration_open')
    )
}

export function getOpenRegistrationTryouts(orgId: string): FakeTryout[] {
    return fakeTryouts.filter((t) => t.org_id === orgId && t.status === 'registration_open')
}

export function getTryoutsForSport(sportId: string): FakeTryout[] {
    return fakeTryouts.filter((t) => t.sport_id === sportId)
}

export function getRegistrationById(registrationId: string): FakeTryoutRegistration | undefined {
    return fakeTryoutRegistrations.find((r) => r.id === registrationId)
}

export function getRegistrationsForTryout(tryoutId: string): FakeTryoutRegistration[] {
    return fakeTryoutRegistrations.filter((r) => r.tryout_id === tryoutId)
}

export function getRegistrationsForChild(childId: string): FakeTryoutRegistration[] {
    return fakeTryoutRegistrations.filter((r) => r.child_id === childId)
}

export function getConfirmedRegistrationsCount(tryoutId: string): number {
    return fakeTryoutRegistrations.filter((r) => r.tryout_id === tryoutId && r.status === 'confirmed').length
}

export function getAvailableSpotsForTryout(tryoutId: string): number {
    const tryout = getTryoutById(tryoutId)
    if (!tryout) return 0
    const confirmedCount = getConfirmedRegistrationsCount(tryoutId)
    return Math.max(0, tryout.max_participants - confirmedCount)
}

export function isChildRegisteredForTryout(childId: string, tryoutId: string): boolean {
    return fakeTryoutRegistrations.some(
        (r) => r.child_id === childId && r.tryout_id === tryoutId && r.status !== 'cancelled'
    )
}

export function getEvaluationsForRegistration(registrationId: string): FakeTryoutEvaluation[] {
    return fakeTryoutEvaluations.filter((e) => e.registration_id === registrationId)
}

/**
 * Get tryout with registration count
 */
export function getTryoutWithStats(
    tryoutId: string
): (FakeTryout & { registrationCount: number; availableSpots: number }) | undefined {
    const tryout = getTryoutById(tryoutId)
    if (!tryout) return undefined

    const registrationCount = getConfirmedRegistrationsCount(tryoutId)
    return {
        ...tryout,
        registrationCount,
        availableSpots: tryout.max_participants - registrationCount,
    }
}
