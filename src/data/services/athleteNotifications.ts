import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'
import type { NotificationAction } from '../../types/notifications'

const supabaseAny = supabase as any

interface AthleteTeamNotificationInput {
    athlete_id: string
    team_id: string
    org_id: string
    athlete_name: string
    team_name: string
    action_by_user_id: string
}

export async function distributeAthleteAddedNotifications(input: AthleteTeamNotificationInput): Promise<void> {
    debug.flow('AthleteNotifications.distributeAthleteAddedNotifications', 'Distributing notifications', { athleteId: input.athlete_id, teamId: input.team_id, orgId: input.org_id })
    debug.perf.start('athleteNotifications.distributeAthleteAddedNotifications')

    if (USE_FAKE_DATA) {
        debug.perf.end('athleteNotifications.distributeAthleteAddedNotifications')
        return
    }

    try {
        const recipients = new Set<string>()

        // Get guardians of the athlete
        const { data: athlete, error: athleteError } = await supabase
            .from('athletes')
            .select('family_id')
            .eq('id', input.athlete_id)
            .single()

        if (!athleteError && athlete?.family_id) {
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, preferences')
                .eq('family_id', athlete.family_id)

            if (!userError && users) {
                users.forEach(u => {
                    const prefs = u.preferences as any
                    const notifications = prefs?.notifications
                    const isEnabled = notifications?.registration_activity !== false

                    if (isEnabled) {
                        recipients.add(u.id)
                    }
                })
            }
        }

        // Get coaches of the team
        const { data: coaches, error: coachError } = await supabaseAny
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', input.team_id)

        if (!coachError && coaches) {
            coaches.forEach((c: any) => recipients.add(c.user_id))
        }

        recipients.delete(input.action_by_user_id)

        if (recipients.size === 0) return

        const action: NotificationAction = 'athlete_added_to_team'

        const notificationsToInsert = Array.from(recipients).map(userId => ({
            user_id: userId,
            org_id: input.org_id,
            team_id: input.team_id,
            action: action,
            title: `Athlete Added to Team`,
            body: `${input.athlete_name} has been added to ${input.team_name}`,
            link_url: `/athletes/${input.athlete_id}`,
            role_context: 'guardian',
            entity_type: 'athlete',
            entity_id: input.athlete_id,
            created_at: new Date().toISOString(),
            metadata: {
                team_name: input.team_name
            }
        }))

        const { error: insertError } = await supabaseAny
            .from('user_notifications')
            .insert(notificationsToInsert as any)

        if (insertError) throw insertError

        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} athlete-added notifications`)

    } catch (err) {
        console.error('[NotificationService] Error distributing athlete-added notifications:', err)
    }
}

export async function distributeAthleteRemovedNotifications(input: AthleteTeamNotificationInput): Promise<void> {
    if (USE_FAKE_DATA) return

    try {
        const recipients = new Set<string>()

        const { data: athlete, error: athleteError } = await supabase
            .from('athletes')
            .select('family_id')
            .eq('id', input.athlete_id)
            .single()

        if (!athleteError && athlete?.family_id) {
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, preferences')
                .eq('family_id', athlete.family_id)

            if (!userError && users) {
                users.forEach(u => {
                    const prefs = u.preferences as any
                    const notifications = prefs?.notifications
                    const isEnabled = notifications?.registration_activity !== false

                    if (isEnabled) {
                        recipients.add(u.id)
                    }
                })
            }
        }

        const { data: coaches, error: coachError } = await supabaseAny
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', input.team_id)

        if (!coachError && coaches) {
            coaches.forEach((c: any) => recipients.add(c.user_id))
        }

        recipients.delete(input.action_by_user_id)

        if (recipients.size === 0) return

        const action: NotificationAction = 'athlete_removed_from_team'

        const notificationsToInsert = Array.from(recipients).map(userId => ({
            user_id: userId,
            org_id: input.org_id,
            team_id: input.team_id,
            action: action,
            title: `Athlete Removed from Team`,
            body: `${input.athlete_name} has been removed from ${input.team_name}`,
            link_url: `/athletes/${input.athlete_id}`,
            role_context: 'guardian',
            entity_type: 'athlete',
            entity_id: input.athlete_id,
            created_at: new Date().toISOString(),
            metadata: {
                team_name: input.team_name
            }
        }))

        const { error: insertError } = await supabaseAny
            .from('user_notifications')
            .insert(notificationsToInsert as any)

        if (insertError) throw insertError

        debug.perf.end('athleteNotifications.distributeAthleteRemovedNotifications')
        debug.flow('AthleteNotifications.distributeAthleteRemovedNotifications', 'Notifications distributed', { athleteId: input.athlete_id, teamId: input.team_id, count: notificationsToInsert.length })
        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} athlete-removed notifications`)

    } catch (err) {
        debug.perf.end('athleteNotifications.distributeAthleteRemovedNotifications')
        debug.error('AthleteNotifications.distributeAthleteRemovedNotifications', 'Failed to distribute notifications', { error: err, athleteId: input.athlete_id, teamId: input.team_id })
        console.error('[NotificationService] Error distributing athlete-removed notifications:', err)
    }
}
