import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useOrganization, Organization } from '../contexts/OrganizationContext'

// Role types - now per organization
type OrgMemberRole = 'parent' | 'coach' | 'org_admin'

// Legacy single-org role type (for backward compatibility)
type LegacyUserRole = 'parent' | 'coach' | 'admin'

interface UserProfile {
  id: string
  email: string | null
  phone: string | null
  display_name: string | null
  // Legacy fields (deprecated, use organizations instead)
  role?: LegacyUserRole
  family_id?: string | null
  org_id?: string | null
  // New multi-org fields
  organizations: Organization[]
  isPlatformAdmin: boolean
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>
  // Role helpers (UX-only, not security - RLS handles authorization)
  hasRole: (orgId: string, role: OrgMemberRole) => boolean
  hasAnyRole: (role: OrgMemberRole) => boolean
  isOrgAdmin: (orgId?: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  const { setOrganizations, currentOrganization } = useOrganization()

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, phone, display_name, role, family_id, org_id')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('Error fetching profile:', userError)
        setProfile(null)
        setLoading(false)
        return
      }

      // Fetch organization memberships
      const { data: orgData, error: orgError } = await supabase
        .rpc('get_user_organizations', { check_user_id: userId })

      if (orgError) {
        console.error('Error fetching organizations:', orgError)
        // Continue with empty orgs rather than failing completely
      }

      // Check if user is platform admin
      const { data: adminData } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', userId)
        .single()

      // Type the org data from RPC
      interface OrgRpcResult {
        organization_id: string
        org_name: string
        role: OrgMemberRole
      }
      
      const organizations: Organization[] = (orgData as OrgRpcResult[] | null)?.map((org) => ({
        id: org.organization_id,
        name: org.org_name,
        role: org.role,
      })) ?? []

      const userProfile: UserProfile = {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        display_name: userData.display_name,
        role: userData.role,
        family_id: userData.family_id,
        org_id: userData.org_id,
        organizations,
        isPlatformAdmin: !!adminData,
      }

      setProfile(userProfile)
      setOrganizations(organizations)
    } catch (err) {
      console.error('Error in fetchProfile:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [setOrganizations])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
          
          // Check for pending invites after signup/signin
          if (event === 'SIGNED_IN') {
            await checkPendingInvites()
          }
        } else {
          setProfile(null)
          setOrganizations([])
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, setOrganizations])

  async function checkPendingInvites() {
    try {
      const { data: invites } = await supabase.rpc('get_pending_invites_for_user')
      
      if (invites && invites.length > 0) {
        // Store pending invites in sessionStorage for the accept invite page
        sessionStorage.setItem('pending_invites', JSON.stringify(invites))
      }
    } catch (err) {
      console.error('Error checking pending invites:', err)
    }
  }

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

  async function signUp(email: string, password: string, displayName?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
        data: {
          display_name: displayName,
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
    sessionStorage.removeItem('pending_invites')
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

  // UX-only role helpers (actual authorization is done by RLS)
  function hasRole(orgId: string, role: OrgMemberRole): boolean {
    if (profile?.isPlatformAdmin) return true
    return profile?.organizations.some(o => o.id === orgId && o.role === role) ?? false
  }

  function hasAnyRole(role: OrgMemberRole): boolean {
    if (profile?.isPlatformAdmin) return true
    return profile?.organizations.some(o => o.role === role) ?? false
  }

  function isOrgAdmin(orgId?: string): boolean {
    if (profile?.isPlatformAdmin) return true
    if (orgId) {
      return hasRole(orgId, 'org_admin')
    }
    return currentOrganization ? hasRole(currentOrganization.id, 'org_admin') : false
  }

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

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
