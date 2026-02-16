import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'
import type { NotificationAction } from '../../types/notifications'
import { notifyUsers } from './notificationServiceCore'

interface FeeNotificationInput {
    fee_id: string
    athlete_id: string
    org_id: string
    team_id?: string
    amount: number
    description: string
    due_date?: string
    created_by_user_id: string
}

export async function distributeFeeAssignedNotifications(input: FeeNotificationInput): Promise<void> {
    console.groupCollapsed(`%cdistributeFeeAssignedNotifications: ${input.fee_id}`, 'color: #666; font-weight: bold;');
    debug.flow('FeeNotificationsService.distributeFeeAssignedNotifications', 'Distributing fee assigned notifications', { feeId: input.fee_id, athleteId: input.athlete_id, amount: input.amount })
    debug.perf.start('feeNotificationsService.distributeFeeAssignedNotifications')

    try {
        if (USE_FAKE_DATA) {
            debug.perf.end('feeNotificationsService.distributeFeeAssignedNotifications')
            debug.flow('FeeNotificationsService.distributeFeeAssignedNotifications', 'Notifications distributed (fake)', { feeId: input.fee_id })
            console.groupEnd()
            return
        }

        const guardianUserIds: string[] = []

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
                    if (u.id !== input.created_by_user_id) {
                        guardianUserIds.push(u.id)
                    }
                })
            }
        }

        if (guardianUserIds.length === 0) {
            debug.perf.end('feeNotificationsService.distributeFeeAssignedNotifications')
            console.groupEnd()
            return
        }

        const action: NotificationAction = 'fee_assigned'

        const result = await notifyUsers({
            userIds: guardianUserIds,
            orgId: input.org_id,
            teamId: input.team_id || null,
            action,
            roleContext: 'guardian',
            title: `New Fee Assigned`,
            body: `${input.description} - $${input.amount.toFixed(2)}${input.due_date ? ` due ${new Date(input.due_date).toLocaleDateString()}` : ''}`,
            linkUrl: `/portal/payments`,
            entityType: 'fee',
            entityId: input.fee_id,
            metadata: {
                amount: input.amount,
                due_date: input.due_date
            }
        })

        debug.perf.end('feeNotificationsService.distributeFeeAssignedNotifications')
        if (result.success) {
            debug.flow('FeeNotificationsService.distributeFeeAssignedNotifications', 'Notifications distributed successfully', { feeId: input.fee_id, recipientCount: result.inAppCount })
            console.log(`[NotificationService] Distributed ${result.inAppCount} fee-assigned notifications`)
        } else {
            debug.error('FeeNotificationsService.distributeFeeAssignedNotifications', 'Failed to distribute notifications', { error: result.error, feeId: input.fee_id })
        }
        console.groupEnd()

    } catch (err) {
        debug.perf.end('feeNotificationsService.distributeFeeAssignedNotifications')
        debug.error('FeeNotificationsService.distributeFeeAssignedNotifications', 'Failed to distribute notifications', { error: err, input })
        console.groupEnd()
        console.error('[NotificationService] Error distributing fee-assigned notifications:', err)
    }
}

export async function distributeFeeOverdueNotifications(input: FeeNotificationInput): Promise<void> {
    console.groupCollapsed(`%cdistributeFeeOverdueNotifications: ${input.fee_id}`, 'color: #666; font-weight: bold;');
    debug.flow('FeeNotificationsService.distributeFeeOverdueNotifications', 'Distributing fee overdue notifications', { feeId: input.fee_id, athleteId: input.athlete_id, amount: input.amount })
    debug.perf.start('feeNotificationsService.distributeFeeOverdueNotifications')

    try {
        if (USE_FAKE_DATA) {
            debug.perf.end('feeNotificationsService.distributeFeeOverdueNotifications')
            debug.flow('FeeNotificationsService.distributeFeeOverdueNotifications', 'Notifications distributed (fake)', { feeId: input.fee_id })
            console.groupEnd()
            return
        }

        const guardianUserIds: string[] = []

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
                    guardianUserIds.push(u.id)
                })
            }
        }

        if (guardianUserIds.length === 0) {
            debug.perf.end('feeNotificationsService.distributeFeeOverdueNotifications')
            console.groupEnd()
            return
        }

        const action: NotificationAction = 'fee_overdue'

        const result = await notifyUsers({
            userIds: guardianUserIds,
            orgId: input.org_id,
            teamId: input.team_id || null,
            action,
            roleContext: 'guardian',
            title: `Payment Overdue`,
            body: `${input.description} - $${input.amount.toFixed(2)} is now overdue`,
            linkUrl: `/portal/payments`,
            entityType: 'fee',
            entityId: input.fee_id,
            presentation: 'warning',
            metadata: {
                amount: input.amount,
                due_date: input.due_date
            }
        })

        debug.perf.end('feeNotificationsService.distributeFeeOverdueNotifications')
        if (result.success) {
            debug.flow('FeeNotificationsService.distributeFeeOverdueNotifications', 'Notifications distributed successfully', { feeId: input.fee_id, recipientCount: result.inAppCount })
            console.log(`[NotificationService] Distributed ${result.inAppCount} fee-overdue notifications`)
        } else {
            debug.error('FeeNotificationsService.distributeFeeOverdueNotifications', 'Failed to distribute notifications', { error: result.error, feeId: input.fee_id })
        }
        console.groupEnd()

    } catch (err) {
        debug.perf.end('feeNotificationsService.distributeFeeOverdueNotifications')
        debug.error('FeeNotificationsService.distributeFeeOverdueNotifications', 'Failed to distribute notifications', { error: err, input })
        console.groupEnd()
        console.error('[NotificationService] Error distributing fee-overdue notifications:', err)
    }
}
