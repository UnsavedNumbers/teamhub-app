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

function getRoleCompatiblePath(targetRole: DemoSwitcherRole, currentPath: string): string {
  const path = currentPath || '/'

  if (targetRole === 'org_admin' || targetRole === 'coach') {
    if (path === '/portal/notifications') {
      return '/admin/notifications'
    }

    if (path === '/portal/announcements') {
      return '/admin/announcements'
    }

    const portalAnnouncementMatch = path.match(/^\/portal\/(?:announcements|messages)\/([^/?#]+)(.*)$/)
    if (portalAnnouncementMatch) {
      return `/admin/announcements/${portalAnnouncementMatch[1]}${portalAnnouncementMatch[2] ?? ''}`
    }
  }

  if (targetRole === 'guardian' || targetRole === 'athlete') {
    if (path === '/admin/notifications') {
      return '/portal/notifications'
    }

    if (path === '/admin/announcements') {
      return '/portal/announcements'
    }

    const adminAnnouncementMatch = path.match(/^\/admin\/announcements\/([^/?#]+)(.*)$/)
    if (adminAnnouncementMatch) {
      return `/portal/announcements/${adminAnnouncementMatch[1]}${adminAnnouncementMatch[2] ?? ''}`
    }
  }

  return path
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
