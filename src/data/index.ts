/**
 * Data Layer Index
 *
 * Main entry point for all data access.
 * Import services and types from this file.
 *
 * ARCHITECTURE:
 * Components → Services → Fake Data Modules
 *                      ↘ Supabase (future)
 *
 * USAGE IN COMPONENTS:
 * ```typescript
 * import { getEvents, getTeams, type UserContext } from '@/data'
 * import { useAuth } from '@/hooks/useAuth'
 * import { useOrganization } from '@/contexts/OrganizationContext'
 *
 * function MyComponent() {
 *   const { user, profile } = useAuth()
 *   const { currentOrganization } = useOrganization()
 *
 *   const context: UserContext = {
 *     userId: user?.id ?? '',
 *     email: user?.email ?? null,
 *     orgId: currentOrganization?.id ?? '',
 *     roles: currentOrganization?.roles ?? [],
 *     isPlatformAdmin: profile?.isPlatformAdmin ?? false,
 *   }
 *
 *   useEffect(() => {
 *     getEvents(context).then(({ data, error }) => {
 *       if (error) console.error(error)
 *       else setEvents(data)
 *     })
 *   }, [context.userId, context.orgId])
 * }
 * ```
 */

// Configuration
export { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from './config'

// Services (main API for components)
export * from './services'

// Types from fake data (for reference)
export type { UserContext, PermissionSet } from './fake/userContext'
