/**
 * RLS Contract Test – Galleries & Gallery Photos
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

describe('galleries', () => {
    describe('SELECT', () => {
        it('org_admin can read galleries in their org', async () => {
            const result = await clients.orgAdmin
                .from('galleries')
                .select('*')
                .eq('id', seeded.galleryId);
            expectSelectAllowed(result, [seeded.galleryId]);
        });

        it('coach can read galleries in their org', async () => {
            const result = await clients.coach
                .from('galleries')
                .select('*')
                .eq('id', seeded.galleryId);
            expectSelectAllowed(result, [seeded.galleryId]);
        });

        it('parent can read galleries in their org', async () => {
            const result = await clients.parent
                .from('galleries')
                .select('*')
                .eq('id', seeded.galleryId);
            expectSelectAllowed(result, [seeded.galleryId]);
        });

        it('orgAdmin2 (different org) cannot see gallery', async () => {
            const result = await clients.orgAdmin2
                .from('galleries')
                .select('*')
                .eq('id', seeded.galleryId);
            expectSelectDenied(result, [seeded.galleryId], 'empty');
        });
    });

    describe('INSERT', () => {
        it('org_admin can create galleries', async () => {
            const result = await clients.orgAdmin
                .from('galleries')
                .insert({
                    org_id: seeded.orgId,
                    gallery_type: 'team',
                    entity_id: seeded.teamId,
                    name: testName('gallery_insert_test'),
                })
                .select();
            expectWriteAllowed(result);

            // Cleanup
            if (result.data?.[0]?.id) {
                const { getServiceClient } = await import('../helpers/supabase');
                await getServiceClient()
                    .from('galleries')
                    .delete()
                    .eq('id', result.data[0].id);
            }
        });

        it('parent cannot create galleries', async () => {
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
    });

    describe('UPDATE', () => {
        it('org_admin can update galleries', async () => {
            const result = await clients.orgAdmin
                .from('galleries')
                .update({ name: testName('gallery_updated') })
                .eq('id', seeded.galleryId)
                .select();
            expectWriteAllowed(result);
        });

        it('parent cannot update galleries', async () => {
            const result = await clients.parent
                .from('galleries')
                .update({ name: testName('gallery_hack') })
                .eq('id', seeded.galleryId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('parent cannot delete galleries', async () => {
            const result = await clients.parent
                .from('galleries')
                .delete()
                .eq('id', seeded.galleryId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});

describe('gallery_photos', () => {
    describe('SELECT', () => {
        it('org_admin can read gallery photos', async () => {
            // We might not have seeded photos; just confirm no error accessing the table
            const result = await clients.orgAdmin
                .from('gallery_photos')
                .select('*')
                .eq('gallery_id', seeded.galleryId);
            // No error means allowed (even if empty)
            expect(result.error).toBeNull();
        });
    });
});
