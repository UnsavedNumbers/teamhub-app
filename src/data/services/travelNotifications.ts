import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'
import type { NotificationAction } from '../../types/notifications'
import { notifyUsers } from './notificationServiceCore'

const supabaseAny = supabase as any

interface TravelNotificationInput {
    travel_id: string
    team_id: string
    org_id: string
    title: string
    start_date: string
    created_by_user_id: string
}

export async function distributeTravelCreatedNotifications(input: TravelNotificationInput): Promise<void> {
    console.groupCollapsed(`%cdistributeTravelCreatedNotifications: ${input.travel_id}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelNotificationsService.distributeTravelCreatedNotifications', 'Distributing notifications', { travelId: input.travel_id, teamId: input.team_id, orgId: input.org_id })
    debug.perf.start('travelNotificationsService.distributeTravelCreatedNotifications')

    try {
        if (USE_FAKE_DATA) {
            debug.perf.end('travelNotificationsService.distributeTravelCreatedNotifications')
            debug.flow('TravelNotificationsService.distributeTravelCreatedNotifications', 'Notifications distributed (fake)', { travelId: input.travel_id })
            console.groupEnd()
            return
        }

        const guardianUserIds: string[] = []
        const coachUserIds: string[] = []

        const { data: members, error: memberError } = await supabase
            .from('team_memberships')
            .select(`
                athlete_id,
                athlete:athletes!athlete_id(family_id)
            `)
            .eq('team_id', input.team_id)
            .eq('status', 'active')

        if (!memberError && members) {
            const familyIds = members
                .map(m => (m.athlete as any)?.family_id)
                .filter(Boolean) as string[]

            if (familyIds.length > 0) {
                const { data: users, error: userError } = await supabase
                    .from('users')
                    .select('id')
                    .in('family_id', familyIds)

                if (!userError && users) {
                    users.forEach(u => {
                        if (u.id !== input.created_by_user_id) {
                            guardianUserIds.push(u.id)
                        }
                    })
                }
            }
        }

        const { data: coaches, error: coachError } = await supabaseAny
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', input.team_id)

        if (!coachError && coaches) {
            (coaches as { user_id?: string }[]).forEach(c => {
                if (c.user_id && c.user_id !== input.created_by_user_id) {
                    coachUserIds.push(c.user_id)
                }
            })
        }

        const action: NotificationAction = 'travel_created'
        let totalInAppCount = 0

        // Notify guardians
        if (guardianUserIds.length > 0) {
            const result = await notifyUsers({
                userIds: guardianUserIds,
                orgId: input.org_id,
                teamId: input.team_id,
                action,
                roleContext: 'guardian',
                title: `New Travel Plan: ${input.title}`,
                body: `Travel scheduled for ${new Date(input.start_date).toLocaleDateString()}`,
                linkUrl: `/portal/travel/${input.travel_id}`,
                entityType: 'travel',
                entityId: input.travel_id,
                metadata: {
                    start_date: input.start_date
                }
            })
            if (result.success) {
                totalInAppCount += result.inAppCount
            }
        }

        // Notify coaches
        if (coachUserIds.length > 0) {
            const result = await notifyUsers({
                userIds: coachUserIds,
                orgId: input.org_id,
                teamId: input.team_id,
                action,
                roleContext: 'coach',
                title: `New Travel Plan: ${input.title}`,
                body: `Travel scheduled for ${new Date(input.start_date).toLocaleDateString()}`,
                linkUrl: `/portal/travel/${input.travel_id}`,
                entityType: 'travel',
                entityId: input.travel_id,
                metadata: {
                    start_date: input.start_date
                }
            })
            if (result.success) {
                totalInAppCount += result.inAppCount
            }
        }

        debug.perf.end('travelNotificationsService.distributeTravelCreatedNotifications')
        debug.flow('TravelNotificationsService.distributeTravelCreatedNotifications', 'Notifications distributed successfully', { travelId: input.travel_id, recipientCount: totalInAppCount })
        console.groupEnd()
        console.log(`[NotificationService] Distributed ${totalInAppCount} travel-created notifications`)

    } catch (err) {
        debug.perf.end('travelNotificationsService.distributeTravelCreatedNotifications')
        debug.error('TravelNotificationsService.distributeTravelCreatedNotifications', 'Failed to distribute notifications', { error: err, input })
        console.groupEnd()
        console.error('[NotificationService] Error distributing travel-created notifications:', err)
    }
}

export async function distributeTravelCanceledNotifications(input: TravelNotificationInput): Promise<void> {
    console.groupCollapsed(`%cdistributeTravelCanceledNotifications: ${input.travel_id}`, 'color: #666; font-weight: bold;');
    debug.flow('TravelNotificationsService.distributeTravelCanceledNotifications', 'Distributing cancellation notifications', { travelId: input.travel_id, teamId: input.team_id, orgId: input.org_id })
    debug.perf.start('travelNotificationsService.distributeTravelCanceledNotifications')

    try {
        if (USE_FAKE_DATA) {
            debug.perf.end('travelNotificationsService.distributeTravelCanceledNotifications')
            debug.flow('TravelNotificationsService.distributeTravelCanceledNotifications', 'Notifications distributed (fake)', { travelId: input.travel_id })
            console.groupEnd()
            return
        }

        const guardianUserIds: string[] = []
        const coachUserIds: string[] = []

        const { data: members, error: memberError } = await supabase
            .from('team_memberships')
            .select(`
                athlete_id,
                athlete:athletes!athlete_id(family_id)
            `)
            .eq('team_id', input.team_id)
            .eq('status', 'active')

        if (!memberError && members) {
            const familyIds = members
                .map(m => (m.athlete as any)?.family_id)
                .filter(Boolean) as string[]

            if (familyIds.length > 0) {
                const { data: users, error: userError } = await supabase
                    .from('users')
                    .select('id')
                    .in('family_id', familyIds)

                if (!userError && users) {
                    users.forEach(u => {
                        if (u.id !== input.created_by_user_id) {
                            guardianUserIds.push(u.id)
                        }
                    })
                }
            }
        }

        const { data: coaches, error: coachError } = await supabaseAny
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', input.team_id)

        if (!coachError && coaches) {
            (coaches as { user_id?: string }[]).forEach(c => {
                if (c.user_id && c.user_id !== input.created_by_user_id) {
                    coachUserIds.push(c.user_id)
                }
            })
        }

        const action: NotificationAction = 'travel_canceled'
        let totalInAppCount = 0

        // Notify guardians
        if (guardianUserIds.length > 0) {
            const result = await notifyUsers({
                userIds: guardianUserIds,
                orgId: input.org_id,
                teamId: input.team_id,
                action,
                roleContext: 'guardian',
                title: `Travel Canceled: ${input.title}`,
                body: `This travel plan has been canceled`,
                linkUrl: `/portal/travel/${input.travel_id}`,
                entityType: 'travel',
                entityId: input.travel_id,
                presentation: 'warning',
                metadata: {
                    start_date: input.start_date
                }
            })
            if (result.success) {
                totalInAppCount += result.inAppCount
            }
        }

        // Notify coaches
        if (coachUserIds.length > 0) {
            const result = await notifyUsers({
                userIds: coachUserIds,
                orgId: input.org_id,
                teamId: input.team_id,
                action,
                roleContext: 'coach',
                title: `Travel Canceled: ${input.title}`,
                body: `This travel plan has been canceled`,
                linkUrl: `/portal/travel/${input.travel_id}`,
                entityType: 'travel',
                entityId: input.travel_id,
                presentation: 'warning',
                metadata: {
                    start_date: input.start_date
                }
            })
            if (result.success) {
                totalInAppCount += result.inAppCount
            }
        }

        debug.perf.end('travelNotificationsService.distributeTravelCanceledNotifications')
        debug.flow('TravelNotificationsService.distributeTravelCanceledNotifications', 'Notifications distributed successfully', { travelId: input.travel_id, recipientCount: totalInAppCount })
        console.groupEnd()
        console.log(`[NotificationService] Distributed ${totalInAppCount} travel-canceled notifications`)

    } catch (err) {
        debug.perf.end('travelNotificationsService.distributeTravelCanceledNotifications')
        debug.error('TravelNotificationsService.distributeTravelCanceledNotifications', 'Failed to distribute notifications', { error: err, input })
        console.groupEnd()
        console.error('[NotificationService] Error distributing travel-canceled notifications:', err)
    }
}
