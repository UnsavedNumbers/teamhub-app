/**
 * Org-Scoped Route Component
 * 
 * Wrapper component that resolves org from URL slug and provides org context
 * to child routes. Handles redirects, error states, and org context injection.
 */

import { useEffect, useState } from 'react'
import { useParams, Navigate, useLocation } from 'react-router-dom'
import { resolveOrgFromSlug, type OrgContext } from '../utils/orgResolution'

interface OrgScopedRouteProps {
  children: (org: OrgContext) => React.ReactNode
  fallback?: React.ReactNode
}

export function OrgScopedRoute({ children, fallback }: OrgScopedRouteProps) {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const location = useLocation()
  const [org, setOrg] = useState<OrgContext | null>(null)
  const [redirectToSlug, setRedirectToSlug] = useState<string | null>(null)
  const [error, setError] = useState<'not_found' | 'suspended' | 'deactivated' | 'deleted' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgSlug) {
      setError('not_found')
      setLoading(false)
      return
    }

    let cancelled = false

    async function resolveOrg() {
      setLoading(true)
      const result = await resolveOrgFromSlug(orgSlug || '')

      if (cancelled) return

      setOrg(result.org)
      setRedirectToSlug(result.redirectToSlug)
      setError(result.error)
      setLoading(false)
    }

    resolveOrg()

    return () => {
      cancelled = true
    }
  }, [orgSlug])

  // Handle redirects (old slug -> new slug)
  if (redirectToSlug) {
    const newPath = location.pathname.replace(`/o/${orgSlug}`, `/o/${redirectToSlug}`)
    return <Navigate to={newPath + location.search} replace />
  }

  // Handle error states
  if (error) {
    if (error === 'not_found' || error === 'deleted') {
      return (
        <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <h1 className="text-3xl font-black text-[#111418] dark:text-white mb-4">Organization Not Found</h1>
            <p className="text-[#617589] dark:text-gray-400">
              The organization you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </div>
      )
    }

    if (error === 'suspended') {
      return (
        <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <h1 className="text-3xl font-black text-[#111418] dark:text-white mb-4">Organization Temporarily Unavailable</h1>
            <p className="text-[#617589] dark:text-gray-400 mb-4">
              This organization's public pages are temporarily unavailable.
            </p>
            <p className="text-sm text-[#617589] dark:text-gray-500">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </div>
      )
    }

    if (error === 'deactivated') {
      return (
        <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <h1 className="text-3xl font-black text-[#111418] dark:text-white mb-4">Organization No Longer Active</h1>
            <p className="text-[#617589] dark:text-gray-400">
              This organization is no longer active on the platform.
            </p>
          </div>
        </div>
      )
    }
  }

  // Loading state
  if (loading || !org) {
    return (
      fallback || (
        <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#137fec]"></div>
            <p className="mt-4 text-[#617589] dark:text-gray-400">Loading...</p>
          </div>
        </div>
      )
    )
  }

  // Render children with org context
  return <>{children(org)}</>
}

/**
 * Hook to get org context from route params
 * Must be used within OrgScopedRoute
 */
export function useOrgContext(): OrgContext {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  if (!orgSlug) {
    throw new Error('useOrgContext must be used within an OrgScopedRoute')
  }
  // The org context is provided by OrgScopedRoute, but we need to resolve it
  // For now, components should receive org as a prop from OrgScopedRoute
  throw new Error('useOrgContext: Org context should be passed as prop from OrgScopedRoute')
}
