/**
 * Feature Key Normalization Logic
 */

export function normalizeFeatureKey(key: string): string {
    if (!key || typeof key !== 'string') return 'unknown_feature';

    const normalized = key
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_')   // Replace non-alphanumeric with underscore
        .replace(/_+/g, '_')           // Collapse multiple underscores
        .replace(/^_|_$/g, '')         // Trim leading/trailing underscores
        .replace(/_feature$/, '')      // Remove common suffixes
        .replace(/_module$/, '');

    // Fallback for empty strings after normalization
    if (!normalized || normalized.length === 0) {
        // Determine a simple hash or fallback
        // In a real env we might process the original string differently
        return `feature_${Math.random().toString(36).substring(7)}`;
    }

    return normalized;
}

export function formatDisplayName(key: string): string {
    // Convert snake_case to Title Case
    return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
