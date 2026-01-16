/**
 * Fake Teams Data Module
 *
 * Provides fake data for sports, programs, teams, seasons, and team memberships.
 * All teams belong to Organization A.
 */

import { DEMO_ORG_A_ID, DEMO_USER_IDS } from '../config'
import {
    CHILD_EMMA_JOHNSON_ID,
    CHILD_LIAM_JOHNSON_ID,
    CHILD_OLIVIA_SMITH_ID,
    CHILD_NOAH_SMITH_ID,
    CHILD_AVA_WILLIAMS_ID,
    CHILD_ETHAN_WILLIAMS_ID,
    CHILD_SOPHIA_CHEN_ID,
    CHILD_MASON_RODRIGUEZ_ID,
    CHILD_ISABELLA_RODRIGUEZ_ID,
    CHILD_AIDEN_PATEL_ID,
    USER_COACH_MARTINEZ_ID,
    USER_COACH_THOMPSON_ID,
} from './fakeUsers'

// ============================================================================
// Types
// ============================================================================

export interface FakeSport {
    id: string
    org_id: string
    name: string
    icon: string
    color: string
    created_at: string
}

export interface FakeProgram {
    id: string
    org_id: string
    sport_id: string
    name: string
    description: string | null
    age_min: number | null
    age_max: number | null
    created_at: string
}

export interface FakeTeam {
    id: string
    org_id: string
    program_id: string | null
    sport_id: string
    name: string
    age_group: string | null
    gender: 'male' | 'female' | 'coed' | null
    skill_level: 'recreational' | 'competitive' | 'elite' | null
    max_roster_size: number | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface FakeSeason {
    id: string
    org_id: string
    team_id: string
    name: string
    start_date: string
    end_date: string
    is_active: boolean
    registration_open: boolean
    registration_deadline: string | null
    created_at: string
    updated_at: string
}

export interface FakeTeamMember {
    id: string
    team_id: string
    season_id: string
    child_id: string
    role: 'player' | 'captain' | 'manager'
    status: 'active' | 'inactive' | 'pending'
    jersey_number: string | null
    position: string | null
    joined_at: string
    created_at: string
    updated_at: string
}

export interface FakeCoachAssignment {
    id: string
    team_id: string
    season_id: string
    user_id: string
    role: 'head_coach' | 'assistant_coach' | 'team_manager'
    created_at: string
}

// ============================================================================
// Generated IDs
// ============================================================================

// Sports
export const SPORT_SOCCER_ID = 'sport-soccer-001'
export const SPORT_BASKETBALL_ID = 'sport-basketball-002'
export const SPORT_BASEBALL_ID = 'sport-baseball-003'
export const SPORT_VOLLEYBALL_ID = 'sport-volleyball-004'

// Programs
export const PROGRAM_SOCCER_REC_ID = 'program-soccer-rec-001'
export const PROGRAM_SOCCER_COMP_ID = 'program-soccer-comp-002'
export const PROGRAM_BASKETBALL_REC_ID = 'program-basketball-rec-003'
export const PROGRAM_BASKETBALL_ELITE_ID = 'program-basketball-elite-004'

// Teams
export const TEAM_U10_SOCCER_ID = 'team-u10-soccer-001'
export const TEAM_U12_SOCCER_ID = 'team-u12-soccer-002'
export const TEAM_U10_BASKETBALL_ID = 'team-u10-basketball-003'
export const TEAM_U12_BASKETBALL_ID = 'team-u12-basketball-004'
export const TEAM_U14_SOCCER_ELITE_ID = 'team-u14-soccer-elite-005'
export const TEAM_U10_VOLLEYBALL_ID = 'team-u10-volleyball-006'
export const TEAM_U8_BASEBALL_ID = 'team-u8-baseball-007'
export const TEAM_U12_BASEBALL_ID = 'team-u12-baseball-008'

// Seasons
export const SEASON_SPRING_2024_U10_SOCCER_ID = 'season-spring24-u10-soccer-001'
export const SEASON_SPRING_2024_U12_SOCCER_ID = 'season-spring24-u12-soccer-002'
export const SEASON_SPRING_2024_U10_BB_ID = 'season-spring24-u10-bb-003'
export const SEASON_SPRING_2024_U12_BB_ID = 'season-spring24-u12-bb-004'
export const SEASON_SPRING_2024_U14_SOCCER_ID = 'season-spring24-u14-soccer-005'
export const SEASON_FALL_2023_U10_SOCCER_ID = 'season-fall23-u10-soccer-006'

// ============================================================================
// Reference to demo user IDs
// ============================================================================

const COACH_ONLY_ID = DEMO_USER_IDS['coach-only@example.com']
const PARENT_COACH_ID = DEMO_USER_IDS['parent-coach@example.com']

// ============================================================================
// Fake Sports Data
// ============================================================================

export const fakeSports: FakeSport[] = [
    {
        id: SPORT_SOCCER_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Soccer',
        icon: 'sports_soccer',
        color: '#16a34a',
        created_at: '2023-01-01T00:00:00Z',
    },
    {
        id: SPORT_BASKETBALL_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Basketball',
        icon: 'sports_basketball',
        color: '#ea580c',
        created_at: '2023-01-01T00:00:00Z',
    },
    {
        id: SPORT_BASEBALL_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Baseball',
        icon: 'sports_baseball',
        color: '#dc2626',
        created_at: '2023-01-01T00:00:00Z',
    },
    {
        id: SPORT_VOLLEYBALL_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Volleyball',
        icon: 'sports_volleyball',
        color: '#7c3aed',
        created_at: '2023-01-01T00:00:00Z',
    },
]

// ============================================================================
// Fake Programs Data
// ============================================================================

export const fakePrograms: FakeProgram[] = [
    {
        id: PROGRAM_SOCCER_REC_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_SOCCER_ID,
        name: 'Recreational Soccer',
        description: 'Fun, skill-building soccer for all ability levels',
        age_min: 5,
        age_max: 14,
        created_at: '2023-01-01T00:00:00Z',
    },
    {
        id: PROGRAM_SOCCER_COMP_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_SOCCER_ID,
        name: 'Competitive Soccer',
        description: 'Travel teams for advanced players',
        age_min: 8,
        age_max: 18,
        created_at: '2023-01-01T00:00:00Z',
    },
    {
        id: PROGRAM_BASKETBALL_REC_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_BASKETBALL_ID,
        name: 'Youth Basketball',
        description: 'Introduction to basketball fundamentals',
        age_min: 6,
        age_max: 14,
        created_at: '2023-01-01T00:00:00Z',
    },
    {
        id: PROGRAM_BASKETBALL_ELITE_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_BASKETBALL_ID,
        name: 'Elite Basketball Academy',
        description: 'Advanced training for serious players',
        age_min: 10,
        age_max: 18,
        created_at: '2023-01-01T00:00:00Z',
    },
]

// ============================================================================
// Fake Teams Data
// ============================================================================

export const fakeTeams: FakeTeam[] = [
    {
        id: TEAM_U10_SOCCER_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: PROGRAM_SOCCER_REC_ID,
        sport_id: SPORT_SOCCER_ID,
        name: 'U10 Lightning',
        age_group: 'U10',
        gender: 'coed',
        skill_level: 'recreational',
        max_roster_size: 15,
        is_active: true,
        created_at: '2023-08-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: TEAM_U12_SOCCER_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: PROGRAM_SOCCER_REC_ID,
        sport_id: SPORT_SOCCER_ID,
        name: 'U12 Thunder',
        age_group: 'U12',
        gender: 'coed',
        skill_level: 'recreational',
        max_roster_size: 18,
        is_active: true,
        created_at: '2023-08-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: TEAM_U14_SOCCER_ELITE_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: PROGRAM_SOCCER_COMP_ID,
        sport_id: SPORT_SOCCER_ID,
        name: 'U14 Elite Storm',
        age_group: 'U14',
        gender: 'coed',
        skill_level: 'elite',
        max_roster_size: 16,
        is_active: true,
        created_at: '2023-06-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: TEAM_U10_BASKETBALL_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: PROGRAM_BASKETBALL_REC_ID,
        sport_id: SPORT_BASKETBALL_ID,
        name: 'U10 Hawks',
        age_group: 'U10',
        gender: 'coed',
        skill_level: 'recreational',
        max_roster_size: 12,
        is_active: true,
        created_at: '2023-09-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: TEAM_U12_BASKETBALL_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: PROGRAM_BASKETBALL_REC_ID,
        sport_id: SPORT_BASKETBALL_ID,
        name: 'U12 Eagles',
        age_group: 'U12',
        gender: 'coed',
        skill_level: 'competitive',
        max_roster_size: 12,
        is_active: true,
        created_at: '2023-09-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: TEAM_U10_VOLLEYBALL_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: null,
        sport_id: SPORT_VOLLEYBALL_ID,
        name: 'U10 Spikers',
        age_group: 'U10',
        gender: 'female',
        skill_level: 'recreational',
        max_roster_size: 12,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
    {
        id: TEAM_U8_BASEBALL_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: null,
        sport_id: SPORT_BASEBALL_ID,
        name: 'U8 Cubs',
        age_group: 'U8',
        gender: 'coed',
        skill_level: 'recreational',
        max_roster_size: 14,
        is_active: true,
        created_at: '2024-02-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
    },
    {
        id: TEAM_U12_BASEBALL_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: null,
        sport_id: SPORT_BASEBALL_ID,
        name: 'U12 Rangers',
        age_group: 'U12',
        gender: 'male',
        skill_level: 'competitive',
        max_roster_size: 15,
        is_active: true,
        created_at: '2023-03-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
    },
]

// ============================================================================
// Fake Seasons Data
// ============================================================================

export const fakeSeasons: FakeSeason[] = [
    // Current active seasons (Spring 2024)
    {
        id: SEASON_SPRING_2024_U10_SOCCER_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        name: 'Spring 2024',
        start_date: '2024-03-01',
        end_date: '2024-06-30',
        is_active: true,
        registration_open: false,
        registration_deadline: '2024-02-15',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
    },
    {
        id: SEASON_SPRING_2024_U12_SOCCER_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_SOCCER_ID,
        name: 'Spring 2024',
        start_date: '2024-03-01',
        end_date: '2024-06-30',
        is_active: true,
        registration_open: false,
        registration_deadline: '2024-02-15',
        created_at: '2024-01-15T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
    },
    {
        id: SEASON_SPRING_2024_U10_BB_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_BASKETBALL_ID,
        name: 'Spring 2024',
        start_date: '2024-03-01',
        end_date: '2024-05-31',
        is_active: true,
        registration_open: false,
        registration_deadline: '2024-02-20',
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
    },
    {
        id: SEASON_SPRING_2024_U12_BB_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_BASKETBALL_ID,
        name: 'Spring 2024',
        start_date: '2024-03-01',
        end_date: '2024-05-31',
        is_active: true,
        registration_open: false,
        registration_deadline: '2024-02-20',
        created_at: '2024-01-20T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
    },
    {
        id: SEASON_SPRING_2024_U14_SOCCER_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U14_SOCCER_ELITE_ID,
        name: 'Spring 2024',
        start_date: '2024-02-15',
        end_date: '2024-07-15',
        is_active: true,
        registration_open: false,
        registration_deadline: '2024-01-31',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-15T00:00:00Z',
    },
    // Past season (Fall 2023)
    {
        id: SEASON_FALL_2023_U10_SOCCER_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        name: 'Fall 2023',
        start_date: '2023-09-01',
        end_date: '2023-12-15',
        is_active: false,
        registration_open: false,
        registration_deadline: '2023-08-15',
        created_at: '2023-07-01T00:00:00Z',
        updated_at: '2023-12-15T00:00:00Z',
    },
]

// ============================================================================
// Fake Team Members Data
// ============================================================================

export const fakeTeamMembers: FakeTeamMember[] = [
    // U10 Soccer - Spring 2024
    { id: 'tm-001', team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_U10_SOCCER_ID, child_id: CHILD_EMMA_JOHNSON_ID, role: 'player', status: 'active', jersey_number: '7', position: 'Forward', joined_at: '2024-02-01T00:00:00Z', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
    { id: 'tm-002', team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_U10_SOCCER_ID, child_id: CHILD_SOPHIA_CHEN_ID, role: 'captain', status: 'active', jersey_number: '10', position: 'Midfielder', joined_at: '2024-02-01T00:00:00Z', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
    { id: 'tm-003', team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_U10_SOCCER_ID, child_id: CHILD_AIDEN_PATEL_ID, role: 'player', status: 'active', jersey_number: '5', position: 'Defender', joined_at: '2024-02-05T00:00:00Z', created_at: '2024-02-05T00:00:00Z', updated_at: '2024-02-05T00:00:00Z' },

    // U12 Soccer - Spring 2024
    { id: 'tm-004', team_id: TEAM_U12_SOCCER_ID, season_id: SEASON_SPRING_2024_U12_SOCCER_ID, child_id: CHILD_OLIVIA_SMITH_ID, role: 'player', status: 'active', jersey_number: '23', position: 'Goalkeeper', joined_at: '2024-02-01T00:00:00Z', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
    { id: 'tm-005', team_id: TEAM_U12_SOCCER_ID, season_id: SEASON_SPRING_2024_U12_SOCCER_ID, child_id: CHILD_MASON_RODRIGUEZ_ID, role: 'captain', status: 'active', jersey_number: '22', position: 'Forward', joined_at: '2024-02-01T00:00:00Z', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
    { id: 'tm-006', team_id: TEAM_U12_SOCCER_ID, season_id: SEASON_SPRING_2024_U12_SOCCER_ID, child_id: CHILD_AVA_WILLIAMS_ID, role: 'player', status: 'active', jersey_number: '15', position: 'Midfielder', joined_at: '2024-02-03T00:00:00Z', created_at: '2024-02-03T00:00:00Z', updated_at: '2024-02-03T00:00:00Z' },

    // U10 Basketball - Spring 2024
    { id: 'tm-007', team_id: TEAM_U10_BASKETBALL_ID, season_id: SEASON_SPRING_2024_U10_BB_ID, child_id: CHILD_LIAM_JOHNSON_ID, role: 'player', status: 'active', jersey_number: '12', position: 'Guard', joined_at: '2024-02-10T00:00:00Z', created_at: '2024-02-10T00:00:00Z', updated_at: '2024-02-10T00:00:00Z' },
    { id: 'tm-008', team_id: TEAM_U10_BASKETBALL_ID, season_id: SEASON_SPRING_2024_U10_BB_ID, child_id: CHILD_NOAH_SMITH_ID, role: 'player', status: 'active', jersey_number: '8', position: 'Forward', joined_at: '2024-02-10T00:00:00Z', created_at: '2024-02-10T00:00:00Z', updated_at: '2024-02-10T00:00:00Z' },
    { id: 'tm-009', team_id: TEAM_U10_BASKETBALL_ID, season_id: SEASON_SPRING_2024_U10_BB_ID, child_id: CHILD_ETHAN_WILLIAMS_ID, role: 'player', status: 'active', jersey_number: '3', position: 'Center', joined_at: '2024-02-12T00:00:00Z', created_at: '2024-02-12T00:00:00Z', updated_at: '2024-02-12T00:00:00Z' },

    // U12 Basketball - Spring 2024
    { id: 'tm-010', team_id: TEAM_U12_BASKETBALL_ID, season_id: SEASON_SPRING_2024_U12_BB_ID, child_id: CHILD_ISABELLA_RODRIGUEZ_ID, role: 'player', status: 'active', jersey_number: '17', position: 'Guard', joined_at: '2024-02-15T00:00:00Z', created_at: '2024-02-15T00:00:00Z', updated_at: '2024-02-15T00:00:00Z' },
]

// ============================================================================
// Fake Coach Assignments Data
// ============================================================================

export const fakeCoachAssignments: FakeCoachAssignment[] = [
    // coach-only@example.com coaches U10 Soccer and U12 Soccer
    { id: 'ca-001', team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_U10_SOCCER_ID, user_id: COACH_ONLY_ID, role: 'head_coach', created_at: '2024-02-01T00:00:00Z' },
    { id: 'ca-002', team_id: TEAM_U12_SOCCER_ID, season_id: SEASON_SPRING_2024_U12_SOCCER_ID, user_id: COACH_ONLY_ID, role: 'head_coach', created_at: '2024-02-01T00:00:00Z' },

    // parent-coach@example.com coaches U10 Basketball
    { id: 'ca-003', team_id: TEAM_U10_BASKETBALL_ID, season_id: SEASON_SPRING_2024_U10_BB_ID, user_id: PARENT_COACH_ID, role: 'head_coach', created_at: '2024-02-10T00:00:00Z' },

    // Other coaches
    { id: 'ca-004', team_id: TEAM_U12_BASKETBALL_ID, season_id: SEASON_SPRING_2024_U12_BB_ID, user_id: USER_COACH_MARTINEZ_ID, role: 'head_coach', created_at: '2024-02-15T00:00:00Z' },
    { id: 'ca-005', team_id: TEAM_U14_SOCCER_ELITE_ID, season_id: SEASON_SPRING_2024_U14_SOCCER_ID, user_id: USER_COACH_THOMPSON_ID, role: 'head_coach', created_at: '2024-02-01T00:00:00Z' },
    { id: 'ca-006', team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_U10_SOCCER_ID, user_id: USER_COACH_MARTINEZ_ID, role: 'assistant_coach', created_at: '2024-02-05T00:00:00Z' },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getTeamById(teamId: string): FakeTeam | undefined {
    return fakeTeams.find((t) => t.id === teamId)
}

export function getTeamsForOrg(orgId: string): FakeTeam[] {
    return fakeTeams.filter((t) => t.org_id === orgId)
}

export function getActiveTeamsForOrg(orgId: string): FakeTeam[] {
    return fakeTeams.filter((t) => t.org_id === orgId && t.is_active)
}

export function getTeamsForSport(sportId: string): FakeTeam[] {
    return fakeTeams.filter((t) => t.sport_id === sportId)
}

export function getSportById(sportId: string): FakeSport | undefined {
    return fakeSports.find((s) => s.id === sportId)
}

export function getSportsForOrg(orgId: string): FakeSport[] {
    return fakeSports.filter((s) => s.org_id === orgId)
}

export function getProgramById(programId: string): FakeProgram | undefined {
    return fakePrograms.find((p) => p.id === programId)
}

export function getProgramsForOrg(orgId: string): FakeProgram[] {
    return fakePrograms.filter((p) => p.org_id === orgId)
}

export function getSeasonById(seasonId: string): FakeSeason | undefined {
    return fakeSeasons.find((s) => s.id === seasonId)
}

export function getSeasonsForTeam(teamId: string): FakeSeason[] {
    return fakeSeasons.filter((s) => s.team_id === teamId)
}

export function getActiveSeasonsForTeam(teamId: string): FakeSeason[] {
    return fakeSeasons.filter((s) => s.team_id === teamId && s.is_active)
}

export function getActiveSeasonForTeam(teamId: string): FakeSeason | undefined {
    return fakeSeasons.find((s) => s.team_id === teamId && s.is_active)
}

export function getTeamMembersForSeason(teamId: string, seasonId: string): FakeTeamMember[] {
    return fakeTeamMembers.filter((tm) => tm.team_id === teamId && tm.season_id === seasonId)
}

export function getTeamMembersForChild(childId: string): FakeTeamMember[] {
    return fakeTeamMembers.filter((tm) => tm.child_id === childId)
}

export function getActiveTeamMembershipsForChild(childId: string): FakeTeamMember[] {
    return fakeTeamMembers.filter((tm) => tm.child_id === childId && tm.status === 'active')
}

export function getCoachAssignmentsForUser(userId: string): FakeCoachAssignment[] {
    return fakeCoachAssignments.filter((ca) => ca.user_id === userId)
}

export function getCoachAssignmentsForTeam(teamId: string, seasonId: string): FakeCoachAssignment[] {
    return fakeCoachAssignments.filter((ca) => ca.team_id === teamId && ca.season_id === seasonId)
}

export function getTeamIdsForCoach(userId: string): string[] {
    return [...new Set(fakeCoachAssignments.filter((ca) => ca.user_id === userId).map((ca) => ca.team_id))]
}

export function isUserCoachOfTeam(userId: string, teamId: string): boolean {
    return fakeCoachAssignments.some((ca) => ca.user_id === userId && ca.team_id === teamId)
}

/**
 * Get child-to-team memberships (for filtering events)
 */
export function getChildTeamMemberships(): Array<{ childId: string; teamId: string }> {
    return fakeTeamMembers
        .filter((tm) => tm.status === 'active')
        .map((tm) => ({ childId: tm.child_id, teamId: tm.team_id }))
}

/**
 * Get team with full relations for display
 */
export function getTeamWithDetails(teamId: string): (FakeTeam & { sport?: FakeSport; program?: FakeProgram; activeSeason?: FakeSeason }) | undefined {
    const team = getTeamById(teamId)
    if (!team) return undefined

    return {
        ...team,
        sport: getSportById(team.sport_id),
        program: team.program_id ? getProgramById(team.program_id) : undefined,
        activeSeason: getActiveSeasonForTeam(teamId),
    }
}
