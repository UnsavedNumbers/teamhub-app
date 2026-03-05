export type TicketCheckoutRole = 'fan' | 'guardian'

export function normalizeTicketCheckoutRole(rawRole: string | null | undefined): TicketCheckoutRole | null {
  if (!rawRole) return null

  const normalized = rawRole.trim().toLowerCase()
  if (normalized === 'fan') return 'fan'
  if (normalized === 'guardian' || normalized === 'parent') return 'guardian'

  return null
}

export function resolveTicketCheckoutRole(
  rawRole: string | null | undefined,
  options?: {
    profileRoles?: string[]
    fallbackRole?: TicketCheckoutRole
  },
): TicketCheckoutRole {
  const explicitRole = normalizeTicketCheckoutRole(rawRole)
  if (explicitRole) return explicitRole

  const fallbackRole = options?.fallbackRole ?? 'guardian'
  const normalizedProfileRoles = (options?.profileRoles ?? []).map((role) => role.trim().toLowerCase())

  if (normalizedProfileRoles.includes('fan')) {
    return 'fan'
  }
  if (normalizedProfileRoles.includes('guardian') || normalizedProfileRoles.includes('parent')) {
    return 'guardian'
  }

  return fallbackRole
}

export function appendTicketCheckoutRole(path: string, role: TicketCheckoutRole | null | undefined): string {
  if (!role) return path

  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}role=${encodeURIComponent(role)}`
}
