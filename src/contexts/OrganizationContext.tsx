import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

export interface Organization {
  id: string
  name: string
  role: 'parent' | 'coach' | 'org_admin'
  slug?: string
  org_type?: 'school' | 'club' | 'league' | 'academy' | 'aau' | null
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
