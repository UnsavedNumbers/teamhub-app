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
    // Debug logging to validate JWT authentication state
    console.log('[createFee] Starting fee creation with params:', params)

    try {
        // Check current authentication state
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        console.log('[createFee] Auth session check:', {
            hasSession: !!sessionData?.session,
            sessionError: sessionError?.message,
            userId: sessionData?.session?.user?.id,
            expiresAt: sessionData?.session?.expires_at,
            fullSessionData: sessionData
        })

        if (sessionError) {
            console.error('[createFee] Session error:', sessionError)
            throw new Error(`Authentication error: ${sessionError.message}`)
        }

        if (!sessionData?.session) {
            console.error('[createFee] No active session found')
            throw new Error('No active authentication session found')
        }

        // Check if token is expired
        if (sessionData.session.expires_at && sessionData.session.expires_at * 1000 < Date.now()) {
            console.error('[createFee] Session token expired')
            throw new Error('Authentication session has expired')
        }

        // Log JWT token details for debugging (without exposing the full token)
        const accessToken = sessionData.session.access_token
        console.log('[createFee] JWT token details:', {
            hasToken: !!accessToken,
            tokenLength: accessToken?.length,
            tokenPrefix: accessToken?.substring(0, 20) + '...',
            tokenParts: accessToken?.split('.').length
        })
    } catch (sessionCheckError) {
        console.error('[createFee] Session check failed:', sessionCheckError)
        throw sessionCheckError
    }

    console.log('[createFee] Invoking admin-create-fee function')

    // First, test if other Edge Functions work to isolate the issue
    console.log('[createFee] Testing billing function to compare authentication...')
    try {
        const { error: billingError } = await supabase.functions.invoke(SUPABASE_FUNCTIONS.BILLING_CREATE_CHECKOUT_SESSION, {
            body: {
                organization_id: params.org_id,
                requested_plan: 'starter',
                success_url: import.meta.env[ENV_VAR_NAMES.FEES_TEST_SUCCESS_URL] || `${window.location.origin}${getLink('portal.paymentSuccess')}`,
                cancel_url: import.meta.env[ENV_VAR_NAMES.FEES_TEST_CANCEL_URL] || `${window.location.origin}${getLink('portal.paymentCancel')}`
            }
        })
        console.log('[createFee] Billing function test result:', {
            success: !billingError,
            error: billingError?.message
        })
    } catch (e) {
        console.log('[createFee] Billing function test failed:', e)
    }

    // Now try the actual fee creation
    // #region agent log
    const currentSession = await supabase.auth.getSession()
    const authToken = currentSession.data?.session?.access_token
    console.log('[createFee] About to invoke admin-create-fee:', {
        hasToken: !!authToken,
        tokenLength: authToken?.length,
        tokenPrefix: authToken?.substring(0, 20) + '...',
        functionName: 'admin-create-fee'
    })
    // #endregion

    const { data, error } = await supabase.functions.invoke('admin-create-fee', {
        body: params
    })

    // Log additional error details if available
    if (error && typeof error === 'object') {
        console.log('[createFee] Error object keys:', Object.keys(error))
        console.log('[createFee] Error context:', (error as any).context)

        // Try to get the actual error response body
        const errorContext = (error as any).context
        if (errorContext && errorContext.text) {
            try {
                const errorBody = await errorContext.text()
                console.log('[createFee] Edge Function error response:', errorBody)
            } catch (e) {
                console.log('[createFee] Could not read error response body:', e)
            }
        }
    }

    console.log('[createFee] Function response:', {
        data: data ? 'success' : 'null',
        error: error?.message,
        errorCode: error?.code,
        errorDetails: error
    })

    if (error) {
        console.error('[createFee] Function invocation error:', error)
        console.error('[createFee] Full error object:', JSON.stringify(error, null, 2))

        // Check if it's a 400 error with specific message
        if (error.message?.includes('Edge Function returned a non-2xx status code')) {
            console.error('[createFee] Edge Function returned 400 status - this suggests the JWT is being rejected by the function')
        }

        throw error
    }


    console.log('[createFee] Fee creation successful')

    // Distribute notifications
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
            }).catch(err => console.error('Failed to distribute fee notification:', err))
        }
    }

    return data
}
