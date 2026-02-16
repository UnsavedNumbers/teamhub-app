/**
 * RLS Contract Test – Athletes & Athlete Guardians
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   athletes:          org_admin, coach, staff, parent, fan, anonymous
 *   athlete_guardians: org_admin, parent, coach, staff, fan
 */

import { describe, it, expect } from 'vitest';
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
//  ATHLETES
// ═══════════════════════════════════════════════════════════════════

describe('athletes', () => {
    // ── SELECT ──────────────────────────────────────────────────────
    describe('SELECT', () => {
        it('org_admin CAN read athletes in org', async () => {
            const result = await clients.orgAdmin
                .from('athletes').select('*').eq('id', seeded.athleteId);
            expectSelectAllowed(result, [seeded.athleteId]);
        });

        it('coach CAN read athletes on their team', async () => {
            const result = await clients.coach
                .from('athletes').select('*').eq('id', seeded.athleteId);
            expectSelectAllowed(result, [seeded.athleteId]);
        });

        it('staff CAN read athletes in org', async () => {
            const result = await clients.staff
                .from('athletes').select('*').eq('id', seeded.athleteId);
            expectSelectAllowed(result, [seeded.athleteId]);
        });

        it('parent CAN read own child athlete record', async () => {
            const result = await clients.parent
                .from('athletes').select('*').eq('id', seeded.athleteId);
            expectSelectAllowed(result, [seeded.athleteId]);
        });

        it('athlete CAN read own athlete record', async () => {
            const result = await clients.athlete
                .from('athletes').select('*').eq('id', seeded.athleteId);
            expectSelectAllowed(result, [seeded.athleteId]);
        });

        it('athlete CANNOT read sibling athlete (other athlete in same org)', async () => {
            if (!seeded.athlete2Id) {
                console.warn('Skipping test: athlete2Id not seeded');
                return;
            }
            const result = await clients.athlete
                .from('athletes').select('*').eq('id', seeded.athlete2Id);
            expectSelectDenied(result, [seeded.athlete2Id], 'either');
        });

        it('fan CANNOT access athlete records', async () => {
            const result = await clients.fan
                .from('athletes').select('*').eq('id', seeded.athleteId);
            expectSelectDenied(result, [seeded.athleteId], 'either');
        });

        it('anonymous CANNOT access athlete records', async () => {
            const result = await anonClient
                .from('athletes').select('*').eq('id', seeded.athleteId);
            expectSelectDenied(result, [seeded.athleteId], 'either');
        });

        it('cross-org admin CANNOT read athletes from another org', async () => {
            const result = await clients.orgAdmin2
                .from('athletes').select('*').eq('id', seeded.athleteId);
            expectSelectDenied(result, [seeded.athleteId], 'either');
        });
    });

    // ── INSERT ──────────────────────────────────────────────────────
    describe('INSERT', () => {
        it('org_admin CAN create athletes', async () => {
            const result = await clients.orgAdmin
                .from('athletes')
                .insert({
                    org_id: seeded.orgId,
                    first_name: testName('athlete_insert'),
                    last_name: 'Test',
                    birthdate: '2015-06-01',
                })
                .select();
            expectWriteAllowed(result);

            if (result.data?.[0]?.id) {
                await getServiceClient().from('athletes').delete().eq('id', result.data[0].id);
            }
        });

        it('parent CANNOT create athletes', async () => {
            const result = await clients.parent
                .from('athletes')
                .insert({
                    org_id: seeded.orgId,
                    first_name: testName('athlete_parent_hack'),
                    last_name: 'Hack',
                    birthdate: '2015-06-01',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create athletes', async () => {
            const result = await clients.fan
                .from('athletes')
                .insert({
                    org_id: seeded.orgId,
                    first_name: testName('athlete_fan_hack'),
                    last_name: 'Hack',
                    birthdate: '2015-06-01',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('anonymous CANNOT create athletes', async () => {
            const result = await anonClient
                .from('athletes')
                .insert({
                    org_id: seeded.orgId,
                    first_name: testName('athlete_anon_hack'),
                    last_name: 'Hack',
                    birthdate: '2015-06-01',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── UPDATE ──────────────────────────────────────────────────────
    describe('UPDATE', () => {
        it('org_admin CAN update athletes', async () => {
            const result = await clients.orgAdmin
                .from('athletes')
                .update({ last_name: 'UpdatedByAdmin' })
                .eq('id', seeded.athleteId)
                .select();
            expectWriteAllowed(result);
        });

        it('parent CANNOT update athlete (unless explicitly allowed)', async () => {
            const result = await clients.parent
                .from('athletes')
                .update({ last_name: 'ParentHack' })
                .eq('id', seeded.athleteId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('athlete CAN update allowed self fields', async () => {
            const result = await clients.athlete
                .from('athletes')
                .update({ preferred_name: 'UpdatedByAthlete' })
                .eq('id', seeded.athleteId)
                .select();
            expectWriteAllowed(result);
        });

        it('athlete CANNOT update org_id or user_id', async () => {
            // Try to update org_id (should fail)
            const result1 = await clients.athlete
                .from('athletes')
                .update({ org_id: '00000000-0000-0000-0000-000000000000' })
                .eq('id', seeded.athleteId)
                .select();
            expectWriteDenied(result1, 'either');

            // Try to update user_id (should fail)
            const result2 = await clients.athlete
                .from('athletes')
                .update({ user_id: '00000000-0000-0000-0000-000000000000' })
                .eq('id', seeded.athleteId)
                .select();
            expectWriteDenied(result2, 'either');
        });

        it('fan CANNOT update athletes', async () => {
            const result = await clients.fan
                .from('athletes')
                .update({ last_name: 'FanHack' })
                .eq('id', seeded.athleteId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── DELETE ──────────────────────────────────────────────────────
    describe('DELETE', () => {
        it('coach CANNOT delete athlete', async () => {
            const result = await clients.coach
                .from('athletes').delete().eq('id', seeded.athleteId).select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT delete athlete', async () => {
            const result = await clients.parent
                .from('athletes').delete().eq('id', seeded.athleteId).select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT delete athlete', async () => {
            const result = await clients.fan
                .from('athletes').delete().eq('id', seeded.athleteId).select();
            expectWriteDenied(result, 'either');
        });

        it('athlete CANNOT delete self', async () => {
            const result = await clients.athlete
                .from('athletes').delete().eq('id', seeded.athleteId).select();
            expectWriteDenied(result, 'either');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════
//  ATHLETE_GUARDIANS (GUARDIANSHIPS)
// ═══════════════════════════════════════════════════════════════════

describe('athlete_guardians', () => {
    describe('SELECT', () => {
        it('org_admin CAN read guardianships', async () => {
            const result = await clients.orgAdmin
                .from('athlete_guardians').select('*').eq('id', seeded.guardianshipId);
            expectSelectAllowed(result, [seeded.guardianshipId]);
        });

        it('parent CAN read guardianship rows tied to their user_id', async () => {
            const result = await clients.parent
                .from('athlete_guardians')
                .select('*')
                .eq('user_id', seeded.userIds.parent);
            expectSelectAllowed(result);
        });

        it('coach CAN read guardianship for athletes on their team', async () => {
            const result = await clients.coach
                .from('athlete_guardians').select('*').eq('id', seeded.guardianshipId);
            expectSelectAllowed(result, [seeded.guardianshipId]);
        });

        it('staff CAN read guardianships', async () => {
            const result = await clients.staff
                .from('athlete_guardians').select('*').eq('id', seeded.guardianshipId);
            expectSelectAllowed(result, [seeded.guardianshipId]);
        });

        it('fan CANNOT access guardianships', async () => {
            const result = await clients.fan
                .from('athlete_guardians').select('*').eq('id', seeded.guardianshipId);
            expectSelectDenied(result, [seeded.guardianshipId], 'either');
        });

        it('cross-org admin CANNOT read guardianships from another org', async () => {
            const result = await clients.orgAdmin2
                .from('athlete_guardians').select('*').eq('id', seeded.guardianshipId);
            expectSelectDenied(result, [seeded.guardianshipId], 'either');
        });

        it('athlete CAN read guardian links for self', async () => {
            const result = await clients.athlete
                .from('athlete_guardians')
                .select('*')
                .eq('athlete_id', seeded.athleteId);
            expectSelectAllowed(result);
        });

        it('athlete CANNOT modify guardian links', async () => {
            const result = await clients.athlete
                .from('athlete_guardians')
                .update({ status: 'inactive' })
                .eq('id', seeded.guardianshipId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('INSERT', () => {
        it('parent CANNOT link themselves to another athlete directly', async () => {
            const result = await clients.parent
                .from('athlete_guardians')
                .insert({
                    athlete_id: seeded.athleteId,
                    user_id: seeded.userIds.parent,
                    org_id: seeded.orgId,
                    status: 'active',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create guardianships', async () => {
            const result = await clients.fan
                .from('athlete_guardians')
                .insert({
                    athlete_id: seeded.athleteId,
                    user_id: seeded.userIds.fan,
                    org_id: seeded.orgId,
                    status: 'active',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('UPDATE', () => {
        it('coach CANNOT modify guardianships', async () => {
            const result = await clients.coach
                .from('athlete_guardians')
                .update({ status: 'inactive' })
                .eq('id', seeded.guardianshipId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT modify guardianships (unlink other guardians)', async () => {
            const result = await clients.parent
                .from('athlete_guardians')
                .update({ status: 'inactive' })
                .eq('id', seeded.guardianshipId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('parent CANNOT unlink other guardians', async () => {
            const result = await clients.parent
                .from('athlete_guardians')
                .delete()
                .eq('id', seeded.guardianshipId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('coach CANNOT delete guardianships', async () => {
            const result = await clients.coach
                .from('athlete_guardians')
                .delete()
                .eq('id', seeded.guardianshipId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
