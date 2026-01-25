// Follow this setup for all Edge Functions
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase env vars missing')
}

// CORS headers matching the working billing functions
function buildCorsHeaders(_req: Request) {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }
}

// Helper function to return JSON responses (matching billing functions pattern)
function json(req: Request, body: unknown, status = 200) {
    const cors = buildCorsHeaders(req)
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, 'Content-Type': 'application/json' },
    })
}

// TypeScript Interfaces
interface CreateFeeRequest {
    org_id: string
    season_id?: string | null
    title: string
    description?: string | null
    fee_type: 'registration' | 'uniform' | 'tournament' | 'travel' | 'fundraiser' | 'misc'
    amount_cents: number
    due_date?: string | null
    scope: 'team' | 'selected_players' | 'individual'
    team_id?: string | null
    athlete_ids?: string[]
}

interface OrganizationMembership {
    org_id: string
    org_name: string
    roles: string[]
}

interface FamilyMember {
    user_id: string
    is_primary: boolean
}

interface AthleteFamily {
    id: string
    members: FamilyMember[]
}

interface AthleteData {
    id: string
    family: AthleteFamily | null
}

interface FeeAssignment {
    athlete_id: string
    parent_id: string
}

interface FeeData {
    org_id: string
    season_id: string | null
    title: string
    description: string | null
    fee_type: string
    amount_cents: number
    due_date: string | null
    scope: string
    status: string
    created_by_admin_id: string
}

// UUID validation regex pattern
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validate if a string is a valid UUID v4
 */
function isValidUUID(value: string | null | undefined): boolean {
    if (!value || typeof value !== 'string') return false
    return UUID_V4_REGEX.test(value)
}

/**
 * Validate if a date string is valid
 */
function isValidDate(dateString: string | null | undefined): boolean {
    if (!dateString) return true // Optional field
    if (typeof dateString !== 'string') return false
    const date = new Date(dateString)
    return !isNaN(date.getTime())
}

/**
 * Centralized input validation function
 */
function validateInput(data: CreateFeeRequest): void {
    // Required fields
    if (!data.org_id) {
        throw new Error('Missing required field: org_id')
    }
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        throw new Error('Missing or invalid field: title must be a non-empty string')
    }
    if (!data.amount_cents) {
        throw new Error('Missing required field: amount_cents')
    }
    if (!data.scope) {
        throw new Error('Missing required field: scope')
    }
    if (!data.fee_type) {
        throw new Error('Missing required field: fee_type')
    }

    // UUID validation
    if (!isValidUUID(data.org_id)) {
        throw new Error('Invalid org_id: must be a valid UUID')
    }
    if (data.season_id && !isValidUUID(data.season_id)) {
        throw new Error('Invalid season_id: must be a valid UUID')
    }
    if (data.team_id && !isValidUUID(data.team_id)) {
        throw new Error('Invalid team_id: must be a valid UUID')
    }

    // Enum validation
    const validFeeTypes: string[] = ['registration', 'uniform', 'tournament', 'travel', 'fundraiser', 'misc']
    if (!validFeeTypes.includes(data.fee_type)) {
        throw new Error(`Invalid fee_type: must be one of ${validFeeTypes.join(', ')}`)
    }

    const validScopes: string[] = ['team', 'selected_players', 'individual']
    if (!validScopes.includes(data.scope)) {
        throw new Error(`Invalid scope: must be one of ${validScopes.join(', ')}`)
    }

    // Numeric validation
    if (typeof data.amount_cents !== 'number' || !Number.isInteger(data.amount_cents) || data.amount_cents <= 0) {
        throw new Error('Invalid amount_cents: must be a positive integer')
    }

    // Date validation
    if (!isValidDate(data.due_date)) {
        throw new Error('Invalid due_date: must be a valid date string')
    }

    // Scope-specific validation
    if (data.scope === 'team') {
        if (!data.team_id) {
            throw new Error('team_id is required when scope is "team"')
        }
        if (!data.season_id) {
            throw new Error('season_id is required when scope is "team"')
        }
    } else if (data.scope === 'selected_players' || data.scope === 'individual') {
        if (!data.athlete_ids || !Array.isArray(data.athlete_ids) || data.athlete_ids.length === 0) {
            throw new Error('athlete_ids must be a non-empty array when scope is "selected_players" or "individual"')
        }
        // Validate all athlete_ids are valid UUIDs
        for (const athleteId of data.athlete_ids) {
            if (!isValidUUID(athleteId)) {
                throw new Error(`Invalid athlete_id in array: ${athleteId} must be a valid UUID`)
            }
        }
    }
}

/**
 * Extract a readable error message from various error types
 */
function extractErrorMessage(error: unknown): string {
    // Handle Error instances
    if (error instanceof Error) {
        return error.message || 'Unknown error'
    }

    // Handle Supabase PostgREST errors
    if (error && typeof error === 'object') {
        const errorObj = error as Record<string, unknown>
        
        // Try to extract message from common Supabase error properties
        if (typeof errorObj.message === 'string' && errorObj.message) {
            return errorObj.message
        }
        if (typeof errorObj.details === 'string' && errorObj.details) {
            return errorObj.details
        }
        if (typeof errorObj.hint === 'string' && errorObj.hint) {
            return errorObj.hint
        }
        
        // If error has a code, include it for debugging
        const code = typeof errorObj.code === 'string' ? errorObj.code : ''
        
        // Try to stringify the error object safely
        try {
            const stringified = JSON.stringify(errorObj, null, 2)
            if (stringified && stringified !== '{}') {
                return code ? `Error ${code}: ${stringified}` : stringified
            }
        } catch {
            // If stringification fails, fall through to default
        }
        
        // Last resort: try to get a string representation
        if (code) {
            return `Database error (${code})`
        }
    }

    // Handle string errors
    if (typeof error === 'string') {
        return error
    }

    // Fallback
    return 'An unexpected error occurred'
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
    }

    // Only allow POST method
    if (req.method !== 'POST') {
        return json(req, { error: 'Method not allowed' }, 405)
    }

    try {
        // Create Supabase client with service role key, passing user's auth header
        // (Same pattern as working billing functions - MUST use service role key for JWT verification)
        const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
            global: {
                headers: { Authorization: req.headers.get('Authorization') ?? '' },
            },
        })

        // Get input data
        let requestData: CreateFeeRequest
        try {
            requestData = await req.json()
        } catch {
            return json(req, { error: 'Invalid JSON' }, 400)
        }

        // Validate input
        validateInput(requestData)

        // Auth Check: Validate the user is authenticated
        // Use the same pattern as working billing functions
        // #region agent log
        const authHeader = req.headers.get('Authorization')
        console.log('[admin-create-fee] Auth header check:', {
            hasHeader: !!authHeader,
            headerPrefix: authHeader?.substring(0, 20) + '...',
            headerLength: authHeader?.length
        })
        // #endregion
        
        // #region agent log
        let getUserResult
        try {
            getUserResult = await supabaseClient.auth.getUser()
            console.log('[admin-create-fee] getUser() result:', {
                hasData: !!getUserResult?.data,
                hasUser: !!getUserResult?.data?.user,
                hasError: !!getUserResult?.error,
                errorMessage: getUserResult?.error?.message,
                errorStatus: getUserResult?.error?.status,
                userId: getUserResult?.data?.user?.id
            })
        } catch (getUserError) {
            console.error('[admin-create-fee] getUser() threw exception:', {
                error: getUserError,
                errorMessage: getUserError instanceof Error ? getUserError.message : String(getUserError),
                errorType: getUserError?.constructor?.name
            })
            return json(req, { error: 'Invalid JWT' }, 401)
        }
        // #endregion
        
        const { data: { user }, error: authError } = getUserResult
        
        // #region agent log
        if (authError) {
            console.error('[admin-create-fee] Auth error from getUser():', {
                message: authError.message,
                status: authError.status,
                name: authError.name,
                fullError: JSON.stringify(authError, Object.getOwnPropertyNames(authError))
            })
            return json(req, { error: authError.message || 'Invalid JWT' }, 401)
        }
        // #endregion
        
        if (!user) {
            // #region agent log
            console.error('[admin-create-fee] No user returned from getUser()', {
                hasData: !!getUserResult?.data,
                hasError: !!getUserResult?.error
            })
            // #endregion
            return json(req, { error: 'Unauthorized' }, 401)
        }

        // Verify Admin Role using RPC (same pattern as billing-create-checkout-session)
        const { data: memberships, error: membershipError } = await supabaseClient.rpc('get_user_organizations', {
            check_user_id: user.id
        })

        if (membershipError) {
            return json(req, { error: membershipError.message }, 400)
        }

        // Check if user is org_admin of the specified organization
        const isAdmin = (memberships as OrganizationMembership[] | null)?.some(
            (m) => m.org_id === requestData.org_id &&
                   Array.isArray(m.roles) &&
                   m.roles.includes('org_admin')
        )

        if (!isAdmin) {
            return json(req, { error: 'Forbidden' }, 403)
        }

        // Check if any athletes exist in org with active guardians (can receive fees)
        // IMPORTANT: Count queries return { count: number | null }, NOT { data: ... }
        const { count, error: athleteCheckError } = await supabaseClient
            .from('athlete_guardians')
            .select('athlete_id', { count: 'exact', head: true })
            .eq('org_id', requestData.org_id)
            .eq('status', 'active')
            .limit(1) // Performance: only need to know if any exist

        // Handle query errors with proper error extraction (use existing helper)
        if (athleteCheckError) {
            const errorMsg = extractErrorMessage(athleteCheckError)
            console.error('Error checking athletes with guardians:', {
                message: errorMsg,
                error: athleteCheckError
            })
            return json(req, { error: 'Failed to verify athletes. Please try again.' }, 500)
        }

        // Count queries return { count: number | null }, handle null with nullish coalescing
        const hasAssignableAthletes = (count ?? 0) > 0

        if (!hasAssignableAthletes) {
            return json(req, {
                error: 'Cannot create fees: No athletes with active guardians found in this organization. Please add athletes and assign guardians before creating fees.'
            }, 400)
        }

        // Determine target athletes
        let targetAthleteIds: string[] = []

        if (requestData.scope === 'team') {
            // Fetch all athletes in team/season
            const { data: members, error: teamError } = await supabaseClient
                .from('team_memberships')
                .select('athlete_id')
                .eq('team_id', requestData.team_id!)
                .eq('season_id', requestData.season_id!)

            if (teamError) {
                const errorMsg = extractErrorMessage(teamError)
                console.error('Error fetching team members:', {
                    message: errorMsg,
                    error: teamError
                })
                return json(req, { error: `Failed to fetch team members: ${errorMsg}` }, 500)
            }

            if (!members || members.length === 0) {
                return json(req, { error: 'No athletes found for the specified team/season' }, 400)
            }

            targetAthleteIds = members.map((m: { athlete_id: string }) => m.athlete_id)
        } else {
            // selected_players or individual
            targetAthleteIds = requestData.athlete_ids!
        }

        // Validate that all athlete_ids exist in database
        if (targetAthleteIds.length > 0) {
            const { data: existingAthletes, error: checkError } = await supabaseClient
                .from('athletes')
                .select('id')
                .in('id', targetAthleteIds)

            if (checkError) {
                const errorMsg = extractErrorMessage(checkError)
                console.error('Error checking athletes:', {
                    message: errorMsg,
                    error: checkError
                })
                return json(req, { error: `Failed to validate athletes: ${errorMsg}` }, 500)
            }

            if (!existingAthletes || existingAthletes.length !== targetAthleteIds.length) {
                return json(req, { error: 'One or more athlete_ids do not exist in the database' }, 400)
            }
        }

        // Fetch primary parents for these athletes
        const assignments: FeeAssignment[] = []

        if (targetAthleteIds.length > 0) {
            // Batch fetch families
            const { data: athletesData, error: athleteError } = await supabaseClient
                .from('athletes')
                .select(`
                    id,
                    family:families (
                        id,
                        members:family_members (
                            user_id,
                            is_primary
                        )
                    )
                `)
                .in('id', targetAthleteIds)

            if (athleteError) {
                const errorMsg = extractErrorMessage(athleteError)
                console.error('Error fetching athletes:', {
                    message: errorMsg,
                    error: athleteError
                })
                return json(req, { error: `Failed to fetch athlete data: ${errorMsg}` }, 500)
            }

            if (!athletesData || athletesData.length === 0) {
                return json(req, { error: 'No athlete data found for the specified IDs' }, 400)
            }

            // Build assignment map
            for (const athlete of athletesData as AthleteData[]) {
                if (!athlete.family) {
                    console.warn(`Athlete ${athlete.id} has no family, skipping`)
                    continue
                }

                const members = athlete.family.members || []
                if (members.length === 0) {
                    console.warn(`Athlete ${athlete.id} family has no members, skipping`)
                    continue
                }

                // Find primary parent
                const primary = members.find((m: FamilyMember) => m.is_primary) || members[0]

                if (primary && primary.user_id) {
                    assignments.push({
                        athlete_id: athlete.id,
                        parent_id: primary.user_id,
                    })
                } else {
                    console.warn(`Athlete ${athlete.id} has no valid parent, skipping`)
                }
            }
        }

        // Validate assignments were created
        if (assignments.length === 0) {
            return json(req, { error: 'No valid parent assignments found for selected athletes. Ensure all athletes have associated families with at least one parent.' }, 400)
        }

        // Call RPC to create fee and assignments atomically
        const feeData: FeeData = {
            org_id: requestData.org_id,
            season_id: requestData.season_id ?? null,
            title: requestData.title,
            description: requestData.description ?? null,
            fee_type: requestData.fee_type,
            amount_cents: requestData.amount_cents,
            due_date: requestData.due_date ?? null,
            scope: requestData.scope,
            status: 'published',
            created_by_admin_id: user.id
        }

        const { data: result, error: rpcError } = await supabaseClient.rpc('create_fee_with_assignments', {
            p_fee_data: feeData,
            p_assignments: assignments
        })

        if (rpcError) {
            // Extract detailed error information
            const errorMessage = extractErrorMessage(rpcError)
            const errorCode = (rpcError as { code?: string })?.code || ''
            const errorDetails = (rpcError as { details?: string })?.details || ''
            const errorHint = (rpcError as { hint?: string })?.hint || ''
            
            console.error('RPC error creating fee:', {
                message: errorMessage,
                code: errorCode,
                details: errorDetails,
                hint: errorHint,
                fullError: rpcError
            })
            
            // Provide user-friendly error messages based on error type
            let userFriendlyMessage = 'Failed to create fee'
            
            // Check for specific database error codes
            if (errorCode === '23503' || errorMessage.toLowerCase().includes('foreign key')) {
                userFriendlyMessage = 'Failed to create fee: Invalid organization, season, or team reference. Please verify all IDs are correct.'
            } else if (errorCode === '23505' || errorMessage.toLowerCase().includes('unique constraint')) {
                userFriendlyMessage = 'Failed to create fee: A fee with these details already exists.'
            } else if (errorCode === '23514' || errorMessage.toLowerCase().includes('check constraint')) {
                userFriendlyMessage = 'Failed to create fee: Data validation failed. Please check your input values.'
            } else if (errorCode === '23502' || errorMessage.toLowerCase().includes('not null')) {
                userFriendlyMessage = 'Failed to create fee: Required fields are missing.'
            } else if (errorMessage.toLowerCase().includes('constraint') || errorMessage.toLowerCase().includes('violates')) {
                userFriendlyMessage = 'Failed to create fee: Data validation failed. Please check your input.'
            } else if (errorDetails) {
                // Use details if available (often more specific than message)
                userFriendlyMessage = `Failed to create fee: ${errorDetails}`
            } else if (errorHint) {
                // Use hint if available
                userFriendlyMessage = `Failed to create fee: ${errorHint}`
            } else if (errorMessage && errorMessage !== 'Unknown error') {
                // Use the extracted message
                userFriendlyMessage = `Failed to create fee: ${errorMessage}`
            }
            
            return json(req, { error: userFriendlyMessage }, 500)
        }

        return json(req, result, 200)

    } catch (error) {
        const message = extractErrorMessage(error)
        console.error('Unhandled error in admin-create-fee:', error)
        return json(req, { error: message }, 400)
    }
})
