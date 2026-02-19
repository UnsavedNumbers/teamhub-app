/**
 * Route Hooks
 * 
 * React hooks for convenient route usage in components.
 * Provides memoized URL generation and route matching.
 */

import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { getLink, getRoute, isValidRouteKey, findRouteKeyByPath } from './helpers'
import type { RouteDefinition, RouteParams } from './types'

/**
 * Memoized route link generation hook.
 * Prevents unnecessary recalculations on re-renders.
 * 
 * @example
 * const dashboardUrl = useRouteLink('portal.dashboard')
 * const eventUrl = useRouteLink('portal.eventDetail', { eventId: '123' })
 * 
 * @param routeKey - The route key
 * @param params - Optional parameters for parameterized routes
 * @returns The generated URL
 */
export function useRouteLink(routeKey: string, params?: RouteParams): string {
    return useMemo(
        () => getLink(routeKey, params),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [routeKey, JSON.stringify(params)]
    )
}

/**
 * Get route metadata as a memoized value
 * 
 * @param routeKey - The route key
 * @returns The route definition or undefined
 */
export function useRouteMeta(routeKey: string): RouteDefinition | undefined {
    return useMemo(() => getRoute(routeKey), [routeKey])
}

/**
 * Check if the current route matches a route key
 * 
 * @param routeKey - The route key to check against
 * @returns True if current URL matches the route
 */
export function useRouteMatch(routeKey: string): boolean {
    const location = useLocation()

    return useMemo(() => {
        const route = getRoute(routeKey)
        if (!route) return false

        // Exact match
        if (location.pathname === route.path) return true

        // Pattern match for parameterized routes
        if (route.params && route.params.length > 0) {
            const patternParts = route.path.split('/')
            const pathParts = location.pathname.split('/')

            if (patternParts.length !== pathParts.length) return false

            for (let i = 0; i < patternParts.length; i++) {
                if (!patternParts[i].startsWith(':') && patternParts[i] !== pathParts[i]) {
                    return false
                }
            }
            return true
        }

        return false
    }, [location.pathname, routeKey])
}

/**
 * Check if current route starts with a given route key's path
 * Useful for determining if a nav item should be "active"
 * 
 * @param routeKey - The route key to check against
 * @returns True if current URL starts with the route's path
 */
export function useRouteActive(routeKey: string): boolean {
    const location = useLocation()

    return useMemo(() => {
        const route = getRoute(routeKey)
        if (!route) return false

        // Special case: exact match for root paths like /admin
        if (route.path === '/admin' || route.path === '/platform-admin') {
            return location.pathname === route.path
        }

        // For list routes, also match detail routes (e.g., /admin/sports matches /admin/sports/:id)
        const isListRoute = route.path.endsWith('/sports') || 
                           route.path.endsWith('/programs') || 
                           route.path.endsWith('/levels') || 
                           route.path.endsWith('/teams') || 
                           route.path.endsWith('/seasons') || 
                           route.path.endsWith('/athletes') || 
                           route.path.endsWith('/guardians')
        
        if (isListRoute) {
            // Match list route exactly or detail routes that start with list route
            return location.pathname === route.path || 
                   location.pathname.startsWith(route.path + '/')
        }

        return location.pathname.startsWith(route.path)
    }, [location.pathname, routeKey])
}

/**
 * Get the current route key based on location
 * 
 * @returns The current route key or undefined if not found
 */
export function useCurrentRouteKey(): string | undefined {
    const location = useLocation()

    return useMemo(() => findRouteKeyByPath(location.pathname), [location.pathname])
}

/**
 * Hook to validate and get route info
 * Returns validation status and route data
 * 
 * @param routeKey - The route key to validate
 * @returns Object with isValid boolean and route data
 */
export function useRouteValidation(routeKey: string): {
    isValid: boolean
    route: RouteDefinition | undefined
    path: string | undefined
} {
    return useMemo(() => {
        const isValid = isValidRouteKey(routeKey)
        const route = isValid ? getRoute(routeKey) : undefined
        return {
            isValid,
            route,
            path: route?.path,
        }
    }, [routeKey])
}

/**
 * Hook to get multiple route links at once
 * Useful when a component needs several routes
 * 
 * @param routes - Object mapping names to route keys
 * @returns Object with same keys but URL values
 */
export function useRouteLinks<T extends Record<string, string>>(
    routes: T
): { [K in keyof T]: string } {
    return useMemo(() => {
        const result = {} as { [K in keyof T]: string }
        for (const [key, routeKey] of Object.entries(routes)) {
            result[key as keyof T] = getLink(routeKey)
        }
        return result
    }, [routes])
}
