// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0"
import * as XLSX from "https://esm.sh/xlsx@0.18.5"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (req.method !== "POST") {
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

  // Parse request body
  let body: any
  try {
    body = await req.json()
  } catch {
    return json(req, { error: "Invalid JSON" }, 400)
  }

  const { job_id, org_id } = body

  if (!job_id || !org_id) {
    return json(req, { error: "job_id and org_id required" }, 400)
  }

  // Verify user is org admin
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("org_id", org_id)
    .eq("role", "org_admin")
    .maybeSingle()

  if (membershipError || !membership) {
    return json(req, { error: "Forbidden: must be org admin" }, 403)
  }

  // Get job record
  const { data: job, error: jobError } = await supabaseAdmin
    .from("bulk_import_jobs")
    .select("*")
    .eq("id", job_id)
    .eq("org_id", org_id)
    .single()

  if (jobError || !job) {
    return json(req, { error: "Job not found" }, 404)
  }

  if (job.status !== "validated") {
    return json(req, { error: `Job must be in 'validated' status, current: ${job.status}` }, 400)
  }

  // Update job status to running
  await supabaseAdmin
    .from("bulk_import_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      progress_json: { step: "parsing", completed: 0, total: 0 },
    })
    .eq("id", job_id)

  try {
    // Download and parse file
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("bulk-imports")
      .download(job.file_path)

    if (downloadError || !fileData) {
      throw new Error("Failed to download file")
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })

    // Parse sheets
    const sheetData: Record<string, any[]> = {}
    const requiredSheets = ["Org Admins", "Coaches", "Guardians", "Athletes"]

    for (const sheetName of requiredSheets) {
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) continue
      const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "", raw: false })
      sheetData[sheetName] = rows.filter((row) =>
        Object.values(row).some((v: any) => v && String(v).trim() !== "")
      )
    }

    // Build consolidated identity map (group by email)
    const emailToIdentity = new Map<
      string,
      {
        email: string
        name: string
        roles: string[]
        rows: Array<{ sheet: string; data: any }>
      }
    >()

    for (const [sheetName, rows] of Object.entries(sheetData)) {
      for (const row of rows) {
        const email = String(row.email || "").trim().toLowerCase()
        if (!email) continue

        if (!emailToIdentity.has(email)) {
          emailToIdentity.set(email, {
            email,
            name: "",
            roles: [],
            rows: [],
          })
        }

        const identity = emailToIdentity.get(email)!
        identity.rows.push({ sheet: sheetName, data: row })

        // Map sheet to role
        if (sheetName === "Org Admins") identity.roles.push("org_admin")
        else if (sheetName === "Coaches") identity.roles.push("coach")
        else if (sheetName === "Guardians") identity.roles.push("parent")
        else if (sheetName === "Athletes") identity.roles.push("athlete")

        // Choose best name (prefer Org Admins)
        if (!identity.name || sheetName === "Org Admins") {
          const firstName = String(row.first_name || "").trim()
          const lastName = String(row.last_name || "").trim()
          identity.name = `${firstName} ${lastName}`.trim() || email
        }
      }
    }

    // Get organization name
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", org_id)
      .single()

    const orgName = org?.name || "Organization"

    // Step 1: Create users and assign roles
    let completedUsers = 0
    const totalUsers = emailToIdentity.size
    const userResults = new Map<string, { userId?: string; inviteToken?: string; error?: string }>()

    await supabaseAdmin
      .from("bulk_import_jobs")
      .update({
        progress_json: { step: "creating_users", completed: 0, total: totalUsers },
      })
      .eq("id", job_id)

    for (const [email, identity] of emailToIdentity.entries()) {
      try {
        // Check if user exists - use .in() with exact email match (safe, parameterized)
        // Note: For Gmail normalization, we'd need an RPC function, but for now exact match is safer
        const { data: existingUsers } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", email.toLowerCase().trim())
          .limit(1)

        const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null

        // Check existing org membership
        let existingMember = false
        if (existingUser) {
          const { data: memberships } = await supabaseAdmin
            .from("organization_members")
            .select("role")
            .eq("user_id", existingUser.id)
            .eq("org_id", org_id)

          if (memberships && memberships.length > 0) {
            existingMember = true
            // Add new roles if not already present
            const existingRoles = memberships.map((m) => m.role)
            const newRoles = identity.roles.filter((r) => !existingRoles.includes(r))

            for (const role of newRoles) {
              await supabaseAdmin.rpc("add_org_role", {
                p_user_id: existingUser.id,
                p_org_id: org_id,
                p_role: role,
              })
            }
          }
        }

        // Create invite if not existing member
        let inviteToken: string | undefined
        if (!existingMember) {
          // Use create_organization_invite with roles array
          const rolesArray = identity.roles.map((r) => {
            if (r === "org_admin") return "org_admin"
            if (r === "coach") return "coach"
            if (r === "parent") return "parent"
            if (r === "athlete") return "athlete"
            return "parent"
          })

          // Create invite directly in database (service role can insert)
          // Check if invite already exists first
          const { data: existingInvites } = await supabaseAdmin
            .from("organization_invites")
            .select("token")
            .eq("org_id", org_id)
            .eq("email", email.toLowerCase().trim())
            .is("accepted_at", null)
            .gt("expires_at", new Date().toISOString())
            .limit(1)

          if (existingInvites && existingInvites.length > 0) {
            inviteToken = existingInvites[0].token
          } else {
            // Create new invite - generate UUID using crypto API (available in Deno)
            const token = crypto.randomUUID()
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 30)

            const { data: newInvite, error: insertError } = await supabaseAdmin
              .from("organization_invites")
              .insert({
                org_id: org_id, // Correct column name is org_id, not organization_id
                email: email.toLowerCase().trim(),
                role: rolesArray[0] || "parent",
                roles: rolesArray,
                token: token,
                expires_at: expiresAt.toISOString(),
                created_by_user_id: user.id,
              })
              .select("token")
              .single()

            if (!insertError && newInvite) {
              inviteToken = newInvite.token
            }
          }
        }

        userResults.set(email, {
          userId: existingUser?.id,
          inviteToken,
        })

        completedUsers++
        await supabaseAdmin
          .from("bulk_import_jobs")
          .update({
            progress_json: { step: "creating_users", completed: completedUsers, total: totalUsers },
          })
          .eq("id", job_id)
      } catch (error: any) {
        userResults.set(email, { error: error.message || "Unknown error" })
      }
    }

    // Step 2: Store athlete data for creation after user acceptance
    // Athletes will be created when users accept their invites, not during bulk import
    // We store athlete data in the invite payload for later processing
    const athletes = sheetData["Athletes"] || []
    const athleteDataMap = new Map<string, any>() // email -> athlete data

    for (const athlete of athletes) {
      const athleteEmail = String(athlete.email || "").trim().toLowerCase()
      if (athleteEmail) {
        // Parse date of birth (MM/DD/YYYY format)
        let birthdate: string | null = null
        const dobStr = String(athlete.date_of_birth || "").trim()
        if (dobStr) {
          const parts = dobStr.split("/")
          if (parts.length === 3) {
            const month = parts[0].padStart(2, "0")
            const day = parts[1].padStart(2, "0")
            const year = parts[2]
            birthdate = `${year}-${month}-${day}`
          }
        }

        // Store athlete data for later creation
        athleteDataMap.set(athleteEmail, {
          first_name: String(athlete.first_name || "").trim(),
          last_name: String(athlete.last_name || "").trim(),
          phone: String(athlete.phone || "").trim() || null,
          birthdate: birthdate || null,
          gender: String(athlete.gender || "").trim() || null,
          guardian_emails: Object.keys(athlete)
            .filter((k) => k.startsWith("guardian_email"))
            .map((k) => String(athlete[k] || "").trim().toLowerCase())
            .filter(Boolean),
          sports: String(athlete.sports || "").trim() || null,
        })
      }
    }

    // Note: Athlete data is stored in notification_jobs payload
    // When users accept invites, the invite acceptance handler should:
    // 1. Check notification_jobs for athlete_data in payload
    // 2. If athlete role and athlete_data exists, call create_athlete_with_guardians RPC
    // 3. Link guardians using the guardian_emails array from athlete_data

    // Step 3: Queue emails
    const platformBaseUrl = Deno.env.get("PLATFORM_APP_URL") || Deno.env.get("APP_URL") || "https://platform.youthsports.team"
    const invitePath = "/portal/accept-invite"

    await supabaseAdmin
      .from("bulk_import_jobs")
      .update({
        progress_json: { step: "sending_emails", completed: 0, total: emailToIdentity.size },
      })
      .eq("id", job_id)

    let completedEmails = 0
    for (const [email, identity] of emailToIdentity.entries()) {
      try {
        const userResult = userResults.get(email)
        if (!userResult || userResult.error) {
          completedEmails++
          continue
        }

        // Get invite token if available
        let inviteToken = userResult.inviteToken
        if (!inviteToken && userResult.userId) {
          // Try to get existing invite
          const { data: invites } = await supabaseAdmin
            .from("organization_invites")
            .select("token")
            .eq("org_id", org_id)
            .eq("email", email)
            .is("accepted_at", null)
            .gt("expires_at", new Date().toISOString())
            .limit(1)

          if (invites && invites.length > 0) {
            inviteToken = invites[0].token
          }
        }

        // Get linked athletes if guardian
        const linkedAthletes: string[] = []
        if (identity.roles.includes("parent")) {
          const userResult = userResults.get(email)
          if (userResult?.userId) {
            const { data: athleteLinks } = await supabaseAdmin
              .from("athlete_guardians")
              .select("athlete:athletes(first_name, last_name)")
              .eq("user_id", userResult.userId)
              .eq("org_id", org_id)

            if (athleteLinks) {
              for (const link of athleteLinks) {
                const athlete = link.athlete as any
                if (athlete) {
                  linkedAthletes.push(`${athlete.first_name} ${athlete.last_name}`.trim())
                }
              }
            }
          }
        }

        // Queue email
        const inviteUrl = inviteToken ? `${platformBaseUrl}${invitePath}?token=${inviteToken}` : null

        await supabaseAdmin.from("notification_jobs").insert({
          org_id,
          user_id: userResult.userId || null,
          email,
          type: "bulk_invite", // New email template type for bulk invites
          payload: {
            organization_name: orgName,
            recipient_firstname: identity.name.split(" ")[0] || identity.name,
            roles: identity.roles,
            role_descriptions: identity.roles.map((r) => {
              if (r === "org_admin") return "Organization Administrator"
              if (r === "coach") return "Coach"
              if (r === "parent") return "Guardian"
              if (r === "athlete") return "Athlete"
              return r
            }),
            athlete_names: linkedAthletes,
            invite_url: inviteUrl,
            is_existing_user: !!userResult.userId,
            is_existing_org_member: false, // We checked this above
            athlete_data: identity.roles.includes("athlete") ? athleteDataMap.get(email) : null,
          },
          status: "queued",
        })

        completedEmails++
        await supabaseAdmin
          .from("bulk_import_jobs")
          .update({
            progress_json: { step: "sending_emails", completed: completedEmails, total: emailToIdentity.size },
          })
          .eq("id", job_id)
      } catch (error: any) {
        // Continue on error
        completedEmails++
      }
    }

    // Update job to completed
    await supabaseAdmin
      .from("bulk_import_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        progress_json: { step: "completed", completed: emailToIdentity.size, total: emailToIdentity.size },
      })
      .eq("id", job_id)

    return json(req, {
      success: true,
      message: "Import completed successfully",
      stats: {
        users_processed: emailToIdentity.size,
        athletes_linked: completedLinks,
        emails_queued: completedEmails,
      },
    })
  } catch (error: any) {
    // Update job to failed
    await supabaseAdmin
      .from("bulk_import_jobs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_summary: { error: error.message || "Unknown error" },
      })
      .eq("id", job_id)

    return json(req, { error: error.message || "Import failed" }, 500)
  }
})
