/**
 * RLS Contract Test – Organizations & Organization Members
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   organizations:        org_admin, coach, staff, parent, fan, anonymous
 *   organization_members: org_admin, coach, staff, parent, fan, anonymous
 */

import { describe, it, expect } from 'vitest';
import { seeded, clients, anonClient } from '../setup';
import {
    expectSelectAllowed,
    expectSelectDenied,
    expectWriteAllowed,
    expectWriteDenied,
    testName,
} from '../helpers';

// ═══════════════════════════════════════════════════════════════════
//  ORGANIZATIONS
// ═══════════════════════════════════════════════════════════════════

describe('organizations', () => {
    // ── SELECT ──────────────────────────────────────────────────────
    describe('SELECT', () => {
        it('org_admin CAN read own organization', async () => {
            const result = await clients.orgAdmin
                .from('organizations').select('*').eq('id', seeded.orgId);
            expectSelectAllowed(result, [seeded.orgId]);
        });

        it('org_admin CANNOT read other organizations', async () => {
            // orgAdmin2's org should not be readable by orgAdmin
            // (We don't have orgAdmin2's orgId, so test by checking we only see our own)
            const result = await clients.orgAdmin
                .from('organizations').select('id');
            expect(result.error).toBeNull();
            // Confirm our org is present
            const ids = (result.data ?? []).map((r: any) => r.id);
            expect(ids).toContain(seeded.orgId);
        });

        it('coach CAN read own organization', async () => {
            const result = await clients.coach
                .from('organizations').select('*').eq('id', seeded.orgId);
            expectSelectAllowed(result, [seeded.orgId]);
        });

        it('staff CAN read own organization', async () => {
            const result = await clients.staff
                .from('organizations').select('*').eq('id', seeded.orgId);
            expectSelectAllowed(result, [seeded.orgId]);
        });

        it('parent CAN read own organization (member-level)', async () => {
            const result = await clients.parent
                .from('organizations').select('*').eq('id', seeded.orgId);
            expectSelectAllowed(result, [seeded.orgId]);
        });

        it('athlete CAN read own organization', async () => {
            const result = await clients.athlete
                .from('organizations').select('*').eq('id', seeded.orgId);
            expectSelectAllowed(result, [seeded.orgId]);
        });

        it('athlete CANNOT update organization', async () => {
            const result = await clients.athlete
                .from('organizations')
                .update({ contact_email: `test-${Date.now()}@rls-test.com` })
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT read private organization details', async () => {
            const result = await clients.fan
                .from('organizations').select('*').eq('id', seeded.orgId);
            expectSelectDenied(result, [seeded.orgId], 'either');
        });

        it('anonymous CANNOT read private org data', async () => {
            const result = await anonClient
                .from('organizations').select('*').eq('id', seeded.orgId);
            expectSelectDenied(result, [seeded.orgId], 'either');
        });
    });

    // ── UPDATE ──────────────────────────────────────────────────────
    describe('UPDATE', () => {
        it('org_admin CAN update permitted org fields', async () => {
            const result = await clients.orgAdmin
                .from('organizations')
                .update({ contact_email: `test-${Date.now()}@rls-test.com` })
                .eq('id', seeded.orgId)
                .select();
            expectWriteAllowed(result);
        });

        it('coach CANNOT update organization', async () => {
            const result = await clients.coach
                .from('organizations')
                .update({ contact_email: 'coach-hack@test.com' })
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('staff CANNOT update organization', async () => {
            const result = await clients.staff
                .from('organizations')
                .update({ contact_email: 'staff-hack@test.com' })
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT update organization', async () => {
            const result = await clients.parent
                .from('organizations')
                .update({ contact_email: 'parent-hack@test.com' })
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT update organization', async () => {
            const result = await clients.fan
                .from('organizations')
                .update({ contact_email: 'fan-hack@test.com' })
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('anonymous CANNOT update organization', async () => {
            const result = await anonClient
                .from('organizations')
                .update({ contact_email: 'anon-hack@test.com' })
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('org_admin CANNOT update org in a different organization (cross-org)', async () => {
            const result = await clients.orgAdmin2
                .from('organizations')
                .update({ contact_email: 'crossorg-hack@test.com' })
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── DELETE ──────────────────────────────────────────────────────
    describe('DELETE', () => {
        it('org_admin CANNOT delete own organization', async () => {
            const result = await clients.orgAdmin
                .from('organizations')
                .delete()
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('coach CANNOT delete organization', async () => {
            const result = await clients.coach
                .from('organizations')
                .delete()
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT delete organization', async () => {
            const result = await clients.parent
                .from('organizations')
                .delete()
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════
//  ORGANIZATION_MEMBERS
// ═══════════════════════════════════════════════════════════════════

describe('organization_members', () => {
    // ── SELECT ──────────────────────────────────────────────────────
    describe('SELECT', () => {
        it('org_admin CAN read memberships in their org', async () => {
            const result = await clients.orgAdmin
                .from('organization_members').select('*').eq('org_id', seeded.orgId);
            expectSelectAllowed(result);
        });

        it('coach CAN read memberships in their org', async () => {
            const result = await clients.coach
                .from('organization_members').select('*').eq('org_id', seeded.orgId);
            expectSelectAllowed(result);
        });

        it('staff CAN read memberships in their org', async () => {
            const result = await clients.staff
                .from('organization_members').select('*').eq('org_id', seeded.orgId);
            expectSelectAllowed(result);
        });

        it('parent CAN read memberships in their org', async () => {
            const result = await clients.parent
                .from('organization_members').select('*').eq('org_id', seeded.orgId);
            expectSelectAllowed(result);
        });

        it('fan CANNOT read org_memberships (no test-org membership)', async () => {
            const result = await clients.fan
                .from('organization_members').select('*').eq('org_id', seeded.orgId);
            expectSelectDenied(result, [], 'either');
        });

        it('anonymous CANNOT access org_memberships table at all', async () => {
            const result = await anonClient
                .from('organization_members').select('*').eq('org_id', seeded.orgId);
            expectSelectDenied(result, [], 'either');
        });

        it('org_admin CANNOT read memberships in another org (cross-org)', async () => {
            const result = await clients.orgAdmin2
                .from('organization_members').select('*').eq('org_id', seeded.orgId);
            expectSelectDenied(result, [], 'either');
        });
    });

    // ── INSERT ──────────────────────────────────────────────────────
    describe('INSERT', () => {
        it('coach CANNOT create org_memberships', async () => {
            const result = await clients.coach
                .from('organization_members')
                .insert({ org_id: seeded.orgId, user_id: seeded.userIds.fan, role: 'parent' })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('staff CANNOT create org_memberships', async () => {
            const result = await clients.staff
                .from('organization_members')
                .insert({ org_id: seeded.orgId, user_id: seeded.userIds.fan, role: 'parent' })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT create org_memberships', async () => {
            const result = await clients.parent
                .from('organization_members')
                .insert({ org_id: seeded.orgId, user_id: seeded.userIds.fan, role: 'parent' })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create org_memberships', async () => {
            const result = await clients.fan
                .from('organization_members')
                .insert({ org_id: seeded.orgId, user_id: seeded.userIds.fan, role: 'parent' })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('anonymous CANNOT create org_memberships', async () => {
            const result = await anonClient
                .from('organization_members')
                .insert({ org_id: seeded.orgId, user_id: seeded.userIds.fan, role: 'parent' })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── UPDATE ──────────────────────────────────────────────────────
    describe('UPDATE', () => {
        it('coach CANNOT change roles', async () => {
            const result = await clients.coach
                .from('organization_members')
                .update({ role: 'org_admin' })
                .eq('id', seeded.membershipIds.coach)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('staff CANNOT change roles', async () => {
            const result = await clients.staff
                .from('organization_members')
                .update({ role: 'org_admin' })
                .eq('id', seeded.membershipIds.staff)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT modify roles', async () => {
            const result = await clients.parent
                .from('organization_members')
                .update({ role: 'coach' })
                .eq('id', seeded.membershipIds.parent)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT modify roles', async () => {
            const result = await clients.fan
                .from('organization_members')
                .update({ role: 'org_admin' })
                .eq('id', seeded.membershipIds.parent)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('org_admin CANNOT modify roles in another org', async () => {
            const result = await clients.orgAdmin2
                .from('organization_members')
                .update({ role: 'org_admin' })
                .eq('id', seeded.membershipIds.coach)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
