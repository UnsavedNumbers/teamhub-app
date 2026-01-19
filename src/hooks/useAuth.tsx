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
import { useOrganization, Organization } from '../contexts/OrganizationContext'

/* ===================== TYPES ===================== */

type OrgMemberRole = 'parent' | 'coach' | 'org_admin'
type LegacyUserRole = 'parent' | 'coach' | 'admin'

interface UserProfile {
  id: string
  email: string | null
  phone: string | null
  display_name: string | null
  role?: LegacyUserRole
  family_id?: string | null
  org_id?: string | null
  organizations: Organization[]
  isPlatformAdmin: boolean
  requiresOrgSetup: boolean
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    requiresOrgSetup?: boolean
  ) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  hasRole: (orgId: string, role: OrgMemberRole) => boolean
  hasAnyRole: (role: OrgMemberRole) => boolean
  isOrgAdmin: (orgId?: string) => boolean
}

/* ===================== CONTEXT ===================== */

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/* ===================== PROVIDER ===================== */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const { setOrganizations, currentOrganization } = useOrganization()

  // Prevent duplicate profile fetch
  const profileFetchRef = useRef<string | null>(null)

  /* ===================== FETCH PROFILE ===================== */

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (profileFetchRef.current === userId) return

      profileFetchRef.current = userId
      setLoading(true)

      try {
        /* ---- user table ---- */
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(
            'id, email, phone, display_name, role, family_id, org_id, requires_org_setup'
          )
          .eq('id', userId)
          .single()

        if (userError || !userData) {
          console.error('Profile fetch error:', userError)
          await supabase.auth.signOut()
          setProfile(null)
          return
        }

        /* ---- organizations ---- */
        let orgs: Organization[] = []
        try {
          const { data } = await supabase.rpc('get_user_organizations', {
            check_user_id: userId,
          })

          if (Array.isArray(data)) {
            orgs = data.map((o: any) => ({
              id: o.organization_id,
              name: o.org_name,
              role: o.role,
            }))
          }
        } catch {
          orgs = []
        }

        /* ---- platform admin ---- */
        const { data: admin } = await supabase
          .from('platform_admins')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle()

        const profileData: UserProfile = {
          id: userData.id,
          email: userData.email,
          phone: userData.phone,
          display_name: userData.display_name,
          role: userData.role,
          family_id: userData.family_id,
          org_id: userData.org_id,
          organizations: orgs,
          isPlatformAdmin: !!admin,
          requiresOrgSetup: userData.requires_org_setup ?? false,
        }

        setProfile(profileData)
        setOrganizations(orgs)
      } finally {
        profileFetchRef.current = null
        setLoading(false)
      }
    },
    [setOrganizations]
  )

  /* ===================== AUTH BOOTSTRAP ===================== */

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return

      setSession(data.session)
      setUser(data.session?.user ?? null)

      if (data.session?.user) {
        fetchProfile(data.session.user.id)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setOrganizations([])
        setLoading(false)
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, setOrganizations])

  /* ===================== AUTH ACTIONS ===================== */

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/portal/auth/callback`,
      },
    })
    return { error }
  }

  async function signUp(
    email: string,
    password: string,
    displayName?: string,
    requiresOrgSetup?: boolean
  ) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
        data: {
          display_name: displayName,
          requires_org_setup: requiresOrgSetup ?? false,
        },
      },
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    setOrganizations([])
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error }
  }

  /* ===================== ROLE HELPERS ===================== */

  function hasRole(orgId: string, role: OrgMemberRole) {
    if (profile?.isPlatformAdmin) return true
    return profile?.organizations.some(
      (o) => o.id === orgId && o.role === role
    ) ?? false
  }

  function hasAnyRole(role: OrgMemberRole) {
    if (profile?.isPlatformAdmin) return true
    return profile?.organizations.some((o) => o.role === role) ?? false
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
