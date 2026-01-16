/**
 * useUserContext Hook
 *
 * Builds a UserContext object from the current auth and organization state.
 * Use this hook in components to pass context to data services.
 *
 * USAGE:
 * ```typescript
 * import { useUserContext } from '@/hooks/useUserContext'
 * import { getEvents } from '@/data'
 *
 * function MyComponent() {
 *   const { context, isReady } = useUserContext()
 *
 *   useEffect(() => {
 *     if (!isReady) return
 *     getEvents(context, { limit: 10 }).then(({ data, error }) => {
 *       // handle response
 *     })
 *   }, [context, isReady])
 * }
 * ```
 */

import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import type { UserContext } from '../data/fake/userContext'

export interface UseUserContextResult {
    /** UserContext object to pass to data services */
    context: UserContext

    /** True when both auth and organization are loaded */
    isReady: boolean

    /** True when still loading auth or organization */
    isLoading: boolean

    /** True if user is authenticated */
    isAuthenticated: boolean

    /** True if user has an organization selected */
    hasOrganization: boolean
}

export function useUserContext(): UseUserContextResult {
    const { user, profile, loading: authLoading } = useAuth()
    const { currentOrganization, loading: orgLoading } = useOrganization()

    const context = useMemo<UserContext>(() => ({
        userId: user?.id ?? '',
        email: user?.email ?? null,
        orgId: currentOrganization?.id ?? '',
        roles: currentOrganization?.roles ?? [],
        isPlatformAdmin: profile?.isPlatformAdmin ?? false,
    }), [user?.id, user?.email, currentOrganization?.id, currentOrganization?.roles, profile?.isPlatformAdmin])

    const isLoading = authLoading || orgLoading
    const isAuthenticated = !!user
    const hasOrganization = !!currentOrganization
    const isReady = !isLoading && isAuthenticated && hasOrganization

    return {
        context,
        isReady,
        isLoading,
        isAuthenticated,
        hasOrganization,
    }
}

export default useUserContext
