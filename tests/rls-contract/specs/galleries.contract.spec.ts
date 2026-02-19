/**
 * RLS Contract Test – Galleries & Gallery Photos
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   galleries:      org_admin, coach, staff, parent, fan, anonymous, cross-org
 *   gallery_photos: org_admin, parent, fan
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

describe('galleries', () => {
    // ── SELECT ──────────────────────────────────────────────────────
    describe('SELECT', () => {
        it('org_admin CAN read galleries', async () => {
            const result = await clients.orgAdmin
                .from('galleries').select('*').eq('id', seeded.galleryId);
            expectSelectAllowed(result, [seeded.galleryId]);
        });

        it('coach CAN read galleries', async () => {
            const result = await clients.coach
                .from('galleries').select('*').eq('id', seeded.galleryId);
            expectSelectAllowed(result, [seeded.galleryId]);
        });

        it('staff CAN read galleries', async () => {
            const result = await clients.staff
                .from('galleries').select('*').eq('id', seeded.galleryId);
            expectSelectAllowed(result, [seeded.galleryId]);
        });

        it('parent CAN read galleries (read-only)', async () => {
            const result = await clients.parent
                .from('galleries').select('*').eq('id', seeded.galleryId);
            expectSelectAllowed(result, [seeded.galleryId]);
        });

        it('fan CANNOT read private galleries', async () => {
            const result = await clients.fan
                .from('galleries').select('*').eq('id', seeded.galleryId);
            expectSelectDenied(result, [seeded.galleryId], 'either');
        });

        it('anonymous CANNOT read private galleries', async () => {
            const result = await anonClient
                .from('galleries').select('*').eq('id', seeded.galleryId);
            expectSelectDenied(result, [seeded.galleryId], 'either');
        });

        it('cross-org admin CANNOT read galleries from another org', async () => {
            const result = await clients.orgAdmin2
                .from('galleries').select('*').eq('id', seeded.galleryId);
            expectSelectDenied(result, [seeded.galleryId], 'either');
        });
    });

    // ── INSERT ──────────────────────────────────────────────────────
    describe('INSERT', () => {
        it('org_admin CAN create galleries', async () => {
            const result = await clients.orgAdmin
                .from('galleries')
                .insert({
                    org_id: seeded.orgId,
                    gallery_type: 'org',
                    name: testName('gallery_insert'),
                })
                .select();
            expectWriteAllowed(result);

            if (result.data?.[0]?.id) {
                await getServiceClient().from('galleries').delete().eq('id', result.data[0].id);
            }
        });

        it('parent CANNOT create galleries', async () => {
            const result = await clients.parent
                .from('galleries')
                .insert({
                    org_id: seeded.orgId,
                    gallery_type: 'org',
                    name: testName('gallery_parent_hack'),
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create galleries', async () => {
            const result = await clients.fan
                .from('galleries')
                .insert({
                    org_id: seeded.orgId,
                    gallery_type: 'org',
                    name: testName('gallery_fan_hack'),
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── UPDATE ──────────────────────────────────────────────────────
    describe('UPDATE', () => {
        it('org_admin CAN update galleries', async () => {
            const result = await clients.orgAdmin
                .from('galleries')
                .update({ name: testName('gallery_updated') })
                .eq('id', seeded.galleryId)
                .select();
            expectWriteAllowed(result);
        });

        it('parent CANNOT update galleries', async () => {
            const result = await clients.parent
                .from('galleries')
                .update({ name: testName('gallery_parent_update_hack') })
                .eq('id', seeded.galleryId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── DELETE ──────────────────────────────────────────────────────
    describe('DELETE', () => {
        it('parent CANNOT delete galleries', async () => {
            const result = await clients.parent
                .from('galleries').delete().eq('id', seeded.galleryId).select();
            expectWriteDenied(result, 'either');
        });

        it('coach CANNOT delete galleries', async () => {
            const result = await clients.coach
                .from('galleries').delete().eq('id', seeded.galleryId).select();
            expectWriteDenied(result, 'either');
        });
    });
});

describe('gallery_photos', () => {
    describe('INSERT', () => {
        it('parent CANNOT insert gallery photos (read-only access)', async () => {
            const result = await clients.parent
                .from('gallery_photos')
                .insert({
                    gallery_id: seeded.galleryId,
                    uploaded_by: seeded.userIds.parent,
                    storage_path: `test/${seeded.testRunId}/parent-hack.jpg`,
                    file_name: 'parent-hack.jpg',
                    file_size: 100,
                    mime_type: 'image/jpeg',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT insert gallery photos', async () => {
            const result = await clients.fan
                .from('gallery_photos')
                .insert({
                    gallery_id: seeded.galleryId,
                    uploaded_by: seeded.userIds.fan,
                    storage_path: `test/${seeded.testRunId}/fan-hack.jpg`,
                    file_name: 'fan-hack.jpg',
                    file_size: 100,
                    mime_type: 'image/jpeg',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
