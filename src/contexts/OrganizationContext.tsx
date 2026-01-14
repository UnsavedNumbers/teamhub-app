import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

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

  // Load current org from sessionStorage on mount
  useEffect(() => {
    const storedOrgId = sessionStorage.getItem(STORAGE_KEY)
    if (storedOrgId && organizations.length > 0) {
      const org = organizations.find(o => o.id === storedOrgId)
      if (org) {
        setCurrentOrganizationState(org)
      } else {
        // Stored org not in list, use first available
        setCurrentOrganizationState(organizations[0])
        sessionStorage.setItem(STORAGE_KEY, organizations[0].id)
      }
    } else if (organizations.length > 0) {
      // No stored org, use first available
      setCurrentOrganizationState(organizations[0])
      sessionStorage.setItem(STORAGE_KEY, organizations[0].id)
    }
    setIsLoading(false)
  }, [organizations])

  const setOrganizations = (orgs: Organization[]) => {
    setOrganizationsState(orgs)
    // If no current org set and we have orgs, set the first one
    if (orgs.length > 0 && !currentOrganization) {
      const storedOrgId = sessionStorage.getItem(STORAGE_KEY)
      const org = storedOrgId ? orgs.find(o => o.id === storedOrgId) : orgs[0]
      setCurrentOrganizationState(org || orgs[0])
      sessionStorage.setItem(STORAGE_KEY, (org || orgs[0]).id)
    }
  }

  const setCurrentOrganization = (org: Organization | null) => {
    setCurrentOrganizationState(org)
    if (org) {
      sessionStorage.setItem(STORAGE_KEY, org.id)
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  const switchOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setCurrentOrganization(org)
    }
  }

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

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
