import type { DiscoveredFeature } from './types';

export function calculateConfidence(feature: DiscoveredFeature): number {
    let score = feature.confidenceScore || 0;

    // Boost for multiple sources
    if (feature.discoveredFrom.length > 1) {
        score += (feature.discoveredFrom.length - 1) * 15;
    }

    // Boost for specific sources
    if (feature.discoveredFrom.includes('routes')) score += 10;
    if (feature.discoveredFrom.includes('schema')) score += 10;
    if (feature.discoveredFrom.includes('services')) score += 10;
    if (feature.discoveredFrom.includes('manual')) score = 100; // Manual is truth

    // Deduct for test/debug
    if (feature.featureKey.includes('test') || feature.featureKey.includes('debug')) {
        score -= 30;
    }

    // Deduct for missing metadata
    if (!feature.description) score -= 5;

    // Clamp
    return Math.min(Math.max(score, 0), 100);
}

export function updateConfidence(feature: DiscoveredFeature): DiscoveredFeature {
    feature.confidenceScore = calculateConfidence(feature);
    feature.needsReview = feature.confidenceScore < 70;
    return feature;
}
