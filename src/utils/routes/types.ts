/**
 * Route System Types
 * 
 * Provides TypeScript types for type-safe route access and URL generation.
 */

/**
 * Route definition interface - describes a single route
 */
export interface RouteDefinition {
    /** Path template with optional :param syntax */
    path: string
    /** List of required parameter names */
    params?: readonly string[]
    /** Human-readable label for UI */
    label?: string
    /** Material icon name */
    icon?: string
    /** Roles that can access this route */
    roles?: readonly string[]
    /** Whether route requires organization context */
    requiresOrg?: boolean
    /** Description for megamenu/navigation */
    description?: string
    /** Whether route is deprecated */
    deprecated?: boolean
    /** Route key to use instead if deprecated */
    deprecatedInFavorOf?: string
}

/**
 * Route parameters type - key-value pairs for URL generation
 */
export type RouteParams = Record<string, string | number>

/**
 * Route group type for organizing routes
 */
export type RouteGroup = {
    [key: string]: RouteDefinition | RouteGroup
}

/**
 * Recursive type to extract all route keys from a nested route object
 * Produces a union type of all valid route keys like 'portal.dashboard' | 'admin.organization.billing'
 */
export type ExtractRouteKeys<T, Prefix extends string = ''> = {
    [K in keyof T]: T[K] extends RouteDefinition
    ? Prefix extends ''
    ? K & string
    : `${Prefix}.${K & string}`
    : T[K] extends object
    ? ExtractRouteKeys<T[K], Prefix extends '' ? K & string : `${Prefix}.${K & string}`>
    : never
}[keyof T]

/**
 * Navigation item for menu configurations
 */
export interface NavigationItem {
    /** Route key reference */
    routeKey: string
    /** Display label */
    label?: string
    /** Alternate text for some navigation contexts */
    text?: string
    /** Material icon name */
    icon: string
    /** Direct path - alternative to routeKey for explicit URLs */
    path?: string
    /** Description for megamenu */
    description?: string
    /** Whether item is disabled */
    disabled?: boolean
    /** Required permission action (for platform admin) */
    requiredAction?: string
    /** 
     * Explicit feature gate key - if not provided, derived from routeKey 
     * via the ROUTE_TO_FEATURE registry 
     */
    featureKey?: string
}

/**
 * Navigation group for organizing navigation items
 */
export interface NavigationGroup {
    label: string
    items: NavigationItem[]
}

/**
 * Navigation section for mega menu
 */
export interface NavigationSection {
    label: string
    route?: string
    groups: NavigationGroup[]
}

/**
 * Menu item for sidebar navigation
 */
export interface MenuItemDefinition {
    label: string
    icon: string
    routeKey: string
    requiresOrg: boolean
    children: MenuItemChild[] | null
}

/**
 * Child menu item
 */
export interface MenuItemChild {
    text: string
    icon: string
    routeKey: string
    requiresOrg: boolean
}
