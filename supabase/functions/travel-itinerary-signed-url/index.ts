// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase env vars missing")
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" })

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: "Invalid JSON" })
  }

  const itineraryFilePath = payload?.itinerary_file_path as string | undefined
  if (!itineraryFilePath) return json(400, { error: "Missing itinerary_file_path" })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return json(401, { error: "Unauthorized" })

  // Load travel plan by itinerary path
  const { data: plan, error: planErr } = await supabase
    .from("travel_plans")
    .select("id, team_id, status, itinerary_file_path, teams(org_id)")
    .eq("itinerary_file_path", itineraryFilePath)
    .maybeSingle()

  if (planErr) return json(400, { error: planErr.message })
  if (!plan?.itinerary_file_path) return json(404, { error: "Not found" })

  const teamId = (plan as any).team_id as string
  const orgId = (plan as any).teams?.org_id as string | undefined
  const status = (plan as any).status as string | undefined

  // Only allow downloads for published/cancelled trips.
  if (status !== "published" && status !== "cancelled") {
    return json(403, { error: "Forbidden" })
  }

  // Load user profile role/family/org (legacy model)
  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("id, role, org_id, family_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileErr) return json(400, { error: profileErr.message })

  const role = (profile as any)?.role as string | undefined
  const familyId = (profile as any)?.family_id as string | null | undefined
  const userOrgId = (profile as any)?.org_id as string | null | undefined

  let allowed = false

  // Admins (legacy) can download within org
  if (role === "admin" && orgId && userOrgId === orgId) {
    allowed = true
  }

  // Coaches can download within org
  if (!allowed && role === "coach" && orgId && userOrgId === orgId) {
    allowed = true
  }

  // Parents: must have active membership on that team
  if (!allowed && role === "parent" && familyId) {
    const { data: memberships, error: memErr } = await supabase
      .from("team_memberships")
      .select("id")
      .in(
        "child_id",
        (
          await supabase.from("children").select("id").eq("family_id", familyId)
        ).data?.map((c: any) => c.id) ?? []
      )
      .eq("team_id", teamId)
      .eq("status", "active")
      .limit(1)

    if (memErr) return json(400, { error: memErr.message })
    if ((memberships as any[] | null)?.length) allowed = true
  }

  // org_admin (new org membership model): verify via RPC if available
  if (!allowed && orgId) {
    const { data: orgs } = await supabase.rpc("get_user_organizations", { check_user_id: user.id })
    const hasOrgAdmin = (orgs as any[] | null)?.some((m) => m.organization_id === orgId && m.role === "org_admin")
    if (hasOrgAdmin) allowed = true
  }

  if (!allowed) return json(403, { error: "Forbidden" })

  const { data: signed, error: signedErr } = await supabase.storage
    .from("travel-itineraries")
    .createSignedUrl(itineraryFilePath, 60 * 10)

  if (signedErr) return json(400, { error: signedErr.message })
  return json(200, { signed_url: signed?.signedUrl })
})

