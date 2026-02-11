/**
 * RLS Contract Test – Cross-Tenant Protection
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   EXPECT: org_admin from Org A CANNOT read data from Org B
 *   EXPECT: coach from Org A CANNOT access athletes from Org B
 *   EXPECT: parent from Org A CANNOT access events from Org B
 *   EXPECT: fan purchase from Org A cannot read purchases from Org B
 *
 * These tests use orgAdmin2 (admin of Org B / Riverside) to attempt
 * accessing data in Org A (our test org / Springfield).
 *
 * Every table with org-scoped data MUST deny cross-tenant access.
 */

import { describe, it, expect } from 'vitest';
import { seeded, clients } from '../setup';
import {
    expectSelectDenied,
    expectWriteDenied,
} from '../helpers';

describe('cross-tenant protection', () => {
    // ── Organizations ──────────────────────────────────────────────
    describe('organizations', () => {
        it('orgAdmin2 CANNOT update test org', async () => {
            const result = await clients.orgAdmin2
                .from('organizations')
                .update({ contact_email: 'hack@cross-tenant.com' })
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('orgAdmin2 CANNOT delete test org', async () => {
            const result = await clients.orgAdmin2
                .from('organizations')
                .delete()
                .eq('id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── Teams ──────────────────────────────────────────────────────
    describe('teams', () => {
        it('orgAdmin2 CANNOT read test org teams', async () => {
            const result = await clients.orgAdmin2
                .from('teams').select('*').eq('id', seeded.teamId);
            expectSelectDenied(result, [seeded.teamId], 'either');
        });

        it('orgAdmin2 CANNOT update test org teams', async () => {
            const result = await clients.orgAdmin2
                .from('teams')
                .update({ name: 'Cross-Tenant Hack' })
                .eq('id', seeded.teamId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('orgAdmin2 CANNOT delete test org teams', async () => {
            const result = await clients.orgAdmin2
                .from('teams').delete().eq('id', seeded.teamId).select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── Athletes ───────────────────────────────────────────────────
    describe('athletes', () => {
        it('orgAdmin2 CANNOT read test org athletes', async () => {
            const result = await clients.orgAdmin2
                .from('athletes').select('*').eq('id', seeded.athleteId);
            expectSelectDenied(result, [seeded.athleteId], 'either');
        });

        it('orgAdmin2 CANNOT update test org athletes', async () => {
            const result = await clients.orgAdmin2
                .from('athletes')
                .update({ last_name: 'CrossTenantHack' })
                .eq('id', seeded.athleteId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('orgAdmin2 CANNOT delete test org athletes', async () => {
            const result = await clients.orgAdmin2
                .from('athletes').delete().eq('id', seeded.athleteId).select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── Events ─────────────────────────────────────────────────────
    describe('events', () => {
        it('orgAdmin2 CANNOT read private events from test org', async () => {
            const result = await clients.orgAdmin2
                .from('events').select('*').eq('id', seeded.privateEventId);
            expectSelectDenied(result, [seeded.privateEventId], 'either');
        });

        it('orgAdmin2 CANNOT update test org events', async () => {
            const result = await clients.orgAdmin2
                .from('events')
                .update({ title: 'Cross-Tenant Hack Event' })
                .eq('id', seeded.eventId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('orgAdmin2 CANNOT delete test org events', async () => {
            const result = await clients.orgAdmin2
                .from('events').delete().eq('id', seeded.eventId).select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── Announcements ──────────────────────────────────────────────
    describe('announcements', () => {
        it('orgAdmin2 CANNOT read test org announcements', async () => {
            const result = await clients.orgAdmin2
                .from('announcements').select('*').eq('id', seeded.announcementId);
            expectSelectDenied(result, [seeded.announcementId], 'either');
        });

        it('orgAdmin2 CANNOT update test org announcements', async () => {
            const result = await clients.orgAdmin2
                .from('announcements')
                .update({ content: 'Cross-tenant hack' })
                .eq('id', seeded.announcementId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── Athlete Guardians ──────────────────────────────────────────
    describe('athlete_guardians', () => {
        it('orgAdmin2 CANNOT read test org guardianships', async () => {
            const result = await clients.orgAdmin2
                .from('athlete_guardians').select('*').eq('id', seeded.guardianshipId);
            expectSelectDenied(result, [seeded.guardianshipId], 'either');
        });
    });

    // ── Organization Members ───────────────────────────────────────
    describe('organization_members', () => {
        it('orgAdmin2 CANNOT read test org memberships', async () => {
            const result = await clients.orgAdmin2
                .from('organization_members').select('*').eq('org_id', seeded.orgId);
            expectSelectDenied(result, [], 'either');
        });
    });

    // ── Galleries ──────────────────────────────────────────────────
    describe('galleries', () => {
        it('orgAdmin2 CANNOT read test org galleries', async () => {
            const result = await clients.orgAdmin2
                .from('galleries').select('*').eq('id', seeded.galleryId);
            expectSelectDenied(result, [seeded.galleryId], 'either');
        });
    });

    // ── Fees ───────────────────────────────────────────────────────
    describe('fees', () => {
        it('orgAdmin2 CANNOT read test org fees', async () => {
            if (!seeded.feeId) return;
            const result = await clients.orgAdmin2
                .from('fees').select('*').eq('id', seeded.feeId);
            expectSelectDenied(result, [seeded.feeId], 'either');
        });
    });

    // ── Fee Assignments ────────────────────────────────────────────
    describe('fee_assignments', () => {
        it('orgAdmin2 CANNOT read test org fee assignments', async () => {
            if (!seeded.feeAssignmentId) return;
            const result = await clients.orgAdmin2
                .from('fee_assignments').select('*').eq('id', seeded.feeAssignmentId);
            expectSelectDenied(result, [seeded.feeAssignmentId], 'either');
        });
    });
});
