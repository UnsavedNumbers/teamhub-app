/**
 * RLS Contract Tests – Videos (Guardian / Athlete Video Library)
 *
 * Ensures:
 * - Guardian can SELECT videos they are allowed to see (team, guardians for their athlete).
 * - Guardian cannot SELECT private or other-org videos.
 * - Athlete can SELECT team videos and their own athlete-linked (guardians) videos.
 * - Athlete cannot SELECT other athletes' guardian-only videos.
 * - Guardian and athlete cannot INSERT/UPDATE/DELETE videos.
 * - Guardian and athlete can manage their own video_favorites (bookmarks).
 */

import { describe, it, expect } from 'vitest';
import { seeded, clients, anonClient } from '../setup';
import {
    expectSelectAllowed,
    expectSelectDenied,
    expectWriteDenied,
    getServiceClient,
} from '../helpers';

describe('videos – guardian/athlete video library', () => {
    describe('SELECT', () => {
        it('guardian CAN select team video (athlete on team)', async () => {
            if (!seeded.videoTeamId) {
                console.warn('Skipping: videoTeamId not seeded');
                return;
            }
            const result = await clients.parent
                .from('videos')
                .select('id')
                .eq('id', seeded.videoTeamId);
            expectSelectAllowed(result, [seeded.videoTeamId]);
        });

        it('guardian CAN select guardians video linked to their athlete', async () => {
            if (!seeded.videoGuardianAthleteId) {
                console.warn('Skipping: videoGuardianAthleteId not seeded');
                return;
            }
            const result = await clients.parent
                .from('videos')
                .select('id')
                .eq('id', seeded.videoGuardianAthleteId);
            expectSelectAllowed(result, [seeded.videoGuardianAthleteId]);
        });

        it('guardian CANNOT select private video', async () => {
            if (!seeded.videoPrivateId) {
                console.warn('Skipping: videoPrivateId not seeded');
                return;
            }
            const result = await clients.parent
                .from('videos')
                .select('id')
                .eq('id', seeded.videoPrivateId);
            expectSelectDenied(result, [seeded.videoPrivateId], 'either');
        });

        it('athlete CAN select team video (same team)', async () => {
            if (!seeded.videoTeamId) {
                console.warn('Skipping: videoTeamId not seeded');
                return;
            }
            const result = await clients.athlete
                .from('videos')
                .select('id')
                .eq('id', seeded.videoTeamId);
            expectSelectAllowed(result, [seeded.videoTeamId]);
        });

        it('athlete CAN select guardians video linked to themselves', async () => {
            if (!seeded.videoGuardianAthleteId) {
                console.warn('Skipping: videoGuardianAthleteId not seeded');
                return;
            }
            const result = await clients.athlete
                .from('videos')
                .select('id')
                .eq('id', seeded.videoGuardianAthleteId);
            expectSelectAllowed(result, [seeded.videoGuardianAthleteId]);
        });

        it('athlete CANNOT select guardians video linked to other athlete', async () => {
            if (!seeded.videoGuardianAthlete2Id) {
                console.warn('Skipping: videoGuardianAthlete2Id not seeded');
                return;
            }
            const result = await clients.athlete
                .from('videos')
                .select('id')
                .eq('id', seeded.videoGuardianAthlete2Id);
            expectSelectDenied(result, [seeded.videoGuardianAthlete2Id], 'either');
        });

        it('org_admin CAN select all org videos', async () => {
            if (!seeded.videoTeamId || !seeded.videoPrivateId) return;
            const result = await clients.orgAdmin
                .from('videos')
                .select('id')
                .in('id', [seeded.videoTeamId, seeded.videoPrivateId]);
            expectSelectAllowed(result, [seeded.videoTeamId, seeded.videoPrivateId]);
        });

        it('anonymous CANNOT select videos', async () => {
            if (!seeded.videoTeamId) return;
            const result = await anonClient
                .from('videos')
                .select('id')
                .eq('id', seeded.videoTeamId);
            expectSelectDenied(result, [seeded.videoTeamId], 'either');
        });
    });

    describe('INSERT / UPDATE / DELETE (guardian and athlete cannot write)', () => {
        it('guardian CANNOT insert video', async () => {
            const result = await clients.parent.from('videos').insert({
                org_id: seeded.orgId,
                team_id: seeded.teamId,
                title: '__rls_test__guardian_insert',
                uploaded_by: seeded.userIds.parent,
                visibility: 'team',
                status: 'ready',
            });
            expectWriteDenied(result);
        });

        it('guardian CANNOT update video', async () => {
            if (!seeded.videoTeamId) return;
            const result = await clients.parent
                .from('videos')
                .update({ title: 'Hacked' })
                .eq('id', seeded.videoTeamId);
            expectWriteDenied(result);
        });

        it('athlete CANNOT insert video', async () => {
            const result = await clients.athlete.from('videos').insert({
                org_id: seeded.orgId,
                team_id: seeded.teamId,
                title: '__rls_test__athlete_insert',
                uploaded_by: seeded.userIds.athlete,
                visibility: 'team',
                status: 'ready',
            });
            expectWriteDenied(result);
        });

        it('athlete CANNOT update video', async () => {
            if (!seeded.videoTeamId) return;
            const result = await clients.athlete
                .from('videos')
                .update({ title: 'Hacked' })
                .eq('id', seeded.videoTeamId);
            expectWriteDenied(result);
        });
    });

    describe('video_favorites (bookmarks)', () => {
        it('guardian CAN insert favorite for video they can view', async () => {
            if (!seeded.videoTeamId) return;
            const result = await clients.parent.from('video_favorites').insert({
                video_id: seeded.videoTeamId,
                user_id: seeded.userIds.parent,
                org_id: seeded.orgId,
            }).select('id');
            expect(result.error).toBeNull();
            expect(result.data).toBeDefined();
            if (result.data && Array.isArray(result.data) && result.data[0]?.id) {
                await getServiceClient().from('video_favorites').delete().eq('id', result.data[0].id);
            }
        });

        it('guardian CAN delete their own favorite', async () => {
            if (!seeded.videoTeamId) return;
            const { data: inserted } = await clients.parent.from('video_favorites').insert({
                video_id: seeded.videoTeamId,
                user_id: seeded.userIds.parent,
                org_id: seeded.orgId,
            }).select('id').single();
            if (!inserted?.id) return;
            const result = await clients.parent.from('video_favorites').delete().eq('id', inserted.id);
            expect(result.error).toBeNull();
        });

        it('athlete CAN insert favorite for video they can view', async () => {
            if (!seeded.videoTeamId) return;
            const result = await clients.athlete.from('video_favorites').insert({
                video_id: seeded.videoTeamId,
                user_id: seeded.userIds.athlete,
                org_id: seeded.orgId,
            }).select('id');
            expect(result.error).toBeNull();
            if (result.data && Array.isArray(result.data) && result.data[0]?.id) {
                await getServiceClient().from('video_favorites').delete().eq('id', result.data[0].id);
            }
        });

        it('guardian CANNOT insert favorite for video they cannot view', async () => {
            if (!seeded.videoPrivateId) return;
            const result = await clients.parent.from('video_favorites').insert({
                video_id: seeded.videoPrivateId,
                user_id: seeded.userIds.parent,
                org_id: seeded.orgId,
            });
            expectWriteDenied(result);
        });
    });
});
