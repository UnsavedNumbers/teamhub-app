import { ApiManagerError } from "./errors.ts"
import type { AuthContext } from "./auth.ts"

export interface AuthorizationRequirements {
  requireAuth: boolean
  orgScoped: boolean
  allowedRoles: string[]
  requiredStaffFlags: string[]
  allowPlatformAdmin: boolean
}

export interface AuthorizationContext {
  userId: string | null
  orgId: string | null
  roles: string[]
  isPlatformAdmin: boolean
  staffPermissions: Record<string, boolean>
}

interface MembershipRow {
  org_id: string
  role: string
  permissions: unknown
  is_active: boolean | null
}

function parsePermissions(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  const result: Record<string, boolean> = {}
  for (const [key, raw] of Object.entries(value)) {
    result[key] = raw === true
  }
  return result
}

function hasAnyRole(roles: string[], allowed: string[]): boolean {
  if (allowed.length === 0) {
    return true
  }
  return roles.some((role) => allowed.includes(role))
}

function hasRequiredStaffFlags(
  roles: string[],
  permissions: Record<string, boolean>,
  required: string[],
): boolean {
  if (required.length === 0) {
    return true
  }

  if (roles.includes("platform_admin")) {
    return true
  }

  if (!roles.includes("staff")) {
    return true
  }

  return required.every((flag) => permissions[flag] === true)
}

export async function enforceRateLimitHook(
  _supabase: unknown,
  _args: { userId: string | null; orgId: string | null; operationKey: string },
): Promise<void> {
  return
}

export async function resolveAuthorizationContext(
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { role?: string } | null; error: { message: string } | null }>
          order?: (column: string, options?: { ascending?: boolean }) => unknown
        }
      }
    }
    rpc: (
      functionName: string,
      args: { check_user_id: string },
    ) => Promise<{ data: Array<{ org_id: string; roles: string[] }> | null; error: { message: string } | null }>
  },
  auth: AuthContext,
  requirements: AuthorizationRequirements,
  requestedOrgId: string | null,
): Promise<AuthorizationContext> {
  if (!requirements.requireAuth && !auth.isAuthenticated) {
    return {
      userId: null,
      orgId: requestedOrgId,
      roles: ["public"],
      isPlatformAdmin: false,
      staffPermissions: {},
    }
  }

  if (!auth.userId) {
    throw new ApiManagerError("AUTH_REQUIRED", "Authentication is required for this operation.", 401)
  }

  const { data: platformRow, error: platformError } = await supabase
    .from("platform_admins")
    .select("role")
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (platformError) {
    throw new ApiManagerError("SERVER_ERROR", "Failed to verify platform role.", 500)
  }

  const isPlatformAdmin = Boolean(platformRow?.role)

  const { data: membershipsByRpc, error: membershipsError } = await supabase.rpc("get_user_organizations", {
    check_user_id: auth.userId,
  })

  if (membershipsError) {
    throw new ApiManagerError("SERVER_ERROR", "Failed to resolve organization memberships.", 500)
  }

  const allMemberships = membershipsByRpc ?? []
  const orgIds = allMemberships.map((item) => item.org_id)

  let resolvedOrgId: string | null = requestedOrgId

  if (requirements.orgScoped) {
    if (!resolvedOrgId && auth.currentOrgId) {
      resolvedOrgId = auth.currentOrgId
    }

    if (!resolvedOrgId && orgIds.length === 1) {
      resolvedOrgId = orgIds[0]
    }

    if (!resolvedOrgId) {
      throw new ApiManagerError(
        "ORG_SCOPE_REQUIRED",
        "An organization context is required for this operation.",
        400,
      )
    }

    const isOrgMember = orgIds.includes(resolvedOrgId)
    if (!isOrgMember && !(isPlatformAdmin && requirements.allowPlatformAdmin)) {
      throw new ApiManagerError("FORBIDDEN", "You do not have access to this organization.", 403)
    }
  }

  const roles = new Set<string>()
  let staffPermissions: Record<string, boolean> = {}

  if (!requirements.requireAuth) {
    roles.add("public")
  }

  if (resolvedOrgId) {
    const { data: membershipRow, error: membershipError } = await supabase
      .from("organization_members")
      .select("org_id, role, permissions, is_active")
      .eq("org_id", resolvedOrgId)
      .eq("user_id", auth.userId)
      .maybeSingle() as {
        data: MembershipRow | null
        error: { message: string } | null
      }

    if (membershipError) {
      throw new ApiManagerError("SERVER_ERROR", "Failed to verify organization role.", 500)
    }

    if (membershipRow && membershipRow.is_active !== false) {
      roles.add(membershipRow.role)
      staffPermissions = parsePermissions(membershipRow.permissions)
    }
  }

  if (isPlatformAdmin) {
    roles.add("platform_admin")
  }

  const roleList = Array.from(roles)

  if (!hasAnyRole(roleList, requirements.allowedRoles)) {
    throw new ApiManagerError("FORBIDDEN", "You do not have permission to run this operation.", 403)
  }

  if (!hasRequiredStaffFlags(roleList, staffPermissions, requirements.requiredStaffFlags)) {
    throw new ApiManagerError("FORBIDDEN", "Your staff permissions do not allow this operation.", 403)
  }

  return {
    userId: auth.userId,
    orgId: resolvedOrgId,
    roles: roleList,
    isPlatformAdmin,
    staffPermissions,
  }
}
