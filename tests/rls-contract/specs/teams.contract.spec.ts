/**
 * RLS Contract Test – Teams & Team Memberships
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

describe('teams', () => {
    describe('SELECT', () => {
        it('org_admin can read teams in their org', async () => {
            const result = await clients.orgAdmin
                .from('teams')
                .select('*')
                .eq('id', seeded.teamId);
            expectSelectAllowed(result, [seeded.teamId]);
        });

        it('coach can read teams in their org', async () => {
            const result = await clients.coach
                .from('teams')
                .select('*')
                .eq('id', seeded.teamId);
            expectSelectAllowed(result, [seeded.teamId]);
        });

        it('parent can read teams in their org', async () => {
            const result = await clients.parent
                .from('teams')
                .select('*')
                .eq('id', seeded.teamId);
            expectSelectAllowed(result, [seeded.teamId]);
        });

        it('orgAdmin2 (different org) cannot see this team', async () => {
            const result = await clients.orgAdmin2
                .from('teams')
                .select('*')
                .eq('id', seeded.teamId);
            expectSelectDenied(result, [seeded.teamId], 'empty');
        });
    });

    describe('INSERT', () => {
        it('org_admin can create a team', async () => {
            const newTeamName = testName('team_insert_test');
            const result = await clients.orgAdmin
                .from('teams')
                .insert({
                    org_id: seeded.orgId,
                    name: newTeamName,
                    invite_code: seeded.testRunId.slice(8, 16).toUpperCase(),
                })
                .select();
            expectWriteAllowed(result);

            // Clean up the test-created team
            if (result.data?.[0]?.id) {
                const { getServiceClient } = await import('../helpers/supabase');
                await getServiceClient()
                    .from('teams')
                    .delete()
                    .eq('id', result.data[0].id);
            }
        });

        it('coach cannot create a team', async () => {
            const result = await clients.coach
                .from('teams')
                .insert({
                    org_id: seeded.orgId,
                    name: testName('team_coach_insert'),
                    invite_code: 'ZZZZTEST',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent cannot create a team', async () => {
            const result = await clients.parent
                .from('teams')
                .insert({
                    org_id: seeded.orgId,
                    name: testName('team_parent_insert'),
                    invite_code: 'YYYTESTP',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('UPDATE', () => {
        it('org_admin can update a team', async () => {
            const result = await clients.orgAdmin
                .from('teams')
                .update({ name: testName('team_updated') })
                .eq('id', seeded.teamId)
                .select();
            expectWriteAllowed(result);

            // Restore original name
            const { getServiceClient } = await import('../helpers/supabase');
            await getServiceClient()
                .from('teams')
                .update({ name: seeded.teamName })
                .eq('id', seeded.teamId);
        });

        it('coach cannot update a team', async () => {
            const result = await clients.coach
                .from('teams')
                .update({ name: testName('team_hack') })
                .eq('id', seeded.teamId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent cannot update a team', async () => {
            const result = await clients.parent
                .from('teams')
                .update({ name: testName('team_hack') })
                .eq('id', seeded.teamId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('coach cannot delete a team', async () => {
            const result = await clients.coach
                .from('teams')
                .delete()
                .eq('id', seeded.teamId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('parent cannot delete a team', async () => {
            const result = await clients.parent
                .from('teams')
                .delete()
                .eq('id', seeded.teamId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});

describe('team_memberships', () => {
    describe('SELECT', () => {
        it('org_admin can read team memberships', async () => {
            const result = await clients.orgAdmin
                .from('team_memberships')
                .select('*')
                .eq('team_id', seeded.teamId);
            expectSelectAllowed(result);
        });

        it('coach can read team memberships', async () => {
            const result = await clients.coach
                .from('team_memberships')
                .select('*')
                .eq('team_id', seeded.teamId);
            expectSelectAllowed(result);
        });

        it('parent can read team memberships (via guardianship)', async () => {
            const result = await clients.parent
                .from('team_memberships')
                .select('*')
                .eq('team_id', seeded.teamId);
            expectSelectAllowed(result);
        });
    });

    describe('INSERT', () => {
        it('coach cannot insert team memberships', async () => {
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

        it('parent cannot insert team memberships', async () => {
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
    });
});
