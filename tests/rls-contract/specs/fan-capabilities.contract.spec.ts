/**
 * RLS Contract Test – Fan capabilities (follows, bookmarks, purchases)
 */

import { describe, it, expect } from 'vitest';
import { seeded, clients } from '../setup';
import {
    expectSelectAllowed,
    expectSelectDenied,
    expectWriteAllowed,
    expectWriteDenied,
    getServiceClient,
} from '../helpers';

describe('fan_org_follows', () => {
    describe('INSERT (follow)', () => {
        it('any authenticated user can follow an org', async () => {
            const result = await clients.parent2
                .from('fan_org_follows')
                .insert({
                    user_id: seeded.userIds.parent2,
                    org_id: seeded.orgId,
                    source: 'manual',
                })
                .select();
            expectWriteAllowed(result);
        });
    });

    describe('SELECT', () => {
        it('user can read their own follows', async () => {
            const result = await clients.parent2
                .from('fan_org_follows')
                .select('*')
                .eq('user_id', seeded.userIds.parent2);
            expectSelectAllowed(result);
        });

        it('user cannot read other users follows', async () => {
            const result = await clients.orgAdmin
                .from('fan_org_follows')
                .select('*')
                .eq('user_id', seeded.userIds.parent2);
            expectSelectDenied(result, [], 'either');
        });
    });

    describe('DELETE (unfollow)', () => {
        it('user can delete their own follows', async () => {
            const result = await clients.parent2
                .from('fan_org_follows')
                .delete()
                .eq('user_id', seeded.userIds.parent2)
                .eq('org_id', seeded.orgId)
                .select();
            expectWriteAllowed(result);
        });

        it('user cannot delete other users follows', async () => {
            // First, make sure parent has a follow to test against
            await getServiceClient()
                .from('fan_org_follows')
                .upsert({
                    user_id: seeded.userIds.parent,
                    org_id: seeded.orgId,
                    source: 'manual',
                });

            const result = await clients.orgAdmin2
                .from('fan_org_follows')
                .delete()
                .eq('user_id', seeded.userIds.parent)
                .eq('org_id', seeded.orgId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});

describe('fan_event_bookmarks', () => {
    describe('INSERT', () => {
        it('authenticated user can bookmark an event', async () => {
            const result = await clients.parent
                .from('fan_event_bookmarks')
                .insert({
                    user_id: seeded.userIds.parent,
                    event_id: seeded.eventId,
                })
                .select();
            expectWriteAllowed(result);
        });
    });

    describe('SELECT', () => {
        it('user can read their own bookmarks', async () => {
            const result = await clients.parent
                .from('fan_event_bookmarks')
                .select('*')
                .eq('user_id', seeded.userIds.parent);
            expectSelectAllowed(result);
        });

        it('user cannot read other users bookmarks', async () => {
            const result = await clients.coach
                .from('fan_event_bookmarks')
                .select('*')
                .eq('user_id', seeded.userIds.parent);
            expectSelectDenied(result, [], 'either');
        });
    });

    describe('DELETE', () => {
        it('user can delete their own bookmarks', async () => {
            const result = await clients.parent
                .from('fan_event_bookmarks')
                .delete()
                .eq('user_id', seeded.userIds.parent)
                .eq('event_id', seeded.eventId)
                .select();
            expectWriteAllowed(result);
        });

        it('user cannot delete other users bookmarks', async () => {
            // Ensure a bookmark exists for coach
            await getServiceClient()
                .from('fan_event_bookmarks')
                .upsert({
                    user_id: seeded.userIds.coach,
                    event_id: seeded.eventId,
                });

            const result = await clients.parent
                .from('fan_event_bookmarks')
                .delete()
                .eq('user_id', seeded.userIds.coach)
                .eq('event_id', seeded.eventId)
                .select();
            expectWriteDenied(result, 'either');

            // Cleanup
            await getServiceClient()
                .from('fan_event_bookmarks')
                .delete()
                .eq('user_id', seeded.userIds.coach)
                .eq('event_id', seeded.eventId);
        });
    });
});

describe('purchases', () => {
    describe('SELECT', () => {
        it('user can only read own purchases (even if empty)', async () => {
            const result = await clients.parent
                .from('purchases')
                .select('*')
                .eq('user_id', seeded.userIds.parent);
            // No error is success (even if no rows)
            expect(result.error).toBeNull();
        });

        it('user cannot read another users purchases', async () => {
            const result = await clients.coach
                .from('purchases')
                .select('*')
                .eq('user_id', seeded.userIds.parent);
            // Should return empty set or error
            if (result.data?.length) {
                // If rows returned, none should belong to parent
                const userIds = result.data.map((r: any) => r.user_id);
                expect(userIds).not.toContain(seeded.userIds.parent);
            }
        });
    });

    describe('INSERT', () => {
        it('direct insert into purchases is denied', async () => {
            const result = await clients.parent
                .from('purchases')
                .insert({
                    user_id: seeded.userIds.parent,
                    org_id: seeded.orgId,
                    event_id: seeded.ticketedEventId ?? seeded.eventId,
                    total_amount: 0,
                    status: 'completed',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
