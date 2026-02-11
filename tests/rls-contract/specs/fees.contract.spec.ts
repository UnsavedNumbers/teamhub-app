/**
 * RLS Contract Test – Fees & Fee Assignments
 */

import { describe, it, expect } from 'vitest';
import { seeded, clients } from '../setup';
import {
    expectSelectAllowed,
    expectSelectDenied,
    expectWriteAllowed,
    expectWriteDenied,
} from '../helpers';

describe('fees', () => {
    describe('SELECT', () => {
        it('org_admin can read fees', async () => {
            if (!seeded.feeId) return; // skip if fees not seeded
            const result = await clients.orgAdmin
                .from('fees')
                .select('*')
                .eq('id', seeded.feeId);
            expectSelectAllowed(result, [seeded.feeId]);
        });

        it('coach can read fees in their org', async () => {
            if (!seeded.feeId) return;
            const result = await clients.coach
                .from('fees')
                .select('*')
                .eq('id', seeded.feeId);
            expectSelectAllowed(result, [seeded.feeId]);
        });

        it('parent can read fees they are assigned to', async () => {
            if (!seeded.feeId) return;
            const result = await clients.parent
                .from('fees')
                .select('*')
                .eq('id', seeded.feeId);
            expectSelectAllowed(result, [seeded.feeId]);
        });

        it('orgAdmin2 (different org) cannot see fees', async () => {
            if (!seeded.feeId) return;
            const result = await clients.orgAdmin2
                .from('fees')
                .select('*')
                .eq('id', seeded.feeId);
            expectSelectDenied(result, [seeded.feeId], 'empty');
        });
    });

    describe('INSERT', () => {
        it('parent cannot create fees', async () => {
            const result = await clients.parent
                .from('fees')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    name: '__rls_test__fee_hack',
                    amount_cents: 100,
                    status: 'draft',
                    type: 'misc',
                    scope: 'team',
                    created_by_user_id: seeded.userIds.parent,
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('UPDATE', () => {
        it('parent cannot update fees', async () => {
            if (!seeded.feeId) return;
            const result = await clients.parent
                .from('fees')
                .update({ amount_cents: 0 })
                .eq('id', seeded.feeId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('parent cannot delete fees', async () => {
            if (!seeded.feeId) return;
            const result = await clients.parent
                .from('fees')
                .delete()
                .eq('id', seeded.feeId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});

describe('fee_assignments', () => {
    describe('SELECT', () => {
        it('org_admin can read fee assignments', async () => {
            if (!seeded.feeAssignmentId) return;
            const result = await clients.orgAdmin
                .from('fee_assignments')
                .select('*')
                .eq('id', seeded.feeAssignmentId);
            expectSelectAllowed(result, [seeded.feeAssignmentId]);
        });

        it('parent can read their own fee assignments', async () => {
            if (!seeded.feeAssignmentId) return;
            const result = await clients.parent
                .from('fee_assignments')
                .select('*')
                .eq('id', seeded.feeAssignmentId);
            expectSelectAllowed(result, [seeded.feeAssignmentId]);
        });

        it('orgAdmin2 (different org) cannot see fee assignments', async () => {
            if (!seeded.feeAssignmentId) return;
            const result = await clients.orgAdmin2
                .from('fee_assignments')
                .select('*')
                .eq('id', seeded.feeAssignmentId);
            expectSelectDenied(result, [seeded.feeAssignmentId], 'empty');
        });
    });

    describe('INSERT', () => {
        it('parent cannot create fee assignments', async () => {
            if (!seeded.feeId) return;
            const result = await clients.parent
                .from('fee_assignments')
                .insert({
                    org_id: seeded.orgId,
                    fee_id: seeded.feeId,
                    athlete_id: seeded.athleteId,
                    parent_id: seeded.userIds.parent,
                    amount_cents: 0,
                    status: 'waived',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
