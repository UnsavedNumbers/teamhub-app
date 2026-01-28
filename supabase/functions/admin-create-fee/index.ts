import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

// ---- CORS helpers ----
function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  const reqHeaders = req.headers.get("Access-Control-Request-Headers") ??
    "authorization, x-client-info, apikey, content-type"

  return {
    // Reflect origin (more compatible than '*', especially if credentials are ever used)
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",

    "Access-Control-Allow-Methods": "POST, OPTIONS",

    // Echo requested headers so preflight matches what the browser asked for
    "Access-Control-Allow-Headers": reqHeaders,

    // Optional but helpful: cache preflight for 1 day
    "Access-Control-Max-Age": "86400",
  }
}

function json(req: Request, body: unknown, status = 200) {
  const cors = buildCorsHeaders(req)
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

// ---- Types ----
interface CreateFeeRequest {
  org_id: string
  season_id?: string | null
  title: string
  description?: string | null
  fee_type: "registration" | "uniform" | "tournament" | "travel" | "fundraiser" | "misc"
  amount_cents: number
  due_date?: string | null
  scope: "team" | "selected_players" | "individual"
  team_id?: string | null
  athlete_ids?: string[]
  
  // Optional payment settings
  allow_partial_payment?: boolean
  allow_installments?: boolean
  allow_discounts?: boolean
  allow_scholarships?: boolean
}

interface OrganizationMembership {
  org_id: string
  org_name: string
  roles: string[]
}

interface AthleteGuardian {
  user_id: string
  status: string
}

interface AthleteWithGuardians {
  id: string
  guardians: AthleteGuardian[]
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
  
  // Optional payment settings
  allow_partial_payment?: boolean
  allow_installments?: boolean
  allow_discounts?: boolean
  allow_scholarships?: boolean
}

// ---- Validation helpers ----
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false
  return UUID_V4_REGEX.test(value)
}

function isValidDate(dateString: string | null | undefined): boolean {
  if (!dateString) return true
  if (typeof dateString !== "string") return false
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

function validateInput(data: CreateFeeRequest): void {
  if (!data.org_id) throw new Error("Missing required field: org_id")
  if (!data.title || typeof data.title !== "string" || data.title.trim().length === 0) {
    throw new Error("Missing or invalid field: title must be a non-empty string")
  }
  if (data.amount_cents == null) throw new Error("Missing required field: amount_cents")
  if (!data.scope) throw new Error("Missing required field: scope")
  if (!data.fee_type) throw new Error("Missing required field: fee_type")

  if (!isValidUUID(data.org_id)) throw new Error("Invalid org_id: must be a valid UUID")
  if (data.season_id && !isValidUUID(data.season_id)) {
    throw new Error("Invalid season_id: must be a valid UUID")
  }
  if (data.team_id && !isValidUUID(data.team_id)) {
    throw new Error("Invalid team_id: must be a valid UUID")
  }

  const validFeeTypes = ["registration", "uniform", "tournament", "travel", "fundraiser", "misc"]
  if (!validFeeTypes.includes(data.fee_type)) {
    throw new Error(`Invalid fee_type: must be one of ${validFeeTypes.join(", ")}`)
  }

  const validScopes = ["team", "selected_players", "individual"]
  if (!validScopes.includes(data.scope)) {
    throw new Error(`Invalid scope: must be one of ${validScopes.join(", ")}`)
  }

  if (typeof data.amount_cents !== "number" || !Number.isInteger(data.amount_cents) || data.amount_cents <= 0) {
    throw new Error("Invalid amount_cents: must be a positive integer")
  }

  if (!isValidDate(data.due_date)) {
    throw new Error("Invalid due_date: must be a valid date string")
  }

  if (data.scope === "team") {
    if (!data.team_id) throw new Error('team_id is required when scope is "team"')
    if (!data.season_id) throw new Error('season_id is required when scope is "team"')
  } else {
    if (!data.athlete_ids || !Array.isArray(data.athlete_ids) || data.athlete_ids.length === 0) {
      throw new Error('athlete_ids must be a non-empty array when scope is "selected_players" or "individual"')
    }
    for (const athleteId of data.athlete_ids) {
      if (!isValidUUID(athleteId)) {
        throw new Error(`Invalid athlete_id in array: ${athleteId} must be a valid UUID`)
      }
    }
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || "Unknown error"
  if (typeof error === "string") return error

  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>
    if (typeof e.message === "string" && e.message) return e.message
    if (typeof e.details === "string" && e.details) return e.details
    if (typeof e.hint === "string" && e.hint) return e.hint
    const code = typeof e.code === "string" ? e.code : ""
    if (code) return `Database error (${code})`
  }

  return "An unexpected error occurred"
}

// ---- Handler ----
serve(async (req) => {
  // Always handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  // Read env vars inside handler so we can still return CORS headers on failure
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json(
      req,
      { error: "Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      500,
    )
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
    })

    let requestData: CreateFeeRequest
    try {
      requestData = await req.json()
    } catch {
      return json(req, { error: "Invalid JSON" }, 400)
    }

    validateInput(requestData)

    // Auth
    const getUserResult = await supabaseClient.auth.getUser()
    const { data: { user }, error: authError } = getUserResult

    if (authError) return json(req, { error: authError.message || "Invalid JWT" }, 401)
    if (!user) return json(req, { error: "Unauthorized" }, 401)

    // Admin check
    const { data: memberships, error: membershipError } = await supabaseClient.rpc("get_user_organizations", {
      check_user_id: user.id,
    })
    if (membershipError) return json(req, { error: membershipError.message }, 400)

    const isAdmin = (memberships as OrganizationMembership[] | null)?.some(
      (m) => m.org_id === requestData.org_id && Array.isArray(m.roles) && m.roles.includes("org_admin"),
    )
    if (!isAdmin) return json(req, { error: "Forbidden" }, 403)

    // Ensure assignable athletes exist
    const { count, error: athleteCheckError } = await supabaseClient
      .from("athlete_guardians")
      .select("athlete_id", { count: "exact", head: true })
      .eq("org_id", requestData.org_id)
      .eq("status", "active")
      .limit(1)

    if (athleteCheckError) {
      console.error("Error checking athletes with guardians:", athleteCheckError)
      return json(req, { error: "Failed to verify athletes. Please try again." }, 500)
    }

    if ((count ?? 0) === 0) {
      return json(req, {
        error:
          "Cannot create fees: No athletes with active guardians found in this organization. Please add athletes and assign guardians before creating fees.",
      }, 400)
    }

    // Determine targets
    let targetAthleteIds: string[] = []

    if (requestData.scope === "team") {
      const { data: members, error: teamError } = await supabaseClient
        .from("team_memberships")
        .select("athlete_id")
        .eq("team_id", requestData.team_id!)
        .eq("season_id", requestData.season_id!)

      if (teamError) return json(req, { error: `Failed to fetch team members: ${extractErrorMessage(teamError)}` }, 500)
      if (!members || members.length === 0) return json(req, { error: "No athletes found for the specified team/season" }, 400)

      targetAthleteIds = members.map((m: { athlete_id: string }) => m.athlete_id)
    } else {
      targetAthleteIds = requestData.athlete_ids!
    }

    // Validate athletes exist
    const { data: existingAthletes, error: checkError } = await supabaseClient
      .from("athletes")
      .select("id")
      .in("id", targetAthleteIds)

    if (checkError) return json(req, { error: `Failed to validate athletes: ${extractErrorMessage(checkError)}` }, 500)
    if (!existingAthletes || existingAthletes.length !== targetAthleteIds.length) {
      return json(req, { error: "One or more athlete_ids do not exist in the database" }, 400)
    }

    // Fetch guardians
    const { data: athletesData, error: athleteError } = await supabaseClient
      .from("athletes")
      .select(`
        id,
        guardians:athlete_guardians (
          user_id,
          status
        )
      `)
      .in("id", targetAthleteIds)

    if (athleteError) return json(req, { error: `Failed to fetch athlete data: ${extractErrorMessage(athleteError)}` }, 500)
    if (!athletesData || athletesData.length === 0) return json(req, { error: "No athlete data found for the specified IDs" }, 400)

    const assignments: FeeAssignment[] = []
    for (const athlete of athletesData as AthleteWithGuardians[]) {
      const activeGuardians = (athlete.guardians || []).filter((g) => g.status === "active")
      if (activeGuardians.length === 0) continue
      assignments.push({ athlete_id: athlete.id, parent_id: activeGuardians[0].user_id })
    }

    if (assignments.length === 0) {
      return json(req, { error: "No valid parent assignments found for selected athletes." }, 400)
    }

    // RPC create
    const feeData: FeeData = {
      org_id: requestData.org_id,
      season_id: requestData.season_id ?? null,
      title: requestData.title,
      description: requestData.description ?? null,
      fee_type: requestData.fee_type,
      amount_cents: requestData.amount_cents,
      due_date: requestData.due_date ?? null,
      scope: requestData.scope,
      status: "published",
      created_by_admin_id: user.id,
      
      // Optional payment settings
      allow_partial_payment: requestData.allow_partial_payment,
      allow_installments: requestData.allow_installments,
      allow_discounts: requestData.allow_discounts,
      allow_scholarships: requestData.allow_scholarships,
    }

    const { data: result, error: rpcError } = await supabaseClient.rpc("create_fee_with_assignments", {
      p_fee_data: feeData,
      p_assignments: assignments,
    })

    if (rpcError) {
      const errorMessage = extractErrorMessage(rpcError)
      console.error("RPC error creating fee:", rpcError)
      return json(req, { error: `Failed to create fee: ${errorMessage}` }, 500)
    }

    return json(req, result, 200)
  } catch (error) {
    console.error("Unhandled error in admin-create-fee:", error)
    return json(req, { error: extractErrorMessage(error) }, 400)
  }
})
