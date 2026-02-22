import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { OrganizationContext, Organization } from '../contexts/OrganizationContext'
import { useDemoSession } from '../contexts/DemoSessionContext'
import type { PlatformAdminRole } from '../types/platformAdmin.types'
import type { HomeLocation } from '../types/location'
import { geocodeZipToHomeLocation } from '../utils/homeLocation'
import { DEMO_ORG_A_ID, USE_FAKE_DATA } from '../data/config'
import { generateDemoData } from '../data/fake/demoDataEngine'
import { getDemoUserContext } from '../data/fake/userContext'
import { getOrganizationById } from '../data/fake/fakeOrganizations'
import { validateDemoCode } from '../data/services/demoCodeService'
import { getDemoOrg } from '../data/services/demoOrgService'
import {
  clearStoredDemoCode,
  createDemoSession,
  endDemoSession,
  getStoredDemoCode,
} from '../data/services/demoSessionService'
import { debug } from '../lib/debug'
import { captureEvent, identifyUser, resetAnalytics } from '../lib/analytics/analytics'

// Role types - now per organization (must match OrganizationContext.OrgMemberRole)
type OrgMemberRole = 'parent' | 'coach' | 'org_admin' | 'staff' | 'athlete'
type LegacyUserRole = 'parent' | 'coach' | 'admin'

interface UserProfile {
  id: string
  email: string | null
  phone: string
  first_name: string
  last_name: string
  display_name: string | null
  home_location?: HomeLocation | null
  home_zipcode?: string
  // Legacy fields (deprecated, use organizations instead)
  role?: LegacyUserRole
  family_id?: string | null
  org_id?: string | null
  organizations: Organization[]
  isPlatformAdmin: boolean
  platformAdminRole: PlatformAdminRole | null
  // Organization setup requirement flag
  requiresOrgSetup: boolean
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signInWithEmail: (email: string, password: string, demoCode?: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string, zipcode: string, requiresOrgSetup?: boolean, signupMode?: 'fan' | 'parent') => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  updateEmail: (newEmail: string, redirectTo?: string) => Promise<{ error: AuthError | null }>
  refreshProfile: () => Promise<void>
  // Role helpers (UX-only, not security - RLS handles authorization)
  hasRole: (orgId: string, role: OrgMemberRole) => boolean
  hasAnyRole: (role: OrgMemberRole) => boolean
  isOrgAdmin: (orgId?: string) => boolean
}

/* ===================== CONTEXT ===================== */

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const FAKE_AUTH_STORAGE_KEY = 'teamhub_fake_auth_state'

interface FakeAuthState {
  userId: string
  email: string
  orgId: string
  orgName: string
  roles: OrgMemberRole[]
  isPlatformAdmin: boolean
}

function readFakeAuthState(): FakeAuthState | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(FAKE_AUTH_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<FakeAuthState>
    if (!parsed || typeof parsed.email !== 'string' || parsed.email.trim().length === 0) {
      return null
    }

    const roles = Array.isArray(parsed.roles)
      ? parsed.roles.filter(
          (role): role is OrgMemberRole =>
            role === 'parent' || role === 'coach' || role === 'org_admin' || role === 'staff' || role === 'athlete',
        )
      : []

    const safeEmail = parsed.email.trim().toLowerCase()
    const safeUserId = typeof parsed.userId === 'string' && parsed.userId.trim().length > 0
      ? parsed.userId.trim()
      : ''
    const safeOrgId = typeof parsed.orgId === 'string' && parsed.orgId.trim().length > 0
      ? parsed.orgId.trim()
      : DEMO_ORG_A_ID
    const safeOrgName = typeof parsed.orgName === 'string' && parsed.orgName.trim().length > 0
      ? parsed.orgName.trim()
      : (getOrganizationById(safeOrgId)?.name ?? 'Demo Organization')

    return {
      userId: safeUserId,
      email: safeEmail,
      orgId: safeOrgId,
      orgName: safeOrgName,
      roles,
      isPlatformAdmin: parsed.isPlatformAdmin === true,
    }
  } catch {
    return null
  }
}

function writeFakeAuthState(state: FakeAuthState): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(FAKE_AUTH_STORAGE_KEY, JSON.stringify(state))
}

function clearFakeAuthState(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(FAKE_AUTH_STORAGE_KEY)
}

/* ===================== PROVIDER ===================== */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const latestUserRef = useRef<User | null>(null)
  const latestProfileRef = useRef<UserProfile | null>(null)
  const latestLoadingRef = useRef(true)
  const lastAuthSnapshotRef = useRef<string>('')
  const sessionRecoveryInFlightRef = useRef(false)
  const lastSessionRecoveryAttemptRef = useRef(0)

  const orgContext = useContext(OrganizationContext)
  const setOrganizations = orgContext?.setOrganizations ?? (() => {})
  const currentOrganization = orgContext?.currentOrganization ?? null
  const { refreshSession } = useDemoSession()

  // Prevent duplicate profile fetches (Bug Prevention #1 & #7)
  const profileFetchRef = useRef<Set<string>>(new Set())

  // Track last processed auth event timestamp for debouncing (Bug Prevention #3)
  const lastAuthEventRef = useRef<{ event: string; timestamp: number } | null>(null)

  // Mounted flag for cleanup (Bug Prevention #2)
  const mountedRef = useRef(true)

  // Keep latest identity in refs for auth event handlers without re-subscribing.
  useEffect(() => {
    latestUserRef.current = user
  }, [user])

  useEffect(() => {
    latestProfileRef.current = profile
  }, [profile])

  useEffect(() => {
    latestLoadingRef.current = loading
  }, [loading])

  const getAuthRouteContext = useCallback(() => {
    if (typeof window === 'undefined') {
      return { route: 'n/a', traceId: null as string | null }
    }
    const route = `${window.location.pathname}${window.location.search}${window.location.hash}`
    const traceId = window.sessionStorage.getItem('auth_debug_trace_id')
    return { route, traceId }
  }, [])

  // Snapshot log for auth state transitions to diagnose redirect races.
  useEffect(() => {
    const snapshot = {
      userId: user?.id ?? null,
      profileId: profile?.id ?? null,
      sessionUserId: session?.user?.id ?? null,
      loading,
      orgCount: profile?.organizations.length ?? 0,
      ...getAuthRouteContext(),
    }
    const serialized = JSON.stringify(snapshot)
    if (lastAuthSnapshotRef.current === serialized) return
    lastAuthSnapshotRef.current = serialized
    debug.data('Auth.state', 'Snapshot', snapshot)
  }, [user, profile, session, loading, getAuthRouteContext])

  /* ===================== FETCH PROFILE ===================== */

  const fetchProfile = useCallback(
    async (userId: string) => {
      // Prevent duplicate fetches for same user (Bug Prevention #1 & #7)
      if (profileFetchRef.current.has(userId)) {
        debug.flow('Auth', 'Profile fetch skipped (already in progress)', { userId })
        return
      }

      debug.flow('Auth', 'Profile fetch started', { userId })
      debug.perf.start(`auth.fetchProfile-${userId}`)

      profileFetchRef.current.add(userId)
      setLoading(true)

      try {
        /* ---- user table ---- */
        // Try to select with home_zipcode/home_location first (if migration has been applied)
        let { data: userData, error: userError } = await supabase
          .from('users')
          .select(
            'id, email, phone, display_name, first_name, last_name, home_zipcode, home_location, role, family_id, org_id, requires_org_setup'
          )
          .eq('id', userId)
          .single()

        // If column doesn't exist yet (migration not applied), retry without it
        if (userError?.code === '42703') {
          const retryResult = await supabase
            .from('users')
            .select(
            'id, email, phone, display_name, first_name, last_name, role, family_id, org_id, requires_org_setup'
          )
            .eq('id', userId)
            .single()
          userData = retryResult.data as any
          userError = retryResult.error
        }

        // Simplified error handling (Bug Prevention #4 & #9)
        if (userError || !userData) {
          const userErrorMessage = (userError?.message || '').toLowerCase()
          const isNetworkError =
            userErrorMessage.includes('networkerror') ||
            userErrorMessage.includes('failed to fetch') ||
            userErrorMessage.includes('network request failed')

          if (isNetworkError) {
            console.warn('Profile fetch network error:', userError)
            const { data: sessionData } = await supabase.auth.getSession()
            const sessionUser = sessionData.session?.user

            if (mountedRef.current && sessionUser?.id === userId) {
              const metadata = sessionUser.user_metadata ?? {}
              const fallbackProfile: UserProfile = {
                id: sessionUser.id,
                email: sessionUser.email ?? null,
                phone: typeof metadata.phone === 'string' ? metadata.phone : '',
                first_name: '',
                last_name: '',
                display_name:
                  typeof metadata.display_name === 'string' ? metadata.display_name : null,
                home_location: null,
                home_zipcode:
                  typeof metadata.home_zipcode === 'string' ? metadata.home_zipcode : undefined,
                role: undefined,
                family_id: null,
                org_id: null,
                organizations: [],
                isPlatformAdmin: false,
                platformAdminRole: null,
                requiresOrgSetup: Boolean(metadata.requires_org_setup),
              }
              setProfile((prev) => prev ?? fallbackProfile)
              setOrganizations([])
            }
            return
          }

          console.error('Profile fetch error:', userError)
          await supabase.auth.signOut()
          setProfile(null)
          return
        }

        // Type guard: ensure userData is not an error type
        if (!('id' in userData) || !userData.id) {
          console.error('Invalid user data structure')
          await supabase.auth.signOut()
          setProfile(null)
          return
        }

        // Type assertion: userData is now confirmed to be the correct type
        // home_zipcode/home_location may not exist if migration hasn't been applied yet
        const validUserData = userData as unknown as {
          id: string
          email: string | null
          phone: string | null
          display_name: string | null
          first_name?: string
          last_name?: string
          home_location?: HomeLocation | null
          home_zipcode?: string | null
          role: string | null
          family_id: string | null
          org_id: string | null
          requires_org_setup: boolean | null
        }

        /* ---- organizations ---- */
        let orgs: Organization[] = []
        let data: Array<{ org_id: string; org_name: string; roles: OrgMemberRole[] }> | null = null

        try {
          let orgError: any = null
          // Use real Supabase RPC
          const result = await supabase.rpc('get_user_organizations', {
            check_user_id: userId,
          })
          data = result.data as any
          orgError = result.error

          // Log RPC errors for debugging (this is likely the "profit data" / "profile data" error)
          if (orgError) {
            console.error('Error fetching user organizations:', orgError)
            // Continue with empty orgs - don't block profile creation
          }

          // Debug logging for organization loading
          if (process.env.NODE_ENV === 'development') {
            console.log('[useAuth] RPC result:', { userId, dataCount: data?.length ?? 0, hasError: !!orgError, data })
          }

          // Type-safe organization mapping (Bug Prevention #5 & #8)
          if (Array.isArray(data)) {
            orgs = data.map((o: any) => {
              // Normalize and validate roles array
              const roles = Array.isArray(o.roles)
                ? o.roles.filter(
                  (r: unknown): r is OrgMemberRole =>
                    r === 'parent' || r === 'coach' || r === 'org_admin' || r === 'staff' || r === 'athlete'
                )
                : []

              return {
                id: o.org_id,
                name: o.org_name || '',
                roles,
                // Compatibility getter for deprecated 'role' property
                get role(): OrgMemberRole {
                  return roles[0] ?? 'parent'
                },
              }
            })
            
            // Debug logging for mapped organizations
            if (process.env.NODE_ENV === 'development') {
              console.log('[useAuth] Mapped organizations:', orgs)
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[useAuth] RPC data is not an array:', data)
            }
          }
        } catch (err) {
          // Continue with empty orgs on error
          console.error('Exception fetching user organizations:', err)
          orgs = []
        }

        /* ---- platform admin ---- */
        const { data: admin } = await supabase
          .from('platform_admins')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()

        // Bug Prevention #10: Default to 'support_admin' if NULL
        let platformAdminRole: PlatformAdminRole | null = null
        if (admin) {
          platformAdminRole = admin.role ?? 'support_admin'
          if (!admin.role) {
            console.warn(`Platform admin ${userId} has NULL role, defaulting to support_admin`)
          }
        }

        // Guard against auth state changes during fetch (Bug Prevention #8)
        // Check if user is still the same before setting profile
        if (!mountedRef.current) return

        const profileData: UserProfile = {
          id: validUserData.id,
          email: validUserData.email,
          phone: validUserData.phone ?? '',
          first_name: validUserData.first_name ?? '',
          last_name: validUserData.last_name ?? '',
          display_name: validUserData.display_name,
          home_location: (validUserData.home_location as HomeLocation | null) ?? null,
          home_zipcode: validUserData.home_zipcode ?? undefined,
          role: (validUserData.role === 'parent' || validUserData.role === 'coach' || validUserData.role === 'admin') 
            ? (validUserData.role as LegacyUserRole) 
            : undefined,
          family_id: validUserData.family_id,
          org_id: validUserData.org_id,
          organizations: orgs,
          isPlatformAdmin: !!admin,
          platformAdminRole,
          requiresOrgSetup: validUserData.requires_org_setup ?? false,
        }

        // Guard against state updates after unmount (Bug Prevention #2)
        if (!mountedRef.current) return

        // Debug logging before setting organizations
        if (process.env.NODE_ENV === 'development') {
          console.log('[useAuth] Setting organizations:', { orgCount: orgs.length, orgs })
        }

        setProfile(profileData)
        setOrganizations(orgs)
        debug.perf.end(`auth.fetchProfile-${userId}`)
        debug.flow('Auth', 'Profile fetch completed', {
          userId,
          orgCount: orgs.length,
          isPlatformAdmin: profileData.isPlatformAdmin,
          requiresOrgSetup: profileData.requiresOrgSetup
        })
      } catch (err) {
        debug.perf.end(`auth.fetchProfile-${userId}`)
        const message = err instanceof Error ? err.message.toLowerCase() : ''
        const isNetworkError =
          message.includes('networkerror') ||
          message.includes('failed to fetch') ||
          message.includes('network request failed')

        if (isNetworkError) {
          debug.error('Auth', 'Profile fetch failed (network)', { userId, error: err })
          return
        }

        debug.error('Auth', 'Profile fetch failed', { userId, error: err })
        if (mountedRef.current) {
          setProfile(null)
        }
      } finally {
        profileFetchRef.current.delete(userId)
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [setOrganizations]
  )

  // Recover auth state if session exists in Supabase but local user/profile were never hydrated.
  // This covers callback flows where setSession() does not emit a usable auth event.
  useEffect(() => {
    if (loading) return
    if (user) return
    if (sessionRecoveryInFlightRef.current) return

    const now = Date.now()
    if (now - lastSessionRecoveryAttemptRef.current < 1500) return
    lastSessionRecoveryAttemptRef.current = now
    sessionRecoveryInFlightRef.current = true

    debug.flow('Auth', 'Session recovery check start', {
      ...getAuthRouteContext(),
    })

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!mountedRef.current) return
        if (error) {
          debug.error('Auth', 'Session recovery check failed', {
            error: error.message,
            ...getAuthRouteContext(),
          })
          return
        }

        const recoveredSession = data.session
        if (!recoveredSession?.user) {
          debug.flow('Auth', 'Session recovery check: no session', {
            ...getAuthRouteContext(),
          })
          return
        }

        debug.flow('Auth', 'Session recovery found session, hydrating auth state', {
          recoveredUserId: recoveredSession.user.id,
          ...getAuthRouteContext(),
        })
        setSession(recoveredSession)
        setUser(recoveredSession.user)
        fetchProfile(recoveredSession.user.id)
      })
      .finally(() => {
        sessionRecoveryInFlightRef.current = false
      })
  }, [loading, user, fetchProfile, getAuthRouteContext])

  /* ===================== AUTH BOOTSTRAP ===================== */

  useEffect(() => {
    mountedRef.current = true

    if (USE_FAKE_DATA) {
      const persisted = readFakeAuthState()
      if (persisted) {
        const resolvedContext = getDemoUserContext(persisted.email)
        const resolvedOrgId = persisted.orgId || resolvedContext?.orgId || DEMO_ORG_A_ID
        const resolvedOrgName =
          persisted.orgName ||
          getOrganizationById(resolvedOrgId)?.name ||
          'Demo Organization'
        const resolvedRoles: OrgMemberRole[] =
          persisted.roles.length > 0
            ? persisted.roles
            : resolvedContext?.roles && resolvedContext.roles.length > 0
              ? resolvedContext.roles
              : ['parent']
        const resolvedUserId = persisted.userId || resolvedContext?.userId || `demo-${persisted.email}`

        const organizations: Organization[] = [
          {
            id: resolvedOrgId,
            name: resolvedOrgName,
            roles: resolvedRoles,
            get role(): OrgMemberRole {
              return this.roles[0] ?? 'parent'
            },
          },
        ]

        const demoUser = {
          id: resolvedUserId,
          email: persisted.email,
          user_metadata: { signup_mode: 'parent' },
        } as unknown as User

        const legacyRole: LegacyUserRole | undefined = resolvedRoles.includes('org_admin')
          ? 'admin'
          : resolvedRoles.includes('coach')
            ? 'coach'
            : resolvedRoles.includes('parent')
              ? 'parent'
              : undefined

        const demoProfile: UserProfile = {
          id: resolvedUserId,
          email: persisted.email,
          phone: '',
          first_name: '',
          last_name: '',
          display_name: persisted.email.split('@')[0] ?? null,
          home_location: null,
          home_zipcode: undefined,
          role: legacyRole,
          family_id: null,
          org_id: resolvedOrgId,
          organizations,
          isPlatformAdmin: persisted.isPlatformAdmin,
          platformAdminRole: null,
          requiresOrgSetup: false,
        }

        if (mountedRef.current) {
          setUser(demoUser)
          setSession(null)
          setProfile(demoProfile)
          setOrganizations(organizations)
        }
        setLoading(false)
      } else {
        // No fake auth state, but check for real Supabase session (from demo entry flow)
        clearFakeAuthState()
        // Fall through to check real Supabase session
      }
    }

    debug.flow('Auth', 'Bootstrap: getSession() start', getAuthRouteContext())

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mountedRef.current) return

      // Handle session/user mismatch (Bug Prevention #10)
      const session = data.session
      debug.flow('Auth', 'Bootstrap: getSession() result', {
        hasSession: !!session,
        sessionUserId: session?.user?.id ?? null,
        ...getAuthRouteContext(),
      })
      if (!mountedRef.current) return
      setSession(session)
      setUser(session?.user ?? null)

      // If session exists but user is null, clear state
      if (session && !session.user) {
        if (!mountedRef.current) return
        setSession(null)
        setUser(null)
        setProfile(null)
        setOrganizations([])
        setLoading(false)
        return
      }

      if (session?.user) {
        // When USE_FAKE_DATA is true and we have a real Supabase session (from demo entry),
        // write fake auth state to sessionStorage so it persists across refreshes
        if (USE_FAKE_DATA && session.user.email) {
          try {
            // Fetch organizations to get roles
            const { data: orgData } = await supabase.rpc('get_user_organizations', {
              check_user_id: session.user.id
            } as any)
            
            const organizations = (orgData || []).map((org: any) => ({
              id: org.org_id,
              name: org.org_name || '',
              roles: Array.isArray(org.roles)
                ? org.roles.filter(
                    (r: unknown): r is OrgMemberRole =>
                      r === 'parent' || r === 'coach' || r === 'org_admin' || r === 'staff' || r === 'athlete'
                  )
                : [],
            }))

            const firstOrg = organizations[0]
            const roles = firstOrg?.roles || []
            const orgId = firstOrg?.id || DEMO_ORG_A_ID
            const orgName = firstOrg?.name || 'Demo Organization'

            // Check if platform admin
            const { data: adminData } = await supabase
              .from('platform_admins')
              .select('user_id')
              .eq('user_id', session.user.id)
              .maybeSingle()

            writeFakeAuthState({
              userId: session.user.id,
              email: session.user.email,
              orgId,
              orgName,
              roles,
              isPlatformAdmin: !!adminData,
            })
          } catch (err) {
            console.error('[useAuth] Failed to write fake auth state:', err)
          }
        }
        fetchProfile(session.user.id)
      } else {
        if (!mountedRef.current) return
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return

      const currentUser = latestUserRef.current
      const currentProfile = latestProfileRef.current
      debug.flow('Auth', `Auth event received: ${event}`, {
        event,
        eventUserId: session?.user?.id ?? null,
        currentUserId: currentUser?.id ?? null,
        currentProfileId: currentProfile?.id ?? null,
        loading: latestLoadingRef.current,
        ...getAuthRouteContext(),
      })

      // TOKEN_REFRESHED fires on tab focus when Supabase auto-refreshes the JWT.
      // Only hydrate profile if the user isn't already loaded — never re-fetch an
      // existing profile, because that causes setState calls that unmount the
      // current page and wipe form state.
      if (event === 'TOKEN_REFRESHED') {
        if (session) {
          setSession(session)

          const needsUserHydration = !currentUser || currentUser.id !== session.user.id

          if (needsUserHydration) {
            setUser(session.user)
            debug.flow('Auth', 'Token refreshed with missing identity, hydrating', {
              userId: session.user.id,
              ...getAuthRouteContext(),
            })
            fetchProfile(session.user.id)
          } else {
            debug.flow('Auth', 'Token refreshed (session updated only)', { userId: session.user.id, ...getAuthRouteContext() })
          }
        }
        return
      }

      // Log auth state changes
      debug.flow('Auth', `State change: ${event}`, {
        event,
        userId: session?.user?.id,
        hasSession: !!session,
        email: session?.user?.email,
        currentUserId: currentUser?.id ?? null,
        currentProfileId: currentProfile?.id ?? null,
        ...getAuthRouteContext(),
      })

      // Event debouncing (Bug Prevention #3)
      const now = Date.now()
      const lastEvent = lastAuthEventRef.current
      if (
        lastEvent &&
        lastEvent.event === event &&
        now - lastEvent.timestamp < 100
      ) {
        debug.data('Auth', 'Debounced duplicate auth event', {
          event,
          deltaMs: now - lastEvent.timestamp,
          ...getAuthRouteContext(),
        })
        return // Skip duplicate event within 100ms
      }
      lastAuthEventRef.current = { event, timestamp: now }

      // Handle session/user mismatch (Bug Prevention #10)
      if (session && !session.user) {
        if (!mountedRef.current) return
        setSession(null)
        setUser(null)
        setProfile(null)
        setOrganizations([])
        setLoading(false)
        return
      }

      if (!mountedRef.current) return

      // #region agent log
      if (event === 'SIGNED_IN' && session?.user) {
        const alreadyLoaded = currentProfile && currentProfile.id === session.user.id
        fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7451fa'},body:JSON.stringify({sessionId:'7451fa',location:'useAuth.tsx:751',message:'SIGNED_IN event - checking if should skip state updates',data:{event,alreadyLoaded,currentUserId:currentUser?.id,newUserId:session.user.id,currentSessionExists:!!latestUserRef.current?.id},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
        // Skip setSession/setUser if user already loaded — prevents unnecessary re-renders
        // that cause form state loss. Session token refresh happens in Supabase client.
        if (alreadyLoaded) {
          fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7451fa'},body:JSON.stringify({sessionId:'7451fa',location:'useAuth.tsx:755',message:'Skipping setSession/setUser - already loaded',data:{userId:session.user.id},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
        } else {
          setSession(session)
          setUser(session.user)
          fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7451fa'},body:JSON.stringify({sessionId:'7451fa',location:'useAuth.tsx:758',message:'Calling setSession/setUser - not loaded',data:{userId:session.user.id},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
        }
      } else {
        setSession(session)
        setUser(session?.user ?? null)
      }
      // #endregion

      if (event === 'SIGNED_IN') {
        debug.flow('Auth', 'User signed in', { userId: session?.user?.id, email: session?.user?.email })
        if (session?.user) {
          captureEvent('login_success', {
            user_id: session.user.id,
            email: session.user.email ?? undefined,
          })

          // Only fetch profile if user isn't already loaded — Supabase can
          // re-emit SIGNED_IN on tab focus / token refresh, and re-fetching
          // the profile sets loading=true which unmounts the current page.
          const alreadyLoaded = currentProfile && currentProfile.id === session.user.id
          if (!alreadyLoaded) {
            fetchProfile(session.user.id)
          } else {
            debug.flow('Auth', 'SIGNED_IN skipped profile fetch (already loaded)', {
              userId: session.user.id,
              ...getAuthRouteContext(),
            })
          }
        }
      } else if (event === 'SIGNED_OUT') {
        debug.flow('Auth', 'User signed out', { previousUserId: currentUser?.id ?? null })
        resetAnalytics()
        if (!mountedRef.current) return
        setProfile(null)
        setOrganizations([])
        setLoading(false)
        return
      }
    })

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, setOrganizations, getAuthRouteContext])

  // Identify user in PostHog when we have both user and profile (after login or reload)
  const lastIdentifiedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!user?.id) {
      lastIdentifiedRef.current = null
      return
    }
    if (!profile) return
    if (lastIdentifiedRef.current === user.id) return
    lastIdentifiedRef.current = user.id
    const name =
      profile.display_name?.trim() ||
      [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
      null
    const organizationId =
      profile.organizations?.[0]?.id ?? profile.org_id ?? null
    identifyUser(user.id, {
      email: profile.email ?? user.email ?? null,
      name: name || null,
      organization_id: organizationId,
    })
  }, [user?.id, user?.email, profile])

  /* ===================== LOADING STATE TIMEOUT FALLBACK ===================== */

  // Bug Prevention #4: Ensure loading state doesn't get stuck
  useEffect(() => {
    if (!loading) return

    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading state stuck, forcing reset')
        setLoading(false)
      }
    }, 5000)

    return () => clearTimeout(timeout)
  }, [loading])

  /* ===================== AUTH ACTIONS ===================== */

  async function signInWithEmail(email: string, password: string, demoCode?: string) {
    return debug.group(`Auth.signInWithEmail: ${email}`, async () => {
        debug.flow('Auth', 'Login attempt', { email, method: 'email' })
        debug.perf.start('auth.signInWithEmail')

        const toAuthError = (message: string): AuthError => ({ name: 'AuthError', message } as AuthError)

        if (USE_FAKE_DATA) {
      const demoContext = getDemoUserContext(email)
      if (!demoContext) {
        return { error: toAuthError('Invalid login credentials') }
      }

      const normalizedDemoCode = (demoCode ?? getStoredDemoCode() ?? '').trim().toUpperCase()
      let resolvedDemoOrgId = demoContext.orgId
      let resolvedDemoOrgName = getOrganizationById(demoContext.orgId)?.name ?? 'Demo Organization'

      if (normalizedDemoCode) {
        const validation = await validateDemoCode(normalizedDemoCode)
        if (!validation.valid || !validation.demoOrgId) {
          const messageByReason: Record<string, string> = {
            missing: 'Demo code is required.',
            not_found: 'Invalid demo code.',
            revoked: 'This demo code has been revoked.',
            expired: 'This demo code has expired.',
            inactive_org: 'This demo organization is inactive.',
          }
          const reason = validation.reason ?? 'not_found'
          return { error: toAuthError(messageByReason[reason] ?? 'Invalid demo code.') }
        }

        const demoOrg = await getDemoOrg(validation.demoOrgId)
        await generateDemoData(demoOrg, demoOrg.sports_sponsored, normalizedDemoCode)
        await createDemoSession(normalizedDemoCode, demoContext.userId)
        refreshSession()
        resolvedDemoOrgId = validation.demoOrgId
        resolvedDemoOrgName = getOrganizationById(validation.demoOrgId)?.name ?? demoOrg.name ?? 'Demo Organization'
      }

      const roles: OrgMemberRole[] = demoContext.roles
      const organizations: Organization[] = [
        {
          id: resolvedDemoOrgId,
          name: resolvedDemoOrgName,
          roles,
          get role(): OrgMemberRole {
            return roles[0] ?? 'parent'
          },
        },
      ]

      const legacyRole: LegacyUserRole | undefined = roles.includes('org_admin')
        ? 'admin'
        : roles.includes('coach')
          ? 'coach'
          : roles.includes('parent')
            ? 'parent'
            : undefined

      const demoUser = {
        id: demoContext.userId,
        email: demoContext.email,
        user_metadata: { signup_mode: 'parent' },
      } as unknown as User

      const demoProfile: UserProfile = {
        id: demoContext.userId,
        email: demoContext.email,
        phone: '',
        first_name: '',
        last_name: '',
        display_name: demoContext.email?.split('@')[0] ?? null,
        home_location: null,
        home_zipcode: undefined,
        role: legacyRole,
        family_id: null,
        org_id: resolvedDemoOrgId,
        organizations,
        isPlatformAdmin: demoContext.isPlatformAdmin,
        platformAdminRole: null,
        requiresOrgSetup: false,
      }

      writeFakeAuthState({
        userId: demoContext.userId,
        email: demoContext.email ?? email.toLowerCase().trim(),
        orgId: resolvedDemoOrgId,
        orgName: resolvedDemoOrgName,
        roles,
        isPlatformAdmin: demoContext.isPlatformAdmin,
      })

      setUser(demoUser)
      setSession(null)
            setProfile(demoProfile)
            setOrganizations(organizations)
            setLoading(false)
            clearStoredDemoCode()
            debug.perf.end('auth.signInWithEmail')
            debug.flow('Auth', 'Login successful (demo)', {
              email,
              userId: demoContext.userId,
              roles: demoContext.roles,
              demoOrgId: resolvedDemoOrgId,
            })
            return { error: null }
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            debug.perf.end('auth.signInWithEmail')
            if (error) {
                debug.error('Auth', 'Login failed', { email, error: error.message })
                captureEvent('login_failed', {
                  email,
                  reason: error.message,
                  method: 'email',
                })
            } else {
                debug.flow('Auth', 'Login initiated', { email })
            }
            return { error }
        } catch (err) {
            debug.perf.end('auth.signInWithEmail')
            debug.error('Auth', 'Login exception', { email, error: err })
            captureEvent('login_failed', {
              email,
              reason: err instanceof Error ? err.message : 'Unknown error',
              method: 'email',
            })
            return { error: err as AuthError }
        }
    })
  }

  async function signInWithGoogle() {
    // Import getBaseUrl to get current origin (supports localhost and production)
    const { getBaseUrl } = await import('../utils/host')
    const baseUrl = getBaseUrl()
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Use current base URL for OAuth redirect
        // This works for localhost development and production
        redirectTo: `${baseUrl}/portal/auth/callback`,
      },
    })
    return { error }
  }

  async function signUp(email: string, password: string, firstName: string, lastName: string, phone: string, zipcode: string, requiresOrgSetup?: boolean, signupMode?: 'fan' | 'parent', tosAccepted?: boolean, privacyAccepted?: boolean) {
    return debug.group(`Auth.signUp: ${email}`, async () => {
        debug.flow('Auth', 'Signup attempt', { email, signupMode, requiresOrgSetup })
        debug.perf.start('auth.signUp')

        // Import getBaseUrl to get current origin (supports localhost and production)
        const { getBaseUrl } = await import('../utils/host')
        const baseUrl = getBaseUrl()
        const trimmedZip = zipcode.trim()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Use current base URL for email verification links
        // This works for localhost development and production
        emailRedirectTo: `${baseUrl}/portal/auth/callback`,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          home_zipcode: trimmedZip || undefined, // Only include if not empty
          // Derive display_name from first+last for backward compatibility
          display_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          // Pass requires_org_setup to metadata - the database trigger will read this
          requires_org_setup: requiresOrgSetup ?? false,
          // Pass signup_mode to metadata for tracking user intent
          signup_mode: signupMode || 'parent',
        },
      },
    })

        if (!error && data?.user) {
          const userId = data.session?.user?.id || data.user.id
          const now = new Date().toISOString()
          const consentVersion = '1.0' // Update this when ToS/Privacy Policy versions change

          try {
            // Update user with consent and home location
            const updateData: any = {}
            
            if (tosAccepted) {
              updateData.tos_accepted_at = now
            }
            if (privacyAccepted) {
              updateData.privacy_policy_accepted_at = now
            }
            if (tosAccepted || privacyAccepted) {
              updateData.consent_version = consentVersion
            }
            if (trimmedZip) {
              updateData.home_zipcode = trimmedZip
            }

            if (Object.keys(updateData).length > 0) {
              if (trimmedZip) {
                try {
                  const homeLocation = await geocodeZipToHomeLocation(trimmedZip)
                  if (homeLocation) {
                    updateData.home_location = homeLocation
                  }
                } catch (err) {
                  debug.error('Auth', 'Failed to geocode zipcode', { email, error: err })
                }
              }

              await supabase
                .from('users')
                .update(updateData)
                .eq('id', userId)
            }
          } catch (err) {
            debug.error('Auth', 'Failed to save consent/home location after signup', { email, error: err })
          }
        }

        debug.perf.end('auth.signUp')
        if (error) {
          debug.error('Auth', 'Signup failed', { email, error: error.message })
        } else {
          debug.flow('Auth', 'Signup successful', { email, userId: data?.user?.id, signupMode })
        }
        return { error }
    })
  }

  async function signOut() {
    return debug.group('Auth.signOut', async () => {
        debug.flow('Auth', 'Logout started', { userId: user?.id })
        debug.perf.start('auth.signOut')

        if (USE_FAKE_DATA) {
          if (user?.id) {
            await endDemoSession(user.id)
          } else {
            clearStoredDemoCode()
            refreshSession()
          }
          clearFakeAuthState()
          setUser(null)
          setProfile(null)
          setSession(null)
          setOrganizations([])
          resetAnalytics()
          debug.perf.end('auth.signOut')
          debug.flow('Auth', 'Logout completed (demo)', { userId: user?.id })
          return
        }

        try {
          await supabase.auth.signOut()
          setUser(null)
          setProfile(null)
          setSession(null)
          setOrganizations([])
          resetAnalytics()
          debug.perf.end('auth.signOut')
          debug.flow('Auth', 'Logout completed', { userId: user?.id })
        } catch (err) {
          debug.perf.end('auth.signOut')
          debug.error('Auth', 'Logout failed', { userId: user?.id, error: err })
        }
    })
  }

  async function resetPassword(email: string) {
    // Import getBaseUrl to get current origin (supports localhost and production)
    const { getBaseUrl } = await import('../utils/host')
    const baseUrl = getBaseUrl()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Use current base URL for password reset links
      // This works for localhost development and production
      redirectTo: `${baseUrl}/reset-password`,
    })
    return { error }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  async function updateEmail(newEmail: string, redirectTo?: string) {
    // Import getBaseUrl to get current origin (supports localhost and production)
    const { getBaseUrl } = await import('../utils/host')
    const baseUrl = getBaseUrl()
    
    // Use provided redirectTo or default to current path (settings page)
    const emailRedirectTo = redirectTo 
      ? `${baseUrl}${redirectTo}` 
      : `${baseUrl}${window.location.pathname}`
    
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo }
    )
    return { error }
  }

  async function refreshProfile() {
    if (USE_FAKE_DATA) {
      return
    }

    if (user?.id) {
      await fetchProfile(user.id)
    }
  }

  /* ===================== ROLE HELPERS ===================== */

  function hasRole(orgId: string, role: OrgMemberRole) {
    if (profile?.isPlatformAdmin) return true
    return profile?.organizations.some(
      (o) => o.id === orgId && o.roles.includes(role)
    ) ?? false
  }

  function hasAnyRole(role: OrgMemberRole) {
    if (profile?.isPlatformAdmin) return true
    return profile?.organizations.some((o) => o.roles.includes(role)) ?? false
  }

  function isOrgAdmin(orgId?: string) {
    if (profile?.isPlatformAdmin) return true
    if (orgId) return hasRole(orgId, 'org_admin')
    return currentOrganization
      ? hasRole(currentOrganization.id, 'org_admin')
      : false
  }

  /* ===================== CONTEXT VALUE ===================== */

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateEmail,
    refreshProfile,
    hasRole,
    hasAnyRole,
    isOrgAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ===================== HOOK ===================== */

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/** Returns auth context or undefined when outside AuthProvider. Use when component may render outside provider. */
export function useOptionalAuth() {
  return useContext(AuthContext)
}
