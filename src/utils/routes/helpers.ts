/**
 * Route Helpers
 * 
 * URL generation utilities and route lookup functions.
 * Provides type-safe functions for generating URLs from route keys.
 */

import type { RouteDefinition, RouteParams } from './types'
import { routes } from './definitions'
import { validateRouteKey, validateParams } from './validation'

// ============================================================================
// ROUTE REGISTRY - Built once on module load for fast lookups
// ============================================================================

type RouteRegistry = Map<string, RouteDefinition>

/**
 * Build a flat registry from nested route definitions
 */
function buildRegistry(
    obj: Record<string, unknown>,
    prefix: string = '',
    registry: RouteRegistry = new Map()
): RouteRegistry {
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key

        if (value && typeof value === 'object' && 'path' in value) {
            // This is a route definition
            registry.set(fullKey, value as RouteDefinition)
        } else if (value && typeof value === 'object') {
            // This is a nested group
            buildRegistry(value as Record<string, unknown>, fullKey, registry)
        }
    }

    return registry
}

// Build registry on module load
const routeRegistry = buildRegistry(routes)
const validRouteKeys = new Set(routeRegistry.keys())

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a URL from a route key and optional parameters.
 * Type-safe and validated in development mode.
 * 
 * @example
 * getLink('portal.dashboard') // Returns: '/portal/dashboard'
 * getLink('admin.teams.detail', { id: '123' }) // Returns: '/admin/teams/123'
 * getLink('portal.eventDetail', { eventId: 'abc' }) // Returns: '/portal/calendar/events/abc'
 * 
 * @param routeKey - The route key (e.g., 'portal.dashboard', 'admin.teams.detail')
 * @param params - Optional parameters for parameterized routes
 * @returns The generated URL
 * @throws Error if route key is invalid or required params are missing
 */
export function getLink(routeKey: string, params?: RouteParams): string {
    // Development mode validation
    if (process.env.NODE_ENV === 'development') {
        validateRouteKey(routeKey, validRouteKeys)
    }

    const route = routeRegistry.get(routeKey)
    if (!route) {
        throw new Error(`Route not found: ${routeKey}`)
    }

    // Warn on deprecated routes
    if (route.deprecated && process.env.NODE_ENV === 'development') {
        console.warn(
            `[Routes] Route "${routeKey}" is deprecated. Use "${route.deprecatedInFavorOf}" instead.`
        )
    }

    // Validate required parameters
    if (route.params && route.params.length > 0) {
        validateParams(route, params)
    }

    // Generate URL by replacing params
    let url = route.path
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`:${key}`, String(value))
        }
    }

    // Verify all params were replaced
    if (url.includes(':')) {
        const missing = url.match(/:(\w+)/g)
        throw new Error(
            `Missing required parameters for route "${routeKey}": ${missing?.join(', ')}`
        )
    }

    return url
}

/**
 * Get a route definition by key
 * 
 * @param routeKey - The route key
 * @returns The route definition or undefined if not found
 */
export function getRoute(routeKey: string): RouteDefinition | undefined {
    return routeRegistry.get(routeKey)
}

/**
 * Get a route definition by key, throwing if not found
 * 
 * @param routeKey - The route key
 * @returns The route definition
 * @throws Error if route is not found
 */
export function getRouteOrThrow(routeKey: string): RouteDefinition {
    const route = routeRegistry.get(routeKey)
    if (!route) {
        throw new Error(`Route not found: ${routeKey}`)
    }
    return route
}

/**
 * Check if a route requires organization context
 * 
 * @param routeKey - The route key
 * @returns True if the route requires an organization
 */
export function requiresOrganization(routeKey: string): boolean {
    const route = getRoute(routeKey)
    return route?.requiresOrg ?? false
}

/**
 * Get the path template for a route (without parameter substitution)
 * 
 * @param routeKey - The route key
 * @returns The path template
 */
export function getPath(routeKey: string): string {
    const route = getRouteOrThrow(routeKey)
    return route.path
}

/**
 * Get route metadata (label, icon, description, etc.)
 * 
 * @param routeKey - The route key
 * @returns The route definition with all metadata
 */
export function getRouteMeta(routeKey: string): RouteDefinition | undefined {
    return getRoute(routeKey)
}

/**
 * Check if a route key is valid
 * 
 * @param routeKey - The route key to check
 * @returns True if the route key exists
 */
export function isValidRouteKey(routeKey: string): boolean {
    return validRouteKeys.has(routeKey)
}

/**
 * Get all valid route keys
 * 
 * @returns Array of all valid route keys
 */
export function getAllRouteKeys(): string[] {
    return Array.from(validRouteKeys)
}

/**
 * Find route key by path
 * 
 * @param path - The URL path to find
 * @returns The route key or undefined if not found
 */
export function findRouteKeyByPath(path: string): string | undefined {
    const entries = Array.from(routeRegistry.entries())
    for (const [key, route] of entries) {
        // Exact match
        if (route.path === path) {
            return key
        }

        // Pattern match for parameterized routes
        if (route.params && route.params.length > 0) {
            const patternParts = route.path.split('/')
            const pathParts = path.split('/')

            if (patternParts.length === pathParts.length) {
                let matches = true
                for (let i = 0; i < patternParts.length; i++) {
                    if (!patternParts[i].startsWith(':') && patternParts[i] !== pathParts[i]) {
                        matches = false
                        break
                    }
                }
                if (matches) {
                    return key
                }
            }
        }
    }

    return undefined
}

/**
 * Get routes filtered by a predicate
 * 
 * @param predicate - Function to filter routes
 * @returns Array of [routeKey, routeDefinition] tuples
 */
export function getRoutesWhere(
    predicate: (route: RouteDefinition, key: string) => boolean
): [string, RouteDefinition][] {
    const results: [string, RouteDefinition][] = []
    const entries = Array.from(routeRegistry.entries())

    for (const [key, route] of entries) {
        if (predicate(route, key)) {
            results.push([key, route])
        }
    }

    return results
}

/**
 * Get all routes that require organization context
 */
export function getOrgRequiredRoutes(): [string, RouteDefinition][] {
    return getRoutesWhere(route => route.requiresOrg === true)
}

/**
 * Get all portal routes
 */
export function getPortalRoutes(): [string, RouteDefinition][] {
    return getRoutesWhere((_, key) => key.startsWith('portal.'))
}

/**
 * Get all admin routes
 */
export function getAdminRoutes(): [string, RouteDefinition][] {
    return getRoutesWhere((_, key) => key.startsWith('admin.'))
}

/**
 * Get all platform admin routes
 */
export function getPlatformAdminRoutes(): [string, RouteDefinition][] {
    return getRoutesWhere((_, key) => key.startsWith('platformAdmin.'))
}
