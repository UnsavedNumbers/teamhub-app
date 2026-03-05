/**
 * Fake Tryouts Data Module
 *
 * Provides fake data for tryouts, registrations, evaluator assignments,
 * sessions, and evaluations. All data is linked to Organization A.
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
    CHILD_ISABELLA_RODRIGUEZ_ID,
    CHILD_LIAM_JOHNSON_ID,
    CHILD_AIDEN_PATEL_ID,
    USER_MIKE_SMITH_ID,
    USER_COACH_MARTINEZ_ID,
    USER_COACH_THOMPSON_ID,
} from './fakeUsers'

export type TryoutStatus = 'upcoming' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
export type RegistrationStatus =
    | 'registered'
    | 'checked_in'
    | 'evaluated'
    | 'offered'
    | 'accepted'
    | 'declined'
    | 'rejected'
    | 'withdrawn'
    | 'waitlisted'
    | 'not_selected'
    | 'pending'
    | 'confirmed'
    | 'cancelled'
export type EvaluationDecision = 'offer' | 'waitlist' | 'no_offer' | 'pending'
export type FakeTryoutSessionType = 'initial' | 'callback' | 'final'

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
    entry_fee?: number | null
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
    athlete_id: string
    status: RegistrationStatus
    registered_by_user_id: string
    experience_level: string | null
    notes_from_parent: string | null
    check_in_time: string | null
    offer_deadline?: string | null
    session_id?: string | null
    payment_status?: 'pending' | 'paid' | 'failed' | null
    created_at: string
    updated_at: string
}

export interface FakeTryoutEvaluation {
    id: string
    registration_id: string
    evaluated_by_user_id: string
    decision: EvaluationDecision
    skill_score: number | null
    athleticism_score: number | null
    attitude_score: number | null
    notes: string | null
    category?: string | null
    session_id?: string | null
    created_at: string
    updated_at: string
}

export interface FakeTryoutEvaluator {
    id: string
    tryout_id: string
    coach_id: string
    assigned_at: string
}

export interface FakeTryoutSession {
    id: string
    tryout_id: string
    session_date: string
    start_time: string
    end_time: string | null
    location: string | null
    session_type: FakeTryoutSessionType
    capacity: number | null
    created_at: string
    updated_at: string
}

export const TRYOUT_U14_SOCCER_ELITE_ID = 'tryout-u14-soccer-elite-001'
export const TRYOUT_U12_BASKETBALL_ELITE_ID = 'tryout-u12-bb-elite-002'
export const TRYOUT_U12_SOCCER_COMP_ID = 'tryout-u12-soccer-comp-003'

const now = new Date()

function addDays(days: number): string {
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function isoOffset(days: number, hour: number = 9, minute: number = 0): string {
    const value = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    value.setUTCHours(hour, minute, 0, 0)
    return value.toISOString()
}

const PARENT_ONLY_ID = DEMO_USER_IDS['parent-only@example.com']
const PARENT_ADMIN_ID = DEMO_USER_IDS['parent-admin@example.com']
const PARENT_COACH_ID = DEMO_USER_IDS['parent-coach@example.com']
const COACH_ONLY_ID = DEMO_USER_IDS['coach-only@example.com']

export const fakeTryouts: FakeTryout[] = [
    {
        id: TRYOUT_U14_SOCCER_ELITE_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_SOCCER_ID,
        program_id: PROGRAM_SOCCER_COMP_ID,
        title: 'U14 Elite Soccer Tryouts',
        description: `Finalized tryout cycle for the U14 Elite Storm travel roster.

Included sessions:
- Technical assessment and ball mastery
- Small-sided decision making
- 11v11 match evaluation
- Coach interview and readiness review`,
        age_group: 'U14',
        gender: 'coed',
        tryout_date: addDays(-10),
        start_time: '09:00',
        end_time: '12:00',
        location: 'Riverside Sports Complex - Field 1',
        max_participants: 40,
        entry_fee: 3500,
        status: 'completed',
        registration_deadline: addDays(-14),
        evaluation_criteria: 'Technical skill, tactical awareness, athleticism, coachability, effort',
        notes: 'Results published to families after the callback session.',
        created_at: isoOffset(-35, 12),
        updated_at: isoOffset(-7, 15),
    },
    {
        id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_BASKETBALL_ID,
        program_id: PROGRAM_BASKETBALL_ELITE_ID,
        title: 'Elite Basketball Academy Tryouts',
        description: `Open evaluation for the winter academy roster.

Format:
- Warmup and movement prep
- Ball handling and shooting stations
- Competitive 3v3 and 5v5 scrimmages`,
        age_group: 'U12',
        gender: 'coed',
        tryout_date: addDays(9),
        start_time: '10:00',
        end_time: '13:00',
        location: 'Riverside Community Center - Main Gym',
        max_participants: 30,
        entry_fee: 2500,
        status: 'registration_open',
        registration_deadline: addDays(7),
        evaluation_criteria: 'Ball handling, shooting, defense, basketball IQ, hustle',
        notes: 'Indoor shoes required. No outdoor shoes allowed in the gym.',
        created_at: isoOffset(-20, 11),
        updated_at: isoOffset(-2, 16),
    },
    {
        id: TRYOUT_U12_SOCCER_COMP_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_SOCCER_ID,
        program_id: PROGRAM_SOCCER_COMP_ID,
        title: 'U12 Competitive Soccer Tryouts',
        description: 'Registration has closed and coaches are completing final evaluations for the U12 competitive pool.',
        age_group: 'U12',
        gender: 'coed',
        tryout_date: addDays(4),
        start_time: '14:00',
        end_time: '17:00',
        location: 'Eastside Park - Field 2',
        max_participants: 35,
        entry_fee: 3000,
        status: 'registration_closed',
        registration_deadline: addDays(2),
        evaluation_criteria: 'Technical ability, positional awareness, speed of play, physical development',
        notes: 'Closed to new registrations. Current applicants remain under review.',
        created_at: isoOffset(-18, 9),
        updated_at: isoOffset(-1, 10),
    },
]

export const fakeTryoutSessions: FakeTryoutSession[] = [
    {
        id: 'session-u14-initial-001',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        session_date: addDays(-10),
        start_time: '09:00',
        end_time: '12:00',
        location: 'Riverside Sports Complex - Field 1',
        session_type: 'initial',
        capacity: 40,
        created_at: isoOffset(-35, 12),
        updated_at: isoOffset(-35, 12),
    },
    {
        id: 'session-u14-callback-001',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        session_date: addDays(-8),
        start_time: '17:30',
        end_time: '19:00',
        location: 'Riverside Sports Complex - Field 3',
        session_type: 'callback',
        capacity: 20,
        created_at: isoOffset(-34, 12),
        updated_at: isoOffset(-9, 11),
    },
    {
        id: 'session-u12-bb-initial-001',
        tryout_id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        session_date: addDays(9),
        start_time: '10:00',
        end_time: '13:00',
        location: 'Riverside Community Center - Main Gym',
        session_type: 'initial',
        capacity: 30,
        created_at: isoOffset(-20, 11),
        updated_at: isoOffset(-20, 11),
    },
    {
        id: 'session-u12-soccer-initial-001',
        tryout_id: TRYOUT_U12_SOCCER_COMP_ID,
        session_date: addDays(4),
        start_time: '14:00',
        end_time: '17:00',
        location: 'Eastside Park - Field 2',
        session_type: 'initial',
        capacity: 35,
        created_at: isoOffset(-18, 9),
        updated_at: isoOffset(-18, 9),
    },
]

export const fakeTryoutRegistrations: FakeTryoutRegistration[] = [
    {
        id: 'reg-001',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        athlete_id: CHILD_EMMA_JOHNSON_ID,
        status: 'accepted',
        registered_by_user_id: PARENT_ONLY_ID,
        experience_level: '3 years club soccer, attacking midfielder / winger',
        notes_from_parent: 'Emma asked for elite placement and can attend travel weekends.',
        check_in_time: isoOffset(-10, 8, 31),
        offer_deadline: addDays(-5),
        session_id: 'session-u14-callback-001',
        payment_status: 'paid',
        created_at: isoOffset(-24, 13),
        updated_at: isoOffset(-6, 16),
    },
    {
        id: 'reg-002',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        athlete_id: CHILD_SOPHIA_CHEN_ID,
        status: 'offered',
        registered_by_user_id: PARENT_ADMIN_ID,
        experience_level: '4 years soccer, central midfielder and captain profile',
        notes_from_parent: 'Strong leadership and comfortable in possession.',
        check_in_time: isoOffset(-10, 8, 35),
        offer_deadline: addDays(-3),
        session_id: 'session-u14-callback-001',
        payment_status: 'pending',
        created_at: isoOffset(-23, 9),
        updated_at: isoOffset(-4, 12),
    },
    {
        id: 'reg-003',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        athlete_id: CHILD_MASON_RODRIGUEZ_ID,
        status: 'waitlisted',
        registered_by_user_id: PARENT_COACH_ID,
        experience_level: '5 years playing, fast winger, limited travel history',
        notes_from_parent: 'Available if a roster opening appears later in the month.',
        check_in_time: isoOffset(-10, 8, 42),
        offer_deadline: null,
        session_id: 'session-u14-initial-001',
        payment_status: null,
        created_at: isoOffset(-22, 10),
        updated_at: isoOffset(-4, 14),
    },
    {
        id: 'reg-004',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        athlete_id: CHILD_AVA_WILLIAMS_ID,
        status: 'not_selected',
        registered_by_user_id: PARENT_ADMIN_ID,
        experience_level: '2 years rec soccer, first competitive tryout cycle',
        notes_from_parent: 'Ava wants feedback on next steps for development.',
        check_in_time: isoOffset(-10, 8, 48),
        offer_deadline: null,
        session_id: 'session-u14-initial-001',
        payment_status: null,
        created_at: isoOffset(-19, 13),
        updated_at: isoOffset(-5, 9),
    },
    {
        id: 'reg-005',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        athlete_id: CHILD_NOAH_SMITH_ID,
        status: 'accepted',
        registered_by_user_id: USER_MIKE_SMITH_ID,
        experience_level: 'Multi-sport athlete with strong speed and competitive drive',
        notes_from_parent: 'Primary position is outside back, can also play holding mid.',
        check_in_time: isoOffset(-10, 8, 53),
        offer_deadline: addDays(-5),
        session_id: 'session-u14-callback-001',
        payment_status: 'paid',
        created_at: isoOffset(-18, 8),
        updated_at: isoOffset(-5, 11),
    },
    {
        id: 'reg-006',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        athlete_id: CHILD_ISABELLA_RODRIGUEZ_ID,
        status: 'declined',
        registered_by_user_id: PARENT_COACH_ID,
        experience_level: 'Creative attacker, currently balancing club and school commitments',
        notes_from_parent: 'Family declined due to schedule conflict with school team.',
        check_in_time: isoOffset(-10, 9, 1),
        offer_deadline: addDays(-4),
        session_id: 'session-u14-callback-001',
        payment_status: null,
        created_at: isoOffset(-18, 15),
        updated_at: isoOffset(-3, 18),
    },
    {
        id: 'reg-007',
        tryout_id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        athlete_id: CHILD_NOAH_SMITH_ID,
        status: 'registered',
        registered_by_user_id: USER_MIKE_SMITH_ID,
        experience_level: 'School team guard with two years of rec experience',
        notes_from_parent: 'Prefers point guard reps.',
        check_in_time: null,
        offer_deadline: null,
        session_id: 'session-u12-bb-initial-001',
        payment_status: 'paid',
        created_at: isoOffset(-3, 14),
        updated_at: isoOffset(-3, 14),
    },
    {
        id: 'reg-008',
        tryout_id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        athlete_id: CHILD_AIDEN_PATEL_ID,
        status: 'pending',
        registered_by_user_id: PARENT_ADMIN_ID,
        experience_level: 'New to organized basketball, very good athlete',
        notes_from_parent: 'Will submit medical form before the event.',
        check_in_time: null,
        offer_deadline: null,
        session_id: 'session-u12-bb-initial-001',
        payment_status: 'pending',
        created_at: isoOffset(-2, 12),
        updated_at: isoOffset(-2, 12),
    },
    {
        id: 'reg-009',
        tryout_id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        athlete_id: CHILD_LIAM_JOHNSON_ID,
        status: 'waitlisted',
        registered_by_user_id: PARENT_ONLY_ID,
        experience_level: 'Strong defender, transitioning from rec to club',
        notes_from_parent: 'Can attend either session if a spot opens.',
        check_in_time: null,
        offer_deadline: null,
        session_id: 'session-u12-bb-initial-001',
        payment_status: null,
        created_at: isoOffset(-1, 9),
        updated_at: isoOffset(-1, 9),
    },
    {
        id: 'reg-010',
        tryout_id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        athlete_id: CHILD_AVA_WILLIAMS_ID,
        status: 'registered',
        registered_by_user_id: PARENT_ADMIN_ID,
        experience_level: 'Plays guard/wing, high-energy defender',
        notes_from_parent: 'Would like feedback even if roster is full.',
        check_in_time: null,
        offer_deadline: null,
        session_id: 'session-u12-bb-initial-001',
        payment_status: 'paid',
        created_at: isoOffset(-1, 11),
        updated_at: isoOffset(-1, 11),
    },
    {
        id: 'reg-011',
        tryout_id: TRYOUT_U12_SOCCER_COMP_ID,
        athlete_id: CHILD_LIAM_JOHNSON_ID,
        status: 'checked_in',
        registered_by_user_id: PARENT_ONLY_ID,
        experience_level: 'Center back with three seasons of rec soccer',
        notes_from_parent: 'Prefers defensive roles.',
        check_in_time: isoOffset(-1, 13, 41),
        offer_deadline: null,
        session_id: 'session-u12-soccer-initial-001',
        payment_status: 'paid',
        created_at: isoOffset(-8, 10),
        updated_at: isoOffset(-1, 13, 41),
    },
    {
        id: 'reg-012',
        tryout_id: TRYOUT_U12_SOCCER_COMP_ID,
        athlete_id: CHILD_AIDEN_PATEL_ID,
        status: 'evaluated',
        registered_by_user_id: PARENT_ADMIN_ID,
        experience_level: 'Technical left-footed player with futsal background',
        notes_from_parent: 'Aiden can also attend a callback if needed.',
        check_in_time: isoOffset(-1, 13, 45),
        offer_deadline: null,
        session_id: 'session-u12-soccer-initial-001',
        payment_status: 'paid',
        created_at: isoOffset(-7, 14),
        updated_at: isoOffset(0, 10),
    },
    {
        id: 'reg-013',
        tryout_id: TRYOUT_U12_SOCCER_COMP_ID,
        athlete_id: CHILD_SOPHIA_CHEN_ID,
        status: 'registered',
        registered_by_user_id: PARENT_ADMIN_ID,
        experience_level: 'Creative midfielder, looking for higher competition',
        notes_from_parent: 'Please consider for central midfield role.',
        check_in_time: null,
        offer_deadline: null,
        session_id: 'session-u12-soccer-initial-001',
        payment_status: 'pending',
        created_at: isoOffset(-6, 12),
        updated_at: isoOffset(-2, 16),
    },
]

export const fakeTryoutEvaluators: FakeTryoutEvaluator[] = [
    {
        id: 'te-001',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        coach_id: COACH_ONLY_ID,
        assigned_at: isoOffset(-20, 8),
    },
    {
        id: 'te-002',
        tryout_id: TRYOUT_U14_SOCCER_ELITE_ID,
        coach_id: USER_COACH_MARTINEZ_ID,
        assigned_at: isoOffset(-20, 8, 30),
    },
    {
        id: 'te-003',
        tryout_id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        coach_id: USER_COACH_THOMPSON_ID,
        assigned_at: isoOffset(-7, 12),
    },
    {
        id: 'te-004',
        tryout_id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        coach_id: PARENT_COACH_ID,
        assigned_at: isoOffset(-7, 12, 15),
    },
    {
        id: 'te-005',
        tryout_id: TRYOUT_U12_SOCCER_COMP_ID,
        coach_id: COACH_ONLY_ID,
        assigned_at: isoOffset(-6, 9),
    },
    {
        id: 'te-006',
        tryout_id: TRYOUT_U12_BASKETBALL_ELITE_ID,
        coach_id: COACH_ONLY_ID,
        assigned_at: isoOffset(-6, 10),
    },
]

export const fakeTryoutEvaluations: FakeTryoutEvaluation[] = [
    {
        id: 'eval-001',
        registration_id: 'reg-001',
        evaluated_by_user_id: COACH_ONLY_ID,
        decision: 'offer',
        skill_score: 9,
        athleticism_score: 8,
        attitude_score: 9,
        notes: 'Consistent tempo, sharp first touch, and strong two-way effort.',
        category: 'overall',
        session_id: 'session-u14-callback-001',
        created_at: isoOffset(-8, 20),
        updated_at: isoOffset(-8, 20),
    },
    {
        id: 'eval-002',
        registration_id: 'reg-002',
        evaluated_by_user_id: USER_COACH_MARTINEZ_ID,
        decision: 'offer',
        skill_score: 8,
        athleticism_score: 8,
        attitude_score: 9,
        notes: 'Commanded midfield traffic and organized teammates well.',
        category: 'overall',
        session_id: 'session-u14-callback-001',
        created_at: isoOffset(-8, 20, 8),
        updated_at: isoOffset(-8, 20, 8),
    },
    {
        id: 'eval-003',
        registration_id: 'reg-003',
        evaluated_by_user_id: COACH_ONLY_ID,
        decision: 'waitlist',
        skill_score: 7,
        athleticism_score: 8,
        attitude_score: 8,
        notes: 'High work rate; final decision depends on wing depth.',
        category: 'overall',
        session_id: 'session-u14-initial-001',
        created_at: isoOffset(-9, 18),
        updated_at: isoOffset(-9, 18),
    },
    {
        id: 'eval-004',
        registration_id: 'reg-004',
        evaluated_by_user_id: USER_COACH_MARTINEZ_ID,
        decision: 'no_offer',
        skill_score: 5,
        athleticism_score: 6,
        attitude_score: 8,
        notes: 'Needs a stronger first step and more confidence under pressure.',
        category: 'overall',
        session_id: 'session-u14-initial-001',
        created_at: isoOffset(-9, 18, 20),
        updated_at: isoOffset(-9, 18, 20),
    },
    {
        id: 'eval-005',
        registration_id: 'reg-005',
        evaluated_by_user_id: COACH_ONLY_ID,
        decision: 'offer',
        skill_score: 8,
        athleticism_score: 9,
        attitude_score: 8,
        notes: 'Very coachable and one of the best recovery runners in the pool.',
        category: 'overall',
        session_id: 'session-u14-callback-001',
        created_at: isoOffset(-8, 20, 25),
        updated_at: isoOffset(-8, 20, 25),
    },
    {
        id: 'eval-006',
        registration_id: 'reg-006',
        evaluated_by_user_id: USER_COACH_MARTINEZ_ID,
        decision: 'no_offer',
        skill_score: 7,
        athleticism_score: 7,
        attitude_score: 8,
        notes: 'Strong session, but family declined before final roster lock.',
        category: 'overall',
        session_id: 'session-u14-callback-001',
        created_at: isoOffset(-8, 20, 30),
        updated_at: isoOffset(-8, 20, 30),
    },
    {
        id: 'eval-007',
        registration_id: 'reg-011',
        evaluated_by_user_id: COACH_ONLY_ID,
        decision: 'pending',
        skill_score: 6,
        athleticism_score: 7,
        attitude_score: 8,
        notes: 'Solid defensive shape. Awaiting second coach review.',
        category: 'overall',
        session_id: 'session-u12-soccer-initial-001',
        created_at: isoOffset(0, 9),
        updated_at: isoOffset(0, 9),
    },
    {
        id: 'eval-008',
        registration_id: 'reg-012',
        evaluated_by_user_id: COACH_ONLY_ID,
        decision: 'pending',
        skill_score: 8,
        athleticism_score: 7,
        attitude_score: 9,
        notes: 'Technical ceiling is high. Callback candidate if roster expands.',
        category: 'overall',
        session_id: 'session-u12-soccer-initial-001',
        created_at: isoOffset(0, 9, 12),
        updated_at: isoOffset(0, 9, 12),
    },
]

export function getTryoutById(tryoutId: string): FakeTryout | undefined {
    return fakeTryouts.find((t) => t.id === tryoutId)
}

export function getTryoutsForOrg(orgId: string): FakeTryout[] {
    return fakeTryouts.filter((t) => t.org_id === orgId)
}

export function getUpcomingTryoutsForOrg(orgId: string): FakeTryout[] {
    return fakeTryouts.filter(
        (t) => t.org_id === orgId && (t.status === 'upcoming' || t.status === 'registration_open' || t.status === 'registration_closed')
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
    return fakeTryoutRegistrations.filter((r) => r.athlete_id === childId)
}

export function getConfirmedRegistrationsCount(tryoutId: string): number {
    return fakeTryoutRegistrations.filter(
        (r) => r.tryout_id === tryoutId && !['cancelled', 'withdrawn'].includes(r.status)
    ).length
}

export function getAvailableSpotsForTryout(tryoutId: string): number {
    const tryout = getTryoutById(tryoutId)
    if (!tryout) return 0
    const confirmedCount = getConfirmedRegistrationsCount(tryoutId)
    return Math.max(0, tryout.max_participants - confirmedCount)
}

export function isChildRegisteredForTryout(childId: string, tryoutId: string): boolean {
    return fakeTryoutRegistrations.some(
        (r) => r.athlete_id === childId && r.tryout_id === tryoutId && !['cancelled', 'withdrawn'].includes(r.status)
    )
}

export function getEvaluationsForRegistration(registrationId: string): FakeTryoutEvaluation[] {
    return fakeTryoutEvaluations.filter((e) => e.registration_id === registrationId)
}

export function getTryoutSessionsForTryout(tryoutId: string): FakeTryoutSession[] {
    return fakeTryoutSessions
        .filter((session) => session.tryout_id === tryoutId)
        .sort((a, b) => `${a.session_date}-${a.start_time}`.localeCompare(`${b.session_date}-${b.start_time}`))
}

export function getTryoutEvaluatorsForTryout(tryoutId: string): FakeTryoutEvaluator[] {
    return fakeTryoutEvaluators.filter((evaluator) => evaluator.tryout_id === tryoutId)
}

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
