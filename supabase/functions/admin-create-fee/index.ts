// Follow this setup for all Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get input data
        const {
            // Fee details
            org_id,
            season_id,
            title,
            description,
            fee_type,
            amount_cents,
            due_date,
            scope,
            // Assignment details
            team_id,
            athlete_ids, // For 'selected_players' or 'individual'
            // By User
            user_id // The admin creating this
        } = await req.json()

        if (!org_id || !title || !amount_cents || !scope) {
            throw new Error('Missing required fields')
        }

        // Auth Check: Validate the user is an admin of the org
        // We trust 'user_id' from the body ONLY if we verify the JWT matches it?
        // Actually, normally we get the user from the Auth header.
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
        if (authError || !user) throw new Error('Unauthorized')

        // Verify Admin Role using RPC
        const { data: orgs } = await supabaseClient.rpc('get_user_organizations', { check_user_id: user.id })
        const isAdmin = orgs?.some((o: any) => o.org_id === org_id && o.role === 'org_admin')

        if (!isAdmin) throw new Error('User is not an admin of this organization')

        // Determine target athletes
        let targetAthleteIds: string[] = []

        if (scope === 'team') {
            if (!team_id || !season_id) throw new Error('Team and Season required for team scope')
            // Fetch all athletes in team/season
            const { data: members, error: teamError } = await supabaseClient
                .from('team_memberships')
                .select('athlete_id') // Assuming 'athlete_id' column
                .eq('team_id', team_id)
                .eq('season_id', season_id)

            if (teamError) throw teamError
            targetAthleteIds = members.map((m: any) => m.athlete_id)
        } else {
            // selected_players or individual
            if (!athlete_ids || !Array.isArray(athlete_ids)) throw new Error('athlete_ids array required')
            targetAthleteIds = athlete_ids
        }

        // Fetch primary parents for these athletes
        // We need to map athlete_id -> parent_id
        const assignments = []

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

        if (athleteError) throw athleteError

        // Build assignment map
        for (const athlete of athletesData) {
            if (!athlete.family) continue

            // Find primary parent
            const members = athlete.family.members || []
            const primary = members.find((m: any) => m.is_primary) || members[0] // Fallback to first if no primary

            if (primary) {
                assignments.push({
                    athlete_id: athlete.id,
                    parent_id: primary.user_id,
                    // Amount/balance handled in RPC based on the fee params, but RPC expects these fields?
                    // The RPC body:
                    // VALUES (..., (v_assignment->>'athlete_id'), (v_assignment->>'parent_id') ...)
                    // It reads amounts from p_fee_data, not v_assignment.
                    // So we just need IDs here.
                })
            }
        }

        // Call RPC to create fee and assignments atomically
        const feeData = {
            org_id,
            season_id,
            title,
            description,
            fee_type,
            amount_cents,
            due_date,
            scope,
            status: 'published', // or draft? Let's assume passed in or default to published as per 'CreateFee' intent? 
            // But usually typically 'published' if creating for immediate assignment.
            // Actually let's assume 'published' for now unless 'status' param passed.
            created_by_admin_id: user.id
        }

        const { data: result, error: rpcError } = await supabaseClient.rpc('create_fee_with_assignments', {
            p_fee_data: feeData,
            p_assignments: assignments
        })

        if (rpcError) throw rpcError

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
