/**
 * Fake Travel Data Module
 *
 * Provides fake data for travel plans and hotel information.
 * All travel plans are linked to Organization A teams.
 */

import { DEMO_ORG_A_ID } from '../config'
import {
    TEAM_U12_SOCCER_ID,
    TEAM_U14_SOCCER_ELITE_ID,
    SEASON_SPRING_CURRENT_ID,
} from './fakeTeams'

// ============================================================================
// Types
// ============================================================================

export type TravelPlanStatus = 'draft' | 'published' | 'cancelled'

export interface FakeTravelPlan {
    id: string
    org_id: string
    team_id: string
    season_id: string
    title: string
    location: string
    destination_city: string | null
    destination_state: string | null
    venue_name: string | null
    venue_address: string | null
    start_date: string
    end_date: string
    hotel_name: string | null
    hotel_address: string | null
    hotel_phone: string | null
    hotel_confirmation: string | null
    check_in_time: string | null
    check_out_time: string | null
    maps_url: string | null
    notes: string | null
    itinerary_file_path: string | null
    meeting_locations: MeetingLocation[] | null
    status: TravelPlanStatus
    published_at: string | null
    cancelled_at: string | null
    created_at: string
    updated_at: string
}

export interface MeetingLocation {
    name: string
    address: string
    time?: string  // Made optional to match calendar.ts
    notes?: string | null
    maps_url?: string | null
}

// ============================================================================
// Travel Plan IDs
// ============================================================================

export const TRAVEL_SPRING_CUP_ID = 'travel-spring-cup-001'
export const TRAVEL_STATE_CHAMPIONSHIP_ID = 'travel-state-championship-002'
export const TRAVEL_REGIONAL_SHOWCASE_ID = 'travel-regional-showcase-003'
export const TRAVEL_CANCELLED_ID = 'travel-cancelled-004'

// ============================================================================
// Helper for dates
// ============================================================================

const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

function addDays(date: Date, days: number): string {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result.toISOString().split('T')[0]
}

// ============================================================================
// Fake Travel Plans Data
// ============================================================================

export const fakeTravelPlans: FakeTravelPlan[] = [
    // Spring Cup Tournament - U12 Soccer (upcoming)
    {
        id: TRAVEL_SPRING_CUP_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_SOCCER_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'Spring Cup Tournament',
        location: 'San Diego, CA',
        destination_city: 'San Diego',
        destination_state: 'CA',
        venue_name: 'San Diego Sports Complex',
        venue_address: '4545 Sports Arena Blvd, San Diego, CA 92110',
        start_date: addDays(today, 10),
        end_date: addDays(today, 12),
        hotel_name: 'Courtyard by Marriott San Diego',
        hotel_address: '595 Hotel Circle South, San Diego, CA 92108',
        hotel_phone: '+1 (619) 555-1234',
        hotel_confirmation: 'RYASC-123456',
        check_in_time: '15:00',
        check_out_time: '11:00',
        maps_url: 'https://www.google.com/maps/search/?api=1&query=San+Diego+Sports+Complex',
        notes: `IMPORTANT INFORMATION FOR PARENTS:

1. Team dinner on Friday evening - 6:00 PM at hotel restaurant
2. Pool party Saturday after games (until 8 PM)
3. Breakfast included with hotel stay
4. Please pack snacks, sunscreen, and portable chairs
5. Parents responsible for their own transportation

EMERGENCY CONTACT: Coach Davis - (555) 123-4567

GAME SCHEDULE (tentative):
- Saturday 9:00 AM: Pool play game 1
- Saturday 2:00 PM: Pool play game 2
- Sunday 10:00 AM: Bracket play (if qualify)`,
        itinerary_file_path: 'travel/spring-cup-2024/itinerary.pdf',
        meeting_locations: [
            {
                name: 'Team Bus Pickup',
                address: 'Riverside Sports Complex - Parking Lot A',
                time: 'Friday 2:00 PM',
                notes: 'Bus leaves at 2:30 PM sharp. Do not be late!',
                maps_url: 'https://www.google.com/maps/search/?api=1&query=Riverside+Sports+Complex',
            },
            {
                name: 'Hotel Lobby Meeting',
                address: 'Courtyard by Marriott San Diego',
                time: 'Saturday 7:30 AM',
                notes: 'Breakfast from 6:30-7:30 AM',
                maps_url: null,
            },
        ],
        status: 'published',
        published_at: '2024-02-20T00:00:00Z',
        cancelled_at: null,
        created_at: '2024-02-15T00:00:00Z',
        updated_at: '2024-02-20T00:00:00Z',
    },

    // State Championship - U14 Elite Soccer
    {
        id: TRAVEL_STATE_CHAMPIONSHIP_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U14_SOCCER_ELITE_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'State Championship',
        location: 'Sacramento, CA',
        destination_city: 'Sacramento',
        destination_state: 'CA',
        venue_name: 'Cal Expo Sports Complex',
        venue_address: '1600 Exposition Blvd, Sacramento, CA 95815',
        start_date: addDays(today, 14),
        end_date: addDays(today, 16),
        hotel_name: 'Hilton Sacramento Arden West',
        hotel_address: '2200 Harvard St, Sacramento, CA 95815',
        hotel_phone: '+1 (916) 555-7890',
        hotel_confirmation: 'HLT-789012',
        check_in_time: '16:00',
        check_out_time: '12:00',
        maps_url: 'https://www.google.com/maps/search/?api=1&query=Cal+Expo+Sacramento',
        notes: `STATE CHAMPIONSHIP 2024

This is the biggest tournament of the season! Top 16 teams from across California.

SCHEDULE:
- Friday: Check-in and team practice at 5 PM
- Saturday: Quarter-finals (times TBD based on bracket)
- Sunday: Semi-finals and Finals

WHAT TO BRING:
- Both home AND away jerseys
- Warm-up jacket (required for walkout)
- Dress code for team dinner: Collared shirt

TEAM DINNER: Friday 7 PM - Venue TBD

Players must travel with the team. No exceptions.`,
        itinerary_file_path: 'travel/state-championship-2024/itinerary.pdf',
        meeting_locations: [
            {
                name: 'Carpool Meeting Point',
                address: 'Riverside High School - Front Parking Lot',
                time: 'Friday 1:00 PM',
                notes: 'Caravan leaves at 1:30 PM. Wear team gear.',
                maps_url: 'https://www.google.com/maps/search/?api=1&query=Riverside+High+School',
            },
        ],
        status: 'published',
        published_at: '2024-02-01T00:00:00Z',
        cancelled_at: null,
        created_at: '2024-01-25T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
    },

    // Regional Showcase - Draft (not yet published)
    {
        id: TRAVEL_REGIONAL_SHOWCASE_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U14_SOCCER_ELITE_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'Regional Showcase Cup',
        location: 'Las Vegas, NV',
        destination_city: 'Las Vegas',
        destination_state: 'NV',
        venue_name: 'Las Vegas Sports Park',
        venue_address: '7065 Arroyo Crossing Pkwy, Las Vegas, NV 89113',
        start_date: addDays(today, 30),
        end_date: addDays(today, 32),
        hotel_name: null, // Not finalized yet
        hotel_address: null,
        hotel_phone: null,
        hotel_confirmation: null,
        check_in_time: null,
        check_out_time: null,
        maps_url: null,
        notes: 'Hotel and travel details coming soon. Save the dates!',
        itinerary_file_path: null,
        meeting_locations: null,
        status: 'draft',
        published_at: null,
        cancelled_at: null,
        created_at: '2024-02-28T00:00:00Z',
        updated_at: '2024-02-28T00:00:00Z',
    },

    // Cancelled travel plan example
    {
        id: TRAVEL_CANCELLED_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_SOCCER_ID,
        season_id: SEASON_SPRING_CURRENT_ID,
        title: 'Winter Invitational',
        location: 'Phoenix, AZ',
        destination_city: 'Phoenix',
        destination_state: 'AZ',
        venue_name: 'Reach 11 Sports Complex',
        venue_address: '2425 E Deer Valley Rd, Phoenix, AZ 85024',
        start_date: addDays(today, -20),
        end_date: addDays(today, -18),
        hotel_name: 'Hampton Inn Phoenix',
        hotel_address: '1234 Example St, Phoenix, AZ 85001',
        hotel_phone: '+1 (602) 555-4567',
        hotel_confirmation: 'HAMP-456789',
        check_in_time: '15:00',
        check_out_time: '11:00',
        maps_url: null,
        notes: 'Tournament cancelled due to weather conditions.',
        itinerary_file_path: null,
        meeting_locations: null,
        status: 'cancelled',
        published_at: '2024-01-15T00:00:00Z',
        cancelled_at: addDays(today, -25),
        created_at: '2024-01-10T00:00:00Z',
        updated_at: addDays(today, -25),
    },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getTravelPlanById(planId: string): FakeTravelPlan | undefined {
    return fakeTravelPlans.find((p) => p.id === planId)
}

export function getTravelPlansForOrg(orgId: string): FakeTravelPlan[] {
    return fakeTravelPlans.filter((p) => p.org_id === orgId)
}

export function getPublishedTravelPlansForOrg(orgId: string): FakeTravelPlan[] {
    return fakeTravelPlans.filter((p) => p.org_id === orgId && p.status === 'published')
}

export function getTravelPlansForTeam(teamId: string): FakeTravelPlan[] {
    return fakeTravelPlans.filter((p) => p.team_id === teamId)
}

export function getPublishedTravelPlansForTeam(teamId: string): FakeTravelPlan[] {
    return fakeTravelPlans.filter((p) => p.team_id === teamId && p.status === 'published')
}

export function getUpcomingTravelPlans(orgId: string): FakeTravelPlan[] {
    const today = new Date().toISOString().split('T')[0]
    return fakeTravelPlans.filter(
        (p) => p.org_id === orgId && p.status === 'published' && p.start_date >= today
    )
}

export function getDraftTravelPlans(orgId: string): FakeTravelPlan[] {
    return fakeTravelPlans.filter((p) => p.org_id === orgId && p.status === 'draft')
}

export function getCancelledTravelPlans(orgId: string): FakeTravelPlan[] {
    return fakeTravelPlans.filter((p) => p.org_id === orgId && p.status === 'cancelled')
}

export function formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const yearOptions: Intl.DateTimeFormatOptions = { ...options, year: 'numeric' }

    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', yearOptions)}`
}

export function getTravelPlanWithTeamInfo(
    planId: string
): (FakeTravelPlan & { team?: { id: string; name: string } }) | undefined {
    const plan = getTravelPlanById(planId)
    if (!plan) return undefined

    // Import would create circular dependency, so we use a simple lookup
    const teamNames: Record<string, string> = {
        [TEAM_U12_SOCCER_ID]: 'U12 Thunder',
        [TEAM_U14_SOCCER_ELITE_ID]: 'U14 Elite Storm',
    }

    return {
        ...plan,
        team: { id: plan.team_id, name: teamNames[plan.team_id] ?? 'Unknown Team' },
    }
}
