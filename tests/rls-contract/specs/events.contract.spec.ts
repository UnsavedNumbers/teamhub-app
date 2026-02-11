/**
 * RLS Contract Test – Events
 */

import { describe, it, expect } from 'vitest';
import { seeded, clients } from '../setup';
import {
    expectSelectAllowed,
    expectSelectDenied,
    expectWriteAllowed,
    expectWriteDenied,
    testName,
    getAnonClient,
} from '../helpers';

describe('events', () => {
    describe('SELECT', () => {
        it('org_admin can read events in their org', async () => {
            const result = await clients.orgAdmin
                .from('events')
                .select('*')
                .eq('id', seeded.eventId);
            expectSelectAllowed(result, [seeded.eventId]);
        });

        it('coach can read events in their org', async () => {
            const result = await clients.coach
                .from('events')
                .select('*')
                .eq('id', seeded.eventId);
            expectSelectAllowed(result, [seeded.eventId]);
        });

        it('parent can read events in their org', async () => {
            const result = await clients.parent
                .from('events')
                .select('*')
                .eq('id', seeded.eventId);
            expectSelectAllowed(result, [seeded.eventId]);
        });

        it('orgAdmin2 (different org) cannot see this event', async () => {
            const result = await clients.orgAdmin2
                .from('events')
                .select('*')
                .eq('id', seeded.eventId);
            expectSelectDenied(result, [seeded.eventId], 'empty');
        });
    });

    describe('INSERT', () => {
        it('org_admin can create events', async () => {
            const result = await clients.orgAdmin
                .from('events')
                .insert({
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    title: testName('event_insert_test'),
                    type: 'meeting',
                    start_time: '2026-08-01T10:00:00Z',
                    end_time: '2026-08-01T12:00:00Z',
                    created_by_user_id: seeded.userIds.orgAdmin,
                })
                .select();
            expectWriteAllowed(result);

            // Cleanup
            if (result.data?.[0]?.id) {
                const { getServiceClient } = await import('../helpers/supabase');
                await getServiceClient()
                    .from('events')
                    .delete()
                    .eq('id', result.data[0].id);
            }
        });

        it('parent cannot create events', async () => {
            const result = await clients.parent
                .from('events')
                .insert({
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    title: testName('event_parent_hack'),
                    type: 'practice',
                    start_time: '2026-08-01T10:00:00Z',
                    end_time: '2026-08-01T12:00:00Z',
                    created_by_user_id: seeded.userIds.parent,
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('UPDATE', () => {
        it('org_admin can update events', async () => {
            const result = await clients.orgAdmin
                .from('events')
                .update({ notes: 'RLS contract test update' })
                .eq('id', seeded.eventId)
                .select();
            expectWriteAllowed(result);
        });

        it('parent cannot update events', async () => {
            const result = await clients.parent
                .from('events')
                .update({ notes: 'should not work' })
                .eq('id', seeded.eventId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    describe('DELETE', () => {
        it('parent cannot delete events', async () => {
            const result = await clients.parent
                .from('events')
                .delete()
                .eq('id', seeded.eventId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('coach cannot delete events', async () => {
            const result = await clients.coach
                .from('events')
                .delete()
                .eq('id', seeded.eventId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });
});
