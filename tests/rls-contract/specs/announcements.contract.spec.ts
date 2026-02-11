/**
 * RLS Contract Test – Announcements
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   announcements: org_admin, coach, staff, parent, fan, anonymous
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

describe('announcements', () => {
    // ── SELECT ──────────────────────────────────────────────────────
    describe('SELECT', () => {
        it('org_admin CAN read announcements', async () => {
            const result = await clients.orgAdmin
                .from('announcements').select('*').eq('id', seeded.announcementId);
            expectSelectAllowed(result, [seeded.announcementId]);
        });

        it('coach CAN read announcements in their org', async () => {
            const result = await clients.coach
                .from('announcements').select('*').eq('id', seeded.announcementId);
            expectSelectAllowed(result, [seeded.announcementId]);
        });

        it('staff CAN read announcements in their org', async () => {
            const result = await clients.staff
                .from('announcements').select('*').eq('id', seeded.announcementId);
            expectSelectAllowed(result, [seeded.announcementId]);
        });

        it('parent CAN read announcements relevant to their team/org', async () => {
            const result = await clients.parent
                .from('announcements').select('*').eq('id', seeded.announcementId);
            expectSelectAllowed(result, [seeded.announcementId]);
        });

        it('fan CANNOT read private announcements', async () => {
            const result = await clients.fan
                .from('announcements').select('*').eq('id', seeded.announcementId);
            expectSelectDenied(result, [seeded.announcementId], 'either');
        });

        it('anonymous CANNOT read private announcements', async () => {
            const result = await anonClient
                .from('announcements').select('*').eq('id', seeded.announcementId);
            expectSelectDenied(result, [seeded.announcementId], 'either');
        });

        it('cross-org admin CANNOT read announcements from another org', async () => {
            const result = await clients.orgAdmin2
                .from('announcements').select('*').eq('id', seeded.announcementId);
            expectSelectDenied(result, [seeded.announcementId], 'either');
        });
    });

    // ── INSERT ──────────────────────────────────────────────────────
    describe('INSERT', () => {
        it('org_admin CAN create org-wide announcements', async () => {
            const result = await clients.orgAdmin
                .from('announcements')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    author_id: seeded.userIds.orgAdmin,
                    title: testName('announcement_admin_insert'),
                    content: 'Test content',
                    priority: 'normal',
                    type: 'general',
                })
                .select();
            expectWriteAllowed(result);

            if (result.data?.[0]?.id) {
                await getServiceClient().from('announcements').delete().eq('id', result.data[0].id);
            }
        });

        it('parent CANNOT create announcements', async () => {
            const result = await clients.parent
                .from('announcements')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    author_id: seeded.userIds.parent,
                    title: testName('announcement_parent_hack'),
                    content: 'Hack',
                    priority: 'normal',
                    type: 'general',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create announcements', async () => {
            const result = await clients.fan
                .from('announcements')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    author_id: seeded.userIds.fan,
                    title: testName('announcement_fan_hack'),
                    content: 'Hack',
                    priority: 'normal',
                    type: 'general',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('anonymous CANNOT create announcements', async () => {
            const result = await anonClient
                .from('announcements')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    title: testName('announcement_anon_hack'),
                    content: 'Hack',
                    priority: 'normal',
                    type: 'general',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── UPDATE ──────────────────────────────────────────────────────
    describe('UPDATE', () => {
        it('org_admin CAN update announcements', async () => {
            const result = await clients.orgAdmin
                .from('announcements')
                .update({ content: 'Updated by admin' })
                .eq('id', seeded.announcementId)
                .select();
            expectWriteAllowed(result);
        });

        it('parent CANNOT update announcements', async () => {
            const result = await clients.parent
                .from('announcements')
                .update({ content: 'Parent hack' })
                .eq('id', seeded.announcementId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT update announcements', async () => {
            const result = await clients.fan
                .from('announcements')
                .update({ content: 'Fan hack' })
                .eq('id', seeded.announcementId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── DELETE ──────────────────────────────────────────────────────
    describe('DELETE', () => {
        it('org_admin CAN delete announcements', async () => {
            // Create a temp announcement to delete
            const svc = getServiceClient();
            const { data: tmp } = await svc.from('announcements')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    author_id: seeded.userIds.orgAdmin,
                    title: testName('announcement_to_delete'),
                    content: 'Will be deleted',
                    priority: 'normal',
                    type: 'general',
                })
                .select().single();

            if (tmp) {
                const result = await clients.orgAdmin
                    .from('announcements').delete().eq('id', tmp.id).select();
                expectWriteAllowed(result);
            }
        });

        it('parent CANNOT delete announcements', async () => {
            const result = await clients.parent
                .from('announcements').delete().eq('id', seeded.announcementId).select();
            expectWriteDenied(result, 'either');
        });

        it('coach CANNOT delete announcements (unless policy allows)', async () => {
            const result = await clients.coach
                .from('announcements').delete().eq('id', seeded.announcementId).select();
            expectWriteDenied(result, 'either');
        });
    });
});
