/**
 * Fake Messages Data Module
 *
 * Provides fake data for announcements, messages, and notifications.
 * All messages are linked to Organization A.
 */

import { DEMO_ORG_A_ID, DEMO_USER_IDS } from '../config'
import type {
    NotificationAction,
    NotificationEntityType,
    NotificationPresentation,
    NotificationRole,
} from '../../types/notifications'
import {
    TEAM_U10_SOCCER_ID,
    TEAM_U12_SOCCER_ID,
    TEAM_U10_BASKETBALL_ID,
    TEAM_U12_BASKETBALL_ID,
    TEAM_U14_SOCCER_ELITE_ID,
} from './fakeTeams'

// ============================================================================
// Types
// ============================================================================

export type MessageType = 'announcement' | 'alert' | 'emergency' | 'update'
export type MessageStatus = 'draft' | 'sent' | 'scheduled'
export type MessageAudience = 'all' | 'team' | 'parents' | 'coaches'

export interface FakeAnnouncement {
    id: string
    org_id: string
    team_id: string | null
    title: string
    body: string
    type: MessageType
    audience: MessageAudience
    status: MessageStatus
    is_pinned: boolean
    sent_at: string | null
    scheduled_for: string | null
    created_by_user_id: string
    created_at: string
    updated_at: string
}

export interface FakeNotification {
    id: string
    user_id: string
    org_id: string
    team_id: string | null
    action: NotificationAction
    role_context: NotificationRole
    title: string
    body: string
    presentation_type: NotificationPresentation
    entity_type: NotificationEntityType | null
    entity_id: string | null
    link_url: string | null
    metadata: Record<string, unknown> | null
    dedupe_key: string
    read_at: string | null
    created_at: string
}

// ============================================================================
// Helper for dates
// ============================================================================

const now = new Date()

function hoursAgo(hours: number): string {
    return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
}

function daysAgo(days: number): string {
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

// ============================================================================
// User References
// ============================================================================

const ADMIN_ONLY_ID = DEMO_USER_IDS['admin-only@example.com']
const COACH_ONLY_ID = DEMO_USER_IDS['coach-only@example.com']
const PARENT_ONLY_ID = DEMO_USER_IDS['parent-only@example.com']
const STAFF_ONLY_ID = DEMO_USER_IDS['staff-only@example.com']
const ATHLETE_ONLY_ID = DEMO_USER_IDS['athlete-only@example.com']
const FAN_ONLY_ID = DEMO_USER_IDS['fan-only@example.com']

// ============================================================================
// Fake Announcements Data
// ============================================================================

export const fakeAnnouncements: FakeAnnouncement[] = [
    // Organization-wide announcements
    {
        id: 'msg-001',
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        title: 'Spring Season Kickoff',
        body: `Welcome to the Spring 2024 season! We're excited to have all our families back for another great season of youth sports.

Important dates to remember:
- First practices begin this week
- Parent orientation meeting: Next Tuesday at 7 PM
- Picture day: March 15th

Please make sure to complete all registration forms and submit any outstanding fees through the parent portal.

See you on the fields!`,
        type: 'announcement',
        audience: 'all',
        status: 'sent',
        is_pinned: true,
        sent_at: daysAgo(3),
        scheduled_for: null,
        created_by_user_id: ADMIN_ONLY_ID,
        created_at: daysAgo(3),
        updated_at: daysAgo(3),
    },
    {
        id: 'msg-002',
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        title: 'Weather Policy Reminder',
        body: `With spring weather upon us, please remember our weather policies:

⚡ LIGHTNING: If lightning is detected within 10 miles, all outdoor activities will be suspended for 30 minutes.

🌧️ RAIN: Light rain does not cancel practices. Heavy rain or thunderstorms may result in cancellation.

🥵 HEAT: On days above 95°F, extra water breaks will be mandated.

Check the app for real-time updates on weather-related cancellations. Coaches will also communicate via team announcements.`,
        type: 'update',
        audience: 'all',
        status: 'sent',
        is_pinned: false,
        sent_at: daysAgo(7),
        scheduled_for: null,
        created_by_user_id: ADMIN_ONLY_ID,
        created_at: daysAgo(7),
        updated_at: daysAgo(7),
    },

    // Emergency announcement
    {
        id: 'msg-003',
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        title: '⚠️ FIELD CLOSURE - Sports Complex',
        body: `URGENT: The Riverside Sports Complex fields 3 and 4 are CLOSED today due to irrigation system repairs.

All teams scheduled for these fields have been relocated:
- U10 Soccer → Lincoln Park Field 2
- U12 Soccer → Eastside Park Field 1

Practice times remain the same. Check your team announcements for specific directions.

We apologize for the inconvenience.`,
        type: 'emergency',
        audience: 'all',
        status: 'sent',
        is_pinned: true,
        sent_at: hoursAgo(4),
        scheduled_for: null,
        created_by_user_id: ADMIN_ONLY_ID,
        created_at: hoursAgo(4),
        updated_at: hoursAgo(4),
    },

    // Team-specific announcements
    {
        id: 'msg-004',
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        title: 'Great Practice Today, Team!',
        body: `Excellent work at practice today, U10 Lightning!

Highlights:
- Passing drills showed huge improvement
- Scrimmage was competitive and fun
- Everyone gave 100% effort

Reminder for next practice:
- Bring both light and dark jerseys
- We'll be working on corner kicks

See you Wednesday!

- Coach Davis`,
        type: 'announcement',
        audience: 'team',
        status: 'sent',
        is_pinned: false,
        sent_at: hoursAgo(2),
        scheduled_for: null,
        created_by_user_id: COACH_ONLY_ID,
        created_at: hoursAgo(2),
        updated_at: hoursAgo(2),
    },
    {
        id: 'msg-005',
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_SOCCER_ID,
        title: 'Tournament Preparation Meeting',
        body: `Parents and Players,

Please join us for a mandatory tournament preparation meeting:

📅 Date: This Thursday
🕖 Time: 7:00 PM
📍 Location: Community Center Room 201

We will cover:
- Tournament schedule and bracket
- Travel logistics and carpool coordination  
- Hotel information for overnight stay
- What to pack and expectations

Both players AND parents should attend if possible.

Questions? Reply to this message.

Coach Davis`,
        type: 'announcement',
        audience: 'team',
        status: 'sent',
        is_pinned: true,
        sent_at: daysAgo(1),
        scheduled_for: null,
        created_by_user_id: COACH_ONLY_ID,
        created_at: daysAgo(1),
        updated_at: daysAgo(1),
    },
    {
        id: 'msg-006',
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_BASKETBALL_ID,
        title: 'Game Day Reminder - Sunday!',
        body: `Hawks Families,

Reminder: We have a game this Sunday!

🏀 vs. Valley Vipers
📍 Valley Recreation Center
🕑 Game Time: 2:00 PM
⏰ Arrival: 1:30 PM (for warm-ups)

Wear your AWAY jerseys (white).

Let's go Hawks! 🦅`,
        type: 'announcement',
        audience: 'team',
        status: 'sent',
        is_pinned: false,
        sent_at: daysAgo(2),
        scheduled_for: null,
        created_by_user_id: DEMO_USER_IDS['parent-coach@example.com'],
        created_at: daysAgo(2),
        updated_at: daysAgo(2),
    },

    // U12 Basketball announcement
    {
        id: 'msg-008',
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_BASKETBALL_ID,
        title: 'Practice Schedule Update — New Time Slot',
        body: `Eagles Families,

Starting next week, our Tuesday practices will shift to 5:30 PM instead of 6:00 PM to accommodate gym scheduling.

Please update your calendars!

— Coach Thompson`,
        type: 'announcement',
        audience: 'team',
        status: 'sent',
        is_pinned: false,
        sent_at: daysAgo(2),
        scheduled_for: null,
        created_by_user_id: DEMO_USER_IDS['coach.thompson@example.com'] ?? COACH_ONLY_ID,
        created_at: daysAgo(2),
        updated_at: daysAgo(2),
    },
    // U14 Elite Soccer announcement
    {
        id: 'msg-009',
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U14_SOCCER_ELITE_ID,
        title: '🏆 State Cup Qualifier — Travel Details',
        body: `Elite Storm Players & Families,

We have confirmed our spot in the State Cup Qualifier! Here are the travel details:

📅 Dates: May 17-19
📍 Destination: Sacramento Regional Sports Complex
🚌 Team Bus departs Friday 5:00 PM from the main facility

Please complete the travel permission form in the app by May 10th.

Hotel block is reserved at Holiday Inn Express (link in travel plans).

Let's make history! 🌟

— Coach Davis`,
        type: 'announcement',
        audience: 'team',
        status: 'sent',
        is_pinned: true,
        sent_at: daysAgo(4),
        scheduled_for: null,
        created_by_user_id: COACH_ONLY_ID,
        created_at: daysAgo(4),
        updated_at: daysAgo(4),
    },
    // Org-wide scheduled announcement (future)
    {
        id: 'msg-010',
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        title: 'Picture Day - All Teams',
        body: `Mark your calendars! Team picture day is coming up.

📅 Date: March 15th
📍 Location: Main Gymnasium
⏰ Schedule: See below by team

U10 Soccer Lightning: 9:00 AM
U10 Basketball Hawks: 9:30 AM
U12 Soccer Thunder: 10:00 AM
U12 Basketball Eagles: 10:30 AM
U14 Soccer Elite Storm: 11:00 AM

Please arrive 10 minutes early and wear your HOME jersey.`,
        type: 'announcement',
        audience: 'all',
        status: 'scheduled',
        is_pinned: false,
        sent_at: null,
        scheduled_for: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_by_user_id: ADMIN_ONLY_ID,
        created_at: daysAgo(1),
        updated_at: daysAgo(1),
    },
    // Draft message
    {
        id: 'msg-007',
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        title: 'End of Season Celebration',
        body: `Save the date for our end of season celebration!

More details coming soon...`,
        type: 'announcement',
        audience: 'all',
        status: 'draft',
        is_pinned: false,
        sent_at: null,
        scheduled_for: null,
        created_by_user_id: ADMIN_ONLY_ID,
        created_at: daysAgo(1),
        updated_at: daysAgo(1),
    },
]

// ============================================================================
// Fake Notifications Data (for parent-only user)
// ============================================================================

const ADMIN_AMY_ID = DEMO_USER_IDS['admin-only@example.com']
const PARENT_ADMIN_ID = DEMO_USER_IDS['parent-admin@example.com']

export const fakeNotifications: FakeNotification[] = [
    // Parent-only notifications
    {
        id: 'notif-001',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_rsvp_required',
        role_context: 'guardian',
        title: 'RSVP Reminder',
        body: "Please respond to Emma's upcoming soccer game this Saturday.",
        presentation_type: 'info',
        entity_type: 'event',
        entity_id: 'event-001',
        link_url: '/portal/calendar',
        metadata: { severity: 'reminder' },
        dedupe_key: 'demo:notif-001',
        read_at: null,
        created_at: hoursAgo(1),
    },
    {
        id: 'notif-002',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'fee_overdue',
        role_context: 'guardian',
        title: 'Payment Due Soon',
        body: 'Tournament fee of $45 is due by March 15th.',
        presentation_type: 'warning',
        entity_type: 'fee',
        entity_id: 'fee-001',
        link_url: '/portal/payments',
        metadata: { amount_cents: 4500 },
        dedupe_key: 'demo:notif-002',
        read_at: null,
        created_at: hoursAgo(6),
    },
    {
        id: 'notif-003',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_location_updated',
        role_context: 'guardian',
        title: 'Practice Location Changed',
        body: "Today's practice moved to Lincoln Park due to field closure.",
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: 'event-002',
        link_url: '/portal/calendar',
        metadata: { old_location: 'Central Field', new_location: 'Lincoln Park' },
        dedupe_key: 'demo:notif-003',
        read_at: hoursAgo(3),
        created_at: hoursAgo(5),
    },
    {
        id: 'notif-004',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'announcement_created',
        role_context: 'guardian',
        title: 'New Team Announcement',
        body: 'Coach Davis posted a new message for U10 Lightning.',
        presentation_type: 'info',
        entity_type: 'announcement',
        entity_id: 'msg-002',
        link_url: '/portal/announcements',
        metadata: null,
        dedupe_key: 'demo:notif-004',
        read_at: hoursAgo(1),
        created_at: hoursAgo(2),
    },
    {
        id: 'notif-005',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'uniform_size_submitted',
        role_context: 'guardian',
        title: 'Uniform Sizes Submitted',
        body: "Emma's uniform sizes have been confirmed.",
        presentation_type: 'info',
        entity_type: 'uniform',
        entity_id: 'kit-001',
        link_url: '/portal/uniforms',
        metadata: null,
        dedupe_key: 'demo:notif-005',
        read_at: daysAgo(2),
        created_at: daysAgo(3),
    },
    {
        id: 'notif-006',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_canceled',
        role_context: 'guardian',
        title: 'Practice Canceled',
        body: "Thursday's practice has been canceled due to severe weather. Stay safe!",
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: 'event-003',
        link_url: '/portal/calendar',
        metadata: null,
        dedupe_key: 'demo:notif-006',
        read_at: null,
        created_at: hoursAgo(3),
    },
    {
        id: 'notif-007',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'fee_payment_completed',
        role_context: 'guardian',
        title: 'Payment Confirmed',
        body: 'Your payment of $150.00 for Spring Soccer Registration has been received.',
        presentation_type: 'info',
        entity_type: 'fee',
        entity_id: 'pay-guardian-001',
        link_url: '/portal/payments',
        metadata: { amount_cents: 15000 },
        dedupe_key: 'demo:notif-007',
        read_at: hoursAgo(8),
        created_at: hoursAgo(12),
    },
    {
        id: 'notif-008',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_SOCCER_ID,
        action: 'athlete_added_to_team',
        role_context: 'guardian',
        title: 'Team Placement Confirmed',
        body: "Liam has been added to U12 Thunder for the Spring season.",
        presentation_type: 'info',
        entity_type: 'athlete',
        entity_id: 'child-liam-johnson-001',
        link_url: '/portal',
        metadata: null,
        dedupe_key: 'demo:notif-008',
        read_at: daysAgo(1),
        created_at: daysAgo(1),
    },
    {
        id: 'notif-009',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_rescheduled',
        role_context: 'guardian',
        title: 'Game Rescheduled',
        body: "Saturday's game has been moved to Sunday at 2:00 PM at Riverside Field.",
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: 'event-004',
        link_url: '/portal/calendar',
        metadata: null,
        dedupe_key: 'demo:notif-009',
        read_at: null,
        created_at: hoursAgo(8),
    },
    {
        id: 'notif-010',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'announcement_urgent',
        role_context: 'guardian',
        title: 'Important: Photo Day Reminder',
        body: 'Team photos are this Saturday. Please arrive 15 minutes early in full uniform.',
        presentation_type: 'warning',
        entity_type: 'announcement',
        entity_id: 'msg-photo-day',
        link_url: '/portal/announcements',
        metadata: null,
        dedupe_key: 'demo:notif-010',
        read_at: null,
        created_at: daysAgo(1),
    },
    {
        id: 'notif-011',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'uniform_size_requested',
        role_context: 'guardian',
        title: 'Uniform Size Needed',
        body: "Please submit Liam's uniform size for the new away jerseys by Friday.",
        presentation_type: 'info',
        entity_type: 'uniform',
        entity_id: 'kit-002',
        link_url: '/portal/uniforms',
        metadata: null,
        dedupe_key: 'demo:notif-011',
        read_at: null,
        created_at: hoursAgo(5),
    },
    {
        id: 'notif-012',
        user_id: PARENT_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_weather_alert',
        role_context: 'guardian',
        title: 'Weather Advisory',
        body: 'Heat advisory for tomorrow. Extra water and sunscreen recommended for the 10 AM game.',
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: 'event-005',
        link_url: '/portal/calendar',
        metadata: null,
        dedupe_key: 'demo:notif-012',
        read_at: null,
        created_at: hoursAgo(10),
    },
    // Org admin notifications
    {
        id: 'notif-admin-001',
        user_id: ADMIN_AMY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'fee_payment_completed',
        role_context: 'org_admin',
        title: 'New Payment Received',
        body: 'Jennifer Johnson paid $150.00 for Spring Soccer Registration.',
        presentation_type: 'info',
        entity_type: 'fee',
        entity_id: 'pay-001',
        link_url: '/admin/payments',
        metadata: { amount_cents: 15000 },
        dedupe_key: 'demo:notif-admin-001',
        read_at: null,
        created_at: hoursAgo(2),
    },
    {
        id: 'notif-admin-002',
        user_id: ADMIN_AMY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_attendance_updated',
        role_context: 'org_admin',
        title: 'Attendance Not Submitted',
        body: 'U10 Lightning practice attendance has not been submitted yet.',
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: 'event-u10-soccer-practice-001',
        link_url: '/admin/attendance',
        metadata: { event_type: 'practice' },
        dedupe_key: 'demo:notif-admin-002',
        read_at: null,
        created_at: hoursAgo(4),
    },
    {
        id: 'notif-admin-003',
        user_id: ADMIN_AMY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'fee_overdue',
        role_context: 'org_admin',
        title: 'Multiple Fees Overdue',
        body: '5 athletes have overdue fees totaling $225.00.',
        presentation_type: 'warning',
        entity_type: 'fee',
        entity_id: null,
        link_url: '/admin/payments',
        metadata: { count: 5, total_cents: 22500 },
        dedupe_key: 'demo:notif-admin-003',
        read_at: hoursAgo(1),
        created_at: hoursAgo(8),
    },
    {
        id: 'notif-admin-004',
        user_id: ADMIN_AMY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_SOCCER_ID,
        action: 'event_canceled',
        role_context: 'org_admin',
        title: 'Event Cancelled',
        body: 'U12 Thunder tournament has been cancelled due to weather.',
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: 'event-u12-soccer-tournament-001',
        link_url: '/admin/events',
        metadata: { reason: 'weather' },
        dedupe_key: 'demo:notif-admin-004',
        read_at: null,
        created_at: hoursAgo(12),
    },
    {
        id: 'notif-admin-005',
        user_id: ADMIN_AMY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'athlete_created',
        role_context: 'org_admin',
        title: 'New Registration',
        body: 'A new athlete registered for Spring Basketball.',
        presentation_type: 'info',
        entity_type: 'athlete',
        entity_id: 'reg-001',
        link_url: '/admin/registrations',
        metadata: null,
        dedupe_key: 'demo:notif-admin-005',
        read_at: daysAgo(1),
        created_at: daysAgo(1),
    },
    {
        id: 'notif-admin-006',
        user_id: ADMIN_AMY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'announcement_created',
        role_context: 'org_admin',
        title: 'System Maintenance Scheduled',
        body: 'Scheduled maintenance will occur on March 20th from 2-4 AM.',
        presentation_type: 'info',
        entity_type: 'announcement',
        entity_id: null,
        link_url: '/admin',
        metadata: null,
        dedupe_key: 'demo:notif-admin-006',
        read_at: null,
        created_at: daysAgo(2),
    },
    // ── Coach notifications ──────────────────────────────────────────────────
    {
        id: 'notif-coach-001',
        user_id: COACH_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_attendance_updated',
        role_context: 'coach',
        title: 'Attendance Reminder',
        body: 'Please submit attendance for yesterday\'s U10 Lightning practice.',
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: 'event-u10-soccer-practice-001',
        link_url: '/admin/attendance',
        metadata: null,
        dedupe_key: 'demo:notif-coach-001',
        read_at: null,
        created_at: hoursAgo(3),
    },
    {
        id: 'notif-coach-002',
        user_id: COACH_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U14_SOCCER_ELITE_ID,
        action: 'event_rsvp_required',
        role_context: 'coach',
        title: 'Tournament Roster Due',
        body: 'Please finalize the tournament roster for U14 Elite Storm by Friday.',
        presentation_type: 'info',
        entity_type: 'event',
        entity_id: 'event-u14-soccer-travel-001',
        link_url: '/admin/events/event-u14-soccer-travel-001',
        metadata: null,
        dedupe_key: 'demo:notif-coach-002',
        read_at: null,
        created_at: hoursAgo(6),
    },
    {
        id: 'notif-coach-003',
        user_id: COACH_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_SOCCER_ID,
        action: 'announcement_created',
        role_context: 'coach',
        title: 'New Parent Message',
        body: 'A parent on U12 Thunder replied to your tournament announcement.',
        presentation_type: 'info',
        entity_type: 'announcement',
        entity_id: 'msg-005',
        link_url: '/admin/communications',
        metadata: null,
        dedupe_key: 'demo:notif-coach-003',
        read_at: daysAgo(1),
        created_at: daysAgo(1),
    },
    // ── Staff notifications ──────────────────────────────────────────────────
    {
        id: 'notif-staff-001',
        user_id: STAFF_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'event_attendance_updated',
        role_context: 'staff',
        title: 'Gate Shift Starting Soon',
        body: 'Your gate scanning shift for the U10 Soccer game starts in 90 minutes.',
        presentation_type: 'info',
        entity_type: 'event',
        entity_id: 'event-u10-soccer-game-001',
        link_url: '/admin/ticketing/scanner/event-u10-soccer-game-001',
        metadata: null,
        dedupe_key: 'demo:notif-staff-001',
        read_at: null,
        created_at: hoursAgo(1),
    },
    {
        id: 'notif-staff-002',
        user_id: STAFF_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'announcement_created',
        role_context: 'staff',
        title: 'Field Assignment Updated',
        body: 'Field assignments for this weekend have been updated. Please review before your shift.',
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: null,
        link_url: '/admin/facilities',
        metadata: null,
        dedupe_key: 'demo:notif-staff-002',
        read_at: null,
        created_at: hoursAgo(5),
    },
    {
        id: 'notif-staff-003',
        user_id: STAFF_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'fee_payment_completed',
        role_context: 'staff',
        title: 'Ticket Sales Update',
        body: '47 tickets sold for Saturday\'s tournament. 28 seats remaining.',
        presentation_type: 'info',
        entity_type: 'fee',
        entity_id: null,
        link_url: '/admin/ticketing/events',
        metadata: null,
        dedupe_key: 'demo:notif-staff-003',
        read_at: daysAgo(1),
        created_at: daysAgo(1),
    },
    // ── Athlete notifications ────────────────────────────────────────────────
    {
        id: 'notif-athlete-001',
        user_id: ATHLETE_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_rsvp_required',
        role_context: 'athlete',
        title: 'Upcoming Game This Saturday',
        body: 'You have a soccer game on Saturday at 10am. Please confirm your attendance.',
        presentation_type: 'info',
        entity_type: 'event',
        entity_id: 'event-u10-soccer-game-001',
        link_url: '/portal/calendar',
        metadata: null,
        dedupe_key: 'demo:notif-athlete-001',
        read_at: null,
        created_at: hoursAgo(2),
    },
    {
        id: 'notif-athlete-002',
        user_id: ATHLETE_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'announcement_created',
        role_context: 'athlete',
        title: 'New Team Message',
        body: 'Coach Davis posted an update about practice for U10 Lightning.',
        presentation_type: 'info',
        entity_type: 'announcement',
        entity_id: 'msg-004',
        link_url: '/portal/announcements',
        metadata: null,
        dedupe_key: 'demo:notif-athlete-002',
        read_at: hoursAgo(1),
        created_at: hoursAgo(2),
    },
    {
        id: 'notif-athlete-003',
        user_id: ATHLETE_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_SOCCER_ID,
        action: 'athlete_created',
        role_context: 'athlete',
        title: 'Tournament Registration Confirmed',
        body: 'Your registration for the Spring Tournament has been confirmed.',
        presentation_type: 'info',
        entity_type: 'athlete',
        entity_id: 'child-emma-johnson-001',
        link_url: '/portal',
        metadata: null,
        dedupe_key: 'demo:notif-athlete-003',
        read_at: daysAgo(2),
        created_at: daysAgo(3),
    },
    {
        id: 'notif-athlete-004',
        user_id: ATHLETE_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_rsvp_required',
        role_context: 'athlete',
        title: 'RSVP: Saturday Game',
        body: 'Please confirm your availability for the game this Saturday at 10 AM.',
        presentation_type: 'info',
        entity_type: 'event',
        entity_id: 'event-u10-soccer-game-002',
        link_url: '/portal/calendar',
        metadata: { severity: 'reminder' },
        dedupe_key: 'demo:notif-athlete-004',
        read_at: null,
        created_at: hoursAgo(4),
    },
    {
        id: 'notif-athlete-005',
        user_id: ATHLETE_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_location_updated',
        role_context: 'athlete',
        title: 'Practice Field Changed',
        body: "Wednesday's practice moved to Field B at Riverside Park.",
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: 'event-u10-soccer-practice-002',
        link_url: '/portal/calendar',
        metadata: { old_location: 'Field A', new_location: 'Field B – Riverside Park' },
        dedupe_key: 'demo:notif-athlete-005',
        read_at: null,
        created_at: hoursAgo(6),
    },
    {
        id: 'notif-athlete-006',
        user_id: ATHLETE_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'uniform_size_requested',
        role_context: 'athlete',
        title: 'Submit Your Uniform Size',
        body: 'New away jerseys are ready to order. Please submit your size by Friday.',
        presentation_type: 'info',
        entity_type: 'uniform',
        entity_id: 'kit-athlete-001',
        link_url: '/portal/uniforms',
        metadata: null,
        dedupe_key: 'demo:notif-athlete-006',
        read_at: null,
        created_at: hoursAgo(8),
    },
    {
        id: 'notif-athlete-007',
        user_id: ATHLETE_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U12_SOCCER_ID,
        action: 'event_canceled',
        role_context: 'athlete',
        title: 'Practice Canceled',
        body: "Friday's practice has been canceled due to thunderstorm warning.",
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: 'event-u12-soccer-practice-001',
        link_url: '/portal/calendar',
        metadata: null,
        dedupe_key: 'demo:notif-athlete-007',
        read_at: null,
        created_at: hoursAgo(3),
    },
    {
        id: 'notif-athlete-008',
        user_id: ATHLETE_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_rescheduled',
        role_context: 'athlete',
        title: 'Game Time Changed',
        body: 'The championship game has been moved to 3:00 PM on Sunday.',
        presentation_type: 'info',
        entity_type: 'event',
        entity_id: 'event-u10-soccer-championship-001',
        link_url: '/portal/calendar',
        metadata: null,
        dedupe_key: 'demo:notif-athlete-008',
        read_at: daysAgo(1),
        created_at: daysAgo(1),
    },
    {
        id: 'notif-athlete-009',
        user_id: ATHLETE_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'announcement_created',
        role_context: 'athlete',
        title: 'End-of-Season Party',
        body: 'The end-of-season celebration is on March 30th at the community center. All athletes welcome!',
        presentation_type: 'info',
        entity_type: 'announcement',
        entity_id: 'msg-season-party',
        link_url: '/portal/announcements',
        metadata: null,
        dedupe_key: 'demo:notif-athlete-009',
        read_at: null,
        created_at: daysAgo(2),
    },
    {
        id: 'notif-athlete-010',
        user_id: ATHLETE_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_SOCCER_ID,
        action: 'event_weather_alert',
        role_context: 'athlete',
        title: 'Heat Advisory for Tomorrow',
        body: 'Bring extra water to practice tomorrow. Temperatures expected to reach 95°F.',
        presentation_type: 'warning',
        entity_type: 'event',
        entity_id: 'event-u10-soccer-practice-003',
        link_url: '/portal/calendar',
        metadata: null,
        dedupe_key: 'demo:notif-athlete-010',
        read_at: hoursAgo(2),
        created_at: hoursAgo(5),
    },
    // ── Fan notifications ────────────────────────────────────────────────────
    {
        id: 'notif-fan-001',
        user_id: FAN_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'announcement_created',
        role_context: 'fan',
        title: 'New Event: Spring Tournament',
        body: 'Riverside Youth Athletics has posted a new public event: Spring Soccer Tournament.',
        presentation_type: 'info',
        entity_type: 'event',
        entity_id: 'event-u12-soccer-tournament-001',
        link_url: '/fan/events/event-u12-soccer-tournament-001',
        metadata: null,
        dedupe_key: 'demo:notif-fan-001',
        read_at: null,
        created_at: hoursAgo(4),
    },
    {
        id: 'notif-fan-002',
        user_id: FAN_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'fee_payment_completed',
        role_context: 'fan',
        title: 'Ticket Purchase Confirmed',
        body: 'Your 2 tickets for the U10 Soccer Championship have been confirmed.',
        presentation_type: 'info',
        entity_type: 'fee',
        entity_id: 'ticket-order-fan-001',
        link_url: '/fan/tickets',
        metadata: { ticket_count: 2 },
        dedupe_key: 'demo:notif-fan-002',
        read_at: daysAgo(1),
        created_at: daysAgo(2),
    },
    {
        id: 'notif-fan-003',
        user_id: FAN_ONLY_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'event_location_updated',
        role_context: 'fan',
        title: 'Event Reminder: Tomorrow',
        body: 'The Spring Soccer Tournament is tomorrow. Gates open at 8am.',
        presentation_type: 'info',
        entity_type: 'event',
        entity_id: 'event-u12-soccer-tournament-001',
        link_url: '/fan/events/event-u12-soccer-tournament-001',
        metadata: null,
        dedupe_key: 'demo:notif-fan-003',
        read_at: null,
        created_at: hoursAgo(12),
    },
    // Parent-admin notifications (union of parent and admin)
    {
        id: 'notif-parent-admin-001',
        user_id: PARENT_ADMIN_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: null,
        action: 'fee_payment_completed',
        role_context: 'org_admin',
        title: 'New Payment Received',
        body: 'Robert Chen paid $125.00 for Spring Basketball Registration.',
        presentation_type: 'info',
        entity_type: 'fee',
        entity_id: 'pay-002',
        link_url: '/admin/payments',
        metadata: { amount_cents: 12500 },
        dedupe_key: 'demo:notif-parent-admin-001',
        read_at: null,
        created_at: hoursAgo(3),
    },
    {
        id: 'notif-parent-admin-002',
        user_id: PARENT_ADMIN_ID,
        org_id: DEMO_ORG_A_ID,
        team_id: TEAM_U10_BASKETBALL_ID,
        action: 'event_rsvp_required',
        role_context: 'guardian',
        title: 'RSVP Reminder',
        body: "Please respond to Liam's upcoming basketball game this Friday.",
        presentation_type: 'info',
        entity_type: 'event',
        entity_id: 'event-u10-bb-game-001',
        link_url: '/portal/calendar',
        metadata: { severity: 'reminder' },
        dedupe_key: 'demo:notif-parent-admin-002',
        read_at: null,
        created_at: hoursAgo(5),
    },
]

// ============================================================================
// Helper Functions
// ============================================================================

export function getAnnouncementById(messageId: string): FakeAnnouncement | undefined {
    return fakeAnnouncements.find((m) => m.id === messageId)
}

export function getAnnouncementsForOrg(orgId: string): FakeAnnouncement[] {
    return fakeAnnouncements.filter((m) => m.org_id === orgId && m.status === 'sent')
}

export function getPinnedAnnouncementsForOrg(orgId: string): FakeAnnouncement[] {
    return fakeAnnouncements.filter((m) => m.org_id === orgId && m.status === 'sent' && m.is_pinned)
}

export function getAnnouncementsForTeam(teamId: string): FakeAnnouncement[] {
    return fakeAnnouncements.filter((m) => m.team_id === teamId && m.status === 'sent')
}

export function getOrgWideAnnouncements(orgId: string): FakeAnnouncement[] {
    return fakeAnnouncements.filter((m) => m.org_id === orgId && m.team_id === null && m.status === 'sent')
}

export function getDraftAnnouncements(orgId: string): FakeAnnouncement[] {
    return fakeAnnouncements.filter((m) => m.org_id === orgId && m.status === 'draft')
}

export function getEmergencyAnnouncements(orgId: string): FakeAnnouncement[] {
    return fakeAnnouncements.filter((m) => m.org_id === orgId && m.type === 'emergency' && m.status === 'sent')
}

export function getNotificationsForUser(userId: string): FakeNotification[] {
    return fakeNotifications.filter((n) => n.user_id === userId)
}

export function getUnreadNotificationsForUser(userId: string): FakeNotification[] {
    return fakeNotifications.filter((n) => n.user_id === userId && n.read_at === null)
}

export function getUnreadNotificationCount(userId: string): number {
    return getUnreadNotificationsForUser(userId).length
}

export function markNotificationAsRead(notificationId: string): void {
    const notification = fakeNotifications.find((n) => n.id === notificationId)
    if (notification) {
        notification.read_at = new Date().toISOString()
    }
}

export function deleteAnnouncementById(announcementId: string): boolean {
    const index = fakeAnnouncements.findIndex((a) => a.id === announcementId)
    if (index === -1) {
        return false
    }
    fakeAnnouncements.splice(index, 1)
    return true
}

export function updateAnnouncementById(
    announcementId: string,
    updates: Partial<{
        title: string
        body: string
        type: 'announcement' | 'emergency'
        priority: 'normal' | 'urgent'
    }>
): FakeAnnouncement | null {
    const announcement = fakeAnnouncements.find((a) => a.id === announcementId)
    if (!announcement) {
        return null
    }
    
    if (updates.title !== undefined) {
        announcement.title = updates.title
    }
    if (updates.body !== undefined) {
        announcement.body = updates.body
    }
    if (updates.type !== undefined) {
        announcement.type = updates.type
    }
    if (updates.priority !== undefined) {
        // Map priority to type if needed
        if (updates.priority === 'urgent') {
            announcement.type = 'emergency'
        }
    }
    
    announcement.updated_at = new Date().toISOString()
    return announcement
}
