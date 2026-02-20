import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { readDemoManagementStore } from '@/data/services/demoOrgService'
import { getOrganizationById } from '@/data/fake/fakeOrganizations'
import { getCurrentDemoSessionSnapshot } from '@/data/services/demoSessionService'

export type OrgMemberRole = 'parent' | 'coach' | 'org_admin' | 'staff' | 'athlete'

export interface Organization {
  id: string
  name: string
  roles: OrgMemberRole[] // NEW: Array of roles user has in this org
  slug?: string
  org_type?: 'school' | 'club' | 'league' | 'academy' | 'aau' | null
  parent_org_id?: string | null
  
  // Contact information
  website?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  
  /** @deprecated Use roles array instead. Returns roles[0] or 'parent'. Will be removed in v2.0. */
  get role(): OrgMemberRole
}

interface OrganizationContextType {
  currentOrganization: Organization | null
  organizations: Organization[]
  setOrganizations: (orgs: Organization[]) => void
  setCurrentOrganization: (org: Organization | null) => void
  switchOrganization: (orgId: string) => void
  isLoading: boolean
}

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

const STORAGE_KEY = 'teamhub_current_org'

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizationsState] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const demoSession = getCurrentDemoSessionSnapshot()

  const isDemoSessionActive = demoSession.is_demo_session && Boolean(demoSession.demo_org_id)

  const buildDemoOrganization = useCallback(async (userId: string, orgId: string): Promise<Organization | null> => {
    // Use get_user_organizations RPC which already handles demo users
    const { data, error } = await supabase.rpc('get_user_organizations', { check_user_id: userId } as any) as { 
      data: Array<{ org_id: string; org_name: string; roles: OrgMemberRole[] }> | null
      error: unknown 
    }
    
    if (error || !data) {
      // Fallback to fake data if RPC fails
      const store = readDemoManagementStore()
      const demoOrg = store.organizations.find((org) => org.id === orgId)
      const fallback = getOrganizationById(orgId)
      const name = demoOrg?.name ?? fallback?.name ?? 'Demo Organization'
      // Use organization_id from demo session if available, otherwise use demo_org_id
      const targetOrgId = demoSession.organization_id || orgId
      return {
        id: targetOrgId,
        name,
        roles: ['org_admin'],
        get role(): OrgMemberRole {
          return this.roles[0] ?? 'parent'
        },
      }
    }

    // Find the demo org in the results - prefer organization_id match, then demo_org_id match
    const targetOrgId = demoSession.organization_id || orgId
    const demoOrgData = data.find((org) => org.org_id === targetOrgId) || data.find((org) => org.org_id === orgId)
    if (!demoOrgData) {
      return null
    }

    return {
      id: demoOrgData.org_id,
      name: demoOrgData.org_name,
      roles: demoOrgData.roles || [],
      get role(): OrgMemberRole {
        return this.roles[0] ?? 'parent'
      },
    }
  }, [demoSession])

  // Load organizations for demo sessions
  useEffect(() => {
    if (isDemoSessionActive && demoSession.demo_org_id && userId) {
      setIsLoading(true)
      // For demo sessions, fetch org from get_user_organizations which handles demo users
      // Use organization_id from demo session if available, otherwise fall back to demo_org_id lookup
      const targetOrgId = demoSession.organization_id || demoSession.demo_org_id
      supabase.rpc('get_user_organizations', { check_user_id: userId } as any).then(({ data, error }) => {
        if (error || !data) {
          setIsLoading(false)
          return
        }
        const orgs: Organization[] = data.map((org: { org_id: string; org_name: string; roles: OrgMemberRole[] }) => ({
          id: org.org_id,
          name: org.org_name,
          roles: org.roles || [],
          get role(): OrgMemberRole {
            return this.roles[0] ?? 'parent'
          },
        }))
        setOrganizationsState(orgs)
        if (orgs.length > 0) {
          // Prefer organization_id match, then demo_org_id match, then first org
          const selectedOrg = orgs.find((o) => o.id === targetOrgId) || orgs.find((o) => o.id === demoSession.demo_org_id) || orgs[0]
          setCurrentOrganizationState(selectedOrg)
          sessionStorage.setItem(STORAGE_KEY, selectedOrg.id)
        }
        setIsLoading(false)
      }).catch(() => {
        setIsLoading(false)
      })
      return
    }

    if (organizations.length === 0) {
      // No organizations - clear current org but don't stay in loading
      setCurrentOrganizationState(null)
      return
    }

    // If we already have a current org that's still in the list, keep it
    if (currentOrganization && organizations.some(o => o.id === currentOrganization.id)) {
      return
    }

    // Otherwise, select from storage or use first available
    const storedOrgId = sessionStorage.getItem(STORAGE_KEY)
    const org = storedOrgId ? organizations.find(o => o.id === storedOrgId) : null
    const selectedOrg = org || organizations[0]
    
    setCurrentOrganizationState(selectedOrg)
    sessionStorage.setItem(STORAGE_KEY, selectedOrg.id)
  }, [organizations, currentOrganization, isDemoSessionActive, demoSession.demo_org_id, userId])

  const setOrganizations = useCallback(async (orgs: Organization[]) => {
    if (isDemoSessionActive && demoSession.demo_org_id && userId) {
      const demoOrganization = await buildDemoOrganization(userId, demoSession.demo_org_id)
      if (demoOrganization) {
        setOrganizationsState([demoOrganization])
        setCurrentOrganizationState(demoOrganization)
      }
      setIsLoading(false)
      return
    }

    setOrganizationsState(orgs)
    // Mark as loaded once organizations are set (even if empty array)
    setIsLoading(false)
  }, [isDemoSessionActive, demoSession.demo_org_id, userId, buildDemoOrganization])

  const setCurrentOrganization = useCallback((org: Organization | null) => {
    setCurrentOrganizationState(org)
    if (org) {
      sessionStorage.setItem(STORAGE_KEY, org.id)
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const switchOrganization = useCallback((orgId: string) => {
    if (isDemoSessionActive) return
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setCurrentOrganization(org)
    }
  }, [organizations, setCurrentOrganization, isDemoSessionActive])

  // Set up realtime subscription for organization_members changes
  useEffect(() => {
    if (isDemoSessionActive) return
    if (!userId) return

    let refreshTimeout: NodeJS.Timeout | null = null

    const handleRoleChange = () => {
      // Debounce: wait 500ms after last change before refreshing
      if (refreshTimeout) clearTimeout(refreshTimeout)

      refreshTimeout = setTimeout(async () => {
        // Fetch updated organizations from RPC
        const { data } = await supabase.rpc('get_user_organizations', { check_user_id: userId } as any) as { data: Array<{ org_id: string; org_name: string; roles: OrgMemberRole[] }> | null; error: unknown }
        if (data) {
          const updatedOrgs: Organization[] = data.map((org) => {
            // Normalize roles to always be an array
            const roles = org.roles || []
            return {
              id: org.org_id,
              name: org.org_name,
              roles: Array.isArray(roles) ? roles : [],
              get role() {
                return this.roles[0] ?? 'parent'
              },
            }
          })
          setOrganizationsState(updatedOrgs)
        }
        refreshTimeout = null
      }, 500)
    }

    // Subscribe to organization_members changes for current user
    const channel = supabase
      .channel('org_members_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'organization_members',
        filter: `user_id=eq.${userId}`,
      }, handleRoleChange)
      .subscribe()

    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      supabase.removeChannel(channel)
    }
  }, [userId, isDemoSessionActive])

  // Get user ID from auth session (including demo sessions)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    setOrganizations,
    setCurrentOrganization,
    switchOrganization,
    isLoading,
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
