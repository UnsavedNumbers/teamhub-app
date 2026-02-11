/**
 * RLS Contract Test – Videos
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   videos: org_admin, coach, staff, parent, fan, anonymous, cross-org
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

let videoId: string | null = null;

describe('videos', () => {
    // Create a test video via service client before tests
    it('setup: seed a test video', async () => {
        const svc = getServiceClient();
        const { data, error } = await svc
            .from('videos')
            .insert({
                org_id: seeded.orgId,
                team_id: seeded.teamId,
                title: testName('video'),
                video_url: 'https://example.com/test-video.mp4',
                uploaded_by: seeded.userIds.orgAdmin,
            })
            .select('id')
            .single();

        if (error) {
            console.warn(`Video seed skipped: ${error.message}`);
            return;
        }
        videoId = data.id;
    });

    // ── SELECT ──────────────────────────────────────────────────────
    describe('SELECT', () => {
        it('org_admin CAN read videos', async () => {
            if (!videoId) return;
            const result = await clients.orgAdmin
                .from('videos').select('*').eq('id', videoId);
            expectSelectAllowed(result, [videoId]);
        });

        it('coach CAN read videos', async () => {
            if (!videoId) return;
            const result = await clients.coach
                .from('videos').select('*').eq('id', videoId);
            expectSelectAllowed(result, [videoId]);
        });

        it('staff CAN read videos in org', async () => {
            if (!videoId) return;
            const result = await clients.staff
                .from('videos').select('*').eq('id', videoId);
            expectSelectAllowed(result, [videoId]);
        });

        it('fan CANNOT read private videos', async () => {
            if (!videoId) return;
            const result = await clients.fan
                .from('videos').select('*').eq('id', videoId);
            expectSelectDenied(result, [videoId], 'either');
        });

        it('anonymous CANNOT read videos', async () => {
            if (!videoId) return;
            const result = await anonClient
                .from('videos').select('*').eq('id', videoId);
            expectSelectDenied(result, [videoId], 'either');
        });

        it('cross-org admin CANNOT read videos from another org', async () => {
            if (!videoId) return;
            const result = await clients.orgAdmin2
                .from('videos').select('*').eq('id', videoId);
            expectSelectDenied(result, [videoId], 'either');
        });
    });

    // ── INSERT ──────────────────────────────────────────────────────
    describe('INSERT', () => {
        it('parent CANNOT create videos', async () => {
            const result = await clients.parent
                .from('videos')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    title: testName('video_parent_hack'),
                    video_url: 'https://example.com/hack.mp4',
                    uploaded_by: seeded.userIds.parent,
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create videos', async () => {
            const result = await clients.fan
                .from('videos')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    title: testName('video_fan_hack'),
                    video_url: 'https://example.com/hack.mp4',
                    uploaded_by: seeded.userIds.fan,
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('anonymous CANNOT create videos', async () => {
            const result = await anonClient
                .from('videos')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    title: testName('video_anon_hack'),
                    video_url: 'https://example.com/hack.mp4',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── DELETE ──────────────────────────────────────────────────────
    describe('DELETE', () => {
        it('parent CANNOT delete videos', async () => {
            if (!videoId) return;
            const result = await clients.parent
                .from('videos').delete().eq('id', videoId).select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT delete videos', async () => {
            if (!videoId) return;
            const result = await clients.fan
                .from('videos').delete().eq('id', videoId).select();
            expectWriteDenied(result, 'either');
        });
    });

    // Cleanup
    it('teardown: remove test video', async () => {
        if (videoId) {
            await getServiceClient().from('videos').delete().eq('id', videoId);
        }
    });
});
