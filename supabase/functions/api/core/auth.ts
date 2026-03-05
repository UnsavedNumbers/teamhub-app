import { ApiManagerError } from "./errors.ts"

export interface AuthContext {
  userId: string | null
  isAuthenticated: boolean
  currentOrgId: string | null
}

interface UserClaimsLike {
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

function readCurrentOrgFromClaims(user: UserClaimsLike): string | null {
  const appMeta = user.app_metadata ?? {}
  const userMeta = user.user_metadata ?? {}

  const candidate =
    appMeta.current_org_id ??
    appMeta.org_id ??
    userMeta.current_org_id ??
    userMeta.org_id ??
    null

  return typeof candidate === "string" && candidate.length > 0 ? candidate : null
}

export async function resolveAuthContext(
  supabase: {
    auth: {
      getUser: () => Promise<{
        data: { user: (UserClaimsLike & { id: string }) | null }
        error: { message: string } | null
      }>
    }
  },
  authorizationHeader: string | null,
  allowAnonymous: boolean,
): Promise<AuthContext> {
  const hasAuthorization = Boolean(authorizationHeader && authorizationHeader.trim().length > 0)

  if (!hasAuthorization && allowAnonymous) {
    return {
      userId: null,
      isAuthenticated: false,
      currentOrgId: null,
    }
  }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    if (allowAnonymous && !hasAuthorization) {
      return {
        userId: null,
        isAuthenticated: false,
        currentOrgId: null,
      }
    }

    throw new ApiManagerError("AUTH_REQUIRED", "Authentication is required for this operation.", 401)
  }

  return {
    userId: data.user.id,
    isAuthenticated: true,
    currentOrgId: readCurrentOrgFromClaims(data.user),
  }
}
