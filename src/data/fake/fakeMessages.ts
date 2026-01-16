/**
 * Fake Messages Data Module
 *
 * Provides fake data for announcements, messages, and notifications.
 * All messages are linked to Organization A.
 */

import { DEMO_ORG_A_ID, DEMO_USER_IDS } from '../config'
import {
    TEAM_U10_SOCCER_ID,
    TEAM_U12_SOCCER_ID,
    TEAM_U10_BASKETBALL_ID,
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
    title: string
    body: string
    read_at: string | null
    action_url: string | null
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

export const fakeNotifications: FakeNotification[] = [
    {
        id: 'notif-001',
        user_id: PARENT_ONLY_ID,
        title: 'RSVP Reminder',
        body: "Please respond to Emma's upcoming soccer game this Saturday.",
        read_at: null,
        action_url: '/portal/calendar',
        created_at: hoursAgo(1),
    },
    {
        id: 'notif-002',
        user_id: PARENT_ONLY_ID,
        title: 'Payment Due Soon',
        body: 'Tournament fee of $45 is due by March 15th.',
        read_at: null,
        action_url: '/portal/payments',
        created_at: hoursAgo(6),
    },
    {
        id: 'notif-003',
        user_id: PARENT_ONLY_ID,
        title: 'Practice Location Changed',
        body: "Today's practice moved to Lincoln Park due to field closure.",
        read_at: hoursAgo(3),
        action_url: '/portal/calendar',
        created_at: hoursAgo(5),
    },
    {
        id: 'notif-004',
        user_id: PARENT_ONLY_ID,
        title: 'New Team Announcement',
        body: 'Coach Davis posted a new message for U10 Lightning.',
        read_at: hoursAgo(1),
        action_url: '/portal/messages',
        created_at: hoursAgo(2),
    },
    {
        id: 'notif-005',
        user_id: PARENT_ONLY_ID,
        title: 'Uniform Sizes Submitted',
        body: "Emma's uniform sizes have been confirmed.",
        read_at: daysAgo(2),
        action_url: '/portal/uniforms',
        created_at: daysAgo(3),
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
