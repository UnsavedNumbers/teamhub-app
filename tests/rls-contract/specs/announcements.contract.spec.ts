/**
 * RLS Contract Test – Announcements
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

describe('announcements', () => {
    describe('SELECT', () => {
        it('org_admin can read announcements', async () => {
            const result = await clients.orgAdmin
                .from('announcements')
                .select('*')
                .eq('id', seeded.announcementId);
            expectSelectAllowed(result, [seeded.announcementId]);
        });

        it('coach can read announcements in their org', async () => {
            const result = await clients.coach
                .from('announcements')
                .select('*')
                .eq('id', seeded.announcementId);
            expectSelectAllowed(result, [seeded.announcementId]);
        });

        it('parent can read announcements in their org', async () => {
            const result = await clients.parent
                .from('announcements')
                .select('*')
                .eq('id', seeded.announcementId);
            expectSelectAllowed(result, [seeded.announcementId]);
        });

        it('orgAdmin2 (different org) cannot read announcements', async () => {
            const result = await clients.orgAdmin2
                .from('announcements')
                .select('*')
                .eq('id', seeded.announcementId);
            expectSelectDenied(result, [seeded.announcementId], 'empty');
        });
    });

    describe('INSERT', () => {
        it('org_admin can create announcements', async () => {
            const result = await clients.orgAdmin
                .from('announcements')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    author_id: seeded.userIds.orgAdmin,
                    title: testName('announcement_insert'),
                    content: 'Test insert',
                    type: 'general',
                    priority: 'normal',
                })
                .select();
            expectWriteAllowed(result);

            // Cleanup
            if (result.data?.[0]?.id) {
                const { getServiceClient } = await import('../helpers/supabase');
                await getServiceClient()
                    .from('announcements')
                    .delete()
                    .eq('id', result.data[0].id);
            }
        });

        it('parent cannot create announcements', async () => {
            const result = await clients.parent
                .from('announcements')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    author_id: seeded.userIds.parent,
                    title: testName('announcement_hack'),
                    content: 'Should fail',
                    type: 'general',
                    priority: 'normal',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('UPDATE', () => {
        it('org_admin can update announcements', async () => {
            const result = await clients.orgAdmin
                .from('announcements')
                .update({ content: 'Updated by RLS test' })
                .eq('id', seeded.announcementId)
                .select();
            expectWriteAllowed(result);
        });

        it('parent cannot update announcements', async () => {
            const result = await clients.parent
                .from('announcements')
                .update({ content: 'Hacked content' })
                .eq('id', seeded.announcementId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('coach cannot update announcements', async () => {
            const result = await clients.coach
                .from('announcements')
                .update({ content: 'Coach hack' })
                .eq('id', seeded.announcementId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('org_admin can delete announcements', async () => {
            // Create a temporary announcement to delete
            const { getServiceClient } = await import('../helpers/supabase');
            const svc = getServiceClient();
            const { data: temp } = await svc
                .from('announcements')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    author_id: seeded.userIds.orgAdmin,
                    title: testName('announcement_to_delete'),
                    content: 'Will be deleted',
                    type: 'general',
                    priority: 'normal',
                })
                .select()
                .single();

            if (temp) {
                const result = await clients.orgAdmin
                    .from('announcements')
                    .delete()
                    .eq('id', temp.id)
                    .select();
                expectWriteAllowed(result);
            }
        });

        it('parent cannot delete announcements', async () => {
            const result = await clients.parent
                .from('announcements')
                .delete()
                .eq('id', seeded.announcementId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
