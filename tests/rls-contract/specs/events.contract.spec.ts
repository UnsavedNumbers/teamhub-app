/**
 * RLS Contract Test – Events
 *
 * Matrix coverage (see RLS_MATRIX.md):
 *   events: org_admin, coach, staff, parent, fan, anonymous, cross-org
 *
 * Covers both public events (visibility='public') and private events (visibility='private').
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

describe('events', () => {
    // ── SELECT (public event) ──────────────────────────────────────
    describe('SELECT (public event)', () => {
        it('org_admin CAN read events', async () => {
            const result = await clients.orgAdmin
                .from('events').select('*').eq('id', seeded.eventId);
            expectSelectAllowed(result, [seeded.eventId]);
        });

        it('coach CAN read events in their org', async () => {
            const result = await clients.coach
                .from('events').select('*').eq('id', seeded.eventId);
            expectSelectAllowed(result, [seeded.eventId]);
        });

        it('staff CAN read all org events', async () => {
            const result = await clients.staff
                .from('events').select('*').eq('id', seeded.eventId);
            expectSelectAllowed(result, [seeded.eventId]);
        });

        it('parent CAN read events relevant to their child', async () => {
            const result = await clients.parent
                .from('events').select('*').eq('id', seeded.eventId);
            expectSelectAllowed(result, [seeded.eventId]);
        });

        it('fan CAN read public events', async () => {
            const result = await clients.fan
                .from('events').select('*').eq('id', seeded.eventId);
            // Public events should be readable by any authenticated user
            expectSelectAllowed(result, [seeded.eventId]);
        });

        it('anonymous CAN read public events', async () => {
            const result = await anonClient
                .from('events').select('*').eq('id', seeded.eventId);
            // Public events may be readable anonymously
            expectSelectAllowed(result, [seeded.eventId]);
        });
    });

    // ── SELECT (private event) ─────────────────────────────────────
    describe('SELECT (private event)', () => {
        it('org_admin CAN read private events', async () => {
            const result = await clients.orgAdmin
                .from('events').select('*').eq('id', seeded.privateEventId);
            expectSelectAllowed(result, [seeded.privateEventId]);
        });

        it('coach CAN read private events in their org', async () => {
            const result = await clients.coach
                .from('events').select('*').eq('id', seeded.privateEventId);
            expectSelectAllowed(result, [seeded.privateEventId]);
        });

        it('parent CAN read private events relevant to their child', async () => {
            const result = await clients.parent
                .from('events').select('*').eq('id', seeded.privateEventId);
            expectSelectAllowed(result, [seeded.privateEventId]);
        });

        it('fan CANNOT read private events', async () => {
            const result = await clients.fan
                .from('events').select('*').eq('id', seeded.privateEventId);
            expectSelectDenied(result, [seeded.privateEventId], 'either');
        });

        it('anonymous CANNOT read private events', async () => {
            const result = await anonClient
                .from('events').select('*').eq('id', seeded.privateEventId);
            expectSelectDenied(result, [seeded.privateEventId], 'either');
        });
    });

    // ── SELECT (cross-org) ─────────────────────────────────────────
    describe('SELECT (cross-org)', () => {
        it('org_admin CANNOT read events outside org (private)', async () => {
            const result = await clients.orgAdmin2
                .from('events').select('*').eq('id', seeded.privateEventId);
            expectSelectDenied(result, [seeded.privateEventId], 'either');
        });
    });

    // ── INSERT ──────────────────────────────────────────────────────
    describe('INSERT', () => {
        it('org_admin CAN create events', async () => {
            const result = await clients.orgAdmin
                .from('events')
                .insert({
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    title: testName('event_admin_insert'),
                    type: 'practice',
                    start_time: '2026-08-01T10:00:00Z',
                    end_time: '2026-08-01T12:00:00Z',
                    location: 'Test',
                    created_by_user_id: seeded.userIds.orgAdmin,
                    visibility: 'public',
                })
                .select();
            expectWriteAllowed(result);

            if (result.data?.[0]?.id) {
                await getServiceClient().from('events').delete().eq('id', result.data[0].id);
            }
        });

        it('parent CANNOT create events', async () => {
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
                    visibility: 'public',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT create events', async () => {
            const result = await clients.fan
                .from('events')
                .insert({
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    title: testName('event_fan_hack'),
                    type: 'practice',
                    start_time: '2026-08-01T10:00:00Z',
                    end_time: '2026-08-01T12:00:00Z',
                    created_by_user_id: seeded.userIds.fan,
                    visibility: 'public',
                })
                .select();
            expectWriteDenied(result, 'either');
        });

        it('anonymous CANNOT create events', async () => {
            const result = await anonClient
                .from('events')
                .insert({
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    title: testName('event_anon_hack'),
                    type: 'practice',
                    start_time: '2026-08-01T10:00:00Z',
                    end_time: '2026-08-01T12:00:00Z',
                    visibility: 'public',
                })
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── UPDATE ──────────────────────────────────────────────────────
    describe('UPDATE', () => {
        it('org_admin CAN update events', async () => {
            const result = await clients.orgAdmin
                .from('events')
                .update({ location: 'Updated Field' })
                .eq('id', seeded.eventId)
                .select();
            expectWriteAllowed(result);
        });

        it('parent CANNOT update events', async () => {
            const result = await clients.parent
                .from('events')
                .update({ location: 'Parent Hack Field' })
                .eq('id', seeded.eventId)
                .select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT update events', async () => {
            const result = await clients.fan
                .from('events')
                .update({ location: 'Fan Hack Field' })
                .eq('id', seeded.eventId)
                .select();
            expectWriteDenied(result, 'either');
        });
    });

    // ── DELETE ──────────────────────────────────────────────────────
    describe('DELETE', () => {
        it('coach CANNOT delete events', async () => {
            const result = await clients.coach
                .from('events').delete().eq('id', seeded.eventId).select();
            expectWriteDenied(result, 'either');
        });

        it('parent CANNOT delete events', async () => {
            const result = await clients.parent
                .from('events').delete().eq('id', seeded.eventId).select();
            expectWriteDenied(result, 'either');
        });

        it('fan CANNOT delete events', async () => {
            const result = await clients.fan
                .from('events').delete().eq('id', seeded.eventId).select();
            expectWriteDenied(result, 'either');
        });

        it('anonymous CANNOT delete events', async () => {
            const result = await anonClient
                .from('events').delete().eq('id', seeded.eventId).select();
            expectWriteDenied(result, 'either');
        });
    });
});
