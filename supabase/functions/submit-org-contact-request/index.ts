// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"

// ============================================================================
// CORS helpers (matches pattern used across all edge functions)
// ============================================================================

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*"
  const reqHeaders =
    req.headers.get("Access-Control-Request-Headers") ??
    "authorization, x-client-info, apikey, content-type"
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Max-Age": "86400",
  }
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  })
}

// ============================================================================
// Allowed categories — must match the SQL CHECK constraint exactly
// ============================================================================

const ALLOWED_CATEGORIES = new Set([
  "schedule_event",
  "payments_fees",
  "registration_eligibility",
  "attendance_availability",
  "team_roster",
  "technical_bug",
  "general_question",
  "feature_request",
])

// ============================================================================
// Main handler
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: buildCorsHeaders(req) })
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405)
  }

  // -- Environment --
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const appBaseUrl =
    Deno.env.get("PLATFORM_APP_URL") ||
    Deno.env.get("APP_URL") ||
    "https://platform.youthsports.team"

  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, { error: "Server misconfigured: missing Supabase env vars" }, 500)
  }

  // Supabase service-role client: pass through user's Authorization header so
  // getUser() resolves the caller. requester_user_id is always taken from the
  // verified JWT — never from the request body.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  })

  // -- Auth: verify caller --
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return json(req, { error: "Unauthorized" }, 401)
  }
  const callerId = userData.user.id

  // -- Parse body --
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  // -- Required field validation --
  const orgId = payload?.org_id as string | undefined
  const category = payload?.category as string | undefined
  const message = payload?.message as string | undefined

  if (!orgId || typeof orgId !== "string") {
    return json(req, { error: "Missing required field: org_id" }, 400)
  }
  if (!category || !ALLOWED_CATEGORIES.has(category)) {
    return json(req, { error: "Invalid or missing category" }, 400)
  }
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return json(req, { error: "Missing required field: message" }, 400)
  }

  // -- Optional context fields --
  const athleteId = payload?.athlete_id as string | undefined
  const teamId = payload?.team_id as string | undefined
  const seasonId = payload?.season_id as string | undefined
  const eventId = payload?.event_id as string | undefined
  const subject = payload?.subject as string | undefined
  const attachments = Array.isArray(payload?.attachments) ? payload.attachments : []

  // Feature-request–specific fields
  const requestedFeatureKey = payload?.requested_feature_key as string | undefined
  const requestedFeatureName = payload?.requested_feature_name as string | undefined
  const requestedFeatureReason = payload?.requested_feature_reason as string | undefined
  const requestedFeatureUseCase = payload?.requested_feature_use_case as string | undefined

  // -- Org membership check --
  // Verify the caller is actually linked to this org (guardian/athlete/member).
  const { data: memberRow, error: memberErr } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", callerId)
    .maybeSingle()

  if (memberErr) {
    console.error("Membership check error:", memberErr)
    return json(req, { error: "Could not verify org membership" }, 500)
  }
  if (!memberRow) {
    return json(req, { error: "You are not a member of this organization" }, 403)
  }

  const requesterRole: string = memberRow.role ?? "other"

  // -- Feature-request validation --
  // Server-side: confirm the requested_feature_key exists in the org's unavailable
  // features list. Prevents callers from submitting fabricated keys.
  if (category === "feature_request") {
    if (!requestedFeatureKey) {
      return json(req, { error: "feature_request requires requested_feature_key" }, 400)
    }

    const { data: unavailable, error: rpcErr } = await supabase.rpc(
      "get_features_not_in_org",
      { p_org_id: orgId }
    )
    if (rpcErr) {
      console.error("get_features_not_in_org error:", rpcErr)
      return json(req, { error: "Could not verify feature availability" }, 500)
    }

    const isUnavailable = (unavailable as any[] | null)?.some(
      (f: any) => f.feature_key === requestedFeatureKey
    )
    if (!isUnavailable) {
      return json(
        req,
        { error: "Requested feature is already enabled or does not exist" },
        400
      )
    }
  }

  // -- Deduplication: return existing open request for same user+org+category --
  const { data: existingRow, error: dedupErr } = await supabase
    .from("org_contact_requests")
    .select("id, status")
    .eq("org_id", orgId)
    .eq("requester_user_id", callerId)
    .eq("category", category)
    .in("status", ["new", "open"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (dedupErr) {
    console.error("Dedup check error:", dedupErr)
    // Non-fatal: proceed with new insert
  }

  if (existingRow) {
    return json(req, {
      request_id: existingRow.id,
      status: existingRow.status,
      org_admins_notified: 0,
      platform_admins_notified: 0,
      deduplicated: true,
    })
  }

  // -- Insert request --
  const { data: newRow, error: insertErr } = await supabase
    .from("org_contact_requests")
    .insert({
      org_id: orgId,
      requester_user_id: callerId, // always from JWT — never from payload
      requester_role: requesterRole,
      athlete_id: athleteId ?? null,
      team_id: teamId ?? null,
      season_id: seasonId ?? null,
      event_id: eventId ?? null,
      category,
      subject: subject ?? null,
      message: message.trim(),
      attachments,
      requested_feature_key: requestedFeatureKey ?? null,
      requested_feature_name: requestedFeatureName ?? null,
      requested_feature_reason: requestedFeatureReason ?? null,
      requested_feature_use_case: requestedFeatureUseCase ?? null,
      status: "new",
    })
    .select("id")
    .single()

  if (insertErr || !newRow) {
    console.error("Insert error:", insertErr)
    return json(req, { error: "Failed to save request" }, 500)
  }

  const requestId = newRow.id

  // -- Fetch org admins for email notifications --
  const { data: orgAdmins, error: adminsErr } = await supabase
    .from("organization_members")
    .select("user_id, users(email, display_name)")
    .eq("org_id", orgId)
    .eq("role", "org_admin")

  if (adminsErr) {
    console.error("Fetch org admins error:", adminsErr)
    // Non-fatal: proceed without email
  }

  const adminsWithEmail = (orgAdmins ?? []).filter(
    (m: any) => m.users?.email && typeof m.users.email === "string"
  )

  // -- Fetch org display name for email subjects --
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle()

  const orgName = orgRow?.name ?? "Your Organization"

  // -- Category label for email subject --
  const CATEGORY_LABELS: Record<string, string> = {
    schedule_event: "Schedule / Event",
    payments_fees: "Payments / Fees",
    registration_eligibility: "Registration",
    attendance_availability: "Attendance",
    team_roster: "Team / Roster",
    technical_bug: "Technical Issue",
    general_question: "General Question",
    feature_request: "Feature Request",
  }
  const categoryLabel = CATEGORY_LABELS[category] ?? category

  const emailSubject =
    category === "feature_request" && requestedFeatureName
      ? `[Feature Request] ${requestedFeatureName} — from ${orgName}`
      : `[${categoryLabel}] New request from a member — ${orgName}`

  const requestDetailUrl = `${appBaseUrl}/admin/contact-requests/${requestId}`

  // -- Enqueue org admin notifications --
  let orgAdminsNotified = 0
  for (const admin of adminsWithEmail) {
    const email = (admin as any).users?.email as string
    const { error: jobErr } = await supabase.from("notification_jobs").insert({
      org_id: orgId,
      user_id: (admin as any).user_id ?? null,
      email,
      type: "org_contact_request",
      payload: {
        request_id: requestId,
        org_id: orgId,
        org_name: orgName,
        category,
        category_label: categoryLabel,
        email_subject: emailSubject,
        message: message.trim(),
        subject: subject ?? null,
        requester_role: requesterRole,
        requested_feature_key: requestedFeatureKey ?? null,
        requested_feature_name: requestedFeatureName ?? null,
        request_detail_url: requestDetailUrl,
      },
      status: "queued",
    })
    if (jobErr) {
      console.error("Failed to enqueue org_contact_request job for", email, jobErr)
    } else {
      orgAdminsNotified++
    }
  }

  if (adminsWithEmail.length === 0) {
    console.warn(`[submit-org-contact-request] No org admins with email found for org ${orgId}`)
  }

  // -- Enqueue platform admin notification (feature_request only) --
  let platformAdminsNotified = 0
  if (category === "feature_request") {
    const { data: platformAdmins, error: paErr } = await supabase
      .from("platform_admins")
      .select("user_id, users(email)")

    if (paErr) {
      console.error("Fetch platform admins error:", paErr)
    } else {
      for (const pa of platformAdmins ?? []) {
        const email = (pa as any).users?.email as string | undefined
        if (!email) continue

        const { error: paJobErr } = await supabase.from("notification_jobs").insert({
          org_id: orgId,
          user_id: (pa as any).user_id ?? null,
          email,
          type: "platform_feature_request_signal",
          payload: {
            request_id: requestId,
            org_id: orgId,
            org_name: orgName,
            feature_key: requestedFeatureKey ?? "",
            feature_name: requestedFeatureName ?? requestedFeatureKey ?? "",
            requester_role: requesterRole,
            org_detail_url: `${appBaseUrl}/platform-admin/organizations/${orgId}`,
          },
          status: "queued",
        })
        if (paJobErr) {
          console.error("Failed to enqueue platform_feature_request_signal for", email, paJobErr)
        } else {
          platformAdminsNotified++
        }
      }
    }
  }

  return json(req, {
    request_id: requestId,
    status: "new",
    org_admins_notified: orgAdminsNotified,
    platform_admins_notified: platformAdminsNotified,
  })
})
