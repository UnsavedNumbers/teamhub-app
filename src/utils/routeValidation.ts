/**
 * Route Parameter Validation Utilities
 * 
 * Validates route parameters (UUIDs, IDs) before use
 */

/**
 * Validates if a string is a valid UUID format
 */
export function isValidUUID(str: string | undefined | null): boolean {
  if (!str) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Validates route ID parameter
 * Returns true if valid UUID or 'new', false otherwise
 */
export function isValidRouteId(id: string | undefined): id is string {
  if (!id) return false
  return id === 'new' || isValidUUID(id)
}

/**
 * Gets error message for invalid route parameter
 */
export function getInvalidRouteIdError(id: string | undefined, entityName: string = 'item'): string {
  if (!id) {
    return `${entityName} ID is required`
  }
  if (id === 'new') {
    return 'Invalid route: "new" is not allowed here'
  }
  return `Invalid ${entityName} ID format. Expected a valid UUID.`
}
