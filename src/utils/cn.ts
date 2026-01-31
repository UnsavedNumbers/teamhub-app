
type ClassValue = string | number | boolean | null | undefined | Record<string, boolean>

/**
 * Utility to conditionally join classNames.
 * Filters out false, null, undefined, and empty string values.
 */
export function cn(...classes: ClassValue[]): string {
    return classes
        .flatMap((c) => {
            if (!c) return []
            if (typeof c === 'string' || typeof c === 'number') return [c]
            if (typeof c === 'object') {
                return Object.entries(c)
                    .filter(([, value]) => Boolean(value))
                    .map(([key]) => key)
            }
            return []
        })
        .join(' ')
}
