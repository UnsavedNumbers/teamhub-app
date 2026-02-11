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

    // 2. Gallery photos
    await svc.from('gallery_photos').delete().eq('gallery_id', seeded.galleryId);

    // 3. Gallery
    await svc.from('galleries').delete().eq('id', seeded.galleryId);

    // 4. Fee assignments
    if (seeded.feeAssignmentId) {
        await svc.from('fee_assignments').delete().eq('id', seeded.feeAssignmentId);
    }

    // 5. Fees
    if (seeded.feeId) {
        await svc.from('fees').delete().eq('id', seeded.feeId);
    }

    // 6. Ticketed events
    if (seeded.ticketedEventId) {
        // Delete ticket_types, tickets, ticket_orders first
        await svc.from('ticket_types').delete().eq('ticketed_event_id', seeded.ticketedEventId);
        await svc.from('ticketed_events').delete().eq('id', seeded.ticketedEventId);
    }

    // 7. Fan bookmarks for our event
    await svc.from('fan_event_bookmarks').delete().eq('event_id', seeded.eventId);

    // 8. Fan org follows for our org
    await svc.from('fan_org_follows').delete().eq('org_id', seeded.orgId);

    // 9. Announcements
    await svc.from('announcements').delete().eq('id', seeded.announcementId);

    // 10. Event RSVPs
    await svc.from('event_rsvps').delete().eq('event_id', seeded.eventId);

    // 11. Events
    await svc.from('events').delete().eq('id', seeded.eventId);

    // 12. Athlete guardians
    await svc.from('athlete_guardians').delete().eq('id', seeded.guardianshipId);

    // 13. Team memberships
    await svc.from('team_memberships').delete().eq('team_id', seeded.teamId);

    // 14. Athletes
    await svc.from('athletes').delete().eq('id', seeded.athleteId);

    // 15. Teams
    await svc.from('teams').delete().eq('id', seeded.teamId);

    // 16. Seasons
    await svc.from('seasons').delete().eq('id', seeded.seasonId);

    // 17. Organization members
    await svc.from('organization_members').delete().eq('org_id', seeded.orgId);

    // 18. Org settings (cascade-dependent tables)
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

    // 19. Organization (root)
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
            'announcements',
            'athlete_guardians',
            'team_memberships',
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
