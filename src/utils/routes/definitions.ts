/**
 * Route Definitions
 * 
 * Single source of truth for all application routes.
 * Organized hierarchically by context: portal, admin, platformAdmin, auth
 * 
 * IMPORTANT: When adding new routes:
 * 1. Add the route definition here
 * 2. Add corresponding Route in App.tsx
 * 3. Update navigation configs if needed (navigation.ts)
 */

import type { RouteDefinition } from './types'

// ============================================================================
// PORTAL ROUTES - Parents and Coaches
// ============================================================================
const portal = {
    // Dashboard
    dashboard: {
        path: '/portal/dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        description: 'Daily overview',
    },

    // Schedule & Calendar
    calendar: {
        path: '/portal/calendar',
        label: 'Schedule',
        icon: 'calendar_month',
        description: 'View all events',
    },
    eventDetail: {
        path: '/portal/calendar/events/:eventId',
        params: ['eventId'] as const,
        label: 'Event Details',
        icon: 'event',
    },

    // Travel
    travel: {
        path: '/portal/travel',
        label: 'Travel',
        icon: 'flight',
        description: 'Trip information',
    },
    travelDetail: {
        path: '/portal/travel/:id',
        params: ['id'] as const,
        label: 'Travel Details',
        icon: 'flight',
    },

    // Messages
    messages: {
        path: '/portal/messages',
        label: 'Messages',
        icon: 'mail',
        description: 'Announcements and chat',
    },
    announcementDetail: {
        path: '/portal/messages/:announcementId',
        params: ['announcementId'] as const,
        label: 'Announcement',
        icon: 'mail',
    },

    // Payments
    payments: {
        path: '/portal/payments',
        label: 'Payments',
        icon: 'receipt_long',
        description: 'Outstanding fees',
    },
    paymentSuccess: {
        path: '/portal/payments/success',
        label: 'Payment Success',
        icon: 'check_circle',
    },
    paymentCancel: {
        path: '/portal/payments/cancel',
        label: 'Payment Cancelled',
        icon: 'cancel',
    },

    // Athletes/Teams
    athletes: {
        path: '/portal/athletes',
        label: 'My Teams',
        icon: 'groups',
        description: 'Your children\'s teams',
    },
    join: {
        path: '/portal/join',
        label: 'Join a Team',
        icon: 'group_add',
        description: 'Enter an invite code',
    },

    // Tryouts
    tryouts: {
        path: '/portal/tryouts',
        label: 'Tryouts',
        icon: 'emoji_events',
        description: 'Tryout sessions',
    },
    tryoutDetail: {
        path: '/portal/tryouts/:tryoutId',
        params: ['tryoutId'] as const,
        label: 'Tryout Details',
        icon: 'emoji_events',
    },

    // Uniforms
    uniforms: {
        path: '/portal/uniforms',
        label: 'Uniforms',
        icon: 'checkroom',
        description: 'Uniform orders',
    },

    // Settings
    settings: {
        path: '/portal/settings',
        label: 'Settings',
        icon: 'settings',
        description: 'Preferences',
    },

    // Role Selection
    roleSelection: {
        path: '/portal/role-selection',
        label: 'Role Selection',
        icon: 'switch_account',
    },
} as const satisfies Record<string, RouteDefinition>

// ============================================================================
// AUTH ROUTES - Authentication flows
// ============================================================================
const auth = {
    login: {
        path: '/portal/login',
        label: 'Login',
        icon: 'login',
    },
    signup: {
        path: '/portal/signup',
        label: 'Sign Up',
        icon: 'person_add',
    },
    forgotPassword: {
        path: '/portal/forgot-password',
        label: 'Forgot Password',
        icon: 'lock_reset',
    },
    resetPassword: {
        path: '/portal/reset-password',
        label: 'Reset Password',
        icon: 'lock_reset',
    },
    acceptInvite: {
        path: '/portal/accept-invite',
        label: 'Accept Invite',
        icon: 'mail',
    },
    authCallback: {
        path: '/portal/auth/callback',
        label: 'Auth Callback',
        icon: 'sync',
    },
    confirmEmail: {
        path: '/portal/confirm-email',
        label: 'Confirm Email',
        icon: 'mark_email_read',
    },
    unauthorized: {
        path: '/portal/unauthorized',
        label: 'Unauthorized',
        icon: 'block',
    },
} as const satisfies Record<string, RouteDefinition>

// ============================================================================
// ADMIN ROUTES - Organization Administrators
// ============================================================================
const admin = {
    // Dashboard
    dashboard: {
        path: '/admin',
        label: 'Dashboard',
        icon: 'dashboard',
        description: 'Organization overview',
        requiresOrg: false,
    },

    // Organization Settings
    organization: {
        base: {
            path: '/admin/organization',
            label: 'Organization Settings',
            icon: 'settings',
            description: 'Organization info',
            requiresOrg: false,
        },
        structure: {
            path: '/admin/organization/structure',
            label: 'Overview',
            icon: 'info',
            description: 'Structure overview',
            requiresOrg: true,
        },
        sportsPrograms: {
            path: '/admin/organization/structure/sports-programs',
            label: 'Sports & Programs',
            icon: 'sports',
            requiresOrg: true,
        },
        levels: {
            path: '/admin/organization/structure/levels',
            label: 'Levels',
            icon: 'grade',
            requiresOrg: true,
        },
        teamsManagement: {
            path: '/admin/organization/structure/teams',
            label: 'Teams',
            icon: 'groups',
            requiresOrg: true,
        },
        seasons: {
            path: '/admin/organization/structure/seasons',
            label: 'Seasons',
            icon: 'calendar_month',
            requiresOrg: true,
        },
        forms: {
            path: '/admin/organization/structure/forms',
            label: 'Forms',
            icon: 'description',
            requiresOrg: true,
        },
        users: {
            path: '/admin/organization/users',
            label: 'Users',
            icon: 'admin_panel_settings',
            description: 'Access and roles',
            requiresOrg: true,
        },
        billing: {
            path: '/admin/organization/billing',
            label: 'Billing',
            icon: 'credit_card',
            description: 'Plan and billing',
            requiresOrg: false,
        },
        planSelection: {
            path: '/admin/organization/billing/plan-selection',
            label: 'Plan Selection',
            icon: 'workspace_premium',
            requiresOrg: false,
        },
        checkoutSuccess: {
            path: '/admin/organization/billing/checkout/success',
            label: 'Checkout Success',
            icon: 'check_circle',
            requiresOrg: false,
        },
        checkoutCancel: {
            path: '/admin/organization/billing/checkout/cancel',
            label: 'Checkout Cancelled',
            icon: 'cancel',
            requiresOrg: false,
        },
        trialExpired: {
            path: '/admin/organization/trial-expired',
            label: 'Trial Expired',
            icon: 'lock',
            requiresOrg: false,
        },
    },

    // Onboarding (special - outside admin layout)
    onboarding: {
        path: '/admin/onboarding',
        label: 'Onboarding',
        icon: 'rocket_launch',
        requiresOrg: false,
    },

    // Teams
    teams: {
        list: {
            path: '/admin/teams',
            label: 'Teams',
            icon: 'groups',
            description: 'Teams and rosters',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/teams/:id',
            params: ['id'] as const,
            label: 'Team Details',
            icon: 'groups',
            requiresOrg: true,
        },
        roster: {
            path: '/admin/teams/:id/roster',
            params: ['id'] as const,
            label: 'Team Roster',
            icon: 'list',
            requiresOrg: true,
        },
    },

    // Families
    families: {
        list: {
            path: '/admin/families',
            label: 'Families',
            icon: 'home',
            description: 'Family management',
            requiresOrg: true,
        },
        create: {
            path: '/admin/families/new',
            label: 'Create Family',
            icon: 'add',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/families/:id',
            params: ['id'] as const,
            label: 'Family Details',
            icon: 'home',
            requiresOrg: true,
        },
        createAthlete: {
            path: '/admin/families/:familyId/athletes/new',
            params: ['familyId'] as const,
            label: 'Add Athlete to Family',
            icon: 'person_add',
            requiresOrg: true,
        },
    },

    // Athletes
    athletes: {
        list: {
            path: '/admin/athletes',
            label: 'Athletes',
            icon: 'child_care',
            description: 'Player registry',
            requiresOrg: true,
        },
        create: {
            path: '/admin/athletes/new',
            label: 'Create Athlete',
            icon: 'person_add',
            requiresOrg: true,
        },
        import: {
            path: '/admin/athletes/import',
            label: 'Import Athletes',
            icon: 'upload_file',
            requiresOrg: true,
        },
    },

    // Events
    events: {
        list: {
            path: '/admin/events',
            label: 'Events',
            icon: 'event',
            description: 'Schedule and calendar',
            requiresOrg: true,
        },
        create: {
            path: '/admin/events/new',
            label: 'Create Event',
            icon: 'add',
            requiresOrg: true,
        },
        attendance: {
            path: '/admin/events/:id/attendance',
            params: ['id'] as const,
            label: 'Attendance',
            icon: 'how_to_reg',
            requiresOrg: true,
        },
    },

    // Attendance
    attendance: {
        path: '/admin/attendance',
        label: 'Attendance',
        icon: 'how_to_reg',
        description: 'Check-ins & tracking',
        requiresOrg: true,
    },

    // Payments
    payments: {
        list: {
            path: '/admin/payments',
            label: 'Payments',
            icon: 'credit_card',
            description: 'Fees and collections',
            requiresOrg: true,
        },
        create: {
            path: '/admin/payments/new',
            label: 'Create Fee',
            icon: 'add',
            requiresOrg: true,
        },
    },

    // Uniforms
    uniforms: {
        list: {
            path: '/admin/uniforms',
            label: 'Uniforms',
            icon: 'checkroom',
            description: 'Kit and gear orders',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/uniforms/:kitId',
            params: ['kitId'] as const,
            label: 'Uniform Kit',
            icon: 'checkroom',
            requiresOrg: true,
        },
    },

    // Travel
    travel: {
        list: {
            path: '/admin/travel',
            label: 'Travel',
            icon: 'flight',
            description: 'Trip planning',
            requiresOrg: true,
        },
        create: {
            path: '/admin/travel/new',
            label: 'Create Travel Plan',
            icon: 'add',
            requiresOrg: true,
        },
        edit: {
            path: '/admin/travel/:id',
            params: ['id'] as const,
            label: 'Edit Travel Plan',
            icon: 'edit',
            requiresOrg: true,
        },
    },

    // Tryouts
    tryouts: {
        list: {
            path: '/admin/tryouts',
            label: 'Tryouts',
            icon: 'emoji_events',
            description: 'Registration and evaluation',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/tryouts/:tryoutId',
            params: ['tryoutId'] as const,
            label: 'Tryout Details',
            icon: 'emoji_events',
            requiresOrg: true,
        },
    },

    // Users
    users: {
        create: {
            path: '/admin/users/new',
            label: 'Create User',
            icon: 'person_add',
            requiresOrg: true,
        },
    },

    // Settings
    settings: {
        path: '/admin/settings',
        label: 'Settings',
        icon: 'settings',
        description: 'Personal settings',
        requiresOrg: false,
    },
} as const satisfies Record<string, RouteDefinition | Record<string, RouteDefinition | Record<string, RouteDefinition>>>

// ============================================================================
// PLATFORM ADMIN ROUTES - Platform Administrators
// ============================================================================
const platformAdmin = {
    // Dashboard
    dashboard: {
        path: '/platform-admin',
        label: 'Dashboard',
        icon: 'dashboard',
        description: 'Platform metrics',
    },

    // Organizations
    organizations: {
        list: {
            path: '/platform-admin/organizations',
            label: 'Organizations',
            icon: 'apartment',
            description: 'All organizations',
        },
        detail: {
            path: '/platform-admin/organizations/:id',
            params: ['id'] as const,
            label: 'Organization Details',
            icon: 'apartment',
        },
    },

    // Users
    users: {
        list: {
            path: '/platform-admin/users',
            label: 'Users',
            icon: 'group',
            description: 'All platform users',
        },
        detail: {
            path: '/platform-admin/users/:id',
            params: ['id'] as const,
            label: 'User Details',
            icon: 'person',
        },
    },

    // Platform Admins
    admins: {
        path: '/platform-admin/admins',
        label: 'Platform Admins',
        icon: 'admin_panel_settings',
        description: 'Admin management',
    },

    // Structure
    structure: {
        path: '/platform-admin/structure',
        label: 'Structure',
        icon: 'account_tree',
        description: 'Data model',
    },

    // Payments
    payments: {
        path: '/platform-admin/payments',
        label: 'Payments',
        icon: 'credit_card',
        description: 'Payment transactions',
    },

    // Fees
    fees: {
        path: '/platform-admin/fees',
        label: 'Fees',
        icon: 'receipt_long',
        description: 'Fee schedules',
    },

    // Audit
    audit: {
        path: '/platform-admin/audit',
        label: 'Event Log',
        icon: 'history',
        description: 'Audit trail',
    },

    // Feature Flags
    featureFlags: {
        path: '/platform-admin/feature-flags',
        label: 'Feature Flags',
        icon: 'flag',
        description: 'Feature toggles',
    },

    // Licenses
    licenses: {
        overview: {
            path: '/platform-admin/licenses',
            label: 'Overview',
            icon: 'dashboard',
            description: 'Licenses overview',
        },
        tiers: {
            path: '/platform-admin/licenses/tiers',
            label: 'License Tiers',
            icon: 'workspace_premium',
        },
        tierDetail: {
            path: '/platform-admin/licenses/tiers/:id',
            params: ['id'] as const,
            label: 'Tier Details',
            icon: 'workspace_premium',
        },
        features: {
            path: '/platform-admin/licenses/features',
            label: 'Feature Catalog',
            icon: 'inventory_2',
        },
        featureDetail: {
            path: '/platform-admin/licenses/features/:id',
            params: ['id'] as const,
            label: 'Feature Details',
            icon: 'inventory_2',
        },
        overrides: {
            path: '/platform-admin/licenses/overrides',
            label: 'Rules & Overrides',
            icon: 'rule',
        },
        overrideCreate: {
            path: '/platform-admin/licenses/overrides/new',
            label: 'Create Override',
            icon: 'add',
        },
        overrideDetail: {
            path: '/platform-admin/licenses/overrides/:id',
            params: ['id'] as const,
            label: 'Override Details',
            icon: 'rule',
        },
        audit: {
            path: '/platform-admin/licenses/audit',
            label: 'Audit & History',
            icon: 'history',
        },
    },
} as const satisfies Record<string, RouteDefinition | Record<string, RouteDefinition>>

// ============================================================================
// ROOT ROUTES
// ============================================================================
const root = {
    marketing: {
        path: '/',
        label: 'Home',
        icon: 'home',
    },
} as const satisfies Record<string, RouteDefinition>

// ============================================================================
// EXPORTED ROUTE DEFINITIONS
// ============================================================================
export const routes = {
    root,
    portal,
    auth,
    admin,
    platformAdmin,
} as const

// Type for the routes object
export type Routes = typeof routes
