/**
 * Fake Teams Data Module
 *
 * Provides fake data for sports, programs, levels, teams, seasons, and associations.
 * Refactored to match Organization -> Sport -> Program -> Level -> Team -> Season hierarchy.
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

import {
    Sport, Program, Level, Team, Season, TeamSeason,
    GenderCategory, LevelType
} from '../types/organization'

// ============================================================================
// Types (Extending shared types for Fake Data consistency)
// ============================================================================

export interface FakeSport extends Sport { }
export interface FakeProgram extends Program { }
export interface FakeLevel extends Level { }
export interface FakeTeam extends Team { }
export interface FakeSeason extends Season { }
export interface FakeTeamSeason extends TeamSeason { }

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

// Levels (New)
export const LEVEL_SOCCER_REC_U10_ID = 'level-soccer-rec-u10'
export const LEVEL_SOCCER_REC_U12_ID = 'level-soccer-rec-u12'
export const LEVEL_SOCCER_COMP_U14_ID = 'level-soccer-comp-u14'
export const LEVEL_BB_REC_U10_ID = 'level-bb-rec-u10'
export const LEVEL_BB_REC_U12_ID = 'level-bb-rec-u12'
export const LEVEL_BB_ELITE_U14_ID = 'level-bb-elite-u14' // Not used yet but good for completeness
export const LEVEL_VB_U10_ID = 'level-vb-u10'
export const LEVEL_BASEBALL_U8_ID = 'level-baseball-u8'
export const LEVEL_BASEBALL_U12_ID = 'level-baseball-u12'

// Teams
export const TEAM_U10_SOCCER_ID = 'team-u10-soccer-001'
export const TEAM_U12_SOCCER_ID = 'team-u12-soccer-002'
export const TEAM_U10_BASKETBALL_ID = 'team-u10-basketball-003'
export const TEAM_U12_BASKETBALL_ID = 'team-u12-basketball-004'
export const TEAM_U14_SOCCER_ELITE_ID = 'team-u14-soccer-elite-005'
export const TEAM_U10_VOLLEYBALL_ID = 'team-u10-volleyball-006'
export const TEAM_U8_BASEBALL_ID = 'team-u8-baseball-007'
export const TEAM_U12_BASEBALL_ID = 'team-u12-baseball-008'

// Seasons (Org-scoped now)
export const SEASON_SPRING_2024_ID = 'season-spring-2024'
export const SEASON_FALL_2023_ID = 'season-fall-2023'

// ============================================================================
// Reference to demo user IDs
// ============================================================================

const COACH_ONLY_ID = DEMO_USER_IDS['coach-only@example.com']
const PARENT_COACH_ID = DEMO_USER_IDS['parent-coach@example.com']

// ============================================================================
// Fake Data Arrays
// ============================================================================

export const fakeSports: FakeSport[] = [
    {
        id: SPORT_SOCCER_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Soccer',
        icon: 'sports_soccer',
        color: '#16a34a',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    },
    {
        id: SPORT_BASKETBALL_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Basketball',
        icon: 'sports_basketball',
        color: '#ea580c',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    },
    {
        id: SPORT_BASEBALL_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Baseball',
        icon: 'sports_baseball',
        color: '#dc2626',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    },
    {
        id: SPORT_VOLLEYBALL_ID,
        org_id: DEMO_ORG_A_ID,
        name: 'Volleyball',
        icon: 'sports_volleyball',
        color: '#7c3aed',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    },
]

export const fakePrograms: FakeProgram[] = [
    {
        id: PROGRAM_SOCCER_REC_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_SOCCER_ID,
        name: 'Recreational Soccer',
        description: 'Fun, skill-building soccer for all ability levels',
        gender_category: 'coed',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null,
        // Deprecated mapping
        age_min: 5,
        age_max: 14,
    },
    {
        id: PROGRAM_SOCCER_COMP_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_SOCCER_ID,
        name: 'Competitive Soccer',
        description: 'Travel teams for advanced players',
        gender_category: 'coed',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null,
        age_min: 8,
        age_max: 18,
    },
    {
        id: PROGRAM_BASKETBALL_REC_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_BASKETBALL_ID,
        name: 'Youth Basketball',
        description: 'Introduction to basketball fundamentals',
        gender_category: 'coed',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null,
        age_min: 6,
        age_max: 14,
    },
    {
        id: PROGRAM_BASKETBALL_ELITE_ID,
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_BASKETBALL_ID,
        name: 'Elite Basketball Academy',
        description: 'Advanced training for serious players',
        gender_category: 'coed',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null,
        age_min: 10,
        age_max: 18,
    },
]

export const fakeLevels: FakeLevel[] = [
    {
        id: LEVEL_SOCCER_REC_U10_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: PROGRAM_SOCCER_REC_ID,
        name: 'U10',
        level_type: 'age_based',
        description: 'Under 10',
        age_min: 8,
        age_max: 10,
        grade_min: null,
        grade_max: null,
        skill_min: null,
        skill_max: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    },
    {
        id: LEVEL_SOCCER_REC_U12_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: PROGRAM_SOCCER_REC_ID,
        name: 'U12',
        level_type: 'age_based',
        description: 'Under 12',
        age_min: 10,
        age_max: 12,
        grade_min: null,
        grade_max: null,
        skill_min: null,
        skill_max: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    },
    {
        id: LEVEL_SOCCER_COMP_U14_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: PROGRAM_SOCCER_COMP_ID,
        name: 'U14 Elite',
        level_type: 'skill_based',
        description: 'Under 14 Competitive',
        age_min: 12,
        age_max: 14,
        grade_min: null,
        grade_max: null,
        skill_min: 8,
        skill_max: 10,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    },
    {
        id: LEVEL_BB_REC_U10_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: PROGRAM_BASKETBALL_REC_ID,
        name: 'U10',
        level_type: 'age_based',
        description: 'Under 10',
        age_min: 8,
        age_max: 10,
        grade_min: null,
        grade_max: null,
        skill_min: null,
        skill_max: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    },
    {
        id: LEVEL_BB_REC_U12_ID,
        org_id: DEMO_ORG_A_ID,
        program_id: PROGRAM_BASKETBALL_REC_ID,
        name: 'U12',
        level_type: 'age_based',
        description: 'Under 12',
        age_min: 10,
        age_max: 12,
        grade_min: null,
        grade_max: null,
        skill_min: null,
        skill_max: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    },
    // For volleyball/baseball, we'll create implied programs or just attach levels if we had programs.
    // The previous fakeTeams had program_id: null for VB/Baseball.
    // To satisfy strict hierarchy, we need programs.
    // I will auto-create default programs for them here in fakePrograms?
    // The previous data has `program_id: null` for VB/Baseball.
    // I will assume for now we keep that or I'll add them.
    // Let's add them to be safe and clean.
]

// Bonus Programs for VB/Baseball to ensure integrity
const EXTRA_PROGRAMS: FakeProgram[] = [
    {
        id: 'program-vb-rec',
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_VOLLEYBALL_ID,
        name: 'Rec Volleyball',
        description: 'Recreational',
        gender_category: 'girls', // VB team was female
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    },
    {
        id: 'program-bb-rec',
        org_id: DEMO_ORG_A_ID,
        sport_id: SPORT_BASEBALL_ID,
        name: 'Rec Baseball',
        description: 'Recreational',
        gender_category: 'coed',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        deleted_at: null
    }
]
fakePrograms.push(...EXTRA_PROGRAMS)

// Bonus Levels
const EXTRA_LEVELS: FakeLevel[] = [
    {
        id: LEVEL_VB_U10_ID, org_id: DEMO_ORG_A_ID, program_id: 'program-vb-rec', name: 'U10', level_type: 'age_based', description: '', age_min: 8, age_max: 10, grade_min: null, grade_max: null, skill_min: null, skill_max: null, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z', deleted_at: null
    },
    {
        id: LEVEL_BASEBALL_U8_ID, org_id: DEMO_ORG_A_ID, program_id: 'program-bb-rec', name: 'U8', level_type: 'age_based', description: '', age_min: 6, age_max: 8, grade_min: null, grade_max: null, skill_min: null, skill_max: null, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z', deleted_at: null
    },
    {
        id: LEVEL_BASEBALL_U12_ID, org_id: DEMO_ORG_A_ID, program_id: 'program-bb-rec', name: 'U12', level_type: 'age_based', description: '', age_min: 10, age_max: 12, grade_min: null, grade_max: null, skill_min: null, skill_max: null, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z', deleted_at: null
    }
]
fakeLevels.push(...EXTRA_LEVELS)

export const fakeTeams: FakeTeam[] = [
    {
        id: TEAM_U10_SOCCER_ID, org_id: DEMO_ORG_A_ID, program_id: PROGRAM_SOCCER_REC_ID, level_id: LEVEL_SOCCER_REC_U10_ID, sport_id: SPORT_SOCCER_ID,
        name: 'U10 Lightning', max_roster_size: 15, is_active: true, created_at: '2023-08-01T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
        age_group: 'U10', gender: 'coed', skill_level: 'recreational' // Deprecated
    },
    {
        id: TEAM_U12_SOCCER_ID, org_id: DEMO_ORG_A_ID, program_id: PROGRAM_SOCCER_REC_ID, level_id: LEVEL_SOCCER_REC_U12_ID, sport_id: SPORT_SOCCER_ID,
        name: 'U12 Thunder', max_roster_size: 18, is_active: true, created_at: '2023-08-01T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
        age_group: 'U12', gender: 'coed', skill_level: 'recreational'
    },
    {
        id: TEAM_U14_SOCCER_ELITE_ID, org_id: DEMO_ORG_A_ID, program_id: PROGRAM_SOCCER_COMP_ID, level_id: LEVEL_SOCCER_COMP_U14_ID, sport_id: SPORT_SOCCER_ID,
        name: 'U14 Elite Storm', max_roster_size: 16, is_active: true, created_at: '2023-06-01T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
        age_group: 'U14', gender: 'coed', skill_level: 'elite'
    },
    {
        id: TEAM_U10_BASKETBALL_ID, org_id: DEMO_ORG_A_ID, program_id: PROGRAM_BASKETBALL_REC_ID, level_id: LEVEL_BB_REC_U10_ID, sport_id: SPORT_BASKETBALL_ID,
        name: 'U10 Hawks', max_roster_size: 12, is_active: true, created_at: '2023-09-01T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
        age_group: 'U10', gender: 'coed', skill_level: 'recreational'
    },
    {
        id: TEAM_U12_BASKETBALL_ID, org_id: DEMO_ORG_A_ID, program_id: PROGRAM_BASKETBALL_REC_ID, level_id: LEVEL_BB_REC_U12_ID, sport_id: SPORT_BASKETBALL_ID,
        name: 'U12 Eagles', max_roster_size: 12, is_active: true, created_at: '2023-09-01T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
        age_group: 'U12', gender: 'coed', skill_level: 'competitive'
    },
    {
        id: TEAM_U10_VOLLEYBALL_ID, org_id: DEMO_ORG_A_ID, program_id: 'program-vb-rec', level_id: LEVEL_VB_U10_ID, sport_id: SPORT_VOLLEYBALL_ID,
        name: 'U10 Spikers', max_roster_size: 12, is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
        age_group: 'U10', gender: 'female', skill_level: 'recreational'
    },
    {
        id: TEAM_U8_BASEBALL_ID, org_id: DEMO_ORG_A_ID, program_id: 'program-bb-rec', level_id: LEVEL_BASEBALL_U8_ID, sport_id: SPORT_BASEBALL_ID,
        name: 'U8 Cubs', max_roster_size: 14, is_active: true, created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z',
        age_group: 'U8', gender: 'coed', skill_level: 'recreational'
    },
    {
        id: TEAM_U12_BASEBALL_ID, org_id: DEMO_ORG_A_ID, program_id: 'program-bb-rec', level_id: LEVEL_BASEBALL_U12_ID, sport_id: SPORT_BASEBALL_ID,
        name: 'U12 Rangers', max_roster_size: 15, is_active: true, created_at: '2023-03-01T00:00:00Z', updated_at: '2024-01-15T00:00:00Z',
        age_group: 'U12', gender: 'male', skill_level: 'competitive'
    },
]

export const fakeSeasons: FakeSeason[] = [
    {
        id: SEASON_SPRING_2024_ID,
        org_id: DEMO_ORG_A_ID,
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
        id: SEASON_FALL_2023_ID,
        org_id: DEMO_ORG_A_ID,
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

export const fakeTeamSeasons: FakeTeamSeason[] = [
    // Link Spring 2024
    { team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, is_active: true, created_at: '...', updated_at: '...' },
    { team_id: TEAM_U12_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, is_active: true, created_at: '...', updated_at: '...' },
    { team_id: TEAM_U10_BASKETBALL_ID, season_id: SEASON_SPRING_2024_ID, is_active: true, created_at: '...', updated_at: '...' },
    { team_id: TEAM_U12_BASKETBALL_ID, season_id: SEASON_SPRING_2024_ID, is_active: true, created_at: '...', updated_at: '...' },
    { team_id: TEAM_U14_SOCCER_ELITE_ID, season_id: SEASON_SPRING_2024_ID, is_active: true, created_at: '...', updated_at: '...' },
    // Past Season
    { team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_FALL_2023_ID, is_active: false, created_at: '...', updated_at: '...' },
]

export const fakeTeamMembers: FakeTeamMember[] = [
    // Need to use new unified season IDs
    { id: 'tm-001', team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, child_id: CHILD_EMMA_JOHNSON_ID, role: 'player', status: 'active', jersey_number: '7', position: 'Forward', joined_at: '2024-02-01T00:00:00Z', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
    { id: 'tm-002', team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, child_id: CHILD_SOPHIA_CHEN_ID, role: 'captain', status: 'active', jersey_number: '10', position: 'Midfielder', joined_at: '2024-02-01T00:00:00Z', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
    { id: 'tm-003', team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, child_id: CHILD_AIDEN_PATEL_ID, role: 'player', status: 'active', jersey_number: '5', position: 'Defender', joined_at: '2024-02-05T00:00:00Z', created_at: '2024-02-05T00:00:00Z', updated_at: '2024-02-05T00:00:00Z' },

    { id: 'tm-004', team_id: TEAM_U12_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, child_id: CHILD_OLIVIA_SMITH_ID, role: 'player', status: 'active', jersey_number: '23', position: 'Goalkeeper', joined_at: '2024-02-01T00:00:00Z', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
    { id: 'tm-005', team_id: TEAM_U12_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, child_id: CHILD_MASON_RODRIGUEZ_ID, role: 'captain', status: 'active', jersey_number: '22', position: 'Forward', joined_at: '2024-02-01T00:00:00Z', created_at: '2024-02-01T00:00:00Z', updated_at: '2024-02-01T00:00:00Z' },
    { id: 'tm-006', team_id: TEAM_U12_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, child_id: CHILD_AVA_WILLIAMS_ID, role: 'player', status: 'active', jersey_number: '15', position: 'Midfielder', joined_at: '2024-02-03T00:00:00Z', created_at: '2024-02-03T00:00:00Z', updated_at: '2024-02-03T00:00:00Z' },

    { id: 'tm-007', team_id: TEAM_U10_BASKETBALL_ID, season_id: SEASON_SPRING_2024_ID, child_id: CHILD_LIAM_JOHNSON_ID, role: 'player', status: 'active', jersey_number: '12', position: 'Guard', joined_at: '2024-02-10T00:00:00Z', created_at: '2024-02-10T00:00:00Z', updated_at: '2024-02-10T00:00:00Z' },
    { id: 'tm-008', team_id: TEAM_U10_BASKETBALL_ID, season_id: SEASON_SPRING_2024_ID, child_id: CHILD_NOAH_SMITH_ID, role: 'player', status: 'active', jersey_number: '8', position: 'Forward', joined_at: '2024-02-10T00:00:00Z', created_at: '2024-02-10T00:00:00Z', updated_at: '2024-02-10T00:00:00Z' },
    { id: 'tm-009', team_id: TEAM_U10_BASKETBALL_ID, season_id: SEASON_SPRING_2024_ID, child_id: CHILD_ETHAN_WILLIAMS_ID, role: 'player', status: 'active', jersey_number: '3', position: 'Center', joined_at: '2024-02-12T00:00:00Z', created_at: '2024-02-12T00:00:00Z', updated_at: '2024-02-12T00:00:00Z' },

    { id: 'tm-010', team_id: TEAM_U12_BASKETBALL_ID, season_id: SEASON_SPRING_2024_ID, child_id: CHILD_ISABELLA_RODRIGUEZ_ID, role: 'player', status: 'active', jersey_number: '17', position: 'Guard', joined_at: '2024-02-15T00:00:00Z', created_at: '2024-02-15T00:00:00Z', updated_at: '2024-02-15T00:00:00Z' },
]

export const fakeCoachAssignments: FakeCoachAssignment[] = [
    { id: 'ca-001', team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, user_id: COACH_ONLY_ID, role: 'head_coach', created_at: '2024-02-01T00:00:00Z' },
    { id: 'ca-002', team_id: TEAM_U12_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, user_id: COACH_ONLY_ID, role: 'head_coach', created_at: '2024-02-01T00:00:00Z' },
    { id: 'ca-003', team_id: TEAM_U10_BASKETBALL_ID, season_id: SEASON_SPRING_2024_ID, user_id: PARENT_COACH_ID, role: 'head_coach', created_at: '2024-02-10T00:00:00Z' },
    { id: 'ca-004', team_id: TEAM_U12_BASKETBALL_ID, season_id: SEASON_SPRING_2024_ID, user_id: USER_COACH_MARTINEZ_ID, role: 'head_coach', created_at: '2024-02-15T00:00:00Z' },
    { id: 'ca-005', team_id: TEAM_U14_SOCCER_ELITE_ID, season_id: SEASON_SPRING_2024_ID, user_id: USER_COACH_THOMPSON_ID, role: 'head_coach', created_at: '2024-02-01T00:00:00Z' },
    { id: 'ca-006', team_id: TEAM_U10_SOCCER_ID, season_id: SEASON_SPRING_2024_ID, user_id: USER_COACH_MARTINEZ_ID, role: 'assistant_coach', created_at: '2024-02-05T00:00:00Z' },
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

export function getLevelById(levelId: string): FakeLevel | undefined {
    return fakeLevels.find((l) => l.id === levelId)
}

export function getLevelsForProgram(programId: string): FakeLevel[] {
    return fakeLevels.filter((l) => l.program_id === programId)
}

export function getSeasonById(seasonId: string): FakeSeason | undefined {
    return fakeSeasons.find((s) => s.id === seasonId)
}

export function getSeasonsForOrg(orgId: string): FakeSeason[] {
    return fakeSeasons.filter((s) => s.org_id === orgId)
}

// Updated Helper: Get seasons for a team via TeamSeasons association
export function getSeasonsForTeam(teamId: string): FakeSeason[] {
    const teamSeasonIds = fakeTeamSeasons
        .filter(ts => ts.team_id === teamId)
        .map(ts => ts.season_id)
    return fakeSeasons.filter(s => teamSeasonIds.includes(s.id))
}

export function getActiveSeasonsForTeam(teamId: string): FakeSeason[] {
    const activeSeasonIds = fakeTeamSeasons
        .filter(ts => ts.team_id === teamId && ts.is_active)
        .map(ts => ts.season_id)
    return fakeSeasons.filter(s => activeSeasonIds.includes(s.id))
}

export function getActiveSeasonForTeam(teamId: string): FakeSeason | undefined {
    const activeSeasonId = fakeTeamSeasons.find(ts => ts.team_id === teamId && ts.is_active)?.season_id
    if (!activeSeasonId) return undefined
    return fakeSeasons.find(s => s.id === activeSeasonId)
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

export function getChildTeamMemberships(): Array<{ childId: string; teamId: string }> {
    return fakeTeamMembers
        .filter((tm) => tm.status === 'active')
        .map((tm) => ({ childId: tm.child_id, teamId: tm.team_id }))
}

/**
 * Get team with full relations for display
 * Includes Level, Program, Sport, ActiveSeason
 */
export function getTeamWithDetails(teamId: string): (FakeTeam & { sport?: FakeSport; program?: FakeProgram; level?: FakeLevel; activeSeason?: FakeSeason }) | undefined {
    const team = getTeamById(teamId)
    if (!team) return undefined

    const level = getLevelById(team.level_id)

    return {
        ...team,
        sport: getSportById(team.sport_id),
        program: team.program_id ? getProgramById(team.program_id) : undefined,
        level: level,
        activeSeason: getActiveSeasonForTeam(teamId),
        seasons: getSeasonsForTeam(teamId)
    }
}
