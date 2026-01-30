import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import type { NotificationAction } from '../../types/notifications'

interface TravelNotificationInput {
    travel_id: string
    team_id: string
    org_id: string
    title: string
    start_date: string
    created_by_user_id: string
}

export async function distributeTravelCreatedNotifications(input: TravelNotificationInput): Promise<void> {
    if (USE_FAKE_DATA) return

    try {
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

        const { data: coaches, error: coachError } = await supabase
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', input.team_id)

        if (!coachError && coaches) {
            coaches.forEach(c => recipients.add(c.user_id))
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

        const { error: insertError } = await supabase
            .from('user_notifications')
            .insert(notificationsToInsert)

        if (insertError) throw insertError

        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} travel-created notifications`)

    } catch (err) {
        console.error('[NotificationService] Error distributing travel-created notifications:', err)
    }
}

export async function distributeTravelCanceledNotifications(input: TravelNotificationInput): Promise<void> {
    if (USE_FAKE_DATA) return

    try {
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

        const { data: coaches, error: coachError } = await supabase
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', input.team_id)

        if (!coachError && coaches) {
            coaches.forEach(c => recipients.add(c.user_id))
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

        const { error: insertError } = await supabase
            .from('user_notifications')
            .insert(notificationsToInsert)

        if (insertError) throw insertError

        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} travel-canceled notifications`)

    } catch (err) {
        console.error('[NotificationService] Error distributing travel-canceled notifications:', err)
    }
}
