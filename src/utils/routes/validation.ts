/**
 * Route Validation Utilities
 * 
 * Runtime validation for route keys and parameters.
 * Used in development mode to catch errors early with descriptive messages.
 */

import type { RouteDefinition, RouteParams } from './types'

/** Valid path pattern: starts with /, contains lowercase letters, numbers, slashes, hyphens, and colons */
const PATH_PATTERN = /^\/[a-z0-9/\-:]*$/i

/** Pattern to match route parameters like :id or :eventId */
const PARAM_PATTERN = /:[\w]+/g

/**
 * Validate path template format
 * @param path - The path template to validate
 * @throws Error if path is invalid
 */
export function validatePathTemplate(path: string): void {
    if (!PATH_PATTERN.test(path)) {
        throw new Error(
            `Invalid path template: "${path}". Paths must start with / and contain only letters, numbers, slashes, hyphens, and colons.`
        )
    }

    // Extract params from path
    const paramsInPath = path.match(PARAM_PATTERN)?.map(p => p.slice(1)) || []

    // Check for duplicate params
    const seen = new Set<string>()
    for (const param of paramsInPath) {
        if (seen.has(param)) {
            throw new Error(
                `Duplicate parameter in path "${path}": ${param}`
            )
        }
        seen.add(param)
    }
}

/**
 * Validate route key exists in registry
 * @param routeKey - The route key to validate
 * @param validKeys - Set of valid route keys
 * @throws Error if route key is invalid
 */
export function validateRouteKey(
    routeKey: string,
    validKeys: Set<string>
): void {
    if (!validKeys.has(routeKey)) {
        const suggestions = findSimilarKeys(routeKey, Array.from(validKeys))
        throw new Error(
            `Invalid route key: "${routeKey}". ${suggestions.length > 0 ? `Did you mean: ${suggestions.join(', ')}?` : 'Check route definitions.'}`
        )
    }
}

/**
 * Validate required parameters are provided
 * @param route - The route definition
 * @param params - The provided parameters
 * @throws Error if required params are missing
 */
export function validateParams(
    route: RouteDefinition,
    params?: RouteParams
): void {
    if (!route.params || route.params.length === 0) {
        return
    }

    const provided = params ? Object.keys(params) : []
    const missing = route.params.filter(p => !provided.includes(p))

    if (missing.length > 0) {
        throw new Error(
            `Missing required parameters for route "${route.path}": ${missing.join(', ')}`
        )
    }

    // Warn about extra params in development
    if (process.env.NODE_ENV === 'development') {
        const extra = provided.filter(p => !route.params!.includes(p))
        if (extra.length > 0) {
            console.warn(
                `[Routes] Extra parameters provided (will be ignored): ${extra.join(', ')}`
            )
        }
    }
}

/**
 * Validate all route definitions on module load
 * @param routes - The routes object to validate
 */
export function validateRouteDefinitions(
    routes: Record<string, unknown>
): void {
    const keys = new Set<string>()
    const paths = new Set<string>()

    function validateRecursive(obj: Record<string, unknown>, prefix: string = ''): void {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key

            if (value && typeof value === 'object' && 'path' in value) {
                // This is a route definition
                const route = value as RouteDefinition

                // Check for duplicate keys
                if (keys.has(fullKey)) {
                    throw new Error(`Duplicate route key: ${fullKey}`)
                }
                keys.add(fullKey)

                // Check for duplicate paths (excluding parameterized routes)
                const staticPath = route.path.replace(PARAM_PATTERN, ':param')
                if (paths.has(staticPath)) {
                    // This is a warning, not an error - parameterized routes might legitimately share patterns
                    if (process.env.NODE_ENV === 'development') {
                        console.warn(`[Routes] Path pattern "${route.path}" is similar to an existing route`)
                    }
                }
                paths.add(staticPath)

                // Validate path format
                validatePathTemplate(route.path)

                // Validate params match path
                const paramsInPath = route.path.match(PARAM_PATTERN)?.map(p => p.slice(1)) || []
                const declaredParams = route.params || []

                for (const param of paramsInPath) {
                    if (!declaredParams.includes(param)) {
                        throw new Error(
                            `Route "${fullKey}" has parameter :${param} in path but not declared in params array`
                        )
                    }
                }

                for (const param of declaredParams) {
                    if (!paramsInPath.includes(param)) {
                        throw new Error(
                            `Route "${fullKey}" declares param "${param}" but it's not in the path template`
                        )
                    }
                }
            } else if (value && typeof value === 'object') {
                // This is a nested route group
                validateRecursive(value as Record<string, unknown>, fullKey)
            }
        }
    }

    validateRecursive(routes)
}

/**
 * Find similar route keys for error messages (Levenshtein distance)
 * @param key - The invalid key
 * @param validKeys - List of valid keys
 * @returns Top 3 most similar keys
 */
function findSimilarKeys(key: string, validKeys: string[]): string[] {
    return validKeys
        .map(k => ({ key: k, distance: levenshteinDistance(key.toLowerCase(), k.toLowerCase()) }))
        .filter(x => x.distance <= Math.max(key.length / 2, 3)) // Only suggest if somewhat similar
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
        .map(x => x.key)
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                )
            }
        }
    }

    return matrix[b.length][a.length]
}

/**
 * Check if a URL matches a route pattern
 * @param url - The URL to check
 * @param pattern - The route pattern (e.g., /admin/teams/:id)
 * @returns True if the URL matches the pattern
 */
export function matchesPattern(url: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
        .replace(/:[^/]+/g, '[^/]+') // Replace :param with [^/]+
        .replace(/\//g, '\\/') // Escape slashes

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(url)
}

/**
 * Extract parameters from a URL given a route pattern
 * @param url - The URL to extract from
 * @param pattern - The route pattern
 * @returns Object with extracted parameter values
 */
export function extractParams(url: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {}

    const patternParts = pattern.split('/')
    const urlParts = url.split('/')

    if (patternParts.length !== urlParts.length) {
        return params
    }

    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
            const paramName = patternParts[i].slice(1)
            params[paramName] = urlParts[i]
        }
    }

    return params
}
