import { supabase } from '../lib/supabase'

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
    const { data, error } = await supabase.functions.invoke('admin-create-fee', {
        body: params
    })

    if (error) throw error
    return data
}
