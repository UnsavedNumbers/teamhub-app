/**
 * Centralized Route Manager
 * 
 * Single source of truth for all application routes.
 * 
 * @example
 * // Generate URLs
 * import { getLink } from '@/utils/routes'
 * 
 * getLink('portal.dashboard') // '/portal/dashboard'
 * getLink('admin.teams.detail', { id: '123' }) // '/admin/teams/123'
 * 
 * // Use in components
 * import { useRouteLink } from '@/utils/routes'
 * 
 * const eventUrl = useRouteLink('portal.eventDetail', { eventId: event.id })
 * 
 * // Get route metadata
 * import { getRoute } from '@/utils/routes'
 * 
 * const route = getRoute('admin.dashboard')
 * console.log(route.label, route.icon)
 */

// Re-export types
export type {
    RouteDefinition,
    RouteParams,
    RouteGroup,
    NavigationItem,
    NavigationGroup,
    NavigationSection,
    MenuItemDefinition,
    MenuItemChild,
} from './types'

// Re-export route definitions
export { routes } from './definitions'
export type { Routes } from './definitions'

// Re-export helpers (main API)
export {
    getLink,
    getRoute,
    getRouteOrThrow,
    getPath,
    getRouteMeta,
    requiresOrganization,
    isValidRouteKey,
    getAllRouteKeys,
    findRouteKeyByPath,
    getRoutesWhere,
    getOrgRequiredRoutes,
    getPortalRoutes,
    getAdminRoutes,
    getPlatformAdminRoutes,
} from './helpers'

// Re-export hooks
export {
    useRouteLink,
    useRouteMeta,
    useRouteMatch,
    useRouteActive,
    useCurrentRouteKey,
    useRouteValidation,
    useRouteLinks,
} from './hooks'

// Re-export navigation configs
export {
    // Portal navigation
    parentNavSections,
    coachNavSections,
    orgAdminNavSections,
    // Admin navigation
    adminMenuItems,
    adminGlobalNavSections,
    // Platform admin navigation
    platformAdminNavSections,
    platformAdminGlobalNavSections,
    // User dropdown
    userDropdownRoleLinks,
} from './navigation'

// Re-export validation utilities (for testing/advanced use)
export {
    validatePathTemplate,
    validateRouteKey,
    validateParams,
    validateRouteDefinitions,
    matchesPattern,
    extractParams,
} from './validation'

// ============================================================================
// ROUTE KEY CONSTANTS (for type-safe usage)
// ============================================================================

/**
 * Common route keys as constants for type safety
 * Use these instead of string literals where possible
 */
export const RouteKeys = {
    // Root
    MARKETING: 'root.marketing',

    // Portal
    PORTAL_DASHBOARD: 'portal.dashboard',
    PORTAL_CALENDAR: 'portal.calendar',
    PORTAL_EVENT_DETAIL: 'portal.eventDetail',
    PORTAL_TRAVEL: 'portal.travel',
    PORTAL_TRAVEL_DETAIL: 'portal.travelDetail',
    PORTAL_MESSAGES: 'portal.messages',
    PORTAL_PAYMENTS: 'portal.payments',
    PORTAL_ATHLETES: 'portal.athletes',
    PORTAL_JOIN: 'portal.join',
    PORTAL_TRYOUTS: 'portal.tryouts',
    PORTAL_UNIFORMS: 'portal.uniforms',
    PORTAL_SETTINGS: 'portal.settings',
    PORTAL_ROLE_SELECTION: 'portal.roleSelection',

    // Auth
    AUTH_LOGIN: 'auth.login',
    AUTH_SIGNUP: 'auth.signup',
    AUTH_FORGOT_PASSWORD: 'auth.forgotPassword',
    AUTH_RESET_PASSWORD: 'auth.resetPassword',
    AUTH_ACCEPT_INVITE: 'auth.acceptInvite',
    AUTH_UNAUTHORIZED: 'auth.unauthorized',

    // Admin
    ADMIN_DASHBOARD: 'admin.dashboard',
    ADMIN_ORGANIZATION: 'admin.organization.base',
    ADMIN_ORGANIZATION_STRUCTURE: 'admin.organization.structure',
    ADMIN_ORGANIZATION_SPORTS: 'admin.organization.sports',
    ADMIN_ORGANIZATION_PROGRAMS: 'admin.organization.programs',
    ADMIN_ORGANIZATION_BILLING: 'admin.organization.billing',
    ADMIN_ORGANIZATION_USERS: 'admin.organization.users',
    ADMIN_TRIAL_EXPIRED: 'admin.organization.trialExpired',
    ADMIN_ONBOARDING: 'admin.onboarding',
    ADMIN_TEAMS: 'admin.teams.list',
    ADMIN_TEAM_DETAIL: 'admin.teams.detail',
    ADMIN_FAMILIES: 'admin.families.list',
    ADMIN_FAMILY_DETAIL: 'admin.families.detail',
    ADMIN_CREATE_FAMILY: 'admin.families.create',
    ADMIN_ATHLETES: 'admin.athletes.list',
    ADMIN_CREATE_ATHLETE: 'admin.athletes.create',
    ADMIN_EVENTS: 'admin.events.list',
    ADMIN_CREATE_EVENT: 'admin.events.create',
    ADMIN_ATTENDANCE: 'admin.attendance',
    ADMIN_PAYMENTS: 'admin.payments.list',
    ADMIN_CREATE_FEE: 'admin.payments.create',
    ADMIN_UNIFORMS: 'admin.uniforms.list',
    ADMIN_TRAVEL: 'admin.travel.list',
    ADMIN_TRYOUTS: 'admin.tryouts.list',
    ADMIN_SETTINGS: 'admin.settings',

    // Platform Admin
    PLATFORM_DASHBOARD: 'platformAdmin.dashboard',
    PLATFORM_ORGANIZATIONS: 'platformAdmin.organizations.list',
    PLATFORM_ORGANIZATION_DETAIL: 'platformAdmin.organizations.detail',
    PLATFORM_USERS: 'platformAdmin.users.list',
    PLATFORM_USER_DETAIL: 'platformAdmin.users.detail',
    PLATFORM_ADMINS: 'platformAdmin.admins',
    PLATFORM_PAYMENTS: 'platformAdmin.payments',
    PLATFORM_FEES: 'platformAdmin.fees',
    PLATFORM_AUDIT: 'platformAdmin.audit',
    PLATFORM_FEATURE_FLAGS: 'platformAdmin.featureFlags',
    PLATFORM_LICENSES: 'platformAdmin.licenses.overview',
} as const

export type RouteKeyConstant = typeof RouteKeys[keyof typeof RouteKeys]
