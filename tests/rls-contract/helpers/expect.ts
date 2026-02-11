/**
 * RLS Contract Test – Assertion helpers
 *
 * Provides consistent, unambiguous assertion helpers for RLS behavior.
 *
 * Denial semantics vary by table/policy:
 * - Some policies return empty result sets (no error).
 * - Some policies throw PostgresError (permission denied).
 * - Writes may return null/empty data on denied insert/update/delete.
 *
 * Each helper takes optional `mode` to declare the expected denial behavior.
 */

import { expect } from 'vitest';
import type { PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────
export type DenialMode = 'empty' | 'error' | 'either';

// ── SELECT assertions ──────────────────────────────────────────────

/**
 * Assert that a SELECT query returns the expected row(s).
 * @param result – the Supabase query result
 * @param knownIds – at least one seeded row ID that MUST be in the result
 */
export function expectSelectAllowed(
    result: PostgrestResponse<any>,
    knownIds?: string[]
): void {
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data!.length).toBeGreaterThan(0);

    if (knownIds && knownIds.length > 0) {
        const returnedIds = result.data!.map((r: any) => r.id);
        for (const id of knownIds) {
            expect(returnedIds).toContain(id);
        }
    }
}

/**
 * Assert that a SELECT query DENIES access to the specified rows.
 * @param result – the Supabase query result
 * @param deniedIds – row IDs that must NOT appear in the result
 * @param mode – expected denial behavior: 'empty' (rows filtered out), 'error' (permission error), or 'either'
 */
export function expectSelectDenied(
    result: PostgrestResponse<any>,
    deniedIds: string[],
    mode: DenialMode = 'either'
): void {
    if (mode === 'error') {
        expect(result.error).not.toBeNull();
        return;
    }

    if (mode === 'empty') {
        // Policy filters rows: no error, but denied rows are not returned
        if (result.error) {
            // Also acceptable if an outright error
            return;
        }
        const returnedIds = (result.data ?? []).map((r: any) => r.id);
        for (const id of deniedIds) {
            expect(returnedIds).not.toContain(id);
        }
        return;
    }

    // mode === 'either'
    if (result.error) {
        // Error means denied – pass
        return;
    }
    // No error: rows should be absent
    const returnedIds = (result.data ?? []).map((r: any) => r.id);
    for (const id of deniedIds) {
        expect(returnedIds).not.toContain(id);
    }
}

// ── WRITE (INSERT/UPDATE/DELETE) assertions ────────────────────────

/**
 * Assert that a write operation (INSERT/UPDATE/DELETE) is allowed.
 */
export function expectWriteAllowed(
    result: PostgrestSingleResponse<any> | PostgrestResponse<any>
): void {
    expect(result.error).toBeNull();
    // For INSERT/UPDATE returning single row:
    if ('data' in result && result.data !== null) {
        if (Array.isArray(result.data)) {
            expect(result.data.length).toBeGreaterThan(0);
        }
    }
    // If the query used .count, check count > 0
    if ('count' in result && typeof result.count === 'number') {
        expect(result.count).toBeGreaterThan(0);
    }
}

/**
 * Assert that a write operation is denied by RLS.
 * @param mode – 'error' (policy throws error) or 'empty' (affected count == 0)
 */
export function expectWriteDenied(
    result: PostgrestSingleResponse<any> | PostgrestResponse<any>,
    mode: DenialMode = 'either'
): void {
    if (mode === 'error') {
        expect(result.error).not.toBeNull();
        return;
    }

    if (mode === 'empty') {
        // No error but no rows affected
        if (result.error) return; // Also acceptable
        if (Array.isArray(result.data)) {
            expect(result.data.length).toBe(0);
        } else {
            expect(result.data).toBeNull();
        }
        return;
    }

    // mode === 'either'
    if (result.error) return; // Error means denied – pass
    // No error – data should be empty/null
    if (Array.isArray(result.data)) {
        expect(result.data.length).toBe(0);
    } else {
        expect(result.data).toBeNull();
    }
}
