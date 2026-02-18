/**
 * RLS Contract Test – Teams & Team Memberships
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   teams:            org_admin, coach, staff, parent, fan, anonymous, cross-org
 *   team_memberships: org_admin, coach, parent, staff, fan
 */

import { describe, it } from 'vitest';
import { seeded, clients, anonClient } from '../setup';
import {
    expectSelectAllowed,
    expectSelectDenied,
    expectWriteAllowed,
    expectWriteDenied,
    testName,
    getServiceClient,
} from '../helpers';

// ═══════════════════════════════════════════════════════════════════
//  TEAMS
// ═══════════════════════════════════════════════════════════════════

describe('teams', () => {
    // ── SELECT ──────────────────────────────────────────────────────
    describe('SELECT', () => {
        it('org_admin CAN read teams in their org', async () => {
            const result = await clients.orgAdmin
                .from('teams').select('*').eq('id', seeded.teamId);
            expectSelectAllowed(result, [seeded.teamId]);
        });

        it('coach CAN read teams they belong to', async () => {
            const result = await clients.coach
                .from('teams').select('*').eq('id', seeded.teamId);
            expectSelectAllowed(result, [seeded.teamId]);
        });

        it('staff CAN read all teams in org', async () => {
            const result = await clients.staff
                .from('teams').select('*').eq('id', seeded.teamId);
            expectSelectAllowed(result, [seeded.teamId]);
        });

        it('parent CAN read teams their child belongs to', async () => {
            const result = await clients.parent
                .from('teams').select('*').eq('id', seeded.teamId);
            expectSelectAllowed(result, [seeded.teamId]);
        });

        it('fan CANNOT read private teams', async () => {
            const result = await clients.fan
                .from('teams').select('*').eq('id', seeded.teamId);
            expectSelectDenied(result, [seeded.teamId], 'either');
        });

        it('anonymous CANNOT read teams (unless public)', async () => {
            const result = await anonClient
                .from('teams').select('*').eq('id', seeded.teamId);
            expectSelectDenied(result, [seeded.teamId], 'either');
        });

        it('org_admin CANNOT manage teams outside their org (cross-org)', async () => {
            const result = await clients.orgAdmin2
                .from('teams').select('*').eq('id', seeded.teamId);
            expectSelectDenied(result, [seeded.teamId], 'either');
        });
    });

    // ── INSERT ──────────────────────────────────────────────────────
    describe('INSERT', () => {
        it('org_admin CAN create teams within their org', async () => {
            const result = await clients.orgAdmin
                .from('teams')
                .insert({
                    org_id: seeded.orgId,
                    name: testName('team_admin_insert'),
                    invite_code: 'RLSI' + Date.now().toString(36).slice(-4).toUpperCase(),
                })
                .select();
            expectWriteAllowed(result);

            // Cleanup
            if (result.data?.[0]?.id) {
                await getServiceClient().from('teams').delete().eq('id', result.data[0].id);
            }
        });

        it('coach CANNOT create new teams', async () => {
            const result = await clients.coach
                .from('teams')
                .insert({
                    org_id: seeded.orgId,
                    name: testName('team_coach_hack'),
                    invite_code: 'HACK',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT create teams', async () => {
            const result = await clients.parent
                .from('teams')
                .insert({
                    org_id: seeded.orgId,
                    name: testName('team_parent_hack'),
                    invite_code: 'HACK',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('staff CANNOT create teams (unless granted)', async () => {
            const result = await clients.staff
                .from('teams')
                .insert({
                    org_id: seeded.orgId,
                    name: testName('team_staff_hack'),
                    invite_code: 'HACK',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create teams', async () => {
            const result = await clients.fan
                .from('teams')
                .insert({
                    org_id: seeded.orgId,
                    name: testName('team_fan_hack'),
                    invite_code: 'HACK',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('anonymous CANNOT create teams', async () => {
            const result = await anonClient
                .from('teams')
                .insert({
                    org_id: seeded.orgId,
                    name: testName('team_anon_hack'),
                    invite_code: 'HACK',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── UPDATE ──────────────────────────────────────────────────────
    describe('UPDATE', () => {
        it('org_admin CAN update teams within their org', async () => {
            const result = await clients.orgAdmin
                .from('teams')
                .update({ name: testName('team_updated') })
                .eq('id', seeded.teamId)
                .select();
            expectWriteAllowed(result);
        });

        it('coach CANNOT update teams (unless policy grants)', async () => {
            const result = await clients.coach
                .from('teams')
                .update({ name: testName('team_coach_update_hack') })
                .eq('id', seeded.teamId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT update teams', async () => {
            const result = await clients.parent
                .from('teams')
                .update({ name: testName('team_parent_update_hack') })
                .eq('id', seeded.teamId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT update teams', async () => {
            const result = await clients.fan
                .from('teams')
                .update({ name: testName('team_fan_update_hack') })
                .eq('id', seeded.teamId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── DELETE ──────────────────────────────────────────────────────
    describe('DELETE', () => {
        it('org_admin CAN delete teams within their org', async () => {
            // Create a temp team to delete
            const svc = getServiceClient();
            const { data: tmp } = await svc.from('teams')
                .insert({
                    org_id: seeded.orgId,
                    name: testName('team_to_delete'),
                    invite_code: 'DELT',
                })
                .select().single();

            if (tmp) {
                const result = await clients.orgAdmin
                    .from('teams').delete().eq('id', tmp.id).select();
                expectWriteAllowed(result);
            }
        });

        it('coach CANNOT delete teams', async () => {
            const result = await clients.coach
                .from('teams').delete().eq('id', seeded.teamId).select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT delete teams', async () => {
            const result = await clients.parent
                .from('teams').delete().eq('id', seeded.teamId).select();
            expectWriteDenied(result, 'either');
        });

        it('staff CANNOT delete teams (unless granted)', async () => {
            const result = await clients.staff
                .from('teams').delete().eq('id', seeded.teamId).select();
            expectWriteDenied(result, 'either');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════
//  TEAM_MEMBERSHIPS
// ═══════════════════════════════════════════════════════════════════

describe('team_memberships', () => {
    describe('SELECT', () => {
        it('org_admin CAN read team memberships', async () => {
            const result = await clients.orgAdmin
                .from('team_memberships').select('*').eq('team_id', seeded.teamId);
            expectSelectAllowed(result);
        });

        it('coach CAN read team memberships', async () => {
            const result = await clients.coach
                .from('team_memberships').select('*').eq('team_id', seeded.teamId);
            expectSelectAllowed(result);
        });

        it('parent CAN read team_memberships of their child', async () => {
            const result = await clients.parent
                .from('team_memberships').select('*').eq('athlete_id', seeded.athleteId);
            expectSelectAllowed(result);
        });

        it('staff CAN read memberships', async () => {
            const result = await clients.staff
                .from('team_memberships').select('*').eq('team_id', seeded.teamId);
            expectSelectAllowed(result);
        });

        it('fan CANNOT access team_memberships', async () => {
            const result = await clients.fan
                .from('team_memberships').select('*').eq('team_id', seeded.teamId);
            expectSelectDenied(result, [], 'either');
        });
    });

    describe('INSERT', () => {
        it('parent CANNOT modify team_memberships', async () => {
            const result = await clients.parent
                .from('team_memberships')
                .insert({
                    athlete_id: seeded.athleteId,
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    status: 'active',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('coach CANNOT assign other coaches', async () => {
            const result = await clients.coach
                .from('team_memberships')
                .insert({
                    athlete_id: seeded.athleteId,
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    status: 'active',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create team_memberships', async () => {
            const result = await clients.fan
                .from('team_memberships')
                .insert({
                    athlete_id: seeded.athleteId,
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    status: 'active',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('parent CANNOT delete team_memberships', async () => {
            const result = await clients.parent
                .from('team_memberships')
                .delete()
                .eq('athlete_id', seeded.athleteId)
                .eq('team_id', seeded.teamId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
