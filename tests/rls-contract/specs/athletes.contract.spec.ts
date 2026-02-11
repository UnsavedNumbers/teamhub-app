/**
 * RLS Contract Test – Athletes & Athlete Guardians
 */

import { describe, it, expect } from 'vitest';
import { seeded, clients } from '../setup';
import {
    expectSelectAllowed,
    expectSelectDenied,
    expectWriteAllowed,
    expectWriteDenied,
    testName,
} from '../helpers';

describe('athletes', () => {
    describe('SELECT', () => {
        it('org_admin can read athletes', async () => {
            const result = await clients.orgAdmin
                .from('athletes')
                .select('*')
                .eq('id', seeded.athleteId);
            expectSelectAllowed(result, [seeded.athleteId]);
        });

        it('coach can read athletes', async () => {
            const result = await clients.coach
                .from('athletes')
                .select('*')
                .eq('id', seeded.athleteId);
            expectSelectAllowed(result, [seeded.athleteId]);
        });

        it('parent can read athletes (their own children)', async () => {
            const result = await clients.parent
                .from('athletes')
                .select('*')
                .eq('id', seeded.athleteId);
            expectSelectAllowed(result, [seeded.athleteId]);
        });
    });

    describe('INSERT', () => {
        it('org_admin can create athletes', async () => {
            const result = await clients.orgAdmin
                .from('athletes')
                .insert({
                    org_id: seeded.orgId,
                    first_name: testName('athlete_insert_test'),
                    last_name: 'RLSTest',
                })
                .select();
            expectWriteAllowed(result);

            // Cleanup
            if (result.data?.[0]?.id) {
                const { getServiceClient } = await import('../helpers/supabase');
                await getServiceClient()
                    .from('athletes')
                    .delete()
                    .eq('id', result.data[0].id);
            }
        });

        it('parent cannot create athletes directly', async () => {
            const result = await clients.parent
                .from('athletes')
                .insert({
                    org_id: seeded.orgId,
                    first_name: testName('athlete_parent_hack'),
                    last_name: 'RLSTest',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('UPDATE', () => {
        it('org_admin can update athletes', async () => {
            const result = await clients.orgAdmin
                .from('athletes')
                .update({ preferred_name: 'RLS-Test-Updated' })
                .eq('id', seeded.athleteId)
                .select();
            expectWriteAllowed(result);
        });

        it('parent cannot update athletes directly', async () => {
            const result = await clients.parent
                .from('athletes')
                .update({ preferred_name: 'Hack' })
                .eq('id', seeded.athleteId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('parent cannot delete athletes', async () => {
            const result = await clients.parent
                .from('athletes')
                .delete()
                .eq('id', seeded.athleteId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('coach cannot delete athletes', async () => {
            const result = await clients.coach
                .from('athletes')
                .delete()
                .eq('id', seeded.athleteId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});

describe('athlete_guardians', () => {
    describe('SELECT', () => {
        it('org_admin can read guardianships', async () => {
            const result = await clients.orgAdmin
                .from('athlete_guardians')
                .select('*')
                .eq('id', seeded.guardianshipId);
            expectSelectAllowed(result, [seeded.guardianshipId]);
        });

        it('parent can see their own guardianships', async () => {
            const result = await clients.parent
                .from('athlete_guardians')
                .select('*')
                .eq('id', seeded.guardianshipId);
            expectSelectAllowed(result, [seeded.guardianshipId]);
        });

        it('orgAdmin2 (different org) cannot see guardianships', async () => {
            const result = await clients.orgAdmin2
                .from('athlete_guardians')
                .select('*')
                .eq('id', seeded.guardianshipId);
            expectSelectDenied(result, [seeded.guardianshipId], 'empty');
        });
    });

    describe('INSERT', () => {
        it('org_admin can create guardianships', async () => {
            // Insert and immediately remove
            const result = await clients.orgAdmin
                .from('athlete_guardians')
                .insert({
                    athlete_id: seeded.athleteId,
                    user_id: seeded.userIds.coach, // attach coach as guardian (test-only)
                    org_id: seeded.orgId,
                    status: 'pending',
                })
                .select();
            expectWriteAllowed(result);

            // Cleanup
            if (result.data?.[0]?.id) {
                const { getServiceClient } = await import('../helpers/supabase');
                await getServiceClient()
                    .from('athlete_guardians')
                    .delete()
                    .eq('id', result.data[0].id);
            }
        });

        it('parent cannot create guardianships', async () => {
            const result = await clients.parent
                .from('athlete_guardians')
                .insert({
                    athlete_id: seeded.athleteId,
                    user_id: seeded.userIds.orgAdmin2,
                    org_id: seeded.orgId,
                    status: 'active',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('parent cannot delete guardianships', async () => {
            const result = await clients.parent
                .from('athlete_guardians')
                .delete()
                .eq('id', seeded.guardianshipId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
