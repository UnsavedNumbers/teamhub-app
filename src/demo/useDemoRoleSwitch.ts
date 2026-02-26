import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/contexts/OrganizationContext'
import { USE_FAKE_DATA } from '@/data/config'
import { showError, showWarning } from '@/utils/toast'
import { canAccessPath, getHomeRouteForRole, type PathAccessContext } from '@/lib/routeGuard'
import { getDemoRoleLabel, getDemoUser, listDemoUsers, type DemoSwitcherRole } from './demoUsers'

const DEMO_RETURN_TO_KEY = 'DEMO_RETURN_TO'
const DEMO_RETURN_TS_KEY = 'DEMO_RETURN_TS'
const DEMO_PREV_ROLE_KEY = 'DEMO_PREV_ROLE'
const DEMO_TARGET_ROLE_KEY = 'DEMO_TARGET_ROLE'
const DEMO_SWITCH_IN_PROGRESS_KEY = 'DEMO_SWITCH_IN_PROGRESS'

const SWITCH_STALE_MS = 15_000
const AUTH_SETTLE_TIMEOUT_MS = 5_000

function nowTs(): number {
  return Date.now()
}

function clearSwitchStorage(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(DEMO_RETURN_TO_KEY)
  sessionStorage.removeItem(DEMO_RETURN_TS_KEY)
  sessionStorage.removeItem(DEMO_PREV_ROLE_KEY)
  sessionStorage.removeItem(DEMO_TARGET_ROLE_KEY)
  sessionStorage.removeItem(DEMO_SWITCH_IN_PROGRESS_KEY)
}

function storeSwitchIntent(returnTo: string, previousRole: DemoSwitcherRole | null, targetRole: DemoSwitcherRole): void {
  if (typeof window === 'undefined') return

  const ts = String(nowTs())
  sessionStorage.setItem(DEMO_RETURN_TO_KEY, returnTo)
  sessionStorage.setItem(DEMO_RETURN_TS_KEY, ts)
  sessionStorage.setItem(DEMO_PREV_ROLE_KEY, previousRole ?? '')
  sessionStorage.setItem(DEMO_TARGET_ROLE_KEY, targetRole)
  sessionStorage.setItem(DEMO_SWITCH_IN_PROGRESS_KEY, ts)
}

function getSwitchInProgressAge(): number | null {
  if (typeof window === 'undefined') return null

  const raw = sessionStorage.getItem(DEMO_SWITCH_IN_PROGRESS_KEY)
  if (!raw) return null

  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null

  return nowTs() - parsed
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function inferCurrentDemoRole(profile: ReturnType<typeof useAuth>['profile']): DemoSwitcherRole | null {
  if (!profile) return null
  if (profile.isPlatformAdmin) return 'platform_admin'

  const roles = profile.organizations.flatMap((org) => org.roles)

  if (roles.includes('org_admin')) return 'org_admin'
  if (roles.includes('coach')) return 'coach'
  if (roles.includes('staff')) return 'staff'
  if (roles.includes('guardian')) return 'guardian'
  if (roles.includes('parent')) return 'guardian'
  if (roles.includes('athlete')) return 'athlete'
  if (roles.includes('fan')) return 'fan'

  return 'guardian'
}

function toPathAccessRole(role: DemoSwitcherRole): PathAccessContext['role'] {
  if (role === 'platform_admin') return 'platform_admin'
  if (role === 'org_admin') return 'org_admin'
  if (role === 'coach') return 'coach'
  if (role === 'fan') return 'fan'
  if (role === 'athlete') return 'athlete'
  if (role === 'staff') return 'parent'
  return 'parent'
}

interface RouteRewriteRule {
  pattern: RegExp
  rewrite: (...segments: string[]) => string
}

function splitPathWithSuffix(path: string): { pathname: string; suffix: string } {
  const safePath = path || '/'
  const searchIndex = safePath.indexOf('?')
  const hashIndex = safePath.indexOf('#')
  const cutAt = [searchIndex, hashIndex]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? safePath.length

  return {
    pathname: safePath.slice(0, cutAt) || '/',
    suffix: safePath.slice(cutAt),
  }
}

function applyRouteRewrites(pathname: string, rules: RouteRewriteRule[]): string | null {
  for (const rule of rules) {
    const match = pathname.match(rule.pattern)
    if (!match) continue
    return rule.rewrite(...match.slice(1))
  }

  return null
}

const TO_ADMIN_REWRITES: RouteRewriteRule[] = [
  { pattern: /^\/portal$/, rewrite: () => '/admin' },
  { pattern: /^\/portal\/dashboard$/, rewrite: () => '/admin' },
  { pattern: /^\/portal\/announcements$/, rewrite: () => '/admin/announcements' },
  { pattern: /^\/portal\/(?:announcements|messages)\/([^/]+)$/, rewrite: (id) => `/admin/announcements/${id}` },
  { pattern: /^\/portal\/notifications$/, rewrite: () => '/admin/notifications' },
  { pattern: /^\/portal\/athletes$/, rewrite: () => '/admin/athletes' },
  { pattern: /^\/portal\/athletes\/new$/, rewrite: () => '/admin/athletes/new' },
  { pattern: /^\/portal\/athletes\/([^/]+)\/profile$/, rewrite: (id) => `/admin/athletes/${id}` },
  { pattern: /^\/portal\/athletes\/([^/]+)\/edit$/, rewrite: (id) => `/admin/athletes/${id}/edit` },
  { pattern: /^\/portal\/calendar$/, rewrite: () => '/admin/events' },
  { pattern: /^\/portal\/calendar\/new$/, rewrite: () => '/admin/events/new' },
  { pattern: /^\/portal\/calendar\/events\/([^/]+)$/, rewrite: (id) => `/admin/events/${id}` },
  { pattern: /^\/portal\/calendar\/events\/([^/]+)\/edit$/, rewrite: (id) => `/admin/events/${id}/edit` },
  { pattern: /^\/portal\/payments$/, rewrite: () => '/admin/payments' },
  { pattern: /^\/portal\/payments\/([^/]+)$/, rewrite: (id) => `/admin/payments/${id}` },
  { pattern: /^\/portal\/uniforms$/, rewrite: () => '/admin/uniforms' },
  { pattern: /^\/portal\/uniforms\/([^/]+)$/, rewrite: (id) => `/admin/uniforms/${id}` },
  { pattern: /^\/portal\/travel$/, rewrite: () => '/admin/travel' },
  { pattern: /^\/portal\/travel\/([^/]+)$/, rewrite: (id) => `/admin/travel/${id}` },
  { pattern: /^\/portal\/tryouts$/, rewrite: () => '/admin/tryouts' },
  { pattern: /^\/portal\/tryouts\/([^/]+)$/, rewrite: (id) => `/admin/tryouts/${id}` },
  { pattern: /^\/portal\/photos$/, rewrite: () => '/admin/photos' },
  { pattern: /^\/portal\/photos\/gallery\/([^/]+)(?:\/manage)?$/, rewrite: (id) => `/admin/photos/${id}` },
  { pattern: /^\/portal\/videos$/, rewrite: () => '/admin/videos' },
  { pattern: /^\/portal\/videos\/([^/]+)$/, rewrite: (id) => `/admin/videos/${id}` },
  { pattern: /^\/portal\/settings$/, rewrite: () => '/admin/settings' },
  { pattern: /^\/portal\/contact$/, rewrite: () => '/admin/contact' },
  { pattern: /^\/portal\/contact-org$/, rewrite: () => '/admin/contact-requests' },
  { pattern: /^\/portal\/tickets(?:\/.*)?$/, rewrite: () => '/admin/ticketing/events' },
  { pattern: /^\/portal\/account\/tickets$/, rewrite: () => '/admin/ticketing/orders' },
  { pattern: /^\/fan$/, rewrite: () => '/admin' },
  { pattern: /^\/fan\/home$/, rewrite: () => '/admin' },
  { pattern: /^\/fan\/schedule$/, rewrite: () => '/admin/events' },
  { pattern: /^\/fan\/events\/([^/]+)$/, rewrite: (id) => `/admin/events/${id}` },
  { pattern: /^\/fan\/photos$/, rewrite: () => '/admin/photos' },
  { pattern: /^\/fan\/photos\/gallery\/([^/]+)$/, rewrite: (id) => `/admin/photos/${id}` },
  { pattern: /^\/fan\/videos$/, rewrite: () => '/admin/videos' },
  { pattern: /^\/fan\/videos\/([^/]+)$/, rewrite: (id) => `/admin/videos/${id}` },
  { pattern: /^\/fan\/tickets(?:\/.*)?$/, rewrite: () => '/admin/ticketing/events' },
  { pattern: /^\/fan\/profile\/notifications$/, rewrite: () => '/admin/notifications' },
  { pattern: /^\/fan\/profile(?:\/.*)?$/, rewrite: () => '/admin/settings' },
]

const TO_PORTAL_REWRITES: RouteRewriteRule[] = [
  { pattern: /^\/admin$/, rewrite: () => '/portal/dashboard' },
  { pattern: /^\/admin\/announcements$/, rewrite: () => '/portal/announcements' },
  { pattern: /^\/admin\/announcements\/([^/]+)$/, rewrite: (id) => `/portal/announcements/${id}` },
  { pattern: /^\/admin\/notifications(?:\/analytics)?$/, rewrite: () => '/portal/notifications' },
  { pattern: /^\/admin\/athletes$/, rewrite: () => '/portal/athletes' },
  { pattern: /^\/admin\/athletes\/new$/, rewrite: () => '/portal/athletes/new' },
  { pattern: /^\/admin\/athletes\/import$/, rewrite: () => '/portal/athletes' },
  { pattern: /^\/admin\/athletes\/([^/]+)$/, rewrite: (id) => `/portal/athletes/${id}/profile` },
  { pattern: /^\/admin\/athletes\/([^/]+)\/edit$/, rewrite: (id) => `/portal/athletes/${id}/edit` },
  { pattern: /^\/admin\/guardians(?:\/.*)?$/, rewrite: () => '/portal/athletes' },
  { pattern: /^\/admin\/events$/, rewrite: () => '/portal/calendar' },
  { pattern: /^\/admin\/events\/new$/, rewrite: () => '/portal/calendar/new' },
  { pattern: /^\/admin\/events\/([^/]+)$/, rewrite: (id) => `/portal/calendar/events/${id}` },
  { pattern: /^\/admin\/events\/([^/]+)\/edit$/, rewrite: (id) => `/portal/calendar/events/${id}/edit` },
  { pattern: /^\/admin\/events\/([^/]+)\/attendance$/, rewrite: (id) => `/portal/calendar/events/${id}` },
  { pattern: /^\/admin\/payments$/, rewrite: () => '/portal/payments' },
  { pattern: /^\/admin\/payments\/new$/, rewrite: () => '/portal/payments' },
  { pattern: /^\/admin\/payments\/([^/]+)$/, rewrite: (id) => `/portal/payments/${id}` },
  { pattern: /^\/admin\/uniforms$/, rewrite: () => '/portal/uniforms' },
  { pattern: /^\/admin\/uniforms\/new$/, rewrite: () => '/portal/uniforms' },
  { pattern: /^\/admin\/uniforms\/([^/]+)$/, rewrite: (id) => `/portal/uniforms/${id}` },
  { pattern: /^\/admin\/uniforms\/([^/]+)\/edit$/, rewrite: (id) => `/portal/uniforms/${id}` },
  { pattern: /^\/admin\/travel$/, rewrite: () => '/portal/travel' },
  { pattern: /^\/admin\/travel\/new$/, rewrite: () => '/portal/travel' },
  { pattern: /^\/admin\/travel\/([^/]+)$/, rewrite: (id) => `/portal/travel/${id}` },
  { pattern: /^\/admin\/tryouts$/, rewrite: () => '/portal/tryouts' },
  { pattern: /^\/admin\/tryouts\/new$/, rewrite: () => '/portal/tryouts' },
  { pattern: /^\/admin\/tryouts\/([^/]+)$/, rewrite: (id) => `/portal/tryouts/${id}` },
  { pattern: /^\/admin\/photos$/, rewrite: () => '/portal/photos' },
  { pattern: /^\/admin\/photos\/([^/]+)$/, rewrite: (id) => `/portal/photos/gallery/${id}` },
  { pattern: /^\/admin\/photos\/([^/]+)\/photo\/([^/]+)$/, rewrite: (galleryId) => `/portal/photos/gallery/${galleryId}` },
  { pattern: /^\/admin\/photos\/.*$/, rewrite: () => '/portal/photos' },
  { pattern: /^\/admin\/videos$/, rewrite: () => '/portal/videos' },
  { pattern: /^\/admin\/videos\/([^/]+)$/, rewrite: (id) => `/portal/videos/${id}` },
  { pattern: /^\/admin\/settings$/, rewrite: () => '/portal/settings' },
  { pattern: /^\/admin\/organization(?:\/.*)?$/, rewrite: () => '/portal/settings' },
  { pattern: /^\/admin\/contact$/, rewrite: () => '/portal/contact' },
  { pattern: /^\/admin\/contact-requests(?:\/.*)?$/, rewrite: () => '/portal/contact-org' },
  { pattern: /^\/admin\/ticketing\/orders(?:\/.*)?$/, rewrite: () => '/portal/account/tickets' },
  { pattern: /^\/admin\/ticketing\/events(?:\/.*)?$/, rewrite: () => '/portal/tickets' },
  { pattern: /^\/fan$/, rewrite: () => '/portal/dashboard' },
  { pattern: /^\/fan\/home$/, rewrite: () => '/portal/dashboard' },
  { pattern: /^\/fan\/schedule$/, rewrite: () => '/portal/calendar' },
  { pattern: /^\/fan\/events\/([^/]+)$/, rewrite: (id) => `/portal/calendar/events/${id}` },
  { pattern: /^\/fan\/photos$/, rewrite: () => '/portal/photos' },
  { pattern: /^\/fan\/photos\/gallery\/([^/]+)$/, rewrite: (id) => `/portal/photos/gallery/${id}` },
  { pattern: /^\/fan\/videos$/, rewrite: () => '/portal/videos' },
  { pattern: /^\/fan\/videos\/([^/]+)$/, rewrite: (id) => `/portal/videos/${id}` },
  { pattern: /^\/fan\/tickets(?:\/.*)?$/, rewrite: () => '/portal/account/tickets' },
  { pattern: /^\/fan\/following$/, rewrite: () => '/portal/follows' },
  { pattern: /^\/fan\/discover$/, rewrite: () => '/portal/discover' },
  { pattern: /^\/fan\/profile\/notifications$/, rewrite: () => '/portal/notifications' },
  { pattern: /^\/fan\/profile(?:\/.*)?$/, rewrite: () => '/portal/settings' },
]

const TO_FAN_REWRITES: RouteRewriteRule[] = [
  { pattern: /^\/portal$/, rewrite: () => '/fan/home' },
  { pattern: /^\/portal\/dashboard$/, rewrite: () => '/fan/home' },
  { pattern: /^\/admin$/, rewrite: () => '/fan/home' },
  { pattern: /^\/platform-admin(?:\/.*)?$/, rewrite: () => '/fan/home' },
  { pattern: /^\/portal\/calendar$/, rewrite: () => '/fan/schedule' },
  { pattern: /^\/admin\/events$/, rewrite: () => '/fan/schedule' },
  { pattern: /^\/portal\/calendar\/events\/([^/]+)$/, rewrite: (id) => `/fan/events/${id}` },
  { pattern: /^\/admin\/events\/([^/]+)$/, rewrite: (id) => `/fan/events/${id}` },
  { pattern: /^\/portal\/photos$/, rewrite: () => '/fan/photos' },
  { pattern: /^\/admin\/photos(?:\/.*)?$/, rewrite: () => '/fan/photos' },
  { pattern: /^\/portal\/photos\/gallery\/([^/]+)(?:\/manage)?$/, rewrite: (id) => `/fan/photos/gallery/${id}` },
  { pattern: /^\/admin\/photos\/([^/]+)$/, rewrite: (id) => `/fan/photos/gallery/${id}` },
  { pattern: /^\/portal\/videos$/, rewrite: () => '/fan/videos' },
  { pattern: /^\/admin\/videos$/, rewrite: () => '/fan/videos' },
  { pattern: /^\/portal\/videos\/([^/]+)$/, rewrite: (id) => `/fan/videos/${id}` },
  { pattern: /^\/admin\/videos\/([^/]+)$/, rewrite: (id) => `/fan/videos/${id}` },
  { pattern: /^\/portal\/notifications$/, rewrite: () => '/fan/profile/notifications' },
  { pattern: /^\/admin\/notifications(?:\/analytics)?$/, rewrite: () => '/fan/profile/notifications' },
  { pattern: /^\/portal\/follows$/, rewrite: () => '/fan/following' },
  { pattern: /^\/portal\/discover$/, rewrite: () => '/fan/discover' },
  { pattern: /^\/portal\/tickets(?:\/.*)?$/, rewrite: () => '/fan/tickets' },
  { pattern: /^\/portal\/account\/tickets$/, rewrite: () => '/fan/tickets' },
  { pattern: /^\/admin\/ticketing\/(?:events|orders)(?:\/.*)?$/, rewrite: () => '/fan/tickets' },
]

const TO_PLATFORM_REWRITES: RouteRewriteRule[] = [
  { pattern: /^\/portal(?:\/dashboard)?$/, rewrite: () => '/platform-admin' },
  { pattern: /^\/admin$/, rewrite: () => '/platform-admin' },
  { pattern: /^\/fan(?:\/home)?$/, rewrite: () => '/platform-admin' },
  { pattern: /^\/portal\/photos(?:\/.*)?$/, rewrite: () => '/platform-admin/photos' },
  { pattern: /^\/admin\/photos(?:\/.*)?$/, rewrite: () => '/platform-admin/photos' },
  { pattern: /^\/fan\/photos(?:\/.*)?$/, rewrite: () => '/platform-admin/photos' },
  { pattern: /^\/portal\/payments(?:\/.*)?$/, rewrite: () => '/platform-admin/payments' },
  { pattern: /^\/admin\/payments(?:\/.*)?$/, rewrite: () => '/platform-admin/payments' },
  { pattern: /^\/portal\/tickets(?:\/.*)?$/, rewrite: () => '/platform-admin/ticketing/events' },
  { pattern: /^\/portal\/account\/tickets$/, rewrite: () => '/platform-admin/ticketing/orders' },
  { pattern: /^\/fan\/tickets(?:\/.*)?$/, rewrite: () => '/platform-admin/ticketing/events' },
  { pattern: /^\/admin\/ticketing\/events(?:\/.*)?$/, rewrite: () => '/platform-admin/ticketing/events' },
  { pattern: /^\/admin\/ticketing\/orders(?:\/.*)?$/, rewrite: () => '/platform-admin/ticketing/orders' },
  { pattern: /^\/admin\/organization\/users$/, rewrite: () => '/platform-admin/users' },
  { pattern: /^\/admin\/organization(?:\/.*)?$/, rewrite: () => '/platform-admin/organizations' },
]

function getRoleCompatiblePath(targetRole: DemoSwitcherRole, currentPath: string): string {
  const path = currentPath || '/'
  const { pathname, suffix } = splitPathWithSuffix(path)

  const isAdminTarget = targetRole === 'org_admin' || targetRole === 'coach'
  const isPortalTarget = targetRole === 'guardian' || targetRole === 'athlete' || targetRole === 'staff'

  const rewrites = isAdminTarget
    ? TO_ADMIN_REWRITES
    : isPortalTarget
      ? TO_PORTAL_REWRITES
      : targetRole === 'fan'
        ? TO_FAN_REWRITES
        : targetRole === 'platform_admin'
          ? TO_PLATFORM_REWRITES
          : []

  const rewrittenPath = applyRouteRewrites(pathname, rewrites)
  if (!rewrittenPath) return path

  return `${rewrittenPath}${suffix}`
}

export function useDemoRoleSwitch() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { signInWithEmail, user, profile, loading } = useAuth()
  const { currentOrganization, setCurrentOrganization } = useOrganization()

  const [isSwitching, setIsSwitching] = useState(false)

  const snapshotRef = useRef({ user, profile, loading, currentOrganization })
  useEffect(() => {
    snapshotRef.current = { user, profile, loading, currentOrganization }
  }, [user, profile, loading, currentOrganization])

  const demoUsers = useMemo(() => listDemoUsers(currentOrganization?.id), [currentOrganization?.id])

  const waitForTargetAuth = useCallback(
    async (targetEmail: string, targetRole: DemoSwitcherRole): Promise<boolean> => {
      const started = nowTs()
      const normalizedTargetEmail = targetEmail.trim().toLowerCase()

      while (nowTs() - started < AUTH_SETTLE_TIMEOUT_MS) {
        const snapshot = snapshotRef.current
        const activeEmail = snapshot.profile?.email?.trim().toLowerCase() ?? snapshot.user?.email?.trim().toLowerCase() ?? null
        const activeRole = inferCurrentDemoRole(snapshot.profile)

        if (!snapshot.loading && snapshot.user && snapshot.profile && activeEmail === normalizedTargetEmail && activeRole === targetRole) {
          return true
        }

        await sleep(120)
      }

      return false
    },
    [],
  )

  const switchDemoRole = useCallback(
    async (targetRole: DemoSwitcherRole, currentPath: string) => {
      if (!USE_FAKE_DATA) return
      if (isSwitching) return

      const staleAge = getSwitchInProgressAge()
      if (staleAge !== null && staleAge < SWITCH_STALE_MS) {
        showWarning('A demo role switch is already in progress.')
        return
      }

      const snapshot = snapshotRef.current
      const previousRole = inferCurrentDemoRole(snapshot.profile)
      const target = getDemoUser(targetRole, snapshot.currentOrganization?.id)

      if (!target || !target.seeded || !target.email) {
        showError(`Demo user for ${getDemoRoleLabel(targetRole)} is not seeded.`)
        return
      }

      setIsSwitching(true)
      storeSwitchIntent(currentPath, previousRole, targetRole)

      try {
        await queryClient.cancelQueries()
        queryClient.clear()

        const loginResult = await signInWithEmail(target.email, target.password ?? 'demo-password')
        if (loginResult.error) {
          showError(loginResult.error.message || 'Could not switch demo role.')
          clearSwitchStorage()
          return
        }

        const settled = await waitForTargetAuth(target.email, targetRole)
        if (!settled) {
          showWarning('Demo switch completed, but profile loading timed out. Redirecting to home.')
          const timeoutFallbackPath = getHomeRouteForRole(toPathAccessRole(targetRole))
          if (typeof window !== 'undefined') {
            clearSwitchStorage()
            window.location.replace(timeoutFallbackPath)
            return
          } else {
            navigate(timeoutFallbackPath, { replace: true })
            clearSwitchStorage()
            return
          }
        }

        const postAuth = snapshotRef.current
        const organizations = postAuth.profile?.organizations ?? []
        const preferredOrgId = snapshot.currentOrganization?.id

        const preferredOrg = preferredOrgId
          ? organizations.find((org) => org.id === preferredOrgId) ?? null
          : null

        const fallbackOrg = target.defaultOrgId
          ? organizations.find((org) => org.id === target.defaultOrgId) ?? null
          : null

        const nextOrg = preferredOrg ?? fallbackOrg ?? organizations[0] ?? null
        if (nextOrg) {
          setCurrentOrganization(nextOrg)
        } else {
          setCurrentOrganization(null)
        }

        const activeRole = inferCurrentDemoRole(postAuth.profile) ?? targetRole

        const context: PathAccessContext = {
          isAuthenticated: Boolean(postAuth.user),
          role: toPathAccessRole(activeRole),
          isPlatformAdmin: postAuth.profile?.isPlatformAdmin ?? false,
          hasOrganization: Boolean(nextOrg) || Boolean(postAuth.profile?.isPlatformAdmin),
          orgId: nextOrg?.id ?? null,
          userId: postAuth.user?.id ?? null,
          organizationRoles: nextOrg?.roles,
        }

        const canReturn = await canAccessPath(context, currentPath)

        let destination = currentPath
        if (!canReturn) {
          const roleCompatiblePath = getRoleCompatiblePath(activeRole, currentPath)
          const canUseCompatiblePath = roleCompatiblePath !== currentPath
            ? await canAccessPath(context, roleCompatiblePath)
            : false

          destination = canUseCompatiblePath
            ? roleCompatiblePath
            : getHomeRouteForRole(context.role)
        }

        if (destination === getHomeRouteForRole(context.role)) {
          showWarning('Access denied for previous page. Redirected to role home.')
        }

        if (typeof window !== 'undefined') {
          clearSwitchStorage()
          window.location.replace(destination)
          return
        } else {
          navigate(destination, { replace: true })
          clearSwitchStorage()
        }
      } finally {
        setIsSwitching(false)
      }
    },
    [isSwitching, navigate, queryClient, setCurrentOrganization, signInWithEmail, waitForTargetAuth],
  )

  return {
    demoUsers,
    isSwitching,
    currentRole: inferCurrentDemoRole(profile),
    switchDemoRole,
  }
}
