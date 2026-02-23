import { supabase } from '../lib/supabase'
import { SUPABASE_FUNCTIONS, ENV_VAR_NAMES } from '../constants/api'
import { getLink } from '../utils/routes'

export interface CreateFeeParams {
    org_id: string
    season_id: string
    title: string
    description?: string
    fee_type: 'registration' | 'uniform' | 'tournament' | 'travel' | 'fundraiser' | 'misc'
    amount_cents: number
    due_date?: string
    scope: 'team' | 'individual' | 'selected_players'
    // For team scope
    team_id?: string
    // For others
    athlete_ids?: string[]

    // Optional config
    allow_partial_payment?: boolean
    allow_installments?: boolean
    allow_discounts?: boolean
    allow_scholarships?: boolean
    visibility?: 'all_parents' | 'assigned_only'
}

export async function createFee(params: CreateFeeParams) {
    try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
            throw new Error(`Authentication error: ${sessionError.message}`)
        }

        if (!sessionData?.session) {
            throw new Error('No active authentication session found')
        }

        if (sessionData.session.expires_at && sessionData.session.expires_at * 1000 < Date.now()) {
            throw new Error('Authentication session has expired')
        }
    } catch (sessionCheckError) {
        throw sessionCheckError
    }

    try {
        await supabase.functions.invoke(SUPABASE_FUNCTIONS.BILLING_CREATE_CHECKOUT_SESSION, {
            body: {
                organization_id: params.org_id,
                requested_plan: 'starter',
                success_url: import.meta.env[ENV_VAR_NAMES.FEES_TEST_SUCCESS_URL] || `${window.location.origin}${getLink('portal.paymentSuccess')}`,
                cancel_url: import.meta.env[ENV_VAR_NAMES.FEES_TEST_CANCEL_URL] || `${window.location.origin}${getLink('portal.paymentCancel')}`
            }
        })
    } catch {
        // Billing test is diagnostic only; continue to fee creation
    }

    const { data, error } = await supabase.functions.invoke('admin-create-fee', {
        body: params
    })

    if (error) {
        throw error
    }

    if (data?.fee_id && params.athlete_ids && params.athlete_ids.length > 0) {
        const { distributeFeeAssignedNotifications } = await import('../data/services/feeNotifications')
        const { data: sessionData } = await supabase.auth.getSession()

        for (const athleteId of params.athlete_ids) {
            distributeFeeAssignedNotifications({
                fee_id: data.fee_id,
                athlete_id: athleteId,
                org_id: params.org_id,
                team_id: params.team_id,
                amount: params.amount_cents / 100,
                description: params.title,
                due_date: params.due_date,
                created_by_user_id: sessionData?.session?.user?.id || ''
            }).catch(() => {})
        }
    }

    return data
}
