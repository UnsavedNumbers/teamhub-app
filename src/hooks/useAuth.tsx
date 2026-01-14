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
  // Organization setup requirement flag
  requiresOrgSetup: boolean
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, displayName?: string, requiresOrgSetup?: boolean) => Promise<{ error: AuthError | null }>
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
    // #region agent log
    fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.tsx:53',message:'fetchProfile called',data:{userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, phone, display_name, role, family_id, org_id, requires_org_setup')
        .eq('id', userId)
        .single()

      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.tsx:60',message:'User query completed',data:{hasData:!!userData,hasError:!!userError,error:userError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (userError) {
        console.error('Error fetching profile:', userError)
        
        // If user doesn't exist in database (deleted user), sign out to clear stale session
        // PGRST116 = "No rows returned" error code from PostgREST
        if (userError.code === 'PGRST116' || userError.message?.includes('No rows') || userError.message?.includes('not found')) {
          console.warn('User not found in database, signing out to clear stale session')
          await supabase.auth.signOut()
        }
        
        setProfile(null)
        setLoading(false)
        return
      }

      // Fetch organization memberships
      // Wrap in try-catch to gracefully handle missing RPC function
      let orgData = null
      let orgError = null
      try {
        const result = await supabase.rpc('get_user_organizations', { check_user_id: userId })
        orgData = result.data
        orgError = result.error
        
        // If function doesn't exist (404/PGRST202), treat as empty orgs
        if (orgError && (orgError.code === 'PGRST202' || orgError.message?.includes('not found') || orgError.message?.includes('does not exist'))) {
          console.warn('get_user_organizations RPC function not found. Run migrations to create it.')
          orgError = null // Clear error so we continue with empty orgs
          orgData = []
        }
      } catch (err) {
        // Network or other errors - continue with empty orgs
        console.error('Error calling get_user_organizations RPC:', err)
        orgError = err as any
        orgData = []
      }

      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.tsx:85',message:'Org query completed',data:{hasData:!!orgData,orgCount:orgData?.length||0,hasError:!!orgError,errorCode:orgError?.code,errorMessage:orgError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (orgError && orgError.code !== 'PGRST202') {
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
        requiresOrgSetup: userData.requires_org_setup ?? false,
      }

      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.tsx:110',message:'Setting profile and organizations',data:{profileId:userProfile.id,orgCount:organizations.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      setProfile(userProfile)
      setOrganizations(organizations)
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.tsx:112',message:'Error in fetchProfile catch',data:{error:err instanceof Error?err.message:String(err)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('Error in fetchProfile:', err)
      setProfile(null)
    } finally {
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useAuth.tsx:116',message:'fetchProfile finally: setting loading false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
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
        console.log('Auth state change event:', event)
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Only refetch profile on specific events to avoid unnecessary fetches
          // TOKEN_REFRESHED happens frequently and shouldn't trigger profile refetch
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            await fetchProfile(session.user.id)
          }
          
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
      const { data: invites, error } = await supabase.rpc('get_pending_invites_for_user')
      
      // If function doesn't exist (404/PGRST202), just skip silently
      if (error) {
        if (error.code === 'PGRST202' || error.message?.includes('not found') || error.message?.includes('does not exist')) {
          // Function doesn't exist yet - this is okay, just skip
          return
        }
        // Other errors - log but don't block
        console.error('Error checking pending invites:', error)
        return
      }
      
      if (invites && invites.length > 0) {
        // Store pending invites in sessionStorage for the accept invite page
        sessionStorage.setItem('pending_invites', JSON.stringify(invites))
      }
    } catch (err) {
      // RPC function might not exist - this is okay, just skip
      // Only log if it's not a "function doesn't exist" error
      if (!(err instanceof Error && (err.message.includes('not found') || err.message.includes('does not exist')))) {
        console.error('Error checking pending invites:', err)
      }
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

  async function signUp(email: string, password: string, displayName?: string, requiresOrgSetup?: boolean) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/auth/callback`,
        data: {
          display_name: displayName,
          // Pass requires_org_setup to metadata - the database trigger will read this
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
