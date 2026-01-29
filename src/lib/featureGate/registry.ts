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
    'portal.calendar': 'event_scheduling',
    'portal.travel': 'travel_planning',
    'portal.travel.detail': 'travel_details',
    'portal.messages': 'messaging',
    'portal.messages.announcement': 'announcements',
    'portal.payments': 'payment_processing',
    'portal.payments.detail': 'payment_processing',
    'portal.payments.success': 'payment_processing',
    'portal.athletes': 'roster_management',
    'portal.athletes.requestAttachment': 'roster_management',
    'portal.athletes.create': 'roster_management',
    'portal.join': 'registration_forms',
    'portal.tryouts': 'tryouts',
    'portal.tryouts.detail': 'tryouts',
    'portal.uniforms': 'uniform_orders',
    'portal.uniforms.detail': 'uniform_orders',
    'portal.settings': 'settings',
    'portal.preferences': 'settings',

    // -------------------------------------------------------------------------
    // Admin Routes - Dashboard
    // -------------------------------------------------------------------------
    'admin.dashboard': 'dashboard',

    // -------------------------------------------------------------------------
    // Admin Routes - Organization
    // -------------------------------------------------------------------------
    'admin.organization.base': 'organization_settings',
    'admin.organization.structure': 'organization_settings',
    'admin.organization.billing': 'stripe_integration',
    'admin.organization.billing.planSelection': 'stripe_integration',
    'admin.organization.billing.checkoutSuccess': 'stripe_integration',
    'admin.organization.billing.checkoutCancel': 'stripe_integration',
    'admin.organization.users': 'multi_role_support',

    // -------------------------------------------------------------------------
    // Admin Routes - Athletes & Guardians
    // -------------------------------------------------------------------------
    'admin.athletes.list': 'roster_management',
    'admin.athletes.detail': 'roster_management',
    'admin.athletes.create': 'roster_management',
    'admin.athletes.edit': 'roster_management',
    'admin.athletes.import': 'roster_management',
    'admin.guardians.list': 'roster_management',
    'admin.guardianRequests': 'roster_management',

    // -------------------------------------------------------------------------
    // Admin Routes - Operations
    // -------------------------------------------------------------------------
    'admin.payments.list': 'payment_processing',
    'admin.payments.detail': 'payment_processing',
    'admin.payments.fees': 'fee_management',
    'admin.payments.fees.create': 'fee_management',
    'admin.events.list': 'event_scheduling',
    'admin.events.detail': 'event_scheduling',
    'admin.events.create': 'event_scheduling',
    'admin.attendance': 'event_scheduling',
    'admin.uniforms.list': 'uniform_orders',
    'admin.uniforms.detail': 'uniform_orders',
    'admin.uniforms.create': 'uniform_orders',
    'admin.announcements.list': 'announcements',
    'admin.announcements.detail': 'announcements',
    'admin.announcements.create': 'announcements',

    // -------------------------------------------------------------------------
    // Admin Routes - Programs
    // -------------------------------------------------------------------------
    'admin.travel.list': 'travel_planning',
    'admin.travel.detail': 'travel_details',
    'admin.travel.create': 'travel_planning',
    'admin.travel.edit': 'travel_planning',
    'admin.tryouts.list': 'tryouts',
    'admin.tryouts.detail': 'tryouts',
    'admin.tryouts.create': 'tryouts',

    // -------------------------------------------------------------------------
    // Admin Routes - Sports/Programs/Levels/Teams/Seasons
    // -------------------------------------------------------------------------
    'admin.sports.list': 'team_management',
    'admin.sports.detail': 'team_management',
    'admin.programs.list': 'team_management',
    'admin.programs.detail': 'team_management',
    'admin.programs.bySport': 'team_management',
    'admin.levels.list': 'team_management',
    'admin.levels.detail': 'team_management',
    'admin.teams.list': 'team_management',
    'admin.teams.detail': 'team_management',
    'admin.teams.roster': 'roster_management',
    'admin.seasons.list': 'team_management',
    'admin.seasons.detail': 'team_management',
    'admin.seasons.update': 'team_management',

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
    'create_fee': 'fee_management',
    'edit_fee': 'fee_management',
    'delete_fee': 'fee_management',
    'assign_fee': 'fee_management',

    // Athlete actions
    'create_athlete': 'roster_management',
    'edit_athlete': 'roster_management',
    'import_athletes': 'roster_management',
    'delete_athlete': 'roster_management',

    // Event actions
    'create_event': 'event_scheduling',
    'edit_event': 'event_scheduling',
    'delete_event': 'event_scheduling',
    'take_attendance': 'event_scheduling',

    // Travel actions
    'create_travel_plan': 'travel_planning',
    'edit_travel_plan': 'travel_planning',
    'delete_travel_plan': 'travel_planning',

    // Tryout actions
    'create_tryout': 'tryouts',
    'edit_tryout': 'tryouts',
    'delete_tryout': 'tryouts',

    // Announcement/Message actions
    'create_announcement': 'announcements',
    'send_message': 'messaging',
    'delete_announcement': 'announcements',

    // Uniform actions
    'create_uniform_kit': 'uniform_orders',
    'order_uniform': 'uniform_orders',
    'edit_uniform_kit': 'uniform_orders',

    // Team actions
    'create_team': 'team_management',
    'edit_team': 'team_management',
    'delete_team': 'team_management',
    'manage_roster': 'roster_management',

    // Season actions
    'create_season': 'team_management',
    'edit_season': 'team_management',
    'delete_season': 'team_management',

    // Sport/Program/Level actions
    'create_sport': 'team_management',
    'create_program': 'team_management',
    'create_level': 'team_management',

    // Payment actions
    'record_offline_payment': 'payment_processing',
    'issue_refund': 'payment_processing',

    // Guardian actions
    'invite_guardian': 'roster_management',
    'approve_guardian_request': 'roster_management',
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

    // Dashboard (essential for all users)
    'portal.dashboard',
    'admin.dashboard',

    // Organization base/structure (essential admin routes)
    'admin.organization.base',
    'admin.organization.structure',
    'admin.organization.users',

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
    'portal.preferences',
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
