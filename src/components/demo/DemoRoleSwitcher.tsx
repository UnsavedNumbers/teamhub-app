import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { USE_FAKE_DATA } from '@/data/config'
import { useAuth } from '@/hooks/useAuth'
import { getDemoRoleLabel, type DemoSwitcherRole } from '@/demo/demoUsers'
import { useDemoRoleSwitch } from '@/demo/useDemoRoleSwitch'

const ROLE_ORDER: DemoSwitcherRole[] = [
  'org_admin',
  'coach',
  'staff',
  'guardian',
  'athlete',
  'fan',
]

const SWITCHER_HIDDEN_PATH_PREFIXES = [
  '/portal/auth/',
]

const SWITCHER_HIDDEN_PATHS = new Set([
  '/',
  '/demo',
  '/demo-request',
  '/portal/login',
  '/portal/signup',
  '/portal/forgot-password',
  '/portal/reset-password',
])

function shouldShowDemoRoleSwitcher(pathname: string, hasProfile: boolean): boolean {
  const env = import.meta.env as Record<string, string | boolean | undefined>
  const demoMode = String(env.VITE_DEMO_MODE ?? '').toLowerCase()
  const enabled = USE_FAKE_DATA || demoMode === 'true' || demoMode === '1'
  if (!enabled) return false
  if (!hasProfile) return false
  if (SWITCHER_HIDDEN_PATHS.has(pathname)) return false
  if (SWITCHER_HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false
  return true
}

export function DemoRoleSwitcher() {
  const location = useLocation()
  const { profile } = useAuth()
  const { demoUsers, isSwitching, currentRole, switchDemoRole } = useDemoRoleSwitch()

  const currentNonPlatformRole = currentRole && currentRole !== 'platform_admin' ? currentRole : null

  const [open, setOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<DemoSwitcherRole>('org_admin')

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.ctrlKey || event.metaKey
      if (!hasModifier || !event.shiftKey || event.key.toLowerCase() !== 'r') {
        return
      }

      event.preventDefault()
      setOpen((value) => !value)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const usersByRole = useMemo(() => {
    const map = new Map<DemoSwitcherRole, (typeof demoUsers)[number]>()
    for (const user of demoUsers) {
      map.set(user.role, user)
    }
    return map
  }, [demoUsers])

  const chipRoles = useMemo(
    () => ROLE_ORDER.filter((role) => role !== currentNonPlatformRole),
    [currentNonPlatformRole],
  )

  const availableRoles = useMemo(
    () => chipRoles.filter((role) => usersByRole.get(role)?.seeded),
    [chipRoles, usersByRole],
  )

  useEffect(() => {
    if (availableRoles.length === 0) {
      setSelectedRole(currentNonPlatformRole ?? 'org_admin')
      return
    }

    setSelectedRole((previous) => (
      availableRoles.includes(previous) ? previous : availableRoles[0]
    ))
  }, [availableRoles, currentNonPlatformRole])

  if (!shouldShowDemoRoleSwitcher(location.pathname, Boolean(profile?.id))) {
    return null
  }

  const pathWithSearchAndHash = `${location.pathname}${location.search}${location.hash}`
  const currentRoleLabel = getDemoRoleLabel(currentRole ?? 'guardian')
  const currentEmail = profile?.email ?? 'No active user'
  const hasSwitchTarget = availableRoles.length > 0

  const onSwitch = async () => {
    if (!hasSwitchTarget || selectedRole === currentNonPlatformRole) return
    await switchDemoRole(selectedRole, pathWithSearchAndHash)
    setOpen(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-[1200] pointer-events-auto">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2 shadow-sm"
          aria-label="Open demo role switcher"
        >
          <span className="material-symbols-rounded text-base">switch_account</span>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{currentRoleLabel}</span>
        </button>
      ) : (
        <div className="w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-[11px] px-2 py-0.5 font-medium">
                Demo Mode
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300">Ctrl+Shift+R</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              aria-label="Close demo role switcher"
            >
              <span className="material-symbols-rounded text-base">close</span>
            </button>
          </div>

          <div className="px-4 py-3 space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Current User</p>
              <p className="text-sm text-slate-900 dark:text-slate-100 truncate">{currentEmail}</p>
              <p className="text-xs text-slate-500">Role: {currentRoleLabel}</p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">View as</p>
              <div className="flex flex-wrap gap-2">
                {chipRoles.map((role) => {
                  const roleUser = usersByRole.get(role)
                  const disabled = !roleUser?.seeded
                  const active = selectedRole === role
                  return (
                    <button
                      key={role}
                      type="button"
                      disabled={disabled || isSwitching}
                      title={disabled ? 'Not seeded' : undefined}
                      onClick={() => setSelectedRole(role)}
                      className={`rounded-full px-2.5 py-1 text-xs border ${
                        active
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {getDemoRoleLabel(role)}
                    </button>
                  )
                })}
              </div>
              {!hasSwitchTarget && (
                <p className="mt-2 text-xs text-slate-500">No alternative demo roles are seeded.</p>
              )}
            </div>

            <button
              type="button"
              onClick={onSwitch}
              disabled={isSwitching || !hasSwitchTarget || selectedRole === currentNonPlatformRole}
              className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2"
            >
              <span className="material-symbols-rounded text-base">switch_account</span>
              {isSwitching ? 'Switching...' : `Switch to ${getDemoRoleLabel(selectedRole)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DemoRoleSwitcher
