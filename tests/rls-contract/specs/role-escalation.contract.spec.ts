/**
 * RLS Contract Test – Role Escalation Protection
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   EXPECT: No role can modify its own role in org_memberships
 *   EXPECT: coach CANNOT promote self to org_admin
 *   EXPECT: parent CANNOT promote self to coach
 *   EXPECT: staff CANNOT escalate privileges
 *   EXPECT: Only org_admin can assign elevated roles
 *
 * These tests are critical security assertions that prevent privilege escalation.
 */

import { describe, it, expect } from 'vitest';
import { seeded, clients } from '../setup';
import {
    expectWriteDenied,
    expectWriteAllowed,
} from '../helpers';

describe('role escalation protection', () => {
    // ── Self-promotion prevention ──────────────────────────────────
    describe('self-promotion prevention', () => {
        it('coach CANNOT promote self to org_admin', async () => {
            const result = await clients.coach
                .from('organization_members')
                .update({ role: 'org_admin' })
                .eq('id', seeded.membershipIds.coach)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT promote self to coach', async () => {
            const result = await clients.parent
                .from('organization_members')
                .update({ role: 'coach' })
                .eq('id', seeded.membershipIds.parent)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT promote self to org_admin', async () => {
            const result = await clients.parent
                .from('organization_members')
                .update({ role: 'org_admin' })
                .eq('id', seeded.membershipIds.parent)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('staff CANNOT escalate privileges to org_admin', async () => {
            const result = await clients.staff
                .from('organization_members')
                .update({ role: 'org_admin' })
                .eq('id', seeded.membershipIds.staff)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('staff CANNOT escalate privileges to coach', async () => {
            const result = await clients.staff
                .from('organization_members')
                .update({ role: 'coach' })
                .eq('id', seeded.membershipIds.staff)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── Cross-role modification prevention ─────────────────────────
    describe('cross-role modification prevention', () => {
        it('coach CANNOT modify parent role', async () => {
            const result = await clients.coach
                .from('organization_members')
                .update({ role: 'coach' })
                .eq('id', seeded.membershipIds.parent)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT modify coach role', async () => {
            const result = await clients.parent
                .from('organization_members')
                .update({ role: 'parent' })
                .eq('id', seeded.membershipIds.coach)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('staff CANNOT modify admin role', async () => {
            const result = await clients.staff
                .from('organization_members')
                .update({ role: 'staff' })
                .eq('id', seeded.membershipIds.orgAdmin)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── Fan/anonymous cannot touch memberships ─────────────────────
    describe('fan/anonymous membership creation', () => {
        it('fan CANNOT create org_memberships (grant self any role)', async () => {
            const result = await clients.fan
                .from('organization_members')
                .insert({
                    org_id: seeded.orgId,
                    user_id: seeded.userIds.fan,
                    role: 'org_admin',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create membership as coach', async () => {
            const result = await clients.fan
                .from('organization_members')
                .insert({
                    org_id: seeded.orgId,
                    user_id: seeded.userIds.fan,
                    role: 'coach',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create membership as parent', async () => {
            const result = await clients.fan
                .from('organization_members')
                .insert({
                    org_id: seeded.orgId,
                    user_id: seeded.userIds.fan,
                    role: 'parent',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── Cross-org role manipulation ────────────────────────────────
    describe('cross-org role manipulation', () => {
        it('org_admin from Org B CANNOT modify roles in Org A', async () => {
            const result = await clients.orgAdmin2
                .from('organization_members')
                .update({ role: 'org_admin' })
                .eq('id', seeded.membershipIds.coach)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('org_admin from Org B CANNOT create memberships in Org A', async () => {
            const result = await clients.orgAdmin2
                .from('organization_members')
                .insert({
                    org_id: seeded.orgId,
                    user_id: seeded.userIds.orgAdmin2,
                    role: 'org_admin',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('org_admin from Org B CANNOT delete memberships in Org A', async () => {
            const result = await clients.orgAdmin2
                .from('organization_members')
                .delete()
                .eq('id', seeded.membershipIds.coach)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
