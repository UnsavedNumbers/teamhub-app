/**
 * Fake Events Data Module
 *
 * Provides fake data for calendar events, RSVPs, and event locations.
 * Events are linked to teams and seasons from fakeTeams.
 */

import { DEMO_ORG_A_ID } from '../config'
import type { EventType, RSVPStatus, CalendarEvent, EventLocation, EventRSVP } from '../../types/calendar'
import {
    TEAM_U10_SOCCER_ID,
    TEAM_U12_SOCCER_ID,
    TEAM_U10_BASKETBALL_ID,
    TEAM_U12_BASKETBALL_ID,
    TEAM_U14_SOCCER_ELITE_ID,
    SEASON_SPRING_CURRENT_ID,
} from './fakeTeams'

// Dynamic year helpers
const getCurrentYear = () => new Date().getFullYear()
const getSpringSeasonName = () => `Spring ${getCurrentYear()}`

// Helper functions for date generation relative to current year
const getDateInCurrentYear = (month: number, day: number): string => {
    const year = getCurrentYear()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`
}

import {
    CHILD_EMMA_JOHNSON_ID,
    CHILD_LIAM_JOHNSON_ID,
    CHILD_OLIVIA_SMITH_ID,
    CHILD_SOPHIA_CHEN_ID,
    CHILD_MASON_RODRIGUEZ_ID,
    CHILD_AVA_WILLIAMS_ID,
    CHILD_NOAH_SMITH_ID,
    CHILD_AIDEN_PATEL_ID,
    CHILD_ETHAN_WILLIAMS_ID,
    CHILD_ISABELLA_RODRIGUEZ_ID,
} from './fakeUsers'

// ============================================================================
// Helper Functions for Date Generation
// ============================================================================

const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

function addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

function setTime(date: Date, hours: number, minutes: number): string {
    const result = new Date(date)
    result.setHours(hours, minutes, 0, 0)
    return result.toISOString()
}

// ============================================================================
// Event IDs
// ============================================================================

export const EVENT_U10_SOCCER_PRACTICE_1_ID = 'event-u10-soccer-practice-001'
export const EVENT_U10_SOCCER_PRACTICE_2_ID = 'event-u10-soccer-practice-002'
export const EVENT_U10_SOCCER_GAME_1_ID = 'event-u10-soccer-game-001'
export const EVENT_U12_SOCCER_PRACTICE_1_ID = 'event-u12-soccer-practice-001'
export const EVENT_U12_SOCCER_TOURNAMENT_ID = 'event-u12-soccer-tournament-001'
export const EVENT_U10_BB_PRACTICE_1_ID = 'event-u10-bb-practice-001'
export const EVENT_U10_BB_GAME_1_ID = 'event-u10-bb-game-001'
export const EVENT_U12_BB_PRACTICE_1_ID = 'event-u12-bb-practice-001'
export const EVENT_U14_SOCCER_TRAVEL_ID = 'event-u14-soccer-travel-001'
export const EVENT_TEAM_MEETING_ID = 'event-team-meeting-001'
export const EVENT_CANCELLED_ID = 'event-cancelled-001'

// ============================================================================
// Fake Events Data
// ============================================================================

export const fakeEvents: CalendarEvent[] = [
    // U10 Soccer - Practice Today
    {
        id: EVENT_U10_SOCCER_PRACTICE_1_ID,
        team_id: TEAM_U10_SOCCER_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'U10 Soccer Practice',
        type: 'practice' as EventType,
        start_time: setTime(today, 17, 0), // 5:00 PM today
        end_time: setTime(today, 18, 30), // 6:30 PM today
        arrival_time: setTime(today, 16, 45), // 4:45 PM
        timezone: 'America/New_York',
        location: 'Riverside Sports Complex - Field 4',
        notes: 'Focus on passing drills and team formations. Bring plenty of water.',
        uniform_notes: 'Practice jersey (any color)',
        equipment_notes: 'Shin guards, cleats, water bottle',
        weather_dependent: true,
        external_link: null,
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: getDateInCurrentYear(3, 1),
        updated_at: getDateInCurrentYear(3, 1),
        team: { id: TEAM_U10_SOCCER_ID, name: 'U10 Lightning', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
    // U10 Soccer - Practice in 2 days
    {
        id: EVENT_U10_SOCCER_PRACTICE_2_ID,
        team_id: TEAM_U10_SOCCER_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'U10 Soccer Practice',
        type: 'practice' as EventType,
        start_time: setTime(addDays(today, 2), 17, 0),
        end_time: setTime(addDays(today, 2), 18, 30),
        arrival_time: setTime(addDays(today, 2), 16, 45),
        timezone: 'America/New_York',
        location: 'Riverside Sports Complex - Field 4',
        notes: 'Scrimmage practice. Split into two teams.',
        uniform_notes: 'Practice jersey',
        equipment_notes: 'Shin guards, cleats',
        weather_dependent: true,
        external_link: null,
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: getDateInCurrentYear(3, 1),
        updated_at: getDateInCurrentYear(3, 1),
        team: { id: TEAM_U10_SOCCER_ID, name: 'U10 Lightning', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
    // U10 Soccer - Game this weekend
    {
        id: EVENT_U10_SOCCER_GAME_1_ID,
        team_id: TEAM_U10_SOCCER_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'Game vs. Eastside Eagles',
        type: 'game' as EventType,
        start_time: setTime(addDays(today, 5), 10, 0), // Saturday 10 AM
        end_time: setTime(addDays(today, 5), 11, 30),
        arrival_time: setTime(addDays(today, 5), 9, 30),
        timezone: 'America/New_York',
        location: 'Eastside Park - Field 2',
        notes: 'Home game for Eastside. Park in the north lot. Concessions available.',
        uniform_notes: 'Home jersey (blue), white shorts, blue socks',
        equipment_notes: 'Shin guards, cleats, water bottle',
        weather_dependent: true,
        external_link: null,
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: getDateInCurrentYear(3, 1),
        updated_at: getDateInCurrentYear(3, 1),
        team: { id: TEAM_U10_SOCCER_ID, name: 'U10 Lightning', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
    // U12 Soccer - Practice tomorrow
    {
        id: EVENT_U12_SOCCER_PRACTICE_1_ID,
        team_id: TEAM_U12_SOCCER_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'U12 Soccer Practice',
        type: 'practice' as EventType,
        start_time: setTime(addDays(today, 1), 18, 0),
        end_time: setTime(addDays(today, 1), 19, 30),
        arrival_time: setTime(addDays(today, 1), 17, 45),
        timezone: 'America/New_York',
        location: 'Riverside Sports Complex - Field 3',
        notes: 'Working on defensive formations.',
        uniform_notes: 'Practice jersey',
        equipment_notes: 'Shin guards, cleats, water bottle',
        weather_dependent: true,
        external_link: null,
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: getDateInCurrentYear(3, 1),
        updated_at: getDateInCurrentYear(3, 1),
        team: { id: TEAM_U12_SOCCER_ID, name: 'U12 Thunder', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
    // U12 Soccer - Tournament next week
    {
        id: EVENT_U12_SOCCER_TOURNAMENT_ID,
        team_id: TEAM_U12_SOCCER_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'Spring Cup Tournament',
        type: 'tournament' as EventType,
        start_time: setTime(addDays(today, 10), 8, 0),
        end_time: setTime(addDays(today, 10), 17, 0),
        arrival_time: setTime(addDays(today, 10), 7, 30),
        timezone: 'America/New_York',
        location: 'Regional Sports Park',
        notes: 'All-day tournament. Multiple games. Pack lunch and snacks. See travel plan for hotel details.',
        uniform_notes: 'Both home and away jerseys (TBD based on matchups)',
        equipment_notes: 'Full kit, extra socks, sunscreen, chair/canopy recommended',
        weather_dependent: true,
        external_link: 'https://springcupsoccer.com/schedule',
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: '2024-02-15T00:00:00Z',
        updated_at: '2024-02-15T00:00:00Z',
        team: { id: TEAM_U12_SOCCER_ID, name: 'U12 Thunder', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
    // U10 Basketball - Practice
    {
        id: EVENT_U10_BB_PRACTICE_1_ID,
        team_id: TEAM_U10_BASKETBALL_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'U10 Hawks Practice',
        type: 'practice' as EventType,
        start_time: setTime(addDays(today, 1), 16, 30),
        end_time: setTime(addDays(today, 1), 18, 0),
        arrival_time: setTime(addDays(today, 1), 16, 15),
        timezone: 'America/New_York',
        location: 'Riverside Community Center - Gym A',
        notes: 'Focusing on dribbling and basic plays.',
        uniform_notes: 'Practice jersey and shorts',
        equipment_notes: 'Basketball shoes, water bottle',
        weather_dependent: false,
        external_link: null,
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: getDateInCurrentYear(3, 1),
        updated_at: getDateInCurrentYear(3, 1),
        team: { id: TEAM_U10_BASKETBALL_ID, name: 'U10 Hawks', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
    // U10 Basketball - Game
    {
        id: EVENT_U10_BB_GAME_1_ID,
        team_id: TEAM_U10_BASKETBALL_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'Game vs. Valley Vipers',
        type: 'game' as EventType,
        start_time: setTime(addDays(today, 6), 14, 0), // Sunday 2 PM
        end_time: setTime(addDays(today, 6), 15, 30),
        arrival_time: setTime(addDays(today, 6), 13, 30),
        timezone: 'America/New_York',
        location: 'Valley Recreation Center',
        notes: 'Regular season game. Playoffs seeding depends on this game!',
        uniform_notes: 'Away jersey (white)',
        equipment_notes: 'Basketball shoes',
        weather_dependent: false,
        external_link: null,
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: getDateInCurrentYear(3, 1),
        updated_at: getDateInCurrentYear(3, 1),
        team: { id: TEAM_U10_BASKETBALL_ID, name: 'U10 Hawks', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
    // U12 Basketball - Practice
    {
        id: EVENT_U12_BB_PRACTICE_1_ID,
        team_id: TEAM_U12_BASKETBALL_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'U12 Eagles Practice',
        type: 'practice' as EventType,
        start_time: setTime(addDays(today, 3), 17, 0),
        end_time: setTime(addDays(today, 3), 18, 30),
        arrival_time: setTime(addDays(today, 3), 16, 45),
        timezone: 'America/New_York',
        location: 'Riverside Community Center - Gym B',
        notes: 'Conditioning and shooting drills.',
        uniform_notes: 'Practice gear',
        equipment_notes: 'Basketball shoes, water bottle',
        weather_dependent: false,
        external_link: null,
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: getDateInCurrentYear(3, 1),
        updated_at: getDateInCurrentYear(3, 1),
        team: { id: TEAM_U12_BASKETBALL_ID, name: 'U12 Eagles', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
    // U14 Elite Soccer - Travel event
    {
        id: EVENT_U14_SOCCER_TRAVEL_ID,
        team_id: TEAM_U14_SOCCER_ELITE_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'State Championship - Travel',
        type: 'travel' as EventType,
        start_time: setTime(addDays(today, 14), 6, 0),
        end_time: setTime(addDays(today, 16), 20, 0),
        arrival_time: setTime(addDays(today, 14), 5, 30),
        timezone: 'America/New_York',
        location: 'State Sports Complex, Sacramento',
        notes: 'Three-day tournament. See travel plan for all details including hotel.',
        uniform_notes: 'Full kit, both jerseys, warmup jacket',
        equipment_notes: 'Everything for 3 days',
        weather_dependent: true,
        external_link: 'https://statechampionship.org',
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: getDateInCurrentYear(2, 1),
        updated_at: getDateInCurrentYear(2, 1),
        team: { id: TEAM_U14_SOCCER_ELITE_ID, name: 'U14 Elite Storm', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
    // Team Meeting
    {
        id: EVENT_TEAM_MEETING_ID,
        team_id: TEAM_U10_SOCCER_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'Parent Meeting - Season Overview',
        type: 'meeting' as EventType,
        start_time: setTime(addDays(today, 7), 19, 0),
        end_time: setTime(addDays(today, 7), 20, 0),
        arrival_time: null,
        timezone: 'America/New_York',
        location: 'Riverside Community Center - Room 201',
        notes: 'Mandatory parent meeting to discuss season schedule, volunteering, and fundraising.',
        uniform_notes: null,
        equipment_notes: null,
        weather_dependent: false,
        external_link: null,
        is_cancelled: false,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: getDateInCurrentYear(3, 1),
        updated_at: getDateInCurrentYear(3, 1),
        team: { id: TEAM_U10_SOCCER_ID, name: 'U10 Lightning', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
    // Cancelled Event
    {
        id: EVENT_CANCELLED_ID,
        team_id: TEAM_U10_SOCCER_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'U10 Soccer Practice (CANCELLED)',
        type: 'practice' as EventType,
        start_time: setTime(addDays(today, -2), 17, 0), // 2 days ago
        end_time: setTime(addDays(today, -2), 18, 30),
        arrival_time: setTime(addDays(today, -2), 16, 45),
        timezone: 'America/New_York',
        location: 'Riverside Sports Complex - Field 4',
        notes: 'Practice was cancelled due to weather.',
        uniform_notes: 'Practice jersey',
        equipment_notes: 'Shin guards, cleats',
        weather_dependent: true,
        external_link: null,
        is_cancelled: true,
        cancellation_reason: 'Severe thunderstorm warning',
        cancelled_at: addDays(today, -2).toISOString(),
        cancelled_by_user_id: null,
        created_by_user_id: null,
        created_at: '2024-03-01T00:00:00Z',
        updated_at: addDays(today, -2).toISOString(),
        team: { id: TEAM_U10_SOCCER_ID, name: 'U10 Lightning', org_id: DEMO_ORG_A_ID },
        season: { id: SEASON_SPRING_CURRENT_ID, name: getSpringSeasonName() },
    },
]

// ============================================================================
// Fake Event Locations
// ============================================================================

export const fakeEventLocations: EventLocation[] = [
    {
        id: 'loc-001',
        event_id: EVENT_U10_SOCCER_PRACTICE_1_ID,
        venue_name: 'Riverside Sports Complex',
        address_line1: '1234 Sports Complex Dr',
        address_line2: 'Field 4',
        city: 'Riverside',
        state: 'CA',
        postal_code: '92501',
        place_id: null,
        country: 'US',
        latitude: 33.9533,
        longitude: -117.3962,
        is_tbd: false,
        is_virtual: false,
        virtual_link: null,
        created_at: getDateInCurrentYear(3, 1),
        updated_at: getDateInCurrentYear(3, 1),
    },
    {
        id: 'loc-002',
        event_id: EVENT_U10_SOCCER_GAME_1_ID,
        venue_name: 'Eastside Park',
        address_line1: '500 Eastside Ave',
        address_line2: 'Field 2',
        city: 'Riverside',
        state: 'CA',
        postal_code: '92506',
        place_id: null,
        country: 'US',
        latitude: 33.9672,
        longitude: -117.3754,
        is_tbd: false,
        is_virtual: false,
        virtual_link: null,
        created_at: getDateInCurrentYear(3, 1),
        updated_at: getDateInCurrentYear(3, 1),
    },
]

// ============================================================================
// Fake RSVPs Data
// ============================================================================

export const fakeEventRSVPs: EventRSVP[] = [
    // U10 Soccer Practice 1 - RSVPs
    { id: 'rsvp-001', event_id: EVENT_U10_SOCCER_PRACTICE_1_ID, child_id: CHILD_EMMA_JOHNSON_ID, status: 'going' as RSVPStatus, responded_at: '2024-03-01T10:00:00Z', responded_by_user_id: null, note: null, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T10:00:00Z', child: { id: CHILD_EMMA_JOHNSON_ID, first_name: 'Emma', last_name: 'Johnson' } },
    { id: 'rsvp-002', event_id: EVENT_U10_SOCCER_PRACTICE_1_ID, child_id: CHILD_SOPHIA_CHEN_ID, status: 'going' as RSVPStatus, responded_at: '2024-03-01T11:00:00Z', responded_by_user_id: null, note: null, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T11:00:00Z', child: { id: CHILD_SOPHIA_CHEN_ID, first_name: 'Sophia', last_name: 'Chen' } },
    { id: 'rsvp-003', event_id: EVENT_U10_SOCCER_PRACTICE_1_ID, child_id: CHILD_AIDEN_PATEL_ID, status: 'late' as RSVPStatus, responded_at: '2024-03-01T12:00:00Z', responded_by_user_id: null, note: 'Will arrive 15 min late from school pickup', created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T12:00:00Z', child: { id: CHILD_AIDEN_PATEL_ID, first_name: 'Aiden', last_name: 'Patel' } },

    // U10 Soccer Game 1 - RSVPs
    { id: 'rsvp-004', event_id: EVENT_U10_SOCCER_GAME_1_ID, child_id: CHILD_EMMA_JOHNSON_ID, status: 'going' as RSVPStatus, responded_at: '2024-03-02T10:00:00Z', responded_by_user_id: null, note: null, created_at: '2024-03-02T00:00:00Z', updated_at: '2024-03-02T10:00:00Z', child: { id: CHILD_EMMA_JOHNSON_ID, first_name: 'Emma', last_name: 'Johnson' } },
    { id: 'rsvp-005', event_id: EVENT_U10_SOCCER_GAME_1_ID, child_id: CHILD_SOPHIA_CHEN_ID, status: 'unknown' as RSVPStatus, responded_at: null, responded_by_user_id: null, note: null, created_at: '2024-03-02T00:00:00Z', updated_at: '2024-03-02T00:00:00Z', child: { id: CHILD_SOPHIA_CHEN_ID, first_name: 'Sophia', last_name: 'Chen' } },
    { id: 'rsvp-006', event_id: EVENT_U10_SOCCER_GAME_1_ID, child_id: CHILD_AIDEN_PATEL_ID, status: 'not_going' as RSVPStatus, responded_at: '2024-03-02T14:00:00Z', responded_by_user_id: null, note: 'Family commitment - out of town', created_at: '2024-03-02T00:00:00Z', updated_at: '2024-03-02T14:00:00Z', child: { id: CHILD_AIDEN_PATEL_ID, first_name: 'Aiden', last_name: 'Patel' } },

    // U12 Soccer Practice - RSVPs
    { id: 'rsvp-007', event_id: EVENT_U12_SOCCER_PRACTICE_1_ID, child_id: CHILD_OLIVIA_SMITH_ID, status: 'going' as RSVPStatus, responded_at: '2024-03-01T09:00:00Z', responded_by_user_id: null, note: null, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T09:00:00Z', child: { id: CHILD_OLIVIA_SMITH_ID, first_name: 'Olivia', last_name: 'Smith' } },
    { id: 'rsvp-008', event_id: EVENT_U12_SOCCER_PRACTICE_1_ID, child_id: CHILD_MASON_RODRIGUEZ_ID, status: 'going' as RSVPStatus, responded_at: '2024-03-01T09:30:00Z', responded_by_user_id: null, note: null, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T09:30:00Z', child: { id: CHILD_MASON_RODRIGUEZ_ID, first_name: 'Mason', last_name: 'Rodriguez' } },
    { id: 'rsvp-009', event_id: EVENT_U12_SOCCER_PRACTICE_1_ID, child_id: CHILD_AVA_WILLIAMS_ID, status: 'going' as RSVPStatus, responded_at: '2024-03-01T10:00:00Z', responded_by_user_id: null, note: null, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T10:00:00Z', child: { id: CHILD_AVA_WILLIAMS_ID, first_name: 'Ava', last_name: 'Williams' } },

    // U10 Basketball Practice - RSVPs
    { id: 'rsvp-010', event_id: EVENT_U10_BB_PRACTICE_1_ID, child_id: CHILD_LIAM_JOHNSON_ID, status: 'going' as RSVPStatus, responded_at: '2024-03-01T08:00:00Z', responded_by_user_id: null, note: null, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T08:00:00Z', child: { id: CHILD_LIAM_JOHNSON_ID, first_name: 'Liam', last_name: 'Johnson' } },
    { id: 'rsvp-011', event_id: EVENT_U10_BB_PRACTICE_1_ID, child_id: CHILD_NOAH_SMITH_ID, status: 'going' as RSVPStatus, responded_at: '2024-03-01T08:30:00Z', responded_by_user_id: null, note: null, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T08:30:00Z', child: { id: CHILD_NOAH_SMITH_ID, first_name: 'Noah', last_name: 'Smith' } },
    { id: 'rsvp-012', event_id: EVENT_U10_BB_PRACTICE_1_ID, child_id: CHILD_ETHAN_WILLIAMS_ID, status: 'unknown' as RSVPStatus, responded_at: null, responded_by_user_id: null, note: null, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T00:00:00Z', child: { id: CHILD_ETHAN_WILLIAMS_ID, first_name: 'Ethan', last_name: 'Williams' } },

    // U10 Basketball Game - RSVPs
    { id: 'rsvp-013', event_id: EVENT_U10_BB_GAME_1_ID, child_id: CHILD_LIAM_JOHNSON_ID, status: 'going' as RSVPStatus, responded_at: '2024-03-02T09:00:00Z', responded_by_user_id: null, note: null, created_at: '2024-03-02T00:00:00Z', updated_at: '2024-03-02T09:00:00Z', child: { id: CHILD_LIAM_JOHNSON_ID, first_name: 'Liam', last_name: 'Johnson' } },

    // U12 Basketball Practice - RSVPs
    { id: 'rsvp-014', event_id: EVENT_U12_BB_PRACTICE_1_ID, child_id: CHILD_ISABELLA_RODRIGUEZ_ID, status: 'going' as RSVPStatus, responded_at: '2024-03-01T07:00:00Z', responded_by_user_id: null, note: null, created_at: '2024-03-01T00:00:00Z', updated_at: '2024-03-01T07:00:00Z', child: { id: CHILD_ISABELLA_RODRIGUEZ_ID, first_name: 'Isabella', last_name: 'Rodriguez' } },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getEventById(eventId: string): CalendarEvent | undefined {
    return fakeEvents.find((e) => e.id === eventId)
}

export function getEventsForTeam(teamId: string): CalendarEvent[] {
    return fakeEvents.filter((e) => e.team_id === teamId)
}

export function getEventsForSeason(seasonId: string): CalendarEvent[] {
    return fakeEvents.filter((e) => e.season_id === seasonId)
}

export function getUpcomingEvents(limit?: number): CalendarEvent[] {
    const now = new Date()
    const upcoming = fakeEvents
        .filter((e) => new Date(e.start_time) >= now && !e.is_cancelled)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    return limit ? upcoming.slice(0, limit) : upcoming
}

export function getPastEvents(limit?: number): CalendarEvent[] {
    const now = new Date()
    const past = fakeEvents
        .filter((e) => new Date(e.start_time) < now)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

    return limit ? past.slice(0, limit) : past
}

export function getEventsInDateRange(startDate: Date, endDate: Date): CalendarEvent[] {
    return fakeEvents.filter((e) => {
        const eventStart = new Date(e.start_time)
        return eventStart >= startDate && eventStart <= endDate
    })
}

export function getEventLocation(eventId: string): EventLocation | undefined {
    return fakeEventLocations.find((l) => l.event_id === eventId)
}

export function getRSVPsForEvent(eventId: string): EventRSVP[] {
    return fakeEventRSVPs.filter((r) => r.event_id === eventId)
}

export function getRSVPsForChild(childId: string): EventRSVP[] {
    return fakeEventRSVPs.filter((r) => r.child_id === childId)
}

export function getChildRSVPForEvent(eventId: string, childId: string): EventRSVP | undefined {
    return fakeEventRSVPs.find((r) => r.event_id === eventId && r.child_id === childId)
}

export function getEventsForChildTeams(childId: string, teamMemberships: Array<{ childId: string; teamId: string }>): CalendarEvent[] {
    const teamIds = teamMemberships.filter((m) => m.childId === childId).map((m) => m.teamId)
    return fakeEvents.filter((e) => teamIds.includes(e.team_id))
}

export function getAllEvents(): CalendarEvent[] {
    return [...fakeEvents]
}

export function getEventsCount(): number {
    return fakeEvents.length
}
