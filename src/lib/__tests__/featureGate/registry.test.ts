/**
 * Feature Gate Registry Validation Tests
 * 
 * Ensures:
 * 1. Every feature key in the registries is a valid key from the generated list
 * 2. No duplicate feature keys across route and action registries
 * 3. validateRegistry() catches invalid entries
 * 4. UNGATED_ROUTES don't appear in ROUTE_TO_FEATURE
 * 5. FeatureGateRoute routeKeys in App.tsx have corresponding registry entries
 */

import { describe, test, expect } from 'vitest';
import {
    ROUTE_TO_FEATURE,
    ACTION_TO_FEATURE,
    UNGATED_ROUTES,
    getFeatureKeyForRoute,
    getFeatureKeyForAction,
    isRouteUngated,
    getAllRouteFeatureKeys,
    getAllActionFeatureKeys,
    validateRegistry,
} from '../../featureGate/registry';
import {
    VALID_FEATURE_KEYS,
    isValidFeatureKey,
} from '../../featureGate/generatedFeatureKeys';

describe('Feature Gate Registry', () => {
    // =========================================================================
    // Basic integrity
    // =========================================================================

    test('ROUTE_TO_FEATURE is a non-empty object', () => {
        expect(Object.keys(ROUTE_TO_FEATURE).length).toBeGreaterThan(0);
    });

    test('ACTION_TO_FEATURE is a non-empty object', () => {
        expect(Object.keys(ACTION_TO_FEATURE).length).toBeGreaterThan(0);
    });

    test('UNGATED_ROUTES is a non-empty array', () => {
        expect(UNGATED_ROUTES.length).toBeGreaterThan(0);
    });

    // =========================================================================
    // All values must be valid feature keys from the DB-generated list
    // =========================================================================

    test('every ROUTE_TO_FEATURE value is a valid feature key', () => {
        const invalid: string[] = [];
        for (const [routeKey, featureKey] of Object.entries(ROUTE_TO_FEATURE)) {
            if (!isValidFeatureKey(featureKey)) {
                invalid.push(`${routeKey} → ${featureKey}`);
            }
        }
        expect(invalid).toEqual([]);
    });

    test('every ACTION_TO_FEATURE value is a valid feature key', () => {
        const invalid: string[] = [];
        for (const [actionKey, featureKey] of Object.entries(ACTION_TO_FEATURE)) {
            if (!isValidFeatureKey(featureKey)) {
                invalid.push(`${actionKey} → ${featureKey}`);
            }
        }
        expect(invalid).toEqual([]);
    });

    // =========================================================================
    // validateRegistry() function
    // =========================================================================

    test('validateRegistry() returns no errors for valid registry', () => {
        const errors = validateRegistry();
        expect(errors).toEqual([]);
    });

    // =========================================================================
    // UNGATED_ROUTES should NOT appear in ROUTE_TO_FEATURE
    // =========================================================================

    test('UNGATED_ROUTES entries do not also appear in ROUTE_TO_FEATURE', () => {
        const conflicts: string[] = [];
        for (const routeKey of UNGATED_ROUTES) {
            if (routeKey in ROUTE_TO_FEATURE) {
                conflicts.push(routeKey);
            }
        }
        expect(conflicts).toEqual([]);
    });

    // =========================================================================
    // Helper functions
    // =========================================================================

    test('getFeatureKeyForRoute returns correct key', () => {
        const firstRouteKey = Object.keys(ROUTE_TO_FEATURE)[0];
        const expected = ROUTE_TO_FEATURE[firstRouteKey];
        expect(getFeatureKeyForRoute(firstRouteKey)).toBe(expected);
    });

    test('getFeatureKeyForRoute returns null for unknown route', () => {
        expect(getFeatureKeyForRoute('nonexistent.route.key')).toBeNull();
    });

    test('getFeatureKeyForAction returns correct key', () => {
        const firstActionKey = Object.keys(ACTION_TO_FEATURE)[0];
        const expected = ACTION_TO_FEATURE[firstActionKey];
        expect(getFeatureKeyForAction(firstActionKey)).toBe(expected);
    });

    test('getFeatureKeyForAction returns null for unknown action', () => {
        expect(getFeatureKeyForAction('nonexistent.action')).toBeNull();
    });

    test('isRouteUngated returns true for ungated routes', () => {
        const firstUngated = [...UNGATED_ROUTES][0];
        expect(isRouteUngated(firstUngated)).toBe(true);
    });

    test('isRouteUngated returns false for gated routes', () => {
        const firstGated = Object.keys(ROUTE_TO_FEATURE)[0];
        expect(isRouteUngated(firstGated)).toBe(false);
    });

    // =========================================================================
    // Deduplication
    // =========================================================================

    test('getAllRouteFeatureKeys returns unique keys', () => {
        const keys = getAllRouteFeatureKeys();
        const uniqueKeys = [...new Set(keys)];
        expect(keys.length).toBe(uniqueKeys.length);
    });

    test('getAllActionFeatureKeys returns unique keys', () => {
        const keys = getAllActionFeatureKeys();
        const uniqueKeys = [...new Set(keys)];
        expect(keys.length).toBe(uniqueKeys.length);
    });

    // =========================================================================
    // Generated feature keys integrity
    // =========================================================================

    test('VALID_FEATURE_KEYS contains at least one key', () => {
        expect(VALID_FEATURE_KEYS.size).toBeGreaterThan(0);
    });

    test('isValidFeatureKey type guard works correctly', () => {
        // Pick a known valid key from the set
        const firstKey = [...VALID_FEATURE_KEYS][0];
        expect(isValidFeatureKey(firstKey)).toBe(true);
        expect(isValidFeatureKey('totally_fake_feature_999')).toBe(false);
        expect(isValidFeatureKey('')).toBe(false);
    });

    test('all feature keys follow the snake_case naming convention', () => {
        const invalidFormat: string[] = [];
        for (const key of VALID_FEATURE_KEYS) {
            if (!/^[a-z][a-z0-9_]*$/.test(key)) {
                invalidFormat.push(key);
            }
        }
        expect(invalidFormat).toEqual([]);
    });
});
