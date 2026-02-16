import { supabase } from '../../lib/supabase'
const supabaseAny = supabase as any
import { USE_FAKE_DATA } from '../config'
import { debug } from '../../lib/debug'
import type { NotificationAction } from '../../types/notifications'
import { notifyUsers } from './notificationServiceCore'

interface EventNotificationInput {
    id: string
    team_id: string
    org_id: string
    title: string
    start_time: string
    created_by_user_id: string
}

export async function distributeEventNotifications(event: EventNotificationInput): Promise<void> {
    console.groupCollapsed(`%cdistributeEventNotifications: ${event.id}`, 'color: #666; font-weight: bold;');
    debug.flow('NotificationDistributionService.distributeEventNotifications', 'Distributing notifications', { eventId: event.id, teamId: event.team_id, orgId: event.org_id })
    debug.perf.start('notificationDistributionService.distributeEventNotifications')

    if (USE_FAKE_DATA) {
        debug.perf.end('notificationDistributionService.distributeEventNotifications')
        debug.data('NotificationDistributionService.distributeEventNotifications', 'Skipped (fake data)', { eventId: event.id })
        console.groupEnd()
        return
    }

    try {
        const guardianUserIds: string[] = []
        const coachUserIds: string[] = []

        // Get guardians of team members
        const { data: members, error: memberError } = await supabase
            .from('team_memberships')
            .select(`
                athlete_id,
                athlete:athletes!athlete_id(family_id)
            `)
            .eq('team_id', event.team_id)
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
                        if (u.id !== event.created_by_user_id) {
                            guardianUserIds.push(u.id)
                        }
                    })
                }
            }
        }

        // Get coaches for team
        const { data: coaches, error: coachError } = await supabaseAny
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', event.team_id)

        if (!coachError && coaches) {
            coaches.forEach((c: any) => {
                if (c.user_id !== event.created_by_user_id) {
                    coachUserIds.push(c.user_id)
                }
            })
        }

        const action: NotificationAction = 'event_created'
        let totalInAppCount = 0

        // Notify guardians
        if (guardianUserIds.length > 0) {
            const result = await notifyUsers({
                userIds: guardianUserIds,
                orgId: event.org_id,
                teamId: event.team_id,
                action,
                roleContext: 'guardian',
                title: event.title,
                body: `New event scheduled for ${new Date(event.start_time).toLocaleDateString()}`,
                linkUrl: `/portal/calendar/events/${event.id}`,
                entityType: 'event',
                entityId: event.id,
                metadata: {
                    start_time: event.start_time
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
                orgId: event.org_id,
                teamId: event.team_id,
                action,
                roleContext: 'coach',
                title: event.title,
                body: `New event scheduled for ${new Date(event.start_time).toLocaleDateString()}`,
                linkUrl: `/portal/calendar/events/${event.id}`,
                entityType: 'event',
                entityId: event.id,
                metadata: {
                    start_time: event.start_time
                }
            })
            if (result.success) {
                totalInAppCount += result.inAppCount
            }
        }

        debug.perf.end('notificationDistributionService.distributeEventNotifications')
        debug.flow('NotificationDistributionService.distributeEventNotifications', 'Notifications distributed successfully', { eventId: event.id, recipientCount: totalInAppCount })
        console.groupEnd()
        console.log(`[NotificationService] Distributed ${totalInAppCount} notifications for event ${event.id}`)

    } catch (err) {
        debug.perf.end('notificationDistributionService.distributeEventNotifications')
        debug.error('NotificationDistributionService.distributeEventNotifications', 'Failed to distribute notifications', { error: err, eventId: event.id })
        console.groupEnd()
        console.error('[NotificationService] Error distributing event notifications:', err)
    }
}

export async function distributeEventUpdateNotifications(event: EventNotificationInput): Promise<void> {
    console.groupCollapsed(`%cdistributeEventUpdateNotifications: ${event.id}`, 'color: #666; font-weight: bold;');
    debug.flow('NotificationDistributionService.distributeEventUpdateNotifications', 'Distributing update notifications', { eventId: event.id, teamId: event.team_id, orgId: event.org_id })
    debug.perf.start('notificationDistributionService.distributeEventUpdateNotifications')

    if (USE_FAKE_DATA) {
        debug.perf.end('notificationDistributionService.distributeEventUpdateNotifications')
        debug.data('NotificationDistributionService.distributeEventUpdateNotifications', 'Skipped (fake data)', { eventId: event.id })
        console.groupEnd()
        return
    }

    try {
        const guardianUserIds: string[] = []
        const coachUserIds: string[] = []

        const { data: members, error: memberError } = await supabase
            .from('team_memberships')
            .select(`
                athlete_id,
                athlete:athletes!athlete_id(family_id)
            `)
            .eq('team_id', event.team_id)
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
                        if (u.id !== event.created_by_user_id) {
                            guardianUserIds.push(u.id)
                        }
                    })
                }
            }
        }

        const { data: coaches, error: coachError } = await supabaseAny
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', event.team_id)

        if (!coachError && coaches) {
            coaches.forEach((c: any) => {
                if (c.user_id !== event.created_by_user_id) {
                    coachUserIds.push(c.user_id)
                }
            })
        }

        const action: NotificationAction = 'event_updated'
        let totalInAppCount = 0

        // Notify guardians
        if (guardianUserIds.length > 0) {
            const result = await notifyUsers({
                userIds: guardianUserIds,
                orgId: event.org_id,
                teamId: event.team_id,
                action,
                roleContext: 'guardian',
                title: `Event Updated: ${event.title}`,
                body: `Event details have been updated`,
                linkUrl: `/portal/calendar/events/${event.id}`,
                entityType: 'event',
                entityId: event.id,
                metadata: {
                    start_time: event.start_time
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
                orgId: event.org_id,
                teamId: event.team_id,
                action,
                roleContext: 'coach',
                title: `Event Updated: ${event.title}`,
                body: `Event details have been updated`,
                linkUrl: `/portal/calendar/events/${event.id}`,
                entityType: 'event',
                entityId: event.id,
                metadata: {
                    start_time: event.start_time
                }
            })
            if (result.success) {
                totalInAppCount += result.inAppCount
            }
        }

        debug.perf.end('notificationDistributionService.distributeEventUpdateNotifications')
        debug.flow('NotificationDistributionService.distributeEventUpdateNotifications', 'Update notifications distributed successfully', { eventId: event.id, recipientCount: totalInAppCount })
        console.groupEnd()
        console.log(`[NotificationService] Distributed ${totalInAppCount} update notifications for event ${event.id}`)

    } catch (err) {
        debug.perf.end('notificationDistributionService.distributeEventUpdateNotifications')
        debug.error('NotificationDistributionService.distributeEventUpdateNotifications', 'Failed to distribute update notifications', { error: err, eventId: event.id })
        console.groupEnd()
        console.error('[NotificationService] Error distributing event update notifications:', err)
    }
}

export async function distributeEventCancelNotifications(event: EventNotificationInput): Promise<void> {
    console.groupCollapsed(`%cdistributeEventCancelNotifications: ${event.id}`, 'color: #666; font-weight: bold;');
    debug.flow('NotificationDistributionService.distributeEventCancelNotifications', 'Distributing cancel notifications', { eventId: event.id, teamId: event.team_id, orgId: event.org_id })
    debug.perf.start('notificationDistributionService.distributeEventCancelNotifications')

    if (USE_FAKE_DATA) {
        debug.perf.end('notificationDistributionService.distributeEventCancelNotifications')
        debug.data('NotificationDistributionService.distributeEventCancelNotifications', 'Skipped (fake data)', { eventId: event.id })
        console.groupEnd()
        return
    }

    try {
        const guardianUserIds: string[] = []
        const coachUserIds: string[] = []

        const { data: members, error: memberError } = await supabase
            .from('team_memberships')
            .select(`
                athlete_id,
                athlete:athletes!athlete_id(family_id)
            `)
            .eq('team_id', event.team_id)
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
                        if (u.id !== event.created_by_user_id) {
                            guardianUserIds.push(u.id)
                        }
                    })
                }
            }
        }

        const { data: coaches, error: coachError } = await supabaseAny
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', event.team_id)

        if (!coachError && coaches) {
            coaches.forEach((c: any) => {
                if (c.user_id !== event.created_by_user_id) {
                    coachUserIds.push(c.user_id)
                }
            })
        }

        const action: NotificationAction = 'event_canceled'
        let totalInAppCount = 0

        // Notify guardians
        if (guardianUserIds.length > 0) {
            const result = await notifyUsers({
                userIds: guardianUserIds,
                orgId: event.org_id,
                teamId: event.team_id,
                action,
                roleContext: 'guardian',
                title: `Event Canceled: ${event.title}`,
                body: `This event has been canceled`,
                linkUrl: `/portal/calendar/events/${event.id}`,
                entityType: 'event',
                entityId: event.id,
                presentation: 'warning',
                metadata: {
                    start_time: event.start_time
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
                orgId: event.org_id,
                teamId: event.team_id,
                action,
                roleContext: 'coach',
                title: `Event Canceled: ${event.title}`,
                body: `This event has been canceled`,
                linkUrl: `/portal/calendar/events/${event.id}`,
                entityType: 'event',
                entityId: event.id,
                presentation: 'warning',
                metadata: {
                    start_time: event.start_time
                }
            })
            if (result.success) {
                totalInAppCount += result.inAppCount
            }
        }

        debug.perf.end('notificationDistributionService.distributeEventCancelNotifications')
        debug.flow('NotificationDistributionService.distributeEventCancelNotifications', 'Cancel notifications distributed successfully', { eventId: event.id, recipientCount: totalInAppCount })
        console.groupEnd()
        console.log(`[NotificationService] Distributed ${totalInAppCount} cancel notifications for event ${event.id}`)

    } catch (err) {
        debug.perf.end('notificationDistributionService.distributeEventCancelNotifications')
        debug.error('NotificationDistributionService.distributeEventCancelNotifications', 'Failed to distribute cancel notifications', { error: err, eventId: event.id })
        console.groupEnd()
        console.error('[NotificationService] Error distributing event cancel notifications:', err)
    }
}

export async function distributeEventRescheduledNotifications(event: EventNotificationInput, oldStartTime: string): Promise<void> {
    console.groupCollapsed(`%cdistributeEventRescheduledNotifications: ${event.id}`, 'color: #666; font-weight: bold;');
    debug.flow('NotificationDistributionService.distributeEventRescheduledNotifications', 'Distributing reschedule notifications', { eventId: event.id, teamId: event.team_id, orgId: event.org_id })
    debug.perf.start('notificationDistributionService.distributeEventRescheduledNotifications')

    if (USE_FAKE_DATA) {
        debug.perf.end('notificationDistributionService.distributeEventRescheduledNotifications')
        debug.data('NotificationDistributionService.distributeEventRescheduledNotifications', 'Skipped (fake data)', { eventId: event.id })
        console.groupEnd()
        return
    }

    try {
        const guardianUserIds: string[] = []
        const coachUserIds: string[] = []

        const { data: members, error: memberError } = await supabase
            .from('team_memberships')
            .select(`
                athlete_id,
                athlete:athletes!athlete_id(family_id)
            `)
            .eq('team_id', event.team_id)
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
                        if (u.id !== event.created_by_user_id) {
                            guardianUserIds.push(u.id)
                        }
                    })
                }
            }
        }

        const { data: coaches, error: coachError } = await supabaseAny
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', event.team_id)

        if (!coachError && coaches) {
            coaches.forEach((c: any) => {
                if (c.user_id !== event.created_by_user_id) {
                    coachUserIds.push(c.user_id)
                }
            })
        }

        const action: NotificationAction = 'event_rescheduled'
        let totalInAppCount = 0

        // Notify guardians
        if (guardianUserIds.length > 0) {
            const result = await notifyUsers({
                userIds: guardianUserIds,
                orgId: event.org_id,
                teamId: event.team_id,
                action,
                roleContext: 'guardian',
                title: `Event Rescheduled: ${event.title}`,
                body: `Event time changed from ${new Date(oldStartTime).toLocaleString()} to ${new Date(event.start_time).toLocaleString()}`,
                linkUrl: `/portal/calendar/events/${event.id}`,
                entityType: 'event',
                entityId: event.id,
                presentation: 'warning',
                metadata: {
                    old_start_time: oldStartTime,
                    new_start_time: event.start_time
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
                orgId: event.org_id,
                teamId: event.team_id,
                action,
                roleContext: 'coach',
                title: `Event Rescheduled: ${event.title}`,
                body: `Event time changed from ${new Date(oldStartTime).toLocaleString()} to ${new Date(event.start_time).toLocaleString()}`,
                linkUrl: `/portal/calendar/events/${event.id}`,
                entityType: 'event',
                entityId: event.id,
                presentation: 'warning',
                metadata: {
                    old_start_time: oldStartTime,
                    new_start_time: event.start_time
                }
            })
            if (result.success) {
                totalInAppCount += result.inAppCount
            }
        }

        debug.perf.end('notificationDistributionService.distributeEventRescheduledNotifications')
        debug.flow('NotificationDistributionService.distributeEventRescheduledNotifications', 'Reschedule notifications distributed successfully', { eventId: event.id, recipientCount: totalInAppCount })
        console.groupEnd()
        console.log(`[NotificationService] Distributed ${totalInAppCount} reschedule notifications for event ${event.id}`)

    } catch (err) {
        debug.perf.end('notificationDistributionService.distributeEventRescheduledNotifications')
        debug.error('NotificationDistributionService.distributeEventRescheduledNotifications', 'Failed to distribute reschedule notifications', { error: err, eventId: event.id })
        console.groupEnd()
        console.error('[NotificationService] Error distributing event reschedule notifications:', err)
    }
}
