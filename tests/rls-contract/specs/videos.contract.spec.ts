/**
 * RLS Contract Test – Videos
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { seeded, clients } from '../setup';
import {
    expectSelectDenied,
    expectWriteDenied,
    getServiceClient,
    testName,
} from '../helpers';

describe('videos', () => {
    let testVideoId: string | undefined;

    // Seed a video for this spec
    beforeAll(async () => {
        const svc = getServiceClient();
        const { data, error } = await svc
            .from('videos')
            .insert({
                org_id: seeded.orgId,
                team_id: seeded.teamId,
                title: testName('video'),
                category: 'practice',
                visibility: 'team',
                status: 'pending_upload',
                uploaded_by: seeded.userIds.orgAdmin,
            })
            .select('id')
            .single();
        if (!error && data) {
            testVideoId = data.id;
        }
    });

    afterAll(async () => {
        if (testVideoId) {
            const svc = getServiceClient();
            await svc.from('videos').delete().eq('id', testVideoId);
        }
    });

    describe('SELECT', () => {
        it('org_admin can read videos in their org', async () => {
            if (!testVideoId) return;
            const result = await clients.orgAdmin
                .from('videos')
                .select('*')
                .eq('id', testVideoId);
            expect(result.error).toBeNull();
            expect(result.data?.length).toBeGreaterThan(0);
        });

        it('coach can read team videos', async () => {
            if (!testVideoId) return;
            const result = await clients.coach
                .from('videos')
                .select('*')
                .eq('id', testVideoId);
            expect(result.error).toBeNull();
            expect(result.data?.length).toBeGreaterThan(0);
        });

        it('orgAdmin2 (different org) cannot see videos', async () => {
            if (!testVideoId) return;
            const result = await clients.orgAdmin2
                .from('videos')
                .select('*')
                .eq('id', testVideoId);
            expectSelectDenied(result, [testVideoId], 'empty');
        });
    });

    describe('INSERT', () => {
        it('parent cannot upload videos', async () => {
            const result = await clients.parent
                .from('videos')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    title: testName('video_parent_hack'),
                    category: 'practice',
                    visibility: 'team',
                    status: 'pending_upload',
                    uploaded_by: seeded.userIds.parent,
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('parent cannot delete videos', async () => {
            if (!testVideoId) return;
            const result = await clients.parent
                .from('videos')
                .delete()
                .eq('id', testVideoId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
