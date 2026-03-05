// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import * as XLSX from "https://esm.sh/xlsx@0.18.5"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "GET") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json(req, { error: "Server misconfigured" }, 500)
  }

  const authHeader = req.headers.get("Authorization") ?? ""
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return json(req, { error: "Unauthorized" }, 401)
  }

  // Get org_id from query params or user's org
  const url = new URL(req.url)
  const orgIdParam = url.searchParams.get("org_id")

  if (!orgIdParam) {
    return json(req, { error: "org_id parameter required" }, 400)
  }

  // Verify user is org admin
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", orgIdParam)
    .eq("role", "org_admin")
    .maybeSingle()

  if (membershipError || !membership) {
    return json(req, { error: "Forbidden: must be org admin" }, 403)
  }

  // Fetch available sports for the sports column hint
  const { data: sports } = await supabaseAdmin
    .from("sports")
    .select("name")
    .eq("is_system", true)
    .is("deleted_at", null)
    .order("name")

  const sportsList = sports?.map((s) => s.name).join(", ") || "football, soccer, baseball, basketball"

  // Create workbook
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Org Admins
  const orgAdminsData = [
    {
      first_name: "John",
      last_name: "Smith",
      phone: "+15551234567",
      email: "john.smith@example.com",
    },
    {
      first_name: "Jane",
      last_name: "Doe",
      phone: "+15559876543",
      email: "jane.doe@example.com",
    },
  ]
  const orgAdminsSheet = XLSX.utils.json_to_sheet(orgAdminsData)
  XLSX.utils.book_append_sheet(workbook, orgAdminsSheet, "Org Admins")

  // Sheet 2: Coaches
  const coachesData = [
    {
      first_name: "Mike",
      last_name: "Johnson",
      phone: "+15551111111",
      email: "mike.johnson@example.com",
    },
    {
      first_name: "Sarah",
      last_name: "Williams",
      phone: "+15552222222",
      email: "sarah.williams@example.com",
    },
  ]
  const coachesSheet = XLSX.utils.json_to_sheet(coachesData)
  XLSX.utils.book_append_sheet(workbook, coachesSheet, "Coaches")

  // Sheet 3: Guardians
  const guardiansData = [
    {
      first_name: "Robert",
      last_name: "Brown",
      phone: "+15553333333",
      email: "robert.brown@example.com",
    },
    {
      first_name: "Emily",
      last_name: "Davis",
      phone: "+15554444444",
      email: "emily.davis@example.com",
    },
  ]
  const guardiansSheet = XLSX.utils.json_to_sheet(guardiansData)
  XLSX.utils.book_append_sheet(workbook, guardiansSheet, "Guardians")

  // Sheet 4: Athletes
  const athletesData = [
    {
      first_name: "Alex",
      last_name: "Brown",
      phone: "+15555555555",
      email: "alex.brown@example.com",
      guardian_email: "robert.brown@example.com",
      date_of_birth: "01/15/2010",
      gender: "m",
      sports: "football, soccer",
    },
    {
      first_name: "Emma",
      last_name: "Davis",
      phone: "+15556666666",
      email: "emma.davis@example.com",
      guardian_email: "emily.davis@example.com",
      date_of_birth: "03/20/2011",
      gender: "f",
      sports: "soccer, basketball",
    },
  ]
  const athletesSheet = XLSX.utils.json_to_sheet(athletesData)
  XLSX.utils.book_append_sheet(workbook, athletesSheet, "Athletes")

  // Generate XLSX buffer
  const xlsxBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" })

  // Return file as download
  return new Response(xlsxBuffer, {
    headers: {
      ...corsHeaders,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="bulk-invite-template.xlsx"',
    },
  })
})
