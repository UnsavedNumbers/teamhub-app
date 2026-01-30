import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import type { NotificationAction } from '../../types/notifications'

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
                    const isEnabled = notifications?.payment_issues !== false

                    if (isEnabled) {
                        recipients.add(u.id)
                    }
                })
            }
        }

        recipients.delete(input.created_by_user_id)

        if (recipients.size === 0) return

        const action: NotificationAction = 'fee_assigned'

        const notificationsToInsert = Array.from(recipients).map(userId => ({
            user_id: userId,
            org_id: input.org_id,
            team_id: input.team_id || null,
            action: action,
            title: `New Fee Assigned`,
            body: `${input.description} - $${input.amount.toFixed(2)}${input.due_date ? ` due ${new Date(input.due_date).toLocaleDateString()}` : ''}`,
            link_url: `/payments/${input.fee_id}`,
            role_context: 'guardian',
            entity_type: 'fee',
            entity_id: input.fee_id,
            created_at: new Date().toISOString(),
            metadata: {
                amount: input.amount,
                due_date: input.due_date
            }
        }))

        const { error: insertError } = await supabase
            .from('user_notifications')
            .insert(notificationsToInsert)

        if (insertError) throw insertError

        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} fee-assigned notifications`)

    } catch (err) {
        console.error('[NotificationService] Error distributing fee-assigned notifications:', err)
    }
}

export async function distributeFeeOverdueNotifications(input: FeeNotificationInput): Promise<void> {
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
                    const isEnabled = notifications?.payment_issues !== false

                    if (isEnabled) {
                        recipients.add(u.id)
                    }
                })
            }
        }

        if (recipients.size === 0) return

        const action: NotificationAction = 'fee_overdue'

        const notificationsToInsert = Array.from(recipients).map(userId => ({
            user_id: userId,
            org_id: input.org_id,
            team_id: input.team_id || null,
            action: action,
            title: `Payment Overdue`,
            body: `${input.description} - $${input.amount.toFixed(2)} is now overdue`,
            link_url: `/payments/${input.fee_id}`,
            role_context: 'guardian',
            entity_type: 'fee',
            entity_id: input.fee_id,
            created_at: new Date().toISOString(),
            metadata: {
                amount: input.amount,
                due_date: input.due_date
            }
        }))

        const { error: insertError } = await supabase
            .from('user_notifications')
            .insert(notificationsToInsert)

        if (insertError) throw insertError

        console.log(`[NotificationService] Distributed ${notificationsToInsert.length} fee-overdue notifications`)

    } catch (err) {
        console.error('[NotificationService] Error distributing fee-overdue notifications:', err)
    }
}
