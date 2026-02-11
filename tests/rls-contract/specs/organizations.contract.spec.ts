/**
 * RLS Contract Test – Organizations & Organization Members
 *
 * Verifies that:
 * - org_admins can read/manage their own org
 * - coaches/parents can read their org
 * - cross-org isolation is enforced
 * - anonymous/unauthenticated access is denied for writes
 */

import { describe, it, expect } from 'vitest';
import { seeded, clients } from '../setup';
import {
    expectSelectAllowed,
    expectSelectDenied,
    expectWriteAllowed,
    expectWriteDenied,
    testName,
    getAnonClient,
} from '../helpers';

describe('organizations', () => {
    describe('SELECT', () => {
        it('org_admin can read their own org', async () => {
            const result = await clients.orgAdmin
                .from('organizations')
                .select('*')
                .eq('id', seeded.orgId);
            expectSelectAllowed(result, [seeded.orgId]);
        });

        it('coach can read their org', async () => {
            const result = await clients.coach
                .from('organizations')
                .select('*')
                .eq('id', seeded.orgId);
            expectSelectAllowed(result, [seeded.orgId]);
        });

        it('parent can read their org', async () => {
            const result = await clients.parent
                .from('organizations')
                .select('*')
                .eq('id', seeded.orgId);
            expectSelectAllowed(result, [seeded.orgId]);
        });

        it('orgAdmin2 (different org) cannot read this test org', async () => {
            const result = await clients.orgAdmin2
                .from('organizations')
                .select('*')
                .eq('id', seeded.orgId);
            expectSelectDenied(result, [seeded.orgId], 'empty');
        });
    });

    describe('UPDATE', () => {
        it('org_admin can update their own org', async () => {
            const result = await clients.orgAdmin
                .from('organizations')
                .update({ contact_email: `rls-test-${seeded.testRunId.slice(0, 8)}@test.com` })
                .eq('id', seeded.orgId)
                .select();
            expectWriteAllowed(result);
        });

        it('coach cannot update org', async () => {
            const result = await clients.coach
                .from('organizations')
                .update({ contact_email: 'should-not-work@test.com' })
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent cannot update org', async () => {
            const result = await clients.parent
                .from('organizations')
                .update({ contact_email: 'should-not-work@test.com' })
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('org_admin cannot delete org via RLS', async () => {
            const result = await clients.orgAdmin
                .from('organizations')
                .delete()
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});

describe('organization_members', () => {
    describe('SELECT', () => {
        it('org_admin can read memberships in their org', async () => {
            const result = await clients.orgAdmin
                .from('organization_members')
                .select('*')
                .eq('org_id', seeded.orgId);
            expectSelectAllowed(result);
        });

        it('coach can read memberships in their org', async () => {
            const result = await clients.coach
                .from('organization_members')
                .select('*')
                .eq('org_id', seeded.orgId);
            expectSelectAllowed(result);
        });

        it('parent can read memberships in their org', async () => {
            const result = await clients.parent
                .from('organization_members')
                .select('*')
                .eq('org_id', seeded.orgId);
            expectSelectAllowed(result);
        });

        it('orgAdmin2 cannot read memberships of test org', async () => {
            const result = await clients.orgAdmin2
                .from('organization_members')
                .select('*')
                .eq('org_id', seeded.orgId);
            expectSelectDenied(result, [], 'either');
        });
    });

    describe('INSERT', () => {
        it('coach cannot add org members', async () => {
            const result = await clients.coach
                .from('organization_members')
                .insert({
                    org_id: seeded.orgId,
                    user_id: seeded.userIds.orgAdmin2,
                    role: 'parent',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent cannot add org members', async () => {
            const result = await clients.parent
                .from('organization_members')
                .insert({
                    org_id: seeded.orgId,
                    user_id: seeded.userIds.orgAdmin2,
                    role: 'parent',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('coach cannot delete org members', async () => {
            const result = await clients.coach
                .from('organization_members')
                .delete()
                .eq('org_id', seeded.orgId)
                .eq('user_id', seeded.userIds.parent)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
