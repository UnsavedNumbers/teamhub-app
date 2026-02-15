import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'
import type { NotificationAction } from '../../types/notifications'

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
        const recipients = new Set<string>()

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
                    .select('id, preferences')
                    .in('family_id', familyIds)

                if (!userError && users) {
                    users.forEach(u => {
                        const prefs = u.preferences as any
                        const notifications = prefs?.notifications
                        const isEnabled = notifications?.schedule_changes !== false

                        if (isEnabled) {
                            recipients.add(u.id)
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
                if (c.user_id) recipients.add(c.user_id)
            })
        }

        recipients.delete(input.created_by_user_id)

        if (recipients.size === 0) return

        const action: NotificationAction = 'travel_created'

        const notificationsToInsert = Array.from(recipients).map(userId => ({
            user_id: userId,
            org_id: input.org_id,
            team_id: input.team_id,
            action: action,
            title: `New Travel Plan: ${input.title}`,
            body: `Travel scheduled for ${new Date(input.start_date).toLocaleDateString()}`,
            link_url: `/travel/${input.travel_id}`,
            role_context: 'guardian',
            entity_type: 'travel',
            entity_id: input.travel_id,
            created_at: new Date().toISOString(),
            metadata: {
                start_date: input.start_date
            }
        }))

        const { error: insertError } = await supabaseAny
            .from('user_notifications')
            .insert(notificationsToInsert as any)

        if (insertError) throw insertError

        debug.perf.end('travelNotificationsService.distributeTravelCreatedNotifications')
        debug.flow('TravelNotificationsService.distributeTravelCreatedNotifications', 'Notifications distributed successfully', { travelId: input.travel_id, recipientCount: notificationsToInsert.length })
        console.groupEnd()
        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} travel-created notifications`)

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
        const recipients = new Set<string>()

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
                    .select('id, preferences')
                    .in('family_id', familyIds)

                if (!userError && users) {
                    users.forEach(u => {
                        const prefs = u.preferences as any
                        const notifications = prefs?.notifications
                        const isEnabled = notifications?.schedule_changes !== false

                        if (isEnabled) {
                            recipients.add(u.id)
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
                if (c.user_id) recipients.add(c.user_id)
            })
        }

        recipients.delete(input.created_by_user_id)

        if (recipients.size === 0) return

        const action: NotificationAction = 'travel_canceled'

        const notificationsToInsert = Array.from(recipients).map(userId => ({
            user_id: userId,
            org_id: input.org_id,
            team_id: input.team_id,
            action: action,
            title: `Travel Canceled: ${input.title}`,
            body: `This travel plan has been canceled`,
            link_url: `/travel/${input.travel_id}`,
            role_context: 'guardian',
            entity_type: 'travel',
            entity_id: input.travel_id,
            created_at: new Date().toISOString(),
            metadata: {
                start_date: input.start_date
            }
        }))

        const { error: insertError } = await supabaseAny
            .from('user_notifications')
            .insert(notificationsToInsert as any)

        if (insertError) throw insertError

        debug.perf.end('travelNotificationsService.distributeTravelCanceledNotifications')
        debug.flow('TravelNotificationsService.distributeTravelCanceledNotifications', 'Notifications distributed successfully', { travelId: input.travel_id, recipientCount: notificationsToInsert.length })
        console.groupEnd()
        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} travel-canceled notifications`)

    } catch (err) {
        debug.perf.end('travelNotificationsService.distributeTravelCanceledNotifications')
        debug.error('TravelNotificationsService.distributeTravelCanceledNotifications', 'Failed to distribute notifications', { error: err, input })
        console.groupEnd()
        console.error('[NotificationService] Error distributing travel-canceled notifications:', err)
    }
}
