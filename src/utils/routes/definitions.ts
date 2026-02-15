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
    eventEdit: {
        path: '/portal/calendar/events/:eventId/edit',
        params: ['eventId'] as const,
        label: 'Edit Event',
        icon: 'edit',
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

    // Huddles
    messages: {
        path: '/portal/messages',
        label: 'Huddles',
        icon: 'forum',
        description: 'Team chat and announcements',
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
    paymentDetail: {
        path: '/portal/payments/:id',
        params: ['id'] as const,
        label: 'Payment Details',
        icon: 'receipt_long',
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

    // Tickets
    tickets: {
        path: '/portal/tickets',
        label: 'Tickets',
        icon: 'confirmation_number',
        description: 'Buy event tickets',
    },
    ticketEventDetail: {
        path: '/portal/tickets/events/:eventId',
        params: ['eventId'] as const,
        label: 'Event Tickets',
        icon: 'confirmation_number',
    },
    ticketOrderSuccess: {
        path: '/portal/tickets/order/:orderId',
        params: ['orderId'] as const,
        label: 'Order Confirmation',
        icon: 'check_circle',
    },
    ticketAccess: {
        path: '/portal/tickets/access/:token',
        params: ['token'] as const,
        label: 'My Tickets',
        icon: 'confirmation_number',
    },
    ticketValidate: {
        path: '/portal/tickets/validate/:token',
        params: ['token'] as const,
        label: 'Validate Tickets',
        icon: 'qr_code_scanner',
    },
    myTickets: {
        path: '/portal/account/tickets',
        label: 'My Tickets',
        icon: 'confirmation_number',
        description: 'Your event tickets',
    },
    followedOrgs: {
        path: '/portal/follows',
        label: 'Followed Organizations',
        icon: 'favorite',
        description: 'Organizations you follow',
    },
    bookmarkedEvents: {
        path: '/portal/bookmarks',
        label: 'Bookmarked Events',
        icon: 'bookmark',
        description: 'Events you\'ve saved',
    },

    // Athletes/Teams
    athletes: {
        path: '/portal/athletes',
        label: 'My Teams',
        icon: 'groups',
        description: 'Your children\'s teams',
    },
    requestAttachment: {
        path: '/portal/athletes/request-attachment',
        label: 'Request Athlete Attachment',
        icon: 'person_add',
        description: 'Request to attach to an existing athlete',
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
    uniformKitDetail: {
        path: '/portal/uniforms/:kitId',
        params: ['kitId'] as const,
        label: 'Uniform Kit Order',
        icon: 'checkroom',
    },

    // Settings
    settings: {
        path: '/portal/settings',
        label: 'Settings',
        icon: 'settings',
        description: 'Preferences',
    },

    // Following/Organizations
    following: {
        path: '/portal/following',
        label: 'Followed Organizations',
        icon: 'favorite',
        description: 'Organizations you follow',
    },
    discoverOrgs: {
        path: '/portal/discover',
        label: 'Browse Organizations',
        icon: 'explore',
        description: 'Discover new teams',
    },

    // Help & Support
    help: {
        path: '/portal/help',
        label: 'Help & Support',
        icon: 'help',
        description: 'Get assistance',
    },

    // Photos
    photos: {
        path: '/portal/photos',
        label: 'Photos',
        icon: 'photo_library',
        description: 'Team and athlete photos',
    },
    photosGallery: {
        path: '/portal/photos/gallery/:id',
        params: ['id'] as const,
        label: 'Gallery',
        icon: 'photo_library',
    },
    photosGalleryManage: {
        path: '/portal/photos/gallery/:id/manage',
        params: ['id'] as const,
        label: 'Manage Gallery',
        icon: 'edit',
    },

    // Videos
    videos: {
        path: '/portal/videos',
        label: 'Videos',
        icon: 'smart_display',
        description: 'Video library & feedback',
    },
    videoDetail: {
        path: '/portal/videos/:id',
        params: ['id'] as const,
        label: 'Video Details',
        icon: 'smart_display',
    },

    // Role Selection
    roleSelection: {
        path: '/portal/role-selection',
        label: 'Role Selection',
        icon: 'switch_account',
    },

    // Org-Scoped Public Routes
    orgLanding: {
        path: '/o/:orgSlug',
        params: ['orgSlug'] as const,
        label: 'Organization Landing',
        icon: 'apartment',
    },
    orgTickets: {
        path: '/o/:orgSlug/tickets',
        params: ['orgSlug'] as const,
        label: 'Organization Tickets',
        icon: 'confirmation_number',
    },
    orgTicketEvent: {
        path: '/o/:orgSlug/tickets/events/:eventId',
        params: ['orgSlug', 'eventId'] as const,
        label: 'Ticketed Event',
        icon: 'event',
    },
    orgTicketOrder: {
        path: '/o/:orgSlug/tickets/order/:orderId',
        params: ['orgSlug', 'orderId'] as const,
        label: 'Ticket Order',
        icon: 'receipt_long',
    },
    orgTicketAccessLanding: {
        path: '/o/:orgSlug/tickets/access',
        params: ['orgSlug'] as const,
        label: 'Ticket Access',
        icon: 'qr_code_scanner',
    },
    orgTicketAccess: {
        path: '/o/:orgSlug/tickets/access/:token',
        params: ['orgSlug', 'token'] as const,
        label: 'Ticket Access',
        icon: 'qr_code_scanner',
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
            path: '/admin/organization/overview',
            label: 'Overview',
            icon: 'info',
            description: 'Structure overview',
            requiresOrg: true,
        },
        sports: {
            path: '/admin/organization/sports',
            label: 'Sports',
            icon: 'sports',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.sports.list',
        },
        sportDetail: {
            path: '/admin/organization/sports/:id',
            params: ['id'] as const,
            label: 'Sport Details',
            icon: 'sports',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.sports.detail',
        },
        programs: {
            path: '/admin/organization/programs',
            label: 'Programs',
            icon: 'category',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.programs.list',
        },
        programDetail: {
            path: '/admin/organization/programs/:id',
            params: ['id'] as const,
            label: 'Program Details',
            icon: 'category',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.programs.detail',
        },
        levels: {
            path: '/admin/organization/levels',
            label: 'Levels',
            icon: 'grade',
            requiresOrg: true,
        },
        levelDetail: {
            path: '/admin/organization/levels/:id',
            params: ['id'] as const,
            label: 'Level Details',
            icon: 'grade',
            requiresOrg: true,
        },
        teamsManagement: {
            path: '/admin/organization/teams',
            label: 'Teams',
            icon: 'groups',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.teams.list',
        },
        seasons: {
            path: '/admin/organization/seasons',
            label: 'Seasons',
            icon: 'calendar_month',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.seasons.list',
        },
        seasonDetail: {
            path: '/admin/organization/seasons/:id',
            params: ['id'] as const,
            label: 'Season Details',
            icon: 'calendar_month',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.seasons.detail',
        },
        forms: {
            path: '/admin/organization/forms',
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
            routes: {
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
            },
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

    // Teams (standardized - already correct)
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
        update: {
            path: '/admin/teams/:id/update',
            params: ['id'] as const,
            label: 'Update Team',
            icon: 'edit',
            requiresOrg: true,
        },
    },

    // Sports (standardized)
    sports: {
        list: {
            path: '/admin/sports',
            label: 'Sports',
            icon: 'sports',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/sports/:sport_slug',
            params: ['sport_slug'] as const,
            label: 'Sport Details',
            icon: 'sports',
            requiresOrg: true,
        },
        update: {
            path: '/admin/sports/:sport_id/update',
            params: ['sport_id'] as const,
            label: 'Update Sport',
            icon: 'edit',
            requiresOrg: true,
        },
    },

    // Programs (standardized)
    programs: {
        list: {
            path: '/admin/programs',
            label: 'Programs',
            icon: 'category',
            requiresOrg: true,
        },
        bySport: {
            path: '/admin/programs/sport/:sport_slug',
            params: ['sport_slug'] as const,
            label: 'Programs by Sport',
            icon: 'category',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/programs/:id',
            params: ['id'] as const,
            label: 'Program Details',
            icon: 'category',
            requiresOrg: true,
        },
        update: {
            path: '/admin/programs/:id/update',
            params: ['id'] as const,
            label: 'Update Program',
            icon: 'edit',
            requiresOrg: true,
        },
    },

    // Levels (standardized)
    levels: {
        list: {
            path: '/admin/levels',
            label: 'Levels',
            icon: 'grade',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/levels/:id',
            params: ['id'] as const,
            label: 'Level Details',
            icon: 'grade',
            requiresOrg: true,
        },
        update: {
            path: '/admin/levels/:id/update',
            params: ['id'] as const,
            label: 'Update Level',
            icon: 'edit',
            requiresOrg: true,
        },
    },

    // Seasons (standardized)
    seasons: {
        list: {
            path: '/admin/seasons',
            label: 'Seasons',
            icon: 'calendar_month',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/seasons/:id',
            params: ['id'] as const,
            label: 'Season Details',
            icon: 'calendar_month',
            requiresOrg: true,
        },
        update: {
            path: '/admin/seasons/:id/update',
            params: ['id'] as const,
            label: 'Update Season',
            icon: 'edit',
            requiresOrg: true,
        },
    },

    // Families (deprecated - use guardians)
    families: {
        list: {
            path: '/admin/families',
            label: 'Families',
            icon: 'home',
            description: 'Family management',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.guardians.list',
        },
        create: {
            path: '/admin/families/new',
            label: 'Create Family',
            icon: 'add',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.guardians.create',
        },
        detail: {
            path: '/admin/families/:id',
            params: ['id'] as const,
            label: 'Family Details',
            icon: 'home',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.guardians.detail',
        },
        createAthlete: {
            path: '/admin/families/:familyId/athletes/new',
            params: ['familyId'] as const,
            label: 'Add Athlete to Family',
            icon: 'person_add',
            requiresOrg: true,
            deprecated: true,
            deprecatedInFavorOf: 'admin.guardians.createAthlete',
        },
    },

    // Guardians (standardized - renamed from families)
    guardians: {
        list: {
            path: '/admin/guardians',
            label: 'Guardians',
            icon: 'home',
            description: 'Guardian management',
            requiresOrg: true,
        },
        create: {
            path: '/admin/guardians/new',
            label: 'Create Guardian',
            icon: 'add',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/guardians/:id',
            params: ['id'] as const,
            label: 'Guardian Details',
            icon: 'home',
            requiresOrg: true,
        },
        createAthlete: {
            path: '/admin/guardians/:familyId/athletes/new',
            params: ['familyId'] as const,
            label: 'Add Athlete to Guardian',
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
        detail: {
            path: '/admin/athletes/:id',
            params: ['id'] as const,
            label: 'Athlete Details',
            icon: 'child_care',
            requiresOrg: true,
        },
        edit: {
            path: '/admin/athletes/:id/edit',
            params: ['id'] as const,
            label: 'Edit Athlete',
            icon: 'edit',
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
        detail: {
            path: '/admin/events/:id',
            params: ['id'] as const,
            label: 'Event Details',
            icon: 'event',
            requiresOrg: true,
        },
        edit: {
            path: '/admin/events/:id/edit',
            params: ['id'] as const,
            label: 'Edit Event',
            icon: 'edit',
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

    // Announcements
    announcements: {
        list: {
            path: '/admin/announcements',
            label: 'Announcements',
            icon: 'campaign',
            description: 'Team announcements',
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

    // Notifications
    notifications: {
        path: '/admin/notifications',
        label: 'Notifications',
        icon: 'notifications',
        description: 'Admin notifications',
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
        detail: {
            path: '/admin/payments/:id',
            params: ['id'] as const,
            label: 'Payment Details',
            icon: 'credit_card',
            requiresOrg: true,
        },
        create: {
            path: '/admin/payments/new',
            label: 'Create Fee',
            icon: 'add',
            requiresOrg: true,
        },
    },

    // Ticketing
    ticketing: {
        path: '/admin/ticketing',
        label: 'Ticketing',
        icon: 'confirmation_number',
        description: 'Event ticket sales',
        requiresOrg: true,
    },
    ticketingEvents: {
        list: {
            path: '/admin/ticketing/events',
            label: 'Ticketed Events',
            icon: 'event',
            requiresOrg: true,
        },
        create: {
            path: '/admin/ticketing/events/new',
            label: 'Create Ticketed Event',
            icon: 'add',
            requiresOrg: true,
        },
        ticketTypes: {
            create: {
                path: '/admin/ticketing/events/:id/ticket-types/new',
                params: ['id'] as const,
                label: 'Add Ticket Type',
                icon: 'confirmation_number',
                requiresOrg: true,
            },
            edit: {
                path: '/admin/ticketing/events/:id/ticket-types/edit',
                params: ['id'] as const,
                label: 'Edit Ticket Type',
                icon: 'edit',
                requiresOrg: true,
            },
        },
        seatMaps: {
            list: {
                path: '/admin/ticketing/seat-maps',
                label: 'Seat Maps',
                icon: 'event_seat',
                requiresOrg: true,
            },
            edit: {
                path: '/admin/ticketing/seat-maps/:seatMapId/edit',
                params: ['seatMapId'] as const,
                label: 'Seat Map Builder',
                icon: 'event_seat',
                requiresOrg: true,
            },
            builder: {
                path: '/admin/ticketing/events/:eventId/seat-maps/:seatMapId',
                params: ['eventId', 'seatMapId'] as const,
                label: 'Seat Map Builder',
                icon: 'event_seat',
                requiresOrg: true,
            },
        },
    },
    ticketingOrders: {
        path: '/admin/ticketing/orders',
        label: 'Ticket Orders',
        icon: 'receipt_long',
        requiresOrg: true,
    },
    ticketingScanner: {
        path: '/admin/ticketing/scanner',
        label: 'Ticket Scanner',
        icon: 'qr_code_scanner',
        requiresOrg: true,
    },
    ticketingScannerEvent: {
        path: '/admin/ticketing/scanner/:eventId',
        params: ['eventId'] as const,
        label: 'Ticket Scanner (Event)',
        icon: 'qr_code_scanner',
        requiresOrg: true,
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
        create: {
            path: '/admin/tryouts/new',
            label: 'Create Tryout',
            icon: 'emoji_events',
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
        list: {
            path: '/admin/organization/users',
            label: 'Users',
            icon: 'admin_panel_settings',
            description: 'Access and roles',
            requiresOrg: true,
        },
        create: {
            path: '/admin/users/new',
            label: 'Create User',
            icon: 'person_add',
            requiresOrg: true,
        },
        edit: {
            path: '/admin/organization/users/:userId/edit',
            params: ['userId'] as const,
            label: 'Edit User',
            icon: 'edit',
            requiresOrg: true,
        },
    },

    // Guardian Attachment Requests
    guardianRequests: {
        path: '/admin/guardian-requests',
        label: 'Guardian Requests',
        icon: 'person_add',
        description: 'Review guardian attachment requests',
        requiresOrg: true,
    },

    // Settings
    settings: {
        path: '/admin/settings',
        label: 'Settings',
        icon: 'settings',
        description: 'Personal settings',
        requiresOrg: false,
    },

    // Photos
    photos: {
        list: {
            path: '/admin/photos',
            label: 'Photos',
            icon: 'photo_library',
            description: 'Photo galleries',
            requiresOrg: true,
        },
        browse: {
            path: '/admin/photos/browse',
            label: 'Browse',
            icon: 'folder',
            description: 'Browse galleries',
            requiresOrg: true,
        },
        search: {
            path: '/admin/photos/search',
            label: 'Search',
            icon: 'search',
            description: 'Search galleries',
            requiresOrg: true,
        },
        create: {
            path: '/admin/photos/create',
            label: 'Create Gallery',
            icon: 'add_photo_alternate',
            description: 'Create new photo gallery',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/photos/:id',
            params: ['id'] as const,
            label: 'Gallery',
            icon: 'collections',
            requiresOrg: true,
        },
        edit: {
            path: '/admin/photos/:id/edit',
            params: ['id'] as const,
            label: 'Edit Gallery',
            icon: 'edit',
            requiresOrg: true,
        },
        photo: {
            path: '/admin/photos/:galleryId/photo/:photoId',
            params: ['galleryId', 'photoId'] as const,
            label: 'Photo Detail',
            icon: 'image',
            requiresOrg: true,
        },
    },

    // Videos
    videos: {
        list: {
            path: '/admin/videos',
            label: 'Videos',
            icon: 'video_library',
            description: 'Video library',
            requiresOrg: true,
        },
        upload: {
            path: '/admin/videos/upload',
            label: 'Upload Video',
            icon: 'upload',
            description: 'Upload new video',
            requiresOrg: true,
        },
        detail: {
            path: '/admin/videos/:id',
            params: ['id'] as const,
            label: 'Video Detail',
            icon: 'play_circle',
            requiresOrg: true,
        },
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

    // Ticketing (platform oversight)
    ticketing: {
        allEvents: {
            path: '/platform-admin/ticketing/events',
            label: 'All Events',
            icon: 'event',
            description: 'Searchable cross-org ticketed events',
        },
        orderLookup: {
            path: '/platform-admin/ticketing/orders',
            label: 'Order Lookup',
            icon: 'receipt_long',
            description: 'Global order search by email, order ID, or transaction',
        },
        webhookStatus: {
            path: '/platform-admin/ticketing/webhooks',
            label: 'Webhook Status',
            icon: 'webhook',
            description: 'Payment processing and delivery monitoring',
        },
        organization: {
            path: '/platform-admin/ticketing/organizations/:id',
            params: ['id'] as const,
            label: 'Org Ticketing',
            icon: 'confirmation_number',
            description: "This org's ticketing dashboard",
        },
    },

    // Email Preview
    emailPreview: {
        path: '/platform-admin/email-preview',
        label: 'Email Preview',
        icon: 'email',
        description: 'Email template testing',
    },

    // Photos (cross-org overview, content review, storage)
    photos: {
        overview: {
            path: '/platform-admin/photos',
            label: 'Gallery Overview',
            icon: 'photo_library',
            description: 'Storage usage and gallery stats',
        },
        contentReview: {
            path: '/platform-admin/photos/content-review',
            label: 'Content Review',
            icon: 'flag',
            description: 'Flagged content and moderation',
        },
        storage: {
            path: '/platform-admin/photos/storage',
            label: 'Storage Management',
            icon: 'storage',
            description: 'Quotas and retention',
        },
        orgGalleries: {
            path: '/platform-admin/organizations/:id/photos',
            params: ['id'] as const,
            label: 'Organization Galleries',
            icon: 'collections',
        },
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
// FAN ROUTES - Fan Navigation System
// ============================================================================
const fan = {
    // Home Page (Feed)
    home: {
        path: '/fan',
        label: 'Home',
        icon: 'home',
        description: 'Your personalized feed',
    },

    // Schedule
    schedule: {
        path: '/fan/schedule',
        label: 'Schedule',
        icon: 'calendar_month',
        description: 'Upcoming events',
    },

    // Event Detail
    events: {
        detail: {
            path: '/fan/events/:eventId',
            params: ['eventId'] as const,
            label: 'Event Details',
            icon: 'event',
        },
    },

    // Photos & Videos
    photos: {
        list: {
            path: '/fan/photos',
            label: 'Photos & Videos',
            icon: 'photo_library',
            description: 'Browse galleries',
        },
        gallery: {
            path: '/fan/photos/gallery/:id',
            params: ['id'] as const,
            label: 'Gallery',
            icon: 'photo_library',
        },
        athlete: {
            path: '/fan/photos/athlete/:athleteId',
            params: ['athleteId'] as const,
            label: 'Athlete Photos',
            icon: 'person',
        },
    },

    // Videos
    videos: {
        list: {
            path: '/fan/videos',
            label: 'Videos',
            icon: 'videocam',
            description: 'Browse video library',
        },
        detail: {
            path: '/fan/videos/:id',
            params: ['id'] as const,
            label: 'Video Details',
            icon: 'play_circle',
        },
    },

    // My Tickets
    tickets: {
        list: {
            path: '/fan/tickets',
            label: 'My Tickets',
            icon: 'confirmation_number',
            description: 'Your event tickets',
        },
        detail: {
            path: '/fan/tickets/:ticketId',
            params: ['ticketId'] as const,
            label: 'Ticket Details',
            icon: 'confirmation_number',
        },
    },

    // Following
    following: {
        base: {
            path: '/fan/following',
            label: 'Following',
            icon: 'favorite',
            description: 'Teams and athletes',
        },
        discover: {
            path: '/fan/discover',
            label: 'Discover',
            icon: 'explore',
            description: 'Find teams to follow',
        },
    },

    // Entity Profiles
    profiles: {
        org: {
            path: '/fan/org/:orgId',
            params: ['orgId'] as const,
            label: 'Organization Profile',
            icon: 'apartment',
        },
        team: {
            path: '/fan/team/:teamId',
            params: ['teamId'] as const,
            label: 'Team Profile',
            icon: 'groups',
        },
        athlete: {
            path: '/fan/athlete/:athleteId',
            params: ['athleteId'] as const,
            label: 'Athlete Profile',
            icon: 'person',
        },
    },

    // Profile & Settings
    profile: {
        base: {
            path: '/fan/profile',
            label: 'Profile',
            icon: 'account_circle',
            description: 'Your account',
        },
        edit: {
            path: '/fan/profile/edit',
            label: 'Edit Profile',
            icon: 'edit',
        },
        notifications: {
            path: '/fan/profile/notifications',
            label: 'Notifications',
            icon: 'notifications',
        },
        linkedAthletes: {
            path: '/fan/profile/linked-athletes',
            label: 'Linked Athletes',
            icon: 'supervisor_account',
        },
        privacy: {
            path: '/fan/profile/privacy',
            label: 'Privacy Settings',
            icon: 'privacy_tip',
        },
        password: {
            path: '/fan/profile/password',
            label: 'Change Password',
            icon: 'lock',
        },
        security: {
            path: '/fan/profile/security',
            label: 'Security',
            icon: 'security',
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
// SHARE ROUTES - Public shared content
// ============================================================================
const share = {
    video: {
        path: '/share/video/:token',
        params: ['token'] as const,
        label: 'Shared Video',
        icon: 'play_circle',
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
    fan,
    share,
} as const

// Type for the routes object
export type Routes = typeof routes
