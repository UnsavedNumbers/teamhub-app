import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'
import type { NotificationAction } from '../../types/notifications'
import { notifyUsers } from './notificationServiceCore'

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
        const guardianUserIds: string[] = []
        const coachUserIds: string[] = []

        // Get guardians of the athlete
        const { data: athlete, error: athleteError } = await supabase
            .from('athletes')
            .select('family_id')
            .eq('id', input.athlete_id)
            .single()

        if (!athleteError && athlete?.family_id) {
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('family_id', athlete.family_id)

            if (!userError && users) {
                users.forEach(u => {
                    if (u.id !== input.action_by_user_id) {
                        guardianUserIds.push(u.id)
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
            coaches.forEach((c: any) => {
                if (c.user_id !== input.action_by_user_id) {
                    coachUserIds.push(c.user_id)
                }
            })
        }

        const action: NotificationAction = 'athlete_added_to_team'
        let totalInAppCount = 0

        // Notify guardians
        if (guardianUserIds.length > 0) {
            const result = await notifyUsers({
                userIds: guardianUserIds,
                orgId: input.org_id,
                teamId: input.team_id,
                action,
                roleContext: 'guardian',
                title: `Athlete Added to Team`,
                body: `${input.athlete_name} has been added to ${input.team_name}`,
                linkUrl: `/admin/athletes/${input.athlete_id}`,
                entityType: 'athlete',
                entityId: input.athlete_id,
                metadata: {
                    team_name: input.team_name
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
                title: `Athlete Added to Team`,
                body: `${input.athlete_name} has been added to ${input.team_name}`,
                linkUrl: `/admin/athletes/${input.athlete_id}`,
                entityType: 'athlete',
                entityId: input.athlete_id,
                metadata: {
                    team_name: input.team_name
                }
            })
            if (result.success) {
                totalInAppCount += result.inAppCount
            }
        }

        debug.perf.end('athleteNotifications.distributeAthleteAddedNotifications')
        debug.flow('AthleteNotifications.distributeAthleteAddedNotifications', 'Notifications distributed', {
            athleteId: input.athlete_id,
            teamId: input.team_id,
            count: totalInAppCount,
        })
        console.log(`[NotificationService] Distributed ${totalInAppCount} athlete-added notifications`)

    } catch (err) {
        console.error('[NotificationService] Error distributing athlete-added notifications:', err)
    }
}

export async function distributeAthleteRemovedNotifications(input: AthleteTeamNotificationInput): Promise<void> {
    debug.flow('AthleteNotifications.distributeAthleteRemovedNotifications', 'Distributing notifications', {
        athleteId: input.athlete_id,
        teamId: input.team_id,
        orgId: input.org_id,
    })
    debug.perf.start('athleteNotifications.distributeAthleteRemovedNotifications')

    if (USE_FAKE_DATA) {
        debug.perf.end('athleteNotifications.distributeAthleteRemovedNotifications')
        return
    }

    try {
        const guardianUserIds: string[] = []
        const coachUserIds: string[] = []

        const { data: athlete, error: athleteError } = await supabase
            .from('athletes')
            .select('family_id')
            .eq('id', input.athlete_id)
            .single()

        if (!athleteError && athlete?.family_id) {
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('family_id', athlete.family_id)

            if (!userError && users) {
                users.forEach(u => {
                    if (u.id !== input.action_by_user_id) {
                        guardianUserIds.push(u.id)
                    }
                })
            }
        }

        const { data: coaches, error: coachError } = await supabaseAny
            .from('coach_assignments')
            .select('user_id')
            .eq('team_id', input.team_id)

        if (!coachError && coaches) {
            coaches.forEach((c: any) => {
                if (c.user_id !== input.action_by_user_id) {
                    coachUserIds.push(c.user_id)
                }
            })
        }

        const action: NotificationAction = 'athlete_removed_from_team'
        let totalInAppCount = 0

        // Notify guardians
        if (guardianUserIds.length > 0) {
            const result = await notifyUsers({
                userIds: guardianUserIds,
                orgId: input.org_id,
                teamId: input.team_id,
                action,
                roleContext: 'guardian',
                title: `Athlete Removed from Team`,
                body: `${input.athlete_name} has been removed from ${input.team_name}`,
                linkUrl: `/admin/athletes/${input.athlete_id}`,
                entityType: 'athlete',
                entityId: input.athlete_id,
                metadata: {
                    team_name: input.team_name
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
                title: `Athlete Removed from Team`,
                body: `${input.athlete_name} has been removed from ${input.team_name}`,
                linkUrl: `/admin/athletes/${input.athlete_id}`,
                entityType: 'athlete',
                entityId: input.athlete_id,
                metadata: {
                    team_name: input.team_name
                }
            })
            if (result.success) {
                totalInAppCount += result.inAppCount
            }
        }

        debug.perf.end('athleteNotifications.distributeAthleteRemovedNotifications')
        debug.flow('AthleteNotifications.distributeAthleteRemovedNotifications', 'Notifications distributed', {
            athleteId: input.athlete_id,
            teamId: input.team_id,
            count: totalInAppCount,
        })
        console.log(`[NotificationService] Distributed ${totalInAppCount} athlete-removed notifications`)

    } catch (err) {
        debug.perf.end('athleteNotifications.distributeAthleteRemovedNotifications')
        debug.error('AthleteNotifications.distributeAthleteRemovedNotifications', 'Failed to distribute notifications', { error: err, athleteId: input.athlete_id, teamId: input.team_id })
        console.error('[NotificationService] Error distributing athlete-removed notifications:', err)
    }
}
