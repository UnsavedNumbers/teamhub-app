/**
 * Navigation Configurations
 * 
 * Pre-defined navigation structures for different parts of the application.
 * Uses route keys to reference routes defined in definitions.ts.
 * 
 * These configs are used by navigation components (PortalNav, AdminLayout, etc.)
 * to render consistent navigation menus.
 */

import type { NavigationSection, MenuItemDefinition, NavigationItem } from './types'

// ============================================================================
// PORTAL NAVIGATION - Used by PortalNav.tsx
// ============================================================================

/**
 * Parent navigation sections for portal mega menu
 */
export const parentNavSections: NavigationSection[] = [
    {
        label: 'Dashboard',
        route: '/portal/dashboard',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'portal.dashboard', text: 'Dashboard', icon: 'dashboard', description: 'Daily overview' },
                ],
            },
        ],
    },
    {
        label: 'Schedule',
        route: '/portal/calendar',
        groups: [
            {
                label: 'Schedule',
                items: [
                    { routeKey: 'portal.calendar', text: 'Schedule', icon: 'calendar_month', description: 'View all events' },
                ],
            },
        ],
    },
    {
        label: 'Travel',
        route: '/portal/travel',
        groups: [
            {
                label: 'Travel',
                items: [
                    { routeKey: 'portal.travel', text: 'Travel', icon: 'flight', description: 'Trip information' },
                ],
            },
        ],
    },
    {
        label: 'Messages',
        route: '/portal/messages',
        groups: [
            {
                label: 'Messages',
                items: [
                    { routeKey: 'portal.messages', text: 'Messages', icon: 'mail', description: 'Announcements and chat' },
                ],
            },
        ],
    },
    {
        label: 'Payments',
        route: '/portal/payments',
        groups: [
            {
                label: 'Payments',
                items: [
                    { routeKey: 'portal.payments', text: 'Fees Due', icon: 'receipt_long', description: 'Outstanding fees' },
                ],
            },
        ],
    },
    {
        label: 'More',
        groups: [
            {
                label: 'Programs',
                items: [
                    { routeKey: 'portal.athletes', text: 'My Teams', icon: 'groups', description: 'Your children\'s teams' },
                    { routeKey: 'portal.join', text: 'Join a Team', icon: 'group_add', description: 'Enter an invite code' },
                    { routeKey: 'portal.tryouts', text: 'Tryouts', icon: 'emoji_events', description: 'Tryout sessions' },
                ],
            },
            {
                label: 'Additional',
                items: [
                    { routeKey: 'portal.uniforms', text: 'Uniforms', icon: 'checkroom', description: 'Uniform orders' },
                    { routeKey: 'portal.settings', text: 'Settings', icon: 'settings', description: 'Preferences' },
                ],
            },
        ],
    },
]

/**
 * Coach navigation sections for portal mega menu
 */
export const coachNavSections: NavigationSection[] = [
    {
        label: 'Dashboard',
        route: '/portal/dashboard',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'portal.dashboard', text: 'Dashboard', icon: 'dashboard', description: 'Today\'s overview' },
                ],
            },
        ],
    },
    {
        label: 'Teams',
        route: '/portal/athletes',
        groups: [
            {
                label: 'Teams',
                items: [
                    { routeKey: 'portal.athletes', text: 'Teams', icon: 'groups', description: 'Teams and roster access' },
                ],
            },
        ],
    },
    {
        label: 'Schedule',
        route: '/portal/calendar',
        groups: [
            {
                label: 'Schedule',
                items: [
                    { routeKey: 'portal.calendar', text: 'Calendar', icon: 'calendar_month', description: 'View schedule' },
                ],
            },
        ],
    },
    {
        label: 'Attendance',
        route: '/portal/calendar',
        groups: [
            {
                label: 'Tracking',
                items: [
                    { routeKey: 'portal.calendar', text: 'Take Attendance', icon: 'how_to_reg', description: 'Use events to manage attendance', disabled: true },
                    { routeKey: 'portal.calendar', text: 'Attendance History', icon: 'history', description: 'Use events to review attendance', disabled: true },
                ],
            },
        ],
    },
    {
        label: 'More',
        groups: [
            {
                label: 'Additional',
                items: [
                    { routeKey: 'portal.tryouts', text: 'Tryouts', icon: 'emoji_events', description: 'Tryout sessions' },
                    { routeKey: 'portal.travel', text: 'Travel', icon: 'flight', description: 'Trip details' },
                    { routeKey: 'portal.messages', text: 'Messages', icon: 'mail', description: 'Communications' },
                    { routeKey: 'portal.settings', text: 'Settings', icon: 'settings', description: 'Preferences' },
                ],
            },
        ],
    },
]

/**
 * Organization admin navigation sections for portal mega menu
 * (When an org admin is in the portal view)
 */
export const orgAdminNavSections: NavigationSection[] = [
    {
        label: 'Dashboard',
        route: '/admin',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'admin.dashboard', text: 'Admin Dashboard', icon: 'dashboard', description: 'Organization overview' },
                ],
            },
        ],
    },
    {
        label: 'Organization',
        route: '/admin/organization',
        groups: [
            {
                label: 'Configuration',
                items: [
                    { routeKey: 'admin.organization.base', text: 'Organization Settings', icon: 'settings', description: 'Organization info' },
                    { routeKey: 'admin.organization.users', text: 'Users', icon: 'admin_panel_settings', description: 'Access and roles' },
                    { routeKey: 'admin.organization.billing', text: 'Billing', icon: 'credit_card', description: 'Plan and billing' },
                ],
            },
        ],
    },
    {
        label: 'Operations',
        route: '/admin/teams',
        groups: [
            {
                label: 'Core',
                items: [
                    { routeKey: 'admin.teams.list', text: 'Teams', icon: 'groups', description: 'Teams and rosters' },
                    { routeKey: 'admin.events.list', text: 'Events', icon: 'event', description: 'Schedule and calendar' },
                    { routeKey: 'admin.payments.list', text: 'Payments', icon: 'receipt_long', description: 'Fees and collections' },
                ],
            },
            {
                label: 'Programs',
                items: [
                    { routeKey: 'admin.tryouts.list', text: 'Tryouts', icon: 'emoji_events', description: 'Registration and evaluation' },
                    { routeKey: 'admin.travel.list', text: 'Travel', icon: 'flight', description: 'Trip planning' },
                    { routeKey: 'admin.uniforms.list', text: 'Uniforms', icon: 'checkroom', description: 'Kits and gear' },
                ],
            },
        ],
    },
]

// ============================================================================
// ADMIN SIDEBAR NAVIGATION - Used by AdminLayout.tsx
// ============================================================================

/**
 * Admin sidebar menu items configuration
 */
export const adminMenuItems: MenuItemDefinition[] = [
    {
        label: 'Dashboard',
        icon: 'dashboard',
        routeKey: 'admin.dashboard',
        requiresOrg: false,
        children: null,
    },
    {
        label: 'Organization',
        icon: 'business',
        routeKey: 'admin.organization.base',
        requiresOrg: false,
        children: [
            { text: 'Overview', icon: 'info', routeKey: 'admin.organization.structure', requiresOrg: true },
            { text: 'Sports & Programs', icon: 'sports', routeKey: 'admin.organization.sportsPrograms', requiresOrg: true },
            { text: 'Levels', icon: 'grade', routeKey: 'admin.organization.levels', requiresOrg: true },
            { text: 'Teams', icon: 'groups', routeKey: 'admin.organization.teamsManagement', requiresOrg: true },
            { text: 'Seasons', icon: 'calendar_month', routeKey: 'admin.organization.seasons', requiresOrg: true },
        ],
    },
    {
        label: 'Management',
        icon: 'groups',
        routeKey: 'admin.families.list',
        requiresOrg: true,
        children: [
            { text: 'Families', icon: 'home', routeKey: 'admin.families.list', requiresOrg: true },
            { text: 'Athletes', icon: 'child_care', routeKey: 'admin.athletes.list', requiresOrg: true },
        ],
    },
    {
        label: 'Operations',
        icon: 'settings',
        routeKey: 'admin.payments.list',
        requiresOrg: true,
        children: [
            { text: 'Payments', icon: 'credit_card', routeKey: 'admin.payments.list', requiresOrg: true },
            { text: 'Events', icon: 'event', routeKey: 'admin.events.list', requiresOrg: true },
            { text: 'Attendance', icon: 'how_to_reg', routeKey: 'admin.attendance', requiresOrg: true },
            { text: 'Uniforms', icon: 'checkroom', routeKey: 'admin.uniforms.list', requiresOrg: true },
        ],
    },
    {
        label: 'Account',
        icon: 'account_circle',
        routeKey: 'admin.settings',
        requiresOrg: false,
        children: [
            { text: 'Settings', icon: 'settings', routeKey: 'admin.settings', requiresOrg: false },
        ],
    },
]

// ============================================================================
// PLATFORM ADMIN NAVIGATION - Used by PlatformAdminLayout.tsx
// ============================================================================

/**
 * Platform admin sidebar navigation sections
 */
export const platformAdminNavSections: {
    label: string
    items: NavigationItem[]
}[] = [
        {
            label: 'Overview',
            items: [
                { routeKey: 'platformAdmin.dashboard', text: 'Dashboard', icon: 'dashboard', requiredAction: 'view_dashboard' },
            ],
        },
        {
            label: 'Organizations',
            items: [
                { routeKey: 'platformAdmin.organizations.list', text: 'Organizations', icon: 'apartment', requiredAction: 'view_organizations' },
            ],
        },
        {
            label: 'Users',
            items: [
                { routeKey: 'platformAdmin.users.list', text: 'Users', icon: 'group', requiredAction: 'view_users' },
                { routeKey: 'platformAdmin.admins', text: 'Platform Admins', icon: 'admin_panel_settings', requiredAction: 'view_platform_admins' },
            ],
        },
        {
            label: 'Payments',
            items: [
                { routeKey: 'platformAdmin.payments', text: 'Payments', icon: 'credit_card', requiredAction: 'view_payments' },
                { routeKey: 'platformAdmin.fees', text: 'Fees', icon: 'receipt_long', requiredAction: 'view_fees' },
            ],
        },
        {
            label: 'Compliance',
            items: [
                { routeKey: 'platformAdmin.audit', text: 'Event Log', icon: 'history', requiredAction: 'view_audit_log' },
                { routeKey: 'platformAdmin.featureFlags', text: 'Feature Flags', icon: 'flag', requiredAction: 'view_feature_flags' },
            ],
        },
        {
            label: 'Licenses & Entitlements',
            items: [
                { routeKey: 'platformAdmin.licenses.overview', text: 'Overview', icon: 'dashboard', requiredAction: 'view_licenses' },
                { routeKey: 'platformAdmin.licenses.tiers', text: 'License Tiers', icon: 'workspace_premium', requiredAction: 'manage_license_tiers' },
                { routeKey: 'platformAdmin.licenses.features', text: 'Feature Catalog', icon: 'inventory_2', requiredAction: 'manage_features' },
                { routeKey: 'platformAdmin.licenses.overrides', text: 'Rules & Overrides', icon: 'rule', requiredAction: 'manage_overrides' },
                { routeKey: 'platformAdmin.licenses.audit', text: 'Audit & History', icon: 'history', requiredAction: 'view_licenses_audit' },
            ],
        },
        {
            label: 'System',
            items: [
                { routeKey: 'platformAdmin.structure', text: 'Structure', icon: 'account_tree', requiredAction: 'view_structure' },
            ],
        },
    ]

// ============================================================================
// GLOBAL NAV CONFIGURATIONS - Used by GlobalNav.tsx
// ============================================================================

/**
 * Admin global nav sections (top bar mega menu)
 */
export const adminGlobalNavSections: NavigationSection[] = [
    {
        label: 'Overview',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'admin.dashboard', text: 'Dashboard', icon: 'dashboard', description: 'Organization overview' },
                    { routeKey: 'admin.organization.base', text: 'Organization', icon: 'business', description: 'Settings & billing' },
                ],
            },
        ],
    },
    {
        label: 'Management',
        groups: [
            {
                label: 'Teams & People',
                items: [
                    { routeKey: 'admin.teams.list', text: 'Teams', icon: 'groups', description: 'Manage teams & rosters' },
                    { routeKey: 'admin.families.list', text: 'Families', icon: 'home', description: 'Family management' },
                    { routeKey: 'admin.athletes.list', text: 'Athletes', icon: 'child_care', description: 'Player registry' },
                ],
            },
        ],
    },
    {
        label: 'Operations',
        groups: [
            {
                label: 'Core Operations',
                items: [
                    { routeKey: 'admin.payments.list', text: 'Payments', icon: 'credit_card', description: 'Fees & collections' },
                    { routeKey: 'admin.events.list', text: 'Events', icon: 'event', description: 'Schedule & calendar' },
                    { routeKey: 'admin.attendance', text: 'Attendance', icon: 'how_to_reg', description: 'Check-ins & tracking' },
                ],
            },
            {
                label: 'Programs',
                items: [
                    { routeKey: 'admin.uniforms.list', text: 'Uniforms', icon: 'checkroom', description: 'Kit & gear orders' },
                    { routeKey: 'admin.travel.list', text: 'Travel', icon: 'flight', description: 'Trip planning' },
                    { routeKey: 'admin.tryouts.list', text: 'Tryouts', icon: 'emoji_events', description: 'Registration & evaluation' },
                ],
            },
        ],
    },
]

/**
 * Platform admin global nav sections (top bar mega menu)
 */
export const platformAdminGlobalNavSections: NavigationSection[] = [
    {
        label: 'Overview',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'platformAdmin.dashboard', text: 'Dashboard', icon: 'dashboard', description: 'Platform metrics' },
                ],
            },
        ],
    },
    {
        label: 'Organizations',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'platformAdmin.organizations.list', text: 'Organizations', icon: 'apartment', description: 'All organizations' },
                ],
            },
        ],
    },
    {
        label: 'Users',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'platformAdmin.users.list', text: 'Users', icon: 'group', description: 'All platform users' },
                    { routeKey: 'platformAdmin.admins', text: 'Platform Admins', icon: 'admin_panel_settings', description: 'Admin management' },
                ],
            },
        ],
    },
    {
        label: 'Finance',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'platformAdmin.payments', text: 'Payments', icon: 'credit_card', description: 'Payment transactions' },
                    { routeKey: 'platformAdmin.fees', text: 'Fees', icon: 'receipt_long', description: 'Fee schedules' },
                ],
            },
        ],
    },
    {
        label: 'System',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'platformAdmin.audit', text: 'Event Log', icon: 'history', description: 'Audit trail' },
                    { routeKey: 'platformAdmin.featureFlags', text: 'Feature Flags', icon: 'flag', description: 'Feature toggles' },
                    { routeKey: 'platformAdmin.structure', text: 'Structure', icon: 'account_tree', description: 'Data model' },
                ],
            },
        ],
    },
]

// ============================================================================
// USER CONTEXT DROPDOWN - Used by UserContextDropdown.tsx
// ============================================================================

/**
 * Role-based quick links for user dropdown
 */
export const userDropdownRoleLinks = [
    { role: 'parent', label: 'My Children', routeKey: 'portal.athletes', icon: 'family_restroom' },
    { role: 'parent', label: 'Payments', routeKey: 'portal.payments', icon: 'receipt_long' },
    { role: 'coach', label: 'Teams', routeKey: 'portal.athletes', icon: 'sports_soccer' },
    { role: 'org_admin', label: 'Organization Settings', routeKey: 'admin.organization.base', icon: 'admin_panel_settings' },
] as const
