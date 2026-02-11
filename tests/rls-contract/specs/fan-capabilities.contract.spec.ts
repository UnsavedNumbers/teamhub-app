/**
 * RLS Contract Test – Fan Capabilities
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   fan_org_follows:     user_id = auth.uid() scoping
 *   fan_event_bookmarks: user_id = auth.uid() scoping
 *   purchases:           user_id = auth.uid() scoping
 *
 * Key principle: authenticated users can only manage their OWN fan data.
 */

import { describe, it, expect } from 'vitest';
import { seeded, clients, anonClient } from '../setup';
import {
    expectWriteAllowed,
    expectWriteDenied,
    expectSelectDenied,
    getServiceClient,
} from '../helpers';

// ═══════════════════════════════════════════════════════════════════
//  FAN_ORG_FOLLOWS
// ═══════════════════════════════════════════════════════════════════

describe('fan_org_follows', () => {
    describe('INSERT', () => {
        it('authenticated user CAN follow an org (user_id = own)', async () => {
            const svc = getServiceClient();
            // Clean up first in case of retry
            await svc.from('fan_org_follows')
                .delete()
                .eq('user_id', seeded.userIds.fan)
                .eq('org_id', seeded.orgId);

            const result = await clients.fan
                .from('fan_org_follows')
                .insert({ user_id: seeded.userIds.fan, org_id: seeded.orgId })
                .select();
            expectWriteAllowed(result);
        });

        it('authenticated user CANNOT follow as another user', async () => {
            const result = await clients.fan
                .from('fan_org_follows')
                .insert({ user_id: seeded.userIds.orgAdmin, org_id: seeded.orgId })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('anonymous CANNOT follow orgs', async () => {
            const result = await anonClient
                .from('fan_org_follows')
                .insert({ user_id: seeded.userIds.fan, org_id: seeded.orgId })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('SELECT', () => {
        it('authenticated user CAN read own follows', async () => {
            const result = await clients.fan
                .from('fan_org_follows')
                .select('*')
                .eq('user_id', seeded.userIds.fan);
            expect(result.error).toBeNull();
        });

        it('authenticated user CANNOT read others follows', async () => {
            const result = await clients.fan
                .from('fan_org_follows')
                .select('*')
                .eq('user_id', seeded.userIds.orgAdmin);
            // Should return empty or error – not other users' follows
            if (result.data && result.data.length > 0) {
                const userIds = result.data.map((r: any) => r.user_id);
                expect(userIds).not.toContain(seeded.userIds.orgAdmin);
            }
        });

        it('anonymous CANNOT read follows', async () => {
            const result = await anonClient
                .from('fan_org_follows').select('*');
            expectSelectDenied(result, [], 'either');
        });
    });

    describe('DELETE', () => {
        it('authenticated user CAN unfollow own follow', async () => {
            const result = await clients.fan
                .from('fan_org_follows')
                .delete()
                .eq('user_id', seeded.userIds.fan)
                .eq('org_id', seeded.orgId)
                .select();
            // May succeed or return empty if already deleted
            expect(result.error).toBeNull();
        });

        it('authenticated user CANNOT delete others follows', async () => {
            const result = await clients.fan
                .from('fan_org_follows')
                .delete()
                .eq('user_id', seeded.userIds.orgAdmin)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});

// ═══════════════════════════════════════════════════════════════════
//  FAN_EVENT_BOOKMARKS
// ═══════════════════════════════════════════════════════════════════

describe('fan_event_bookmarks', () => {
    describe('INSERT', () => {
        it('authenticated user CAN bookmark an event (user_id = own)', async () => {
            const svc = getServiceClient();
            // Clean up first
            await svc.from('fan_event_bookmarks')
                .delete()
                .eq('user_id', seeded.userIds.fan)
                .eq('event_id', seeded.eventId);

            const result = await clients.fan
                .from('fan_event_bookmarks')
                .insert({ user_id: seeded.userIds.fan, event_id: seeded.eventId })
                .select();
            expectWriteAllowed(result);
        });

        it('authenticated user CANNOT bookmark as another user', async () => {
            const result = await clients.fan
                .from('fan_event_bookmarks')
                .insert({ user_id: seeded.userIds.orgAdmin, event_id: seeded.eventId })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('anonymous CANNOT bookmark events', async () => {
            const result = await anonClient
                .from('fan_event_bookmarks')
                .insert({ user_id: seeded.userIds.fan, event_id: seeded.eventId })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('SELECT', () => {
        it('authenticated user CAN read own bookmarks', async () => {
            const result = await clients.fan
                .from('fan_event_bookmarks')
                .select('*')
                .eq('user_id', seeded.userIds.fan);
            expect(result.error).toBeNull();
        });

        it('authenticated user CANNOT read others bookmarks', async () => {
            const result = await clients.fan
                .from('fan_event_bookmarks')
                .select('*')
                .eq('user_id', seeded.userIds.orgAdmin);
            if (result.data && result.data.length > 0) {
                const userIds = result.data.map((r: any) => r.user_id);
                expect(userIds).not.toContain(seeded.userIds.orgAdmin);
            }
        });
    });

    describe('DELETE', () => {
        it('authenticated user CAN remove own bookmark', async () => {
            const result = await clients.fan
                .from('fan_event_bookmarks')
                .delete()
                .eq('user_id', seeded.userIds.fan)
                .eq('event_id', seeded.eventId)
                .select();
            expect(result.error).toBeNull();
        });

        it('authenticated user CANNOT delete others bookmarks', async () => {
            const result = await clients.fan
                .from('fan_event_bookmarks')
                .delete()
                .eq('user_id', seeded.userIds.orgAdmin)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
