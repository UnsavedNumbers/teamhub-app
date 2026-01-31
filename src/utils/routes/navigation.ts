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
        label: 'Huddles',
        route: '/portal/messages',
        groups: [
            {
                label: 'Huddles',
                items: [
                    { routeKey: 'portal.messages', text: 'Huddles', icon: 'forum', description: 'Team chat and announcements' },
                ],
            },
        ],
    },
    {
        label: 'Payments',
        route: '/portal/payments',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'portal.payments', text: 'Payments', icon: 'receipt_long', description: 'Outstanding fees' },
                ],
            },
        ],
    },
    {
        label: 'Photos',
        route: '/portal/photos',
        groups: [
            {
                label: 'Photos',
                items: [
                    { routeKey: 'portal.photos', text: 'Photos', icon: 'photo_library', description: 'Team and athlete photos' },
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
                    { routeKey: 'portal.athletes', text: 'My Athletes', icon: 'groups', description: 'Your children\'s profiles' },
                    { routeKey: 'portal.athletes.requestAttachment', text: 'Request Athlete Attachment', icon: 'person_add', description: 'Request to attach to an existing athlete' },
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
        label: 'My Athletes',
        route: '/portal/athletes',
        groups: [
            {
                label: 'My Athletes',
                items: [
                    { routeKey: 'portal.athletes', text: 'My Athletes', icon: 'groups', description: 'Your children\'s profiles' },
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
        label: 'Photos',
        route: '/portal/photos',
        groups: [
            {
                label: 'Photos',
                items: [
                    { routeKey: 'portal.photos', text: 'Photos', icon: 'photo_library', description: 'Team and athlete photos' },
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
                    { routeKey: 'portal.messages', text: 'Huddles', icon: 'forum', description: 'Team chat' },
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
            { text: 'Sports', icon: 'sports', routeKey: 'admin.sports.list', requiresOrg: true },
            { text: 'Programs', icon: 'category', routeKey: 'admin.programs.list', requiresOrg: true },
            { text: 'Levels', icon: 'grade', routeKey: 'admin.levels.list', requiresOrg: true },
            { text: 'Teams', icon: 'groups', routeKey: 'admin.teams.list', requiresOrg: true },
            { text: 'Seasons', icon: 'calendar_month', routeKey: 'admin.seasons.list', requiresOrg: true },
        ],
    },
    {
        label: 'Athletes',
        icon: 'groups',
        routeKey: 'admin.athletes.list',
        requiresOrg: true,
        children: [
            { text: 'Athletes', icon: 'child_care', routeKey: 'admin.athletes.list', requiresOrg: true },
        ],
    },
    {
        label: 'Guardians',
        icon: 'home',
        routeKey: 'admin.guardians.list',
        requiresOrg: true,
        children: null,
    },
    {
        label: 'Guardian Requests',
        icon: 'person_add',
        routeKey: 'admin.guardianRequests',
        requiresOrg: true,
        children: null,
    },
    {
        label: 'Ticketing',
        icon: 'confirmation_number',
        routeKey: 'admin.ticketingEvents',
        requiresOrg: true,
        children: [
            { text: 'Events', icon: 'event', routeKey: 'admin.ticketingEvents', requiresOrg: true },
            { text: 'Orders', icon: 'receipt_long', routeKey: 'admin.ticketingOrders', requiresOrg: true },
            { text: 'Gate Entry', icon: 'qr_code_scanner', routeKey: 'admin.ticketingScanner', requiresOrg: true },
        ],
    },
    {
        label: 'Payments',
        icon: 'credit_card',
        routeKey: 'admin.payments.list',
        requiresOrg: true,
        children: null,
    },
    {
        label: 'Photos',
        icon: 'photo_library',
        routeKey: 'admin.photos.list',
        requiresOrg: true,
        children: [
            { text: 'All Galleries', icon: 'collections', routeKey: 'admin.photos.list', requiresOrg: true },
            { text: 'New Gallery', icon: 'add_photo_alternate', routeKey: 'admin.photos.list', requiresOrg: true },
        ],
    },
    {
        label: 'Operations',
        icon: 'settings',
        routeKey: 'admin.events.list',
        requiresOrg: true,
        children: [
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
            label: 'Ticketing',
            items: [
                { routeKey: 'platformAdmin.ticketing.allEvents', text: 'All Events', icon: 'event', requiredAction: 'view_ticketing' },
                { routeKey: 'platformAdmin.ticketing.orderLookup', text: 'Order Lookup', icon: 'receipt_long', requiredAction: 'view_ticketing' },
                { routeKey: 'platformAdmin.ticketing.webhookStatus', text: 'Webhook Status', icon: 'webhook', requiredAction: 'view_ticketing' },
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
        label: 'Athletes',
        groups: [
            {
                label: 'Athletes & Guardians',
                items: [
                    { routeKey: 'admin.athletes.list', text: 'Athletes', icon: 'child_care', description: 'Player registry' },
                    { routeKey: 'admin.guardians.list', text: 'Guardians', icon: 'home', description: 'Guardian management' },
                    { routeKey: 'admin.guardianRequests', text: 'Guardian Requests', icon: 'person_add', description: 'Review attachment requests' },
                    { routeKey: 'admin.teams.list', text: 'Teams', icon: 'groups', description: 'Manage teams & rosters' },
                ],
            },
        ],
    },
    {
        label: 'Ticketing',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'admin.ticketingEvents', text: 'Events', icon: 'event', description: 'Create and manage ticketed events' },
                    { routeKey: 'admin.ticketingOrders', text: 'Orders', icon: 'receipt_long', description: 'Search purchases and process refunds' },
                    { routeKey: 'admin.ticketingScanner', text: 'Gate Entry', icon: 'qr_code_scanner', description: 'Ticket validation' },
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
        label: 'Ticketing',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'platformAdmin.ticketing.allEvents', text: 'All Events', icon: 'event', description: 'Cross-org ticketed events' },
                    { routeKey: 'platformAdmin.ticketing.orderLookup', text: 'Order Lookup', icon: 'receipt_long', description: 'Global order search' },
                    { routeKey: 'platformAdmin.ticketing.webhookStatus', text: 'Webhook Status', icon: 'webhook', description: 'Payment delivery monitoring' },
                ],
            },
        ],
    },
    {
        label: 'Photos',
        groups: [
            {
                label: '',
                items: [
                    { routeKey: 'platformAdmin.photos.overview', text: 'Gallery Overview', icon: 'photo_library', description: 'Storage and gallery stats' },
                    { routeKey: 'platformAdmin.photos.contentReview', text: 'Content Review', icon: 'flag', description: 'Flagged content' },
                    { routeKey: 'platformAdmin.photos.storage', text: 'Storage Management', icon: 'storage', description: 'Quotas and retention' },
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
    { role: 'coach', label: 'My Athletes', routeKey: 'portal.athletes', icon: 'sports_soccer' },
    { role: 'org_admin', label: 'Organization Settings', routeKey: 'admin.organization.base', icon: 'admin_panel_settings' },
] as const
