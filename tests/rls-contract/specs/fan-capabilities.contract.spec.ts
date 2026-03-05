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
    expectSelectAllowed,
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
                const userIds = result.data.map((r: { user_id: string }) => r.user_id);
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

describe('fan_team_follows', () => {
    describe('INSERT/SELECT/DELETE', () => {
        it('fan CAN manage own team follow row', async () => {
            const svc = getServiceClient();
            await svc
                .from('fan_team_follows')
                .delete()
                .eq('fan_user_id', seeded.userIds.fan)
                .eq('team_id', seeded.teamId);

            const inserted = await clients.fan
                .from('fan_team_follows')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    fan_user_id: seeded.userIds.fan,
                })
                .select('id');
            expectWriteAllowed(inserted);

            const selected = await clients.fan
                .from('fan_team_follows')
                .select('id')
                .eq('fan_user_id', seeded.userIds.fan)
                .eq('team_id', seeded.teamId);
            expectSelectAllowed(selected);

            const deleted = await clients.fan
                .from('fan_team_follows')
                .delete()
                .eq('fan_user_id', seeded.userIds.fan)
                .eq('team_id', seeded.teamId)
                .select('id');
            expect(deleted.error).toBeNull();
        });

        it('fan CANNOT insert team follow for another user', async () => {
            const result = await clients.fan
                .from('fan_team_follows')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    fan_user_id: seeded.userIds.orgAdmin,
                })
                .select('id');
            expectWriteDenied(result, 'either');
        });
    });

    describe('SELECT', () => {
        it('fan CANNOT read another fan user follow row', async () => {
            const svc = getServiceClient();
            await svc
                .from('fan_team_follows')
                .delete()
                .eq('fan_user_id', seeded.userIds.parent)
                .eq('team_id', seeded.teamId);
            const { data: seededFollow } = await svc
                .from('fan_team_follows')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    fan_user_id: seeded.userIds.parent,
                })
                .select('id')
                .single();

            const result = await clients.fan
                .from('fan_team_follows')
                .select('id, fan_user_id')
                .eq('id', seededFollow!.id);
            if (result.error) {
                return;
            }
            expect(result.data ?? []).toHaveLength(0);
        });

        it('org_admin CAN read team follows for their org', async () => {
            const svc = getServiceClient();
            await svc
                .from('fan_team_follows')
                .delete()
                .eq('fan_user_id', seeded.userIds.fan)
                .eq('team_id', seeded.teamId);
            const { data: seededFollow } = await svc
                .from('fan_team_follows')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    fan_user_id: seeded.userIds.fan,
                })
                .select('id')
                .single();

            const result = await clients.orgAdmin
                .from('fan_team_follows')
                .select('id')
                .eq('id', seededFollow!.id);
            expectSelectAllowed(result, [seededFollow!.id]);
        });
    });
});

describe('fan_athlete_follows', () => {
    describe('INSERT/SELECT/DELETE', () => {
        it('fan CAN manage own athlete follow row', async () => {
            const svc = getServiceClient();
            await svc
                .from('fan_athlete_follows')
                .delete()
                .eq('fan_user_id', seeded.userIds.fan)
                .eq('athlete_id', seeded.athleteId);

            const inserted = await clients.fan
                .from('fan_athlete_follows')
                .insert({
                    org_id: seeded.orgId,
                    athlete_id: seeded.athleteId,
                    fan_user_id: seeded.userIds.fan,
                })
                .select('id');
            expectWriteAllowed(inserted);

            const selected = await clients.fan
                .from('fan_athlete_follows')
                .select('id')
                .eq('fan_user_id', seeded.userIds.fan)
                .eq('athlete_id', seeded.athleteId);
            expectSelectAllowed(selected);

            const deleted = await clients.fan
                .from('fan_athlete_follows')
                .delete()
                .eq('fan_user_id', seeded.userIds.fan)
                .eq('athlete_id', seeded.athleteId)
                .select('id');
            expect(deleted.error).toBeNull();
        });

        it('fan CANNOT insert athlete follow for another user', async () => {
            const result = await clients.fan
                .from('fan_athlete_follows')
                .insert({
                    org_id: seeded.orgId,
                    athlete_id: seeded.athleteId,
                    fan_user_id: seeded.userIds.orgAdmin,
                })
                .select('id');
            expectWriteDenied(result, 'either');
        });
    });

    describe('SELECT', () => {
        it('fan CANNOT read another fan user athlete follow row', async () => {
            const svc = getServiceClient();
            await svc
                .from('fan_athlete_follows')
                .delete()
                .eq('fan_user_id', seeded.userIds.parent)
                .eq('athlete_id', seeded.athleteId);
            const { data: seededFollow } = await svc
                .from('fan_athlete_follows')
                .insert({
                    org_id: seeded.orgId,
                    athlete_id: seeded.athleteId,
                    fan_user_id: seeded.userIds.parent,
                })
                .select('id')
                .single();

            const result = await clients.fan
                .from('fan_athlete_follows')
                .select('id, fan_user_id')
                .eq('id', seededFollow!.id);
            if (result.error) {
                return;
            }
            expect(result.data ?? []).toHaveLength(0);
        });

        it('org_admin CAN read athlete follows for their org', async () => {
            const svc = getServiceClient();
            await svc
                .from('fan_athlete_follows')
                .delete()
                .eq('fan_user_id', seeded.userIds.fan)
                .eq('athlete_id', seeded.athleteId);
            const { data: seededFollow } = await svc
                .from('fan_athlete_follows')
                .insert({
                    org_id: seeded.orgId,
                    athlete_id: seeded.athleteId,
                    fan_user_id: seeded.userIds.fan,
                })
                .select('id')
                .single();

            const result = await clients.orgAdmin
                .from('fan_athlete_follows')
                .select('id')
                .eq('id', seededFollow!.id);
            expectSelectAllowed(result, [seededFollow!.id]);
        });
    });
});

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
                const userIds = result.data.map((r: { user_id: string }) => r.user_id);
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
