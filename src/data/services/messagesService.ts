/**
 * Messages Service
 *
 * Provides data access for announcements, messages, and notifications.
 * Abstract layer between UI components and data source.
 *
 * MIGRATION NOTE: Replace fake data calls with Supabase queries.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext, PermissionSet } from '../fake/userContext'
import { calculatePermissions } from '../fake/userContext'
import {
    fakeAnnouncements,
    fakeNotifications,
    getAnnouncementById,
    getAnnouncementsForOrg,
    getPinnedAnnouncementsForOrg,
    getAnnouncementsForTeam,
    getOrgWideAnnouncements,
    getDraftAnnouncements,
    getEmergencyAnnouncements,
    getNotificationsForUser,
    getUnreadNotificationsForUser,
    getUnreadNotificationCount,
    type FakeAnnouncement,
    type FakeNotification,
} from '../fake/fakeMessages'
import { getChildrenForUserId, getAssignedTeamsForCoach, getTeamsForUserChildren } from '../fake/relationships'

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

function buildPermissions(context: UserContext): PermissionSet {
    const childIds = getChildrenForUserId(context.userId)
    const assignedTeamIds = context.roles.includes('coach')
        ? getAssignedTeamsForCoach(context.userId)
        : []

    return calculatePermissions(context, assignedTeamIds, childIds, [])
}

// ============================================================================
// Announcement Service Functions
// ============================================================================

export interface AnnouncementsQueryParams {
    teamId?: string
    pinnedOnly?: boolean
    includeOrgWide?: boolean
}

/**
 * Get announcements for the current user
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('announcements')
 *   .select('*')
 *   .eq('org_id', context.orgId)
 *   .eq('status', 'sent')
 *   .or(`team_id.is.null,team_id.in.(${teamIds.join(',')})`)
 *   .order('sent_at', { ascending: false })
 * ```
 */
export async function getAnnouncements(
    context: UserContext,
    params: AnnouncementsQueryParams = {}
): Promise<{ data: FakeAnnouncement[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        let announcements: FakeAnnouncement[] = []

        // Get accessible team IDs for non-admin users
        const accessibleTeamIds = new Set<string>()
        if (!permissions.canViewAllOrgData) {
            if (permissions.canViewAssignedTeams) {
                permissions.assignedTeamIds.forEach((id) => accessibleTeamIds.add(id))
            }
            if (permissions.canViewOwnChildrenData) {
                getTeamsForUserChildren(context.userId).forEach((id) => accessibleTeamIds.add(id))
            }
        }

        // Get base announcements
        if (params.pinnedOnly) {
            announcements = getPinnedAnnouncementsForOrg(context.orgId)
        } else if (params.teamId) {
            announcements = getAnnouncementsForTeam(params.teamId)
            if (params.includeOrgWide !== false) {
                announcements = [...announcements, ...getOrgWideAnnouncements(context.orgId)]
            }
        } else {
            announcements = getAnnouncementsForOrg(context.orgId)
        }

        // Filter by team access for non-admin users
        if (!permissions.canViewAllOrgData) {
            announcements = announcements.filter((a) => {
                // Org-wide announcements are visible to all
                if (a.team_id === null) return true
                // Team-specific announcements require team access
                return accessibleTeamIds.has(a.team_id)
            })
        }

        // Sort by sent_at descending
        announcements.sort((a, b) => {
            const aTime = a.sent_at ? new Date(a.sent_at).getTime() : 0
            const bTime = b.sent_at ? new Date(b.sent_at).getTime() : 0
            return bTime - aTime
        })

        return { data: announcements, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get emergency announcements
 */
export async function getActiveEmergencyAnnouncements(
    context: UserContext
): Promise<{ data: FakeAnnouncement[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const emergencies = getEmergencyAnnouncements(context.orgId)
        return { data: emergencies, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get draft announcements (admin only)
 */
export async function getDraftAnnouncementsAdmin(
    context: UserContext
): Promise<{ data: FakeAnnouncement[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const permissions = buildPermissions(context)
        if (!permissions.canViewAllOrgData && !permissions.canViewAssignedTeams) {
            return { data: [], error: new Error('Access denied') }
        }

        const drafts = getDraftAnnouncements(context.orgId)
        return { data: drafts, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

// ============================================================================
// Notification Service Functions
// ============================================================================

/**
 * Get notifications for the current user
 *
 * TODO: Replace with Supabase query:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('user_notifications')
 *   .select('*')
 *   .eq('user_id', context.userId)
 *   .order('created_at', { ascending: false })
 *   .limit(50)
 * ```
 */
export async function getNotifications(
    context: UserContext,
    limit?: number
): Promise<{ data: FakeNotification[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        let notifications = getNotificationsForUser(context.userId)
        notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        if (limit && limit > 0) {
            notifications = notifications.slice(0, limit)
        }

        return { data: notifications, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get unread notifications for the current user
 */
export async function getUnreadNotifications(
    context: UserContext
): Promise<{ data: FakeNotification[]; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: [], error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const unread = getUnreadNotificationsForUser(context.userId)
        return { data: unread, error: null }
    } catch (err) {
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount(
    context: UserContext
): Promise<{ data: number; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { data: 0, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const count = getUnreadNotificationCount(context.userId)
        return { data: count, error: null }
    } catch (err) {
        return { data: 0, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Mark a notification as read
 *
 * TODO: Replace with Supabase update:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('user_notifications')
 *   .update({ read_at: new Date().toISOString() })
 *   .eq('id', notificationId)
 *   .eq('user_id', context.userId)
 *   .select()
 *   .single()
 * ```
 */
export async function markNotificationRead(
    context: UserContext,
    notificationId: string
): Promise<{ success: boolean; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { success: false, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const notification = fakeNotifications.find(
            (n) => n.id === notificationId && n.user_id === context.userId
        )

        if (!notification) {
            return { success: false, error: new Error('Notification not found') }
        }

        // In real implementation, update the database
        notification.read_at = new Date().toISOString()

        return { success: true, error: null }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Mark all notifications as read
 *
 * TODO: Replace with Supabase update:
 * ```typescript
 * const { data, error } = await supabase
 *   .from('user_notifications')
 *   .update({ read_at: new Date().toISOString() })
 *   .eq('user_id', context.userId)
 *   .is('read_at', null)
 * ```
 */
export async function markAllNotificationsRead(
    context: UserContext
): Promise<{ success: boolean; error: Error | null }> {
    if (!USE_FAKE_DATA) {
        return { success: false, error: new Error('Real data not implemented') }
    }

    try {
        await simulateDelay()

        const readAt = new Date().toISOString()
        fakeNotifications
            .filter((n) => n.user_id === context.userId && n.read_at === null)
            .forEach((n) => {
                n.read_at = readAt
            })

        return { success: true, error: null }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
