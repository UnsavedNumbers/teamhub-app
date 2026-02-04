import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type OrgMemberRole = 'parent' | 'coach' | 'org_admin' | 'staff'

export interface Organization {
  id: string
  name: string
  roles: OrgMemberRole[] // NEW: Array of roles user has in this org
  slug?: string
  org_type?: 'school' | 'club' | 'league' | 'academy' | 'aau' | null
  
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

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

const STORAGE_KEY = 'teamhub_current_org'

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizationsState] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Auto-select current org when organizations change
  useEffect(() => {
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
  }, [organizations, currentOrganization])

  const setOrganizations = useCallback((orgs: Organization[]) => {
    setOrganizationsState(orgs)
    // Mark as loaded once organizations are set (even if empty array)
    setIsLoading(false)
  }, [])

  const setCurrentOrganization = useCallback((org: Organization | null) => {
    setCurrentOrganizationState(org)
    if (org) {
      sessionStorage.setItem(STORAGE_KEY, org.id)
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const switchOrganization = useCallback((orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setCurrentOrganization(org)
    }
  }, [organizations, setCurrentOrganization])

  // Set up realtime subscription for organization_members changes
  useEffect(() => {
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
  }, [userId])

  // Get user ID from auth session
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
