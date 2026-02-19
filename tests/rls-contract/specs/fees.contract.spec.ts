/**
 * RLS Contract Test – Fees & Fee Assignments
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   fees:            org_admin, parent, fan
 *   fee_assignments: org_admin, parent (own), fan, cross-org
 */

import { describe, it } from 'vitest';
import { seeded, clients, anonClient } from '../setup';
import {
    expectSelectAllowed,
    expectSelectDenied,
    expectWriteDenied,
} from '../helpers';

describe('fees', () => {
    describe('SELECT', () => {
        it('org_admin CAN read fees in their org', async () => {
            if (!seeded.feeId) return; // skip if fees table not available
            const result = await clients.orgAdmin
                .from('fees').select('*').eq('id', seeded.feeId);
            expectSelectAllowed(result, [seeded.feeId]);
        });

        it('parent CAN read fees in their org', async () => {
            if (!seeded.feeId) return;
            const result = await clients.parent
                .from('fees').select('*').eq('id', seeded.feeId);
            expectSelectAllowed(result, [seeded.feeId]);
        });

        it('staff CAN read fees in their org', async () => {
            if (!seeded.feeId) return;
            const result = await clients.staff
                .from('fees').select('*').eq('id', seeded.feeId);
            expectSelectAllowed(result, [seeded.feeId]);
        });

        it('fan CANNOT read fees', async () => {
            if (!seeded.feeId) return;
            const result = await clients.fan
                .from('fees').select('*').eq('id', seeded.feeId);
            expectSelectDenied(result, [seeded.feeId], 'either');
        });

        it('cross-org admin CANNOT read fees from another org', async () => {
            if (!seeded.feeId) return;
            const result = await clients.orgAdmin2
                .from('fees').select('*').eq('id', seeded.feeId);
            expectSelectDenied(result, [seeded.feeId], 'either');
        });

        it('anonymous CANNOT read fees', async () => {
            if (!seeded.feeId) return;
            const result = await anonClient
                .from('fees').select('*').eq('id', seeded.feeId);
            expectSelectDenied(result, [seeded.feeId], 'either');
        });
    });

    describe('INSERT', () => {
        it('parent CANNOT create fees', async () => {
            const result = await clients.parent
                .from('fees')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    name: 'Parent Hack Fee',
                    amount_cents: 100,
                    currency: 'usd',
                    status: 'draft',
                    type: 'registration',
                    scope: 'team',
                    created_by_user_id: seeded.userIds.parent,
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create fees', async () => {
            const result = await clients.fan
                .from('fees')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    name: 'Fan Hack Fee',
                    amount_cents: 100,
                    currency: 'usd',
                    status: 'draft',
                    type: 'registration',
                    scope: 'team',
                    created_by_user_id: seeded.userIds.fan,
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});

describe('fee_assignments', () => {
    describe('SELECT', () => {
        it('org_admin CAN read fee assignments', async () => {
            if (!seeded.feeAssignmentId) return;
            const result = await clients.orgAdmin
                .from('fee_assignments').select('*').eq('id', seeded.feeAssignmentId);
            expectSelectAllowed(result, [seeded.feeAssignmentId]);
        });

        it('parent CAN read their own fee assignments', async () => {
            if (!seeded.feeAssignmentId) return;
            const result = await clients.parent
                .from('fee_assignments')
                .select('*')
                .eq('parent_id', seeded.userIds.parent);
            expectSelectAllowed(result);
        });

        it('fan CANNOT read fee assignments', async () => {
            if (!seeded.feeAssignmentId) return;
            const result = await clients.fan
                .from('fee_assignments').select('*').eq('id', seeded.feeAssignmentId);
            expectSelectDenied(result, [seeded.feeAssignmentId], 'either');
        });

        it('cross-org admin CANNOT read fee assignments from another org', async () => {
            if (!seeded.feeAssignmentId) return;
            const result = await clients.orgAdmin2
                .from('fee_assignments').select('*').eq('id', seeded.feeAssignmentId);
            expectSelectDenied(result, [seeded.feeAssignmentId], 'either');
        });
    });

    describe('INSERT', () => {
        it('parent CANNOT create fee assignments', async () => {
            const result = await clients.parent
                .from('fee_assignments')
                .insert({
                    org_id: seeded.orgId,
                    fee_id: seeded.feeId ?? '00000000-0000-0000-0000-000000000000',
                    athlete_id: seeded.athleteId,
                    parent_id: seeded.userIds.parent,
                    amount_cents: 100,
                    status: 'unpaid',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
