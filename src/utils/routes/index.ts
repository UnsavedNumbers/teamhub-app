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
    getFanRoutes,
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
    // Fan navigation
    fanNavSections,
    fanUserDropdownLinks,
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
    DEMO_REQUEST: 'root.demoRequest',
    DEMO_ENTRY: 'root.demoEntry',
    DEMO_WELCOME: 'root.demoWelcome',

    // Portal
    PORTAL_DASHBOARD: 'portal.dashboard',
    PORTAL_CALENDAR: 'portal.calendar',
    PORTAL_EVENT_DETAIL: 'portal.eventDetail',
    PORTAL_EVENT_EDIT: 'portal.eventEdit',
    PORTAL_TRAVEL: 'portal.travel',
    PORTAL_TRAVEL_DETAIL: 'portal.travelDetail',
    PORTAL_MESSAGES: 'portal.messages',
    PORTAL_PAYMENTS: 'portal.payments',
    PORTAL_ATHLETES: 'portal.athletes',
    PORTAL_ATHLETES_REQUEST_ATTACHMENT: 'portal.athletes.requestAttachment',
    PORTAL_JOIN: 'portal.join',
    PORTAL_TRYOUTS: 'portal.tryouts',
    PORTAL_UNIFORMS: 'portal.uniforms',
    PORTAL_SETTINGS: 'portal.settings',
    PORTAL_NOTIFICATIONS: 'portal.notifications',
    PORTAL_PHOTOS: 'portal.photos',
    PORTAL_PHOTOS_GALLERY: 'portal.photosGallery',
    PORTAL_PHOTOS_GALLERY_MANAGE: 'portal.photosGalleryManage',
    PORTAL_ROLE_SELECTION: 'portal.roleSelection',
    PORTAL_TICKETS: 'portal.tickets',
    PORTAL_TICKET_EVENT_DETAIL: 'portal.ticketEventDetail',
    PORTAL_TICKET_ORDER_SUCCESS: 'portal.ticketOrderSuccess',
    PORTAL_TICKET_ACCESS: 'portal.ticketAccess',
    PORTAL_MY_TICKETS: 'portal.myTickets',
    PORTAL_TICKET_VALIDATE: 'portal.ticketValidate',
    PORTAL_HELP: 'portal.help',

    // Org-Scoped Public Routes
    PORTAL_ORG_LANDING: 'portal.orgLanding',
    PORTAL_ORG_TICKETS: 'portal.orgTickets',
    PORTAL_ORG_TICKET_EVENT: 'portal.orgTicketEvent',
    PORTAL_ORG_TICKET_ORDER: 'portal.orgTicketOrder',
    PORTAL_SUB_ORG_REGISTRATION: 'portal.subOrgRegistration',
    PORTAL_ORG_TICKET_ACCESS: 'portal.orgTicketAccess',
    PORTAL_ORG_TICKET_ACCESS_LANDING: 'portal.orgTicketAccessLanding',

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
    ADMIN_ORGANIZATION_SPORT_DETAIL: 'admin.organization.sportDetail',
    ADMIN_ORGANIZATION_PROGRAMS: 'admin.organization.programs',
    ADMIN_ORGANIZATION_BILLING: 'admin.organization.billing',
    ADMIN_ORGANIZATION_BILLING_PLAN_SELECTION: 'admin.organization.billing.planSelection',
    ADMIN_ORGANIZATION_USERS: 'admin.organization.users',
    ADMIN_ORGANIZATION_BULK_INVITE: 'admin.organization.bulkInvite',
    ADMIN_ORGANIZATION_BILLING_CHECKOUT_SUCCESS: 'admin.organization.billing.checkoutSuccess',
    ADMIN_ORGANIZATION_BILLING_CHECKOUT_CANCEL: 'admin.organization.billing.checkoutCancel',
    ADMIN_TRIAL_EXPIRED: 'admin.organization.trialExpired',
    ADMIN_FEATURE_UPGRADE: 'admin.organization.featureUpgrade',
    ADMIN_ONBOARDING: 'admin.onboarding',
    // Standardized entity routes
    ADMIN_SPORTS: 'admin.sports.list',
    ADMIN_SPORT_DETAIL: 'admin.sports.detail',
    ADMIN_SPORT_UPDATE: 'admin.sports.update',
    ADMIN_PROGRAMS: 'admin.programs.list',
    ADMIN_PROGRAM_DETAIL: 'admin.programs.detail',
    ADMIN_PROGRAM_UPDATE: 'admin.programs.update',
    ADMIN_LEVELS: 'admin.levels.list',
    ADMIN_LEVEL_DETAIL: 'admin.levels.detail',
    ADMIN_LEVEL_UPDATE: 'admin.levels.update',
    ADMIN_SEASONS: 'admin.seasons.list',
    ADMIN_SEASON_DETAIL: 'admin.seasons.detail',
    ADMIN_SEASON_UPDATE: 'admin.seasons.update',
    ADMIN_TEAMS: 'admin.teams.list',
    ADMIN_TEAM_DETAIL: 'admin.teams.detail',
    ADMIN_TEAM_ROSTER: 'admin.teams.roster',
    ADMIN_TEAM_UPDATE: 'admin.teams.update',
    ADMIN_ATHLETES: 'admin.athletes.list',
    ADMIN_ATHLETE_DETAIL: 'admin.athletes.detail',
    ADMIN_CREATE_ATHLETE: 'admin.athletes.create',
    ADMIN_GUARDIANS: 'admin.guardians.list',
    ADMIN_GUARDIAN_DETAIL: 'admin.guardians.detail',
    ADMIN_CREATE_GUARDIAN: 'admin.guardians.create',
    ADMIN_GUARDIAN_REQUESTS: 'admin.guardianRequests',
    // Legacy (deprecated)
    ADMIN_FAMILIES: 'admin.families.list',
    ADMIN_FAMILY_DETAIL: 'admin.families.detail',
    ADMIN_CREATE_FAMILY: 'admin.families.create',
    ADMIN_EVENTS: 'admin.events.list',
    ADMIN_CREATE_EVENT: 'admin.events.create',
    ADMIN_FACILITIES: 'admin.facilities.list',
    ADMIN_FACILITY_DETAIL: 'admin.facilities.detail',
    ADMIN_FACILITIES_SCHEDULE: 'admin.facilities.schedule',
    ADMIN_ATTENDANCE: 'admin.attendance',
    ADMIN_NOTIFICATIONS: 'admin.notifications',
    ADMIN_PAYMENTS: 'admin.payments.list',
    ADMIN_PAYMENT_DETAIL: 'admin.payments.detail',
    ADMIN_CREATE_FEE: 'admin.payments.create',
    ADMIN_TICKETING: 'admin.ticketing',
    ADMIN_TICKETING_EVENTS: 'admin.ticketingEvents.list',
    ADMIN_TICKETING_EVENTS_CREATE: 'admin.ticketingEvents.create',
    ADMIN_TICKETING_EVENTS_TICKET_TYPES_CREATE: 'admin.ticketingEvents.ticketTypes.create',
    ADMIN_TICKETING_EVENTS_TICKET_TYPES_EDIT: 'admin.ticketingEvents.ticketTypes.edit',
    ADMIN_TICKETING_EVENTS_SEAT_MAPS: 'admin.ticketingEvents.seatMaps.list',
    ADMIN_TICKETING_EVENTS_SEAT_MAP_EDIT: 'admin.ticketingEvents.seatMaps.edit',
    ADMIN_TICKETING_EVENTS_SEAT_MAP_BUILDER: 'admin.ticketingEvents.seatMaps.builder',
    ADMIN_TICKETING_ORDERS: 'admin.ticketingOrders',
    ADMIN_TICKETING_SCANNER: 'admin.ticketingScanner',
    ADMIN_TICKETING_SCANNER_EVENT: 'admin.ticketingScannerEvent',
    ADMIN_UNIFORMS: 'admin.uniforms.list',
    ADMIN_ANNOUNCEMENTS: 'admin.announcements.list',
    ADMIN_TRAVEL: 'admin.travel.list',
    ADMIN_TRYOUTS: 'admin.tryouts.list',
    ADMIN_SETTINGS: 'admin.settings',
    ADMIN_PHOTOS: 'admin.photos.list',
    ADMIN_REPORTS_OVERVIEW: 'admin.reports.overview',
    ADMIN_REPORTS_BUILDER: 'admin.reports.builder',
    ADMIN_REPORTS_SAVED: 'admin.reports.saved',
    ADMIN_REPORTS_EXPORTS: 'admin.reports.exports',
    ADMIN_REPORTS_SCHEDULES: 'admin.reports.schedules',
    ADMIN_REPORTS_VIEWER: 'admin.reports.viewer',

    // Platform Admin
    PLATFORM_DASHBOARD: 'platformAdmin.dashboard',
    PLATFORM_ORGANIZATIONS: 'platformAdmin.organizations.list',
    PLATFORM_ORGANIZATION_DETAIL: 'platformAdmin.organizations.detail',
    PLATFORM_DEMO_MANAGEMENT: 'platformAdmin.demoManagement.list',
    PLATFORM_DEMO_ORG_DETAIL: 'platformAdmin.demoManagement.detail',
    PLATFORM_DEMO_INSIGHTS: 'platformAdmin.demoInsights',
    PLATFORM_USERS: 'platformAdmin.users.list',
    PLATFORM_USER_DETAIL: 'platformAdmin.users.detail',
    PLATFORM_ADMINS: 'platformAdmin.admins',
    PLATFORM_SETTINGS: 'platformAdmin.settings',
    PLATFORM_PAYMENTS: 'platformAdmin.payments',
    PLATFORM_FEES: 'platformAdmin.fees',
    PLATFORM_AUDIT: 'platformAdmin.audit',
    PLATFORM_FEATURE_FLAGS: 'platformAdmin.featureFlags',
    PLATFORM_LICENSES: 'platformAdmin.licenses.overview',
    PLATFORM_LICENSE_FEATURES: 'platformAdmin.licenses.features',
    PLATFORM_LICENSE_FEATURE_DETAIL: 'platformAdmin.licenses.featureDetail',
    PLATFORM_PHOTOS_OVERVIEW: 'platformAdmin.photos.overview',
    PLATFORM_PHOTOS_CONTENT_REVIEW: 'platformAdmin.photos.contentReview',
    PLATFORM_PHOTOS_STORAGE: 'platformAdmin.photos.storage',
    PLATFORM_ORG_PHOTOS: 'platformAdmin.photos.orgGalleries',
    PLATFORM_EMAILS: 'platformAdmin.emails.list',
    PLATFORM_EMAIL_CREATE: 'platformAdmin.emails.create',
    PLATFORM_EMAIL_EDIT: 'platformAdmin.emails.edit',

    // Fan
    FAN_HOME: 'fan.home',
    FAN_SCHEDULE: 'fan.schedule',
    FAN_EVENT_DETAIL: 'fan.events.detail',
    FAN_PHOTOS: 'fan.photos.list',
    FAN_PHOTOS_GALLERY: 'fan.photos.gallery',
    FAN_PHOTOS_ATHLETE: 'fan.photos.athlete',
    FAN_VIDEOS: 'fan.videos.list',
    FAN_VIDEO_DETAIL: 'fan.videos.detail',
    FAN_TICKETS: 'fan.tickets.list',
    FAN_TICKET_DETAIL: 'fan.tickets.detail',
    FAN_FOLLOWING: 'fan.following.base',
    FAN_DISCOVER: 'fan.following.discover',
    FAN_ORG_PROFILE: 'fan.profiles.org',
    FAN_TEAM_PROFILE: 'fan.profiles.team',
    FAN_ATHLETE_PROFILE: 'fan.profiles.athlete',
    FAN_PROFILE: 'fan.profile.base',
    FAN_PROFILE_EDIT: 'fan.profile.edit',
    FAN_PROFILE_NOTIFICATIONS: 'fan.profile.notifications',
    FAN_PROFILE_LINKED_ATHLETES: 'fan.profile.linkedAthletes',
    FAN_PROFILE_PRIVACY: 'fan.profile.privacy',
    FAN_PROFILE_PASSWORD: 'fan.profile.password',
    FAN_PROFILE_SECURITY: 'fan.profile.security',
} as const

export type RouteKeyConstant = typeof RouteKeys[keyof typeof RouteKeys]
