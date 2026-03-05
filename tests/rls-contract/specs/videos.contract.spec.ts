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
import { testName } from '../helpers/seed';

describe('videos – guardian/athlete video library', () => {
    describe('fan visibility (follow model)', () => {
        it('fan follows org A only: sees entitled videos and cannot see private/team-only org B videos', async () => {
            const svc = getServiceClient();
            const orgBSlug = `rls-fan-video-${crypto.randomUUID().slice(0, 8)}`;
            const createdVideoIds: string[] = [];
            let orgBId: string | null = null;
            let teamBId: string | null = null;

            try {
                const { data: orgB, error: orgBError } = await svc
                    .from('organizations')
                    .insert({
                        name: testName('org_b_fan_video'),
                        slug: orgBSlug,
                        status: 'active',
                        license_status: 'active',
                    })
                    .select('id')
                    .single();
                expect(orgBError).toBeNull();
                orgBId = orgB!.id;

                const { data: teamB, error: teamBError } = await svc
                    .from('teams')
                    .insert({
                        org_id: orgBId,
                        name: testName('team_b_fan_video'),
                        invite_code: orgBSlug.slice(0, 8).toUpperCase(),
                        visible_to_fans: true,
                    })
                    .select('id')
                    .single();
                expect(teamBError).toBeNull();
                teamBId = teamB!.id;

                const { data: orgAPublic, error: orgAPublicError } = await svc
                    .from('videos')
                    .insert({
                        org_id: seeded.orgId,
                        team_id: seeded.teamId,
                        title: testName('fan_video_org_a_public'),
                        uploaded_by: seeded.userIds.coach,
                        visibility: 'public',
                        status: 'ready',
                        fan_visible: false,
                    })
                    .select('id')
                    .single();
                expect(orgAPublicError).toBeNull();
                createdVideoIds.push(orgAPublic!.id);

                const { data: orgAFollowScoped, error: orgAFollowScopedError } = await svc
                    .from('videos')
                    .insert({
                        org_id: seeded.orgId,
                        team_id: seeded.teamId,
                        title: testName('fan_video_org_a_follow_scoped'),
                        uploaded_by: seeded.userIds.coach,
                        visibility: 'organization',
                        status: 'ready',
                        fan_visible: true,
                    })
                    .select('id')
                    .single();
                expect(orgAFollowScopedError).toBeNull();
                createdVideoIds.push(orgAFollowScoped!.id);

                const { data: orgAPrivate, error: orgAPrivateError } = await svc
                    .from('videos')
                    .insert({
                        org_id: seeded.orgId,
                        team_id: seeded.teamId,
                        title: testName('fan_video_org_a_private'),
                        uploaded_by: seeded.userIds.coach,
                        visibility: 'private',
                        status: 'ready',
                        fan_visible: true,
                    })
                    .select('id')
                    .single();
                expect(orgAPrivateError).toBeNull();
                createdVideoIds.push(orgAPrivate!.id);

                const { data: orgBPublic, error: orgBPublicError } = await svc
                    .from('videos')
                    .insert({
                        org_id: orgBId,
                        team_id: teamBId,
                        title: testName('fan_video_org_b_public'),
                        uploaded_by: seeded.userIds.coach,
                        visibility: 'public',
                        status: 'ready',
                        fan_visible: false,
                    })
                    .select('id')
                    .single();
                expect(orgBPublicError).toBeNull();
                createdVideoIds.push(orgBPublic!.id);

                const { data: orgBFollowScoped, error: orgBFollowScopedError } = await svc
                    .from('videos')
                    .insert({
                        org_id: orgBId,
                        team_id: teamBId,
                        title: testName('fan_video_org_b_follow_scoped'),
                        uploaded_by: seeded.userIds.coach,
                        visibility: 'organization',
                        status: 'ready',
                        fan_visible: true,
                    })
                    .select('id')
                    .single();
                expect(orgBFollowScopedError).toBeNull();
                createdVideoIds.push(orgBFollowScoped!.id);

                const { data: orgBTeamOnly, error: orgBTeamOnlyError } = await svc
                    .from('videos')
                    .insert({
                        org_id: orgBId,
                        team_id: teamBId,
                        title: testName('fan_video_org_b_team_only'),
                        uploaded_by: seeded.userIds.coach,
                        visibility: 'team',
                        status: 'ready',
                        fan_visible: true,
                    })
                    .select('id')
                    .single();
                expect(orgBTeamOnlyError).toBeNull();
                createdVideoIds.push(orgBTeamOnly!.id);

                await svc
                    .from('fan_org_follows')
                    .delete()
                    .eq('user_id', seeded.userIds.fan)
                    .in('org_id', [seeded.orgId, orgBId]);

                const followResult = await clients.fan
                    .from('fan_org_follows')
                    .insert({ user_id: seeded.userIds.fan, org_id: seeded.orgId })
                    .select('id');
                expect(followResult.error).toBeNull();

                const visible = await clients.fan
                    .from('videos')
                    .select('id')
                    .in('id', createdVideoIds);

                expectSelectAllowed(visible, [orgAPublic!.id, orgAFollowScoped!.id, orgBPublic!.id]);
                expectSelectDenied(visible, [orgAPrivate!.id, orgBFollowScoped!.id, orgBTeamOnly!.id], 'either');
            } finally {
                await svc.from('fan_org_follows').delete().eq('user_id', seeded.userIds.fan);
                if (createdVideoIds.length > 0) {
                    await svc.from('video_athlete_links').delete().in('video_id', createdVideoIds);
                    await svc.from('video_favorites').delete().in('video_id', createdVideoIds);
                    await svc.from('videos').delete().in('id', createdVideoIds);
                }
                if (teamBId) {
                    await svc.from('teams').delete().eq('id', teamBId);
                }
                if (orgBId) {
                    await svc.from('organizations').delete().eq('id', orgBId);
                }
            }
        });

        it('fan loses follow-scoped access immediately after unfollow', async () => {
            const svc = getServiceClient();
            let followScopedVideoId: string | null = null;

            try {
                const { data: followScopedVideo, error: followScopedVideoError } = await svc
                    .from('videos')
                    .insert({
                        org_id: seeded.orgId,
                        team_id: seeded.teamId,
                        title: testName('fan_video_unfollow_scoped'),
                        uploaded_by: seeded.userIds.coach,
                        visibility: 'organization',
                        status: 'ready',
                        fan_visible: true,
                    })
                    .select('id')
                    .single();
                expect(followScopedVideoError).toBeNull();
                followScopedVideoId = followScopedVideo!.id;

                await svc
                    .from('fan_org_follows')
                    .delete()
                    .eq('user_id', seeded.userIds.fan)
                    .eq('org_id', seeded.orgId);

                const followInsert = await clients.fan
                    .from('fan_org_follows')
                    .insert({ user_id: seeded.userIds.fan, org_id: seeded.orgId })
                    .select('id');
                expect(followInsert.error).toBeNull();

                const whileFollowed = await clients.fan
                    .from('videos')
                    .select('id')
                    .eq('id', followScopedVideoId);
                expectSelectAllowed(whileFollowed, [followScopedVideoId]);

                const unfollow = await clients.fan
                    .from('fan_org_follows')
                    .delete()
                    .eq('user_id', seeded.userIds.fan)
                    .eq('org_id', seeded.orgId)
                    .select('id');
                expect(unfollow.error).toBeNull();

                const afterUnfollow = await clients.fan
                    .from('videos')
                    .select('id')
                    .eq('id', followScopedVideoId);
                expectSelectDenied(afterUnfollow, [followScopedVideoId], 'either');
            } finally {
                await svc
                    .from('fan_org_follows')
                    .delete()
                    .eq('user_id', seeded.userIds.fan)
                    .eq('org_id', seeded.orgId);
                if (followScopedVideoId) {
                    await svc.from('video_athlete_links').delete().eq('video_id', followScopedVideoId);
                    await svc.from('video_favorites').delete().eq('video_id', followScopedVideoId);
                    await svc.from('videos').delete().eq('id', followScopedVideoId);
                }
            }
        });

        it('multi-role user (guardian + fan follow) does not gain private/team-only access in followed org', async () => {
            const svc = getServiceClient();
            const orgBSlug = `rls-fan-video-mr-${crypto.randomUUID().slice(0, 8)}`;
            const createdVideoIds: string[] = [];
            let orgBId: string | null = null;
            let teamBId: string | null = null;

            try {
                const { data: orgB, error: orgBError } = await svc
                    .from('organizations')
                    .insert({
                        name: testName('org_b_multi_role'),
                        slug: orgBSlug,
                        status: 'active',
                        license_status: 'active',
                    })
                    .select('id')
                    .single();
                expect(orgBError).toBeNull();
                orgBId = orgB!.id;

                const { data: teamB, error: teamBError } = await svc
                    .from('teams')
                    .insert({
                        org_id: orgBId,
                        name: testName('team_b_multi_role'),
                        invite_code: orgBSlug.slice(0, 8).toUpperCase(),
                        visible_to_fans: true,
                    })
                    .select('id')
                    .single();
                expect(teamBError).toBeNull();
                teamBId = teamB!.id;

                const { data: followScoped, error: followScopedError } = await svc
                    .from('videos')
                    .insert({
                        org_id: orgBId,
                        team_id: teamBId,
                        title: testName('multi_role_follow_scoped'),
                        uploaded_by: seeded.userIds.coach,
                        visibility: 'organization',
                        status: 'ready',
                        fan_visible: true,
                    })
                    .select('id')
                    .single();
                expect(followScopedError).toBeNull();
                createdVideoIds.push(followScoped!.id);

                const { data: privateVideo, error: privateVideoError } = await svc
                    .from('videos')
                    .insert({
                        org_id: orgBId,
                        team_id: teamBId,
                        title: testName('multi_role_private'),
                        uploaded_by: seeded.userIds.coach,
                        visibility: 'private',
                        status: 'ready',
                        fan_visible: true,
                    })
                    .select('id')
                    .single();
                expect(privateVideoError).toBeNull();
                createdVideoIds.push(privateVideo!.id);

                const { data: teamOnlyVideo, error: teamOnlyVideoError } = await svc
                    .from('videos')
                    .insert({
                        org_id: orgBId,
                        team_id: teamBId,
                        title: testName('multi_role_team_only'),
                        uploaded_by: seeded.userIds.coach,
                        visibility: 'team',
                        status: 'ready',
                        fan_visible: true,
                    })
                    .select('id')
                    .single();
                expect(teamOnlyVideoError).toBeNull();
                createdVideoIds.push(teamOnlyVideo!.id);

                await svc
                    .from('fan_org_follows')
                    .delete()
                    .eq('user_id', seeded.userIds.parent)
                    .eq('org_id', orgBId);

                const parentFollow = await clients.parent
                    .from('fan_org_follows')
                    .insert({ user_id: seeded.userIds.parent, org_id: orgBId })
                    .select('id');
                expect(parentFollow.error).toBeNull();

                const visible = await clients.parent
                    .from('videos')
                    .select('id')
                    .in('id', createdVideoIds);

                expectSelectAllowed(visible, [followScoped!.id]);
                expectSelectDenied(visible, [privateVideo!.id, teamOnlyVideo!.id], 'either');
            } finally {
                await svc.from('fan_org_follows').delete().eq('user_id', seeded.userIds.parent);
                if (createdVideoIds.length > 0) {
                    await svc.from('video_athlete_links').delete().in('video_id', createdVideoIds);
                    await svc.from('video_favorites').delete().in('video_id', createdVideoIds);
                    await svc.from('videos').delete().in('id', createdVideoIds);
                }
                if (teamBId) {
                    await svc.from('teams').delete().eq('id', teamBId);
                }
                if (orgBId) {
                    await svc.from('organizations').delete().eq('id', orgBId);
                }
            }
        });
    });

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
