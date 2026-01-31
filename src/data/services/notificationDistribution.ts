import { supabase } from '../../lib/supabase'
const supabaseAny = supabase as any
import { USE_FAKE_DATA } from '../config'
import type { NotificationAction } from '../../types/notifications'

interface EventNotificationInput {
    id: string
    team_id: string
    org_id: string
    title: string
    start_time: string
    created_by_user_id: string
}

export async function distributeEventNotifications(event: EventNotificationInput): Promise<void> {
    if (USE_FAKE_DATA) return

    try {
        const recipients = new Set<string>()

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

        // Get coaches for team
        const { data: coaches, error: coachError } = await supabaseAny
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', event.team_id)

        if (!coachError && coaches) {
            coaches.forEach(c => recipients.add(c.user_id))
        }

        recipients.delete(event.created_by_user_id)

        if (recipients.size === 0) return

        const action: NotificationAction = 'event_created'

        const notificationsToInsert = Array.from(recipients).map(userId => ({
            user_id: userId,
            org_id: event.org_id,
            team_id: event.team_id,
            action: action,
            title: event.title,
            body: `New event scheduled for ${new Date(event.start_time).toLocaleDateString()}`,
            link_url: `/events/${event.id}`,
            role_context: 'guardian',
            entity_type: 'event',
            entity_id: event.id,
            created_at: new Date().toISOString(),
            metadata: {
                start_time: event.start_time
            }
        }))

        const { error: insertError } = await supabaseAny
            .from('user_notifications')
            .insert(notificationsToInsert as any)

        if (insertError) throw insertError

        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} notifications for event ${event.id}`)

    } catch (err) {
        console.error('[NotificationService] Error distributing event notifications:', err)
    }
}

export async function distributeEventUpdateNotifications(event: EventNotificationInput): Promise<void> {
    if (USE_FAKE_DATA) return

    try {
        const recipients = new Set<string>()

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
            .eq('team_id', event.team_id)

        if (!coachError && coaches) {
            coaches.forEach(c => recipients.add(c.user_id))
        }

        recipients.delete(event.created_by_user_id)

        if (recipients.size === 0) return

        const action: NotificationAction = 'event_updated'

        const notificationsToInsert = Array.from(recipients).map(userId => ({
            user_id: userId,
            org_id: event.org_id,
            team_id: event.team_id,
            action: action,
            title: `Event Updated: ${event.title}`,
            body: `Event details have been updated`,
            link_url: `/events/${event.id}`,
            role_context: 'guardian',
            entity_type: 'event',
            entity_id: event.id,
            created_at: new Date().toISOString(),
            metadata: {
                start_time: event.start_time
            }
        }))

        const { error: insertError } = await supabaseAny
            .from('user_notifications')
            .insert(notificationsToInsert as any)

        if (insertError) throw insertError

        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} update notifications for event ${event.id}`)

    } catch (err) {
        console.error('[NotificationService] Error distributing event update notifications:', err)
    }
}

export async function distributeEventCancelNotifications(event: EventNotificationInput): Promise<void> {
    if (USE_FAKE_DATA) return

    try {
        const recipients = new Set<string>()

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
            .eq('team_id', event.team_id)

        if (!coachError && coaches) {
            coaches.forEach(c => recipients.add(c.user_id))
        }

        recipients.delete(event.created_by_user_id)

        if (recipients.size === 0) return

        const action: NotificationAction = 'event_canceled'

        const notificationsToInsert = Array.from(recipients).map(userId => ({
            user_id: userId,
            org_id: event.org_id,
            team_id: event.team_id,
            action: action,
            title: `Event Canceled: ${event.title}`,
            body: `This event has been canceled`,
            link_url: `/events/${event.id}`,
            role_context: 'guardian',
            entity_type: 'event',
            entity_id: event.id,
            created_at: new Date().toISOString(),
            metadata: {
                start_time: event.start_time
            }
        }))

        const { error: insertError } = await supabaseAny
            .from('user_notifications')
            .insert(notificationsToInsert as any)

        if (insertError) throw insertError

        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} cancel notifications for event ${event.id}`)

    } catch (err) {
        console.error('[NotificationService] Error distributing event cancel notifications:', err)
    }
}
