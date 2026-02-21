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

interface ValidationError {
  sheet: string
  row: number
  field?: string
  message: string
  severity: "error" | "warning"
}

interface ConsolidatedUser {
  email: string
  name: string
  name_source: string
  roles: string[]
  is_new_user: boolean
  existing_org_member: boolean
  existing_roles: string[]
  name_conflicts: Array<{ sheet: string; name: string }>
}

interface AthleteGuardianLink {
  athlete_email: string
  athlete_name: string
  guardian_email: string
  guardian_name: string
  guardian_source: "new" | "existing"
  status: "ok" | "missing" | "invalid"
}

interface ValidationResult {
  valid: boolean
  blocking_errors: number
  warnings: number
  totals: {
    org_admins: number
    coaches: number
    guardians: number
    athletes: number
    unique_emails: number
  }
  row_errors: ValidationError[]
  consolidated_preview: ConsolidatedUser[]
  athlete_guardian_links: AthleteGuardianLink[]
}

// Email validation (RFC-like)
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false
  const trimmed = email.trim().toLowerCase()
  if (trimmed.length === 0) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(trimmed)
}

// Phone normalization (accepts E.164, US formats)
function normalizePhone(phone: string): string | null {
  if (!phone || typeof phone !== "string") return null
  const cleaned = phone.replace(/\D/g, "")
  if (cleaned.length === 0) return null
  // If starts with 1 and 11 digits, assume US E.164
  if (cleaned.length === 11 && cleaned[0] === "1") {
    return `+${cleaned}`
  }
  // If 10 digits, assume US without country code
  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }
  // If starts with +, assume already E.164
  if (phone.trim().startsWith("+")) {
    return phone.trim()
  }
  return null
}

function validatePhone(phone: string): boolean {
  return normalizePhone(phone) !== null
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

  const { file_path, org_id } = body

  if (!file_path || !org_id) {
    return json(req, { error: "file_path and org_id required" }, 400)
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

  // Download file from storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from("bulk-imports")
    .download(file_path)

  if (downloadError || !fileData) {
    return json(req, { error: "Failed to download file" }, 404)
  }

  // Parse XLSX
  const arrayBuffer = await fileData.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: "array" })

  // Required sheets
  const requiredSheets = ["Org Admins", "Coaches", "Guardians", "Athletes"]
  const sheetNames = workbook.SheetNames

  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Validate sheet structure
  for (const sheetName of requiredSheets) {
    if (!sheetNames.includes(sheetName)) {
      errors.push({
        sheet: sheetName,
        row: 0,
        message: `Missing required sheet: ${sheetName}`,
        severity: "error",
      })
    }
  }

  if (errors.length > 0) {
    return json(req, {
      valid: false,
      blocking_errors: errors.length,
      warnings: 0,
      totals: { org_admins: 0, coaches: 0, guardians: 0, athletes: 0, unique_emails: 0 },
      row_errors: errors,
      consolidated_preview: [],
      athlete_guardian_links: [],
    } as ValidationResult)
  }

  // Required columns per sheet
  const requiredColumns: Record<string, string[]> = {
    "Org Admins": ["first_name", "last_name", "phone", "email"],
    "Coaches": ["first_name", "last_name", "phone", "email"],
    "Guardians": ["first_name", "last_name", "phone", "email"],
    "Athletes": ["first_name", "last_name", "phone", "email", "guardian_email"],
  }

  const optionalColumns: Record<string, string[]> = {
    "Athletes": ["date_of_birth", "gender", "sports"],
  }

  // Parse rows from each sheet
  const sheetData: Record<string, any[]> = {}
  const emailToRows: Map<string, Array<{ sheet: string; row: number; data: any }>> = new Map()

  for (const sheetName of requiredSheets) {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) continue

    const rows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: "", raw: false })
    const headers = Object.keys(rows[0] || {})

    // Validate required columns
    const required = requiredColumns[sheetName] || []
    for (const col of required) {
      if (!headers.includes(col)) {
        errors.push({
          sheet: sheetName,
          row: 0,
          field: col,
          message: `Missing required column: ${col}`,
          severity: "error",
        })
      }
    }

    // Validate rows
    const validRows: any[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Excel row number (1-indexed + header)

      // Check if row is empty
      const hasData = Object.values(row).some((v: any) => v && String(v).trim() !== "")
      if (!hasData) continue

      // Validate required fields
      for (const col of required) {
        const value = String(row[col] || "").trim()
        if (!value) {
          errors.push({
            sheet: sheetName,
            row: rowNum,
            field: col,
            message: `Required field ${col} is empty`,
            severity: "error",
          })
        }
      }

      // Validate email
      const email = String(row.email || "").trim().toLowerCase()
      if (email && !isValidEmail(email)) {
        errors.push({
          sheet: sheetName,
          row: rowNum,
          field: "email",
          message: `Invalid email format: ${email}`,
          severity: "error",
        })
      }

      // Validate phone
      const phone = String(row.phone || "").trim()
      if (phone && !validatePhone(phone)) {
        warnings.push({
          sheet: sheetName,
          row: rowNum,
          field: "phone",
          message: `Phone format may be invalid: ${phone}`,
          severity: "warning",
        })
      }

      // Track email for duplicate detection
      if (email && isValidEmail(email)) {
        const key = email.toLowerCase()
        if (!emailToRows.has(key)) {
          emailToRows.set(key, [])
        }
        emailToRows.get(key)!.push({ sheet: sheetName, row: rowNum, data: row })
      }

      validRows.push({ ...row, _rowNumber: rowNum })
    }

    sheetData[sheetName] = validRows

    // Check for duplicate emails within same sheet
    const emailCounts = new Map<string, number>()
    for (const row of validRows) {
      const email = String(row.email || "").trim().toLowerCase()
      if (email && isValidEmail(email)) {
        emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
      }
    }
    for (const [email, count] of emailCounts.entries()) {
      if (count > 1) {
        errors.push({
          sheet: sheetName,
          row: 0,
          field: "email",
          message: `Duplicate email in ${sheetName} sheet: ${email}`,
          severity: "error",
        })
      }
    }
  }

  // Build consolidated preview
  const consolidatedPreview: ConsolidatedUser[] = []
  const guardianEmails = new Set(
    sheetData["Guardians"]?.map((r) => String(r.email || "").trim().toLowerCase()).filter(Boolean) || []
  )

  // Check existing users
  const allEmails = Array.from(emailToRows.keys())
  const existingUsers = new Map<string, any>()

  if (allEmails.length > 0) {
    // Query existing users - fetch all and filter by normalized email in memory
    // This is safe and avoids SQL injection risks
    const { data: allUsers } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, last_name")
      .limit(10000) // Reasonable limit

    if (allUsers) {
      for (const user of allUsers) {
        const userEmail = user.email?.toLowerCase().trim()
        if (userEmail && allEmails.includes(userEmail)) {
          existingUsers.set(userEmail, user)
        }
      }
    }

    // Also check for normalized email matches (Gmail dots, etc.)
    // Query users in smaller batches using email list
    const batchSize = 100
    for (let i = 0; i < allEmails.length; i += batchSize) {
      const batch = allEmails.slice(i, i + batchSize)
      // Query by exact email match first
      const { data: batchUsers } = await supabaseAdmin
        .from("users")
        .select("id, email, first_name, last_name")
        .in("email", batch)

      if (batchUsers) {
        for (const user of batchUsers) {
          const normalized = user.email?.toLowerCase().trim()
          if (normalized) {
            existingUsers.set(normalized, user)
          }
        }
      }
    }

    // Check existing org memberships
    const userIds = Array.from(existingUsers.values()).map((u) => u.id)
    if (userIds.length > 0) {
      const { data: memberships } = await supabaseAdmin
        .from("organization_members")
        .select("user_id, role")
        .eq("org_id", org_id)
        .in("user_id", userIds)

      if (memberships) {
        for (const membership of memberships) {
          const user = Array.from(existingUsers.values()).find((u) => u.id === membership.user_id)
          if (user) {
            const normalized = user.email?.toLowerCase().trim()
            if (normalized && !user._existingRoles) {
              user._existingRoles = []
            }
            if (normalized) {
              user._existingRoles!.push(membership.role)
            }
          }
        }
      }
    }
  }

  // Build consolidated users
  for (const [email, rows] of emailToRows.entries()) {
    const roles: string[] = []
    const nameSources: Array<{ sheet: string; name: string }> = []
    const nameConflicts: Array<{ sheet: string; name: string }> = []

    for (const { sheet, data } of rows) {
      // Map sheet to role
      if (sheet === "Org Admins") roles.push("org_admin")
      else if (sheet === "Coaches") roles.push("coach")
      else if (sheet === "Guardians") roles.push("parent")
      else if (sheet === "Athletes") roles.push("athlete")

      const firstName = String(data.first_name || "").trim()
      const lastName = String(data.last_name || "").trim()
      const name = `${firstName} ${lastName}`.trim()
      if (name) {
        nameSources.push({ sheet, name })
      }
    }

    // Detect name conflicts
    const uniqueNames = new Set(nameSources.map((n) => n.name))
    if (uniqueNames.size > 1) {
      nameConflicts.push(...nameSources)
    }

    // Choose best name (prefer Org Admins, then first non-empty)
    let chosenName = ""
    let chosenSource = ""
    const orgAdminName = nameSources.find((n) => n.sheet === "Org Admins")
    if (orgAdminName) {
      chosenName = orgAdminName.name
      chosenSource = "Org Admins"
    } else if (nameSources.length > 0) {
      chosenName = nameSources[0].name
      chosenSource = nameSources[0].sheet
    } else {
      chosenName = email
      chosenSource = "email"
    }

    const existingUser = existingUsers.get(email)
    const isNewUser = !existingUser
    const existingOrgMember = existingUser?._existingRoles ? existingUser._existingRoles.length > 0 : false
    const existingRoles = existingUser?._existingRoles || []

    consolidatedPreview.push({
      email,
      name: chosenName,
      name_source: chosenSource,
      roles: Array.from(new Set(roles)),
      is_new_user: isNewUser,
      existing_org_member: existingOrgMember,
      existing_roles: existingRoles,
      name_conflicts: nameConflicts,
    })
  }

  // Validate athlete-guardian links
  const athleteLinks: AthleteGuardianLink[] = []
  const athletes = sheetData["Athletes"] || []

  for (const athlete of athletes) {
    const athleteEmail = String(athlete.email || "").trim().toLowerCase()
    const athleteFirstName = String(athlete.first_name || "").trim()
    const athleteLastName = String(athlete.last_name || "").trim()
    const athleteName = `${athleteFirstName} ${athleteLastName}`.trim() || athleteEmail

    // Support multiple guardian emails (guardian_email, guardian_email_2, etc.)
    const guardianEmailKeys = Object.keys(athlete).filter((k) => k.startsWith("guardian_email"))
    for (const key of guardianEmailKeys) {
      const guardianEmail = String(athlete[key] || "").trim().toLowerCase()
      if (!guardianEmail) continue

      if (!isValidEmail(guardianEmail)) {
        errors.push({
          sheet: "Athletes",
          row: athlete._rowNumber || 0,
          field: key,
          message: `Invalid guardian email format: ${guardianEmail}`,
          severity: "error",
        })
        athleteLinks.push({
          athlete_email: athleteEmail,
          athlete_name: athleteName,
          guardian_email: guardianEmail,
          guardian_name: "",
          guardian_source: "new",
          status: "invalid",
        })
        continue
      }

      // Check if guardian exists in Guardians sheet or database
      const guardianInSheet = guardianEmails.has(guardianEmail)
      let guardianExists = false
      let guardianName = ""

      if (guardianInSheet) {
        const guardianRow = sheetData["Guardians"]?.find(
          (r) => String(r.email || "").trim().toLowerCase() === guardianEmail
        )
        if (guardianRow) {
          guardianExists = true
          const gFirst = String(guardianRow.first_name || "").trim()
          const gLast = String(guardianRow.last_name || "").trim()
          guardianName = `${gFirst} ${gLast}`.trim() || guardianEmail
        }
      } else {
        // Check database
        const { data: existingGuardian } = await supabaseAdmin
          .rpc("find_guardian_by_email", {
            p_email: guardianEmail,
            p_org_id: org_id,
          })
        if (existingGuardian && existingGuardian.length > 0) {
          guardianExists = true
          guardianName = existingGuardian[0].display_name || guardianEmail
        }
      }

      if (!guardianExists) {
        errors.push({
          sheet: "Athletes",
          row: athlete._rowNumber || 0,
          field: key,
          message: `Guardian email not found in Guardians sheet or existing users: ${guardianEmail}`,
          severity: "error",
        })
      }

      athleteLinks.push({
        athlete_email: athleteEmail,
        athlete_name: athleteName,
        guardian_email: guardianEmail,
        guardian_name: guardianName,
        guardian_source: guardianInSheet ? "new" : "existing",
        status: guardianExists ? "ok" : "missing",
      })
    }
  }

  const blockingErrors = errors.filter((e) => e.severity === "error").length
  const warningCount = warnings.length

  const result: ValidationResult = {
    valid: blockingErrors === 0,
    blocking_errors: blockingErrors,
    warnings: warningCount,
    totals: {
      org_admins: sheetData["Org Admins"]?.length || 0,
      coaches: sheetData["Coaches"]?.length || 0,
      guardians: sheetData["Guardians"]?.length || 0,
      athletes: sheetData["Athletes"]?.length || 0,
      unique_emails: consolidatedPreview.length,
    },
    row_errors: [...errors, ...warnings],
    consolidated_preview: consolidatedPreview,
    athlete_guardian_links: athleteLinks,
  }

  return json(req, result)
})
