/**
 * RLS Contract Test – Teardown helpers
 *
 * Deletes ONLY rows created by this test run, identified by the
 * `__rls_test__<test_run_id>__` prefix in name/title columns.
 *
 * Deletion order respects foreign keys (children before parents).
 *
 * SAFETY: Never truncates tables. Never deletes unscoped rows.
 */

import { getServiceClient } from './supabase';
import { TEST_RUN_ID, testName } from './seed';
import type { SeededData } from './seed';

/**
 * Tear down all test data by explicit IDs and name patterns.
 * Uses service-role client (bypasses RLS) for reliable cleanup.
 */
export async function teardownTestData(seeded: SeededData): Promise<void> {
    const svc = getServiceClient();
    const namePrefix = `__rls_test__${TEST_RUN_ID}__`;

    // Delete in FK-safe order (leaf → root)

    // 1. Storage objects (test prefix)
    try {
        const { data: files } = await svc.storage
            .from('public-media')
            .list(`__rls_test__/${TEST_RUN_ID}`);
        if (files && files.length > 0) {
            await svc.storage
                .from('public-media')
                .remove(files.map((f) => `__rls_test__/${TEST_RUN_ID}/${f.name}`));
        }
    } catch {
        // Storage cleanup is best-effort
    }

    // 2. Videos (created by spec-level beforeAll)
    try {
        await svc.from('videos').delete().like('title', `${namePrefix}%`);
    } catch {
        // Best-effort
    }

    // 3. Gallery photos
    await svc.from('gallery_photos').delete().eq('gallery_id', seeded.galleryId);

    // 4. Gallery
    await svc.from('galleries').delete().eq('id', seeded.galleryId);
    // Also clean up any galleries created during tests
    try {
        await svc.from('galleries').delete().like('name', `${namePrefix}%`);
    } catch { /* best-effort */ }

    // 5. Fee assignments
    if (seeded.feeAssignmentId) {
        await svc.from('fee_assignments').delete().eq('id', seeded.feeAssignmentId);
    }

    // 6. Fees
    if (seeded.feeId) {
        await svc.from('fees').delete().eq('id', seeded.feeId);
    }

    // 7. Ticketed events
    if (seeded.ticketedEventId) {
        // Delete ticket_types, tickets, ticket_orders first
        try {
            await svc.from('ticket_types').delete().eq('ticketed_event_id', seeded.ticketedEventId);
        } catch { /* may not exist */ }
        await svc.from('ticketed_events').delete().eq('id', seeded.ticketedEventId);
    }

    // 8. Fan bookmarks for our events
    await svc.from('fan_event_bookmarks').delete().eq('event_id', seeded.eventId);
    await svc.from('fan_event_bookmarks').delete().eq('event_id', seeded.privateEventId);

    // 9. Fan org follows for our org
    await svc.from('fan_org_follows').delete().eq('org_id', seeded.orgId);

    // 10. Announcements (seeded + any created by tests)
    await svc.from('announcements').delete().eq('id', seeded.announcementId);
    try {
        await svc.from('announcements').delete().like('title', `${namePrefix}%`);
    } catch { /* best-effort */ }

    // 11. Event RSVPs
    await svc.from('event_rsvps').delete().eq('event_id', seeded.eventId);
    await svc.from('event_rsvps').delete().eq('event_id', seeded.privateEventId);

    // 12. Events (public + private)
    await svc.from('events').delete().eq('id', seeded.eventId);
    await svc.from('events').delete().eq('id', seeded.privateEventId);

    // 13. Athlete guardians
    await svc.from('athlete_guardians').delete().eq('id', seeded.guardianshipId);
    // Clean up any guardians created by tests
    try {
        await svc.from('athlete_guardians').delete().eq('athlete_id', seeded.athleteId);
    } catch { /* best-effort */ }

    // 14. Team memberships
    await svc.from('team_memberships').delete().eq('team_id', seeded.teamId);

    // 15. Athletes
    await svc.from('athletes').delete().eq('id', seeded.athleteId);

    // 16. Teams (seeded + any created by tests)
    await svc.from('teams').delete().eq('id', seeded.teamId);
    try {
        await svc.from('teams').delete().like('name', `${namePrefix}%`);
    } catch { /* best-effort */ }

    // 17. Seasons
    await svc.from('seasons').delete().eq('id', seeded.seasonId);

    // 18. Organization members (including staff)
    await svc.from('organization_members').delete().eq('org_id', seeded.orgId);

    // 19. Org settings (cascade-dependent tables)
    const orgSettingsTables = [
        'organization_settings',
        'organization_contacts',
        'organization_notification_settings',
        'organization_visibility_settings',
        'org_licenses',
        'org_storage_usage',
    ];
    for (const table of orgSettingsTables) {
        try {
            await svc.from(table).delete().eq('org_id', seeded.orgId);
        } catch {
            // Some tables may not exist or have different FK structure
        }
    }

    // 20. Organization (root)
    await svc.from('organizations').delete().eq('id', seeded.orgId);
}

/**
 * Fallback: delete any stale test data from previous runs
 * that may have been left behind due to test crashes.
 *
 * Scans by name prefix `__rls_test__` (without run-specific ID).
 * Only call this manually or in a dedicated cleanup step.
 */
export async function cleanupStaleTestData(): Promise<void> {
    const svc = getServiceClient();

    // Find stale organizations (name starts with __rls_test__)
    const { data: staleOrgs } = await svc
        .from('organizations')
        .select('id')
        .like('name', '__rls_test__%');

    if (!staleOrgs || staleOrgs.length === 0) return;

    for (const org of staleOrgs) {
        // Best-effort cascade delete
        const tables = [
            'gallery_photos',
            'galleries',
            'fee_assignments',
            'fees',
            'fan_event_bookmarks',
            'fan_org_follows',
            'announcements',
            'athlete_guardians',
            'team_memberships',
            'event_rsvps',
            'events',
            'athletes',
            'teams',
            'seasons',
            'organization_members',
        ];

        for (const table of tables) {
            try {
                await svc.from(table).delete().eq('org_id', org.id);
            } catch {
                // Table might not have org_id or might fail on FK
            }
        }

        await svc.from('organizations').delete().eq('id', org.id);
    }
}
