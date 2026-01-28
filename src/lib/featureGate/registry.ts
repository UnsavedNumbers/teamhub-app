/**
 * Feature Gate Registry
 * 
 * Central registry mapping route keys and actions to feature keys.
 * This is the single source of truth for which features gate which routes/actions.
 * 
 * Feature keys must match the `feature_key` column in the `feature_entitlements` table.
 */

// ============================================================================
// Route Key → Feature Key Mapping
// ============================================================================

/**
 * Maps route keys (from src/utils/routes/definitions.ts) to feature entitlement keys.
 */
export const ROUTE_TO_FEATURE: Record<string, string> = {
    // -------------------------------------------------------------------------
    // Portal Routes
    // -------------------------------------------------------------------------
    'portal.dashboard': 'dashboard',
    'portal.calendar': 'calendar',
    'portal.travel': 'travel',
    'portal.travel.detail': 'traveldetail',
    'portal.messages': 'huddles',
    'portal.messages.announcement': 'announcementdetail',
    'portal.payments': 'payments',
    'portal.payments.detail': 'paymentdetail',
    'portal.payments.success': 'paymentsuccess',
    'portal.athletes': 'athletes',
    'portal.athletes.requestAttachment': 'requestattachment',
    'portal.athletes.create': 'createathlete',
    'portal.join': 'join',
    'portal.tryouts': 'tryouts',
    'portal.tryouts.detail': 'tryoutdetail',
    'portal.uniforms': 'uniforms',
    'portal.uniforms.detail': 'uniformkitdetail',
    'portal.settings': 'settings',
    'portal.preferences': 'preferences',

    // -------------------------------------------------------------------------
    // Admin Routes - Dashboard
    // -------------------------------------------------------------------------
    'admin.dashboard': 'dashboard',

    // -------------------------------------------------------------------------
    // Admin Routes - Organization
    // -------------------------------------------------------------------------
    'admin.organization.base': 'base',
    'admin.organization.structure': 'organization_settings',
    'admin.organization.billing': 'billing',
    'admin.organization.billing.planSelection': 'planselection',
    'admin.organization.billing.checkoutSuccess': 'checkoutsuccess',
    'admin.organization.billing.checkoutCancel': 'checkoutcancel',
    'admin.organization.users': 'users',

    // -------------------------------------------------------------------------
    // Admin Routes - Athletes & Guardians
    // -------------------------------------------------------------------------
    'admin.athletes.list': 'athletes',
    'admin.athletes.detail': 'athletes',
    'admin.athletes.create': 'createathlete',
    'admin.athletes.edit': 'athletes',
    'admin.athletes.import': 'import',
    'admin.guardians.list': 'guardian',
    'admin.guardianRequests': 'guardianrequests',

    // -------------------------------------------------------------------------
    // Admin Routes - Operations
    // -------------------------------------------------------------------------
    'admin.payments.list': 'payments',
    'admin.payments.detail': 'paymentdetail',
    'admin.payments.fees': 'fees',
    'admin.payments.fees.create': 'fees',
    'admin.events.list': 'events',
    'admin.events.detail': 'eventdetail',
    'admin.events.create': 'events',
    'admin.attendance': 'attendance',
    'admin.uniforms.list': 'uniforms',
    'admin.uniforms.detail': 'uniformkitdetail',
    'admin.uniforms.create': 'uniforms',
    'admin.announcements.list': 'announcements',
    'admin.announcements.detail': 'announcementdetail',
    'admin.announcements.create': 'announcements',

    // -------------------------------------------------------------------------
    // Admin Routes - Programs
    // -------------------------------------------------------------------------
    'admin.travel.list': 'travel',
    'admin.travel.detail': 'traveldetail',
    'admin.travel.create': 'travel',
    'admin.travel.edit': 'edit',
    'admin.tryouts.list': 'tryouts',
    'admin.tryouts.detail': 'tryoutdetail',
    'admin.tryouts.create': 'tryouts',

    // -------------------------------------------------------------------------
    // Admin Routes - Sports/Programs/Levels/Teams/Seasons
    // -------------------------------------------------------------------------
    'admin.sports.list': 'sports',
    'admin.sports.detail': 'sportdetail',
    'admin.programs.list': 'programs',
    'admin.programs.detail': 'programdetail',
    'admin.programs.bySport': 'bysport',
    'admin.levels.list': 'levels',
    'admin.levels.detail': 'leveldetail',
    'admin.teams.list': 'teams',
    'admin.teams.detail': 'teamsmanagement',
    'admin.teams.roster': 'roster',
    'admin.seasons.list': 'seasons',
    'admin.seasons.detail': 'seasondetail',
    'admin.seasons.update': 'update',

    // -------------------------------------------------------------------------
    // Admin Routes - Settings & Onboarding
    // -------------------------------------------------------------------------
    'admin.settings': 'settings',
    'admin.onboarding': 'onboarding',
    'admin.trialExpired': 'trialexpired',

    // -------------------------------------------------------------------------
    // Platform Admin Routes (all platform_admin_only)
    // -------------------------------------------------------------------------
    'platformAdmin.dashboard': 'dashboard',
    'platformAdmin.organizations.list': 'organizations',
    'platformAdmin.organizations.detail': 'organizations',
    'platformAdmin.users.list': 'list',
    'platformAdmin.users.detail': 'detail',
    'platformAdmin.users.create': 'create',
    'platformAdmin.admins': 'admins',
    'platformAdmin.payments': 'payments',
    'platformAdmin.fees': 'fees',
    'platformAdmin.audit': 'audit',
    'platformAdmin.featureFlags': 'featureflags',
    'platformAdmin.structure': 'structure',
    'platformAdmin.licenses.overview': 'overview',
    'platformAdmin.licenses.tiers': 'tiers',
    'platformAdmin.licenses.tiers.detail': 'tierdetail',
    'platformAdmin.licenses.features': 'features',
    'platformAdmin.licenses.features.detail': 'featuredetail',
    'platformAdmin.licenses.overrides': 'overrides',
    'platformAdmin.licenses.overrides.create': 'overridecreate',
    'platformAdmin.licenses.overrides.detail': 'overridedetail',
    'platformAdmin.licenses.audit': 'audit',
    'platformAdmin.emailPreview': 'emailpreview',
};

// ============================================================================
// Action Key → Feature Key Mapping
// ============================================================================

/**
 * Maps action keys (for buttons, forms) to feature entitlement keys.
 */
export const ACTION_TO_FEATURE: Record<string, string> = {
    // Fee actions
    'create_fee': 'fees',
    'edit_fee': 'fees',
    'delete_fee': 'fees',
    'assign_fee': 'fee_assignments',

    // Athlete actions
    'create_athlete': 'createathlete',
    'edit_athlete': 'athletes',
    'import_athletes': 'import',
    'delete_athlete': 'athletes',

    // Event actions
    'create_event': 'events',
    'edit_event': 'events',
    'delete_event': 'events',
    'take_attendance': 'attendance',

    // Travel actions
    'create_travel_plan': 'travel',
    'edit_travel_plan': 'edit',
    'delete_travel_plan': 'travel',

    // Tryout actions
    'create_tryout': 'tryouts',
    'edit_tryout': 'tryouts',
    'delete_tryout': 'tryouts',

    // Announcement/Message actions
    'create_announcement': 'announcements',
    'send_message': 'huddles',
    'delete_announcement': 'announcements',

    // Uniform actions
    'create_uniform_kit': 'uniforms',
    'order_uniform': 'uniform_orders',
    'edit_uniform_kit': 'uniforms',

    // Team actions
    'create_team': 'teams',
    'edit_team': 'teams',
    'delete_team': 'teams',
    'manage_roster': 'roster',

    // Season actions
    'create_season': 'seasons',
    'edit_season': 'seasons',
    'delete_season': 'seasons',

    // Sport/Program/Level actions
    'create_sport': 'sports',
    'create_program': 'programs',
    'create_level': 'levels',

    // Payment actions
    'record_offline_payment': 'offline_payments',
    'issue_refund': 'refunds',

    // Guardian actions
    'invite_guardian': 'parent_invites',
    'approve_guardian_request': 'guardianrequests',
};

// ============================================================================
// Ungated Routes
// ============================================================================

/**
 * Routes that bypass feature gate checks entirely.
 * These are essential routes that must always be accessible.
 */
export const UNGATED_ROUTES: string[] = [
    // Auth routes
    'auth.login',
    'auth.signup',
    'auth.forgotPassword',
    'auth.resetPassword',
    'auth.unauthorized',
    'auth.verifyEmail',

    // Trial/billing routes (must be accessible to upgrade)
    'admin.trialExpired',
    'admin.organization.billing',
    'admin.organization.billing.checkoutSuccess',
    'admin.organization.billing.checkoutCancel',
    'admin.organization.billing.planSelection',

    // Onboarding
    'admin.onboarding',

    // Settings (basic user functionality)
    'portal.settings',
    'admin.settings',

    // Public/join routes
    'public.join',
    'portal.join',
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get feature key for a route
 * @param routeKey - The route key from definitions
 * @returns Feature key or null if ungated/not found
 */
export function getFeatureKeyForRoute(routeKey: string): string | null {
    if (UNGATED_ROUTES.includes(routeKey)) {
        return null; // Ungated
    }
    return ROUTE_TO_FEATURE[routeKey] ?? null;
}

/**
 * Get feature key for an action
 * @param actionKey - The action key
 * @returns Feature key or null if not found
 */
export function getFeatureKeyForAction(actionKey: string): string | null {
    return ACTION_TO_FEATURE[actionKey] ?? null;
}

/**
 * Check if a route is ungated (always accessible)
 * @param routeKey - The route key to check
 * @returns True if route bypasses feature gates
 */
export function isRouteUngated(routeKey: string): boolean {
    return UNGATED_ROUTES.includes(routeKey);
}

/**
 * Get all feature keys referenced in navigation
 * Useful for batch fetching gates
 */
export function getAllRouteFeatureKeys(): string[] {
    return [...new Set(Object.values(ROUTE_TO_FEATURE))];
}

/**
 * Get all feature keys referenced in actions
 */
export function getAllActionFeatureKeys(): string[] {
    return [...new Set(Object.values(ACTION_TO_FEATURE))];
}
