
/**
 * Utility to conditionally join classNames.
 * Filters out false, null, undefined, and empty string values.
 */
export function cn(...classes: (string | number | boolean | null | undefined)[]): string {
    return classes.filter((c): c is string | number => Boolean(c) && (typeof c === 'string' || typeof c === 'number')).join(' ')
}
