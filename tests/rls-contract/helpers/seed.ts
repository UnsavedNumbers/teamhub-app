/**
 * RLS Contract Test – Seed helpers
 *
 * Seeds data into the remote TEST database using the service-role client.
 * Every seeded row is tagged with the unique `test_run_id` so teardown
 * can reliably delete ONLY test data.
 *
 * SAFETY NOTE: We never truncate tables or delete unscoped data.
 */

import { getServiceClient } from './supabase';
import { TEST_USERS, getUserId } from './auth';

// ── Test Run ID ────────────────────────────────────────────────────
/**
 * Unique per-test-run. Embedded into seeded rows via the `name` prefix pattern:
 *   __rls_test__<test_run_id>__<entity>
 *
 * This never collides with real data and is used for scoped teardown.
 */
export const TEST_RUN_ID = crypto.randomUUID();

/** Prefix all test-created names */
export function testName(entity: string): string {
    return `__rls_test__${TEST_RUN_ID}__${entity}`;
}

/** Check if a name belongs to this test run */
export function isTestRow(name: string | null | undefined): boolean {
    return !!name && name.startsWith(`__rls_test__${TEST_RUN_ID}__`);
}

// ── Seeded data references ─────────────────────────────────────────
export interface SeededData {
    testRunId: string;
    orgId: string;
    orgName: string;
    teamId: string;
    teamName: string;
    seasonId: string;
    /** Public event (visibility = 'public') */
    eventId: string;
    /** Private/members-only event (visibility = 'members') */
    privateEventId: string;
    athleteId: string;
    athleteName: string;
    guardianshipId: string;
    announcementId: string;
    galleryId: string;
    galleryPhotoId?: string;
    /** Video (visibility=team) – parent and athlete can see */
    videoTeamId?: string;
    /** Video (visibility=private) – no guardian/athlete */
    videoPrivateId?: string;
    /** Video (visibility=guardians) linked to athlete – parent and athlete can see */
    videoGuardianAthleteId?: string;
    /** Video (visibility=guardians) linked to athlete2 – parent can see, athlete cannot */
    videoGuardianAthlete2Id?: string;
    feeId?: string;
    feeAssignmentId?: string;
    ticketedEventId?: string;
    /** Map of user labels to user IDs */
    userIds: Record<string, string>;
    /** Organization membership IDs (for role escalation tests) */
    membershipIds: {
        orgAdmin: string;
        coach: string;
        parent: string;
        staff: string;
        athlete?: string;
    };
    /** Second athlete (sibling) for athlete isolation tests */
    athlete2Id?: string;
    /** Athlete user ID (linked to athlete record) */
    athleteUserId?: string;
}

// ── Main seed function ─────────────────────────────────────────────
export async function seedTestData(): Promise<SeededData> {
    const svc = getServiceClient();

    // 1. Resolve user IDs for all test users
    const userIds: Record<string, string> = {};
    for (const [key, user] of Object.entries(TEST_USERS)) {
        userIds[key] = await getUserId(user);
    }

    // 2. Create test organization
    const orgName = testName('org');
    const { data: org, error: orgErr } = await svc
        .from('organizations')
        .insert({
            name: orgName,
            slug: `rls-test-${TEST_RUN_ID.slice(0, 8)}`.toLowerCase(),
            status: 'active',
            license_status: 'active',
        })
        .select('id')
        .single();
    if (orgErr) throw new Error(`Seed organization failed: ${orgErr.message}`);
    const orgId = org.id;

    // 3. Create organization memberships for test users
    //    org_admin → orgAdmin user
    //    coach    → coach user
    //    parent   → parent user
    //    staff    → staff user (coach-multi@test.com)
    const memberships = [
        { org_id: orgId, user_id: userIds.orgAdmin, role: 'org_admin' },
        { org_id: orgId, user_id: userIds.coach, role: 'coach' },
        { org_id: orgId, user_id: userIds.parent, role: 'parent' },
        { org_id: orgId, user_id: userIds.staff, role: 'staff' },
    ];
    const { data: memData, error: memErr } = await svc
        .from('organization_members')
        .insert(memberships)
        .select('id, user_id, role');
    if (memErr) throw new Error(`Seed memberships failed: ${memErr.message}`);

    // Build membership ID map
    const membershipIds = {
        orgAdmin: memData!.find((m: any) => m.role === 'org_admin')!.id,
        coach: memData!.find((m: any) => m.role === 'coach')!.id,
        parent: memData!.find((m: any) => m.role === 'parent')!.id,
        staff: memData!.find((m: any) => m.role === 'staff')!.id,
    };

    // 4. Create a season (required for events + team_memberships)
    const { data: season, error: seasonErr } = await svc
        .from('seasons')
        .insert({
            org_id: orgId,
            name: testName('season'),
            start_date: '2026-01-01',
            end_date: '2026-12-31',
            is_active: true,
        })
        .select('id')
        .single();
    if (seasonErr) throw new Error(`Seed season failed: ${seasonErr.message}`);
    const seasonId = season.id;

    // 5. Create test team
    const teamName = testName('team');
    const { data: team, error: teamErr } = await svc
        .from('teams')
        .insert({
            org_id: orgId,
            name: teamName,
            invite_code: TEST_RUN_ID.slice(0, 8).toUpperCase(),
        })
        .select('id')
        .single();
    if (teamErr) throw new Error(`Seed team failed: ${teamErr.message}`);
    const teamId = team.id;

    // 6a. Create a PUBLIC event
    const { data: event, error: eventErr } = await svc
        .from('events')
        .insert({
            team_id: teamId,
            season_id: seasonId,
            title: testName('event_public'),
            type: 'practice',
            start_time: '2026-06-15T10:00:00Z',
            end_time: '2026-06-15T12:00:00Z',
            location: 'Test Field',
            created_by_user_id: userIds.orgAdmin,
            visibility: 'public',
        })
        .select('id')
        .single();
    if (eventErr) throw new Error(`Seed public event failed: ${eventErr.message}`);
    const eventId = event.id;

    // 6b. Create a PRIVATE event (members only)
    const { data: privEvent, error: privEventErr } = await svc
        .from('events')
        .insert({
            team_id: teamId,
            season_id: seasonId,
            title: testName('event_private'),
            type: 'practice',
            start_time: '2026-07-15T10:00:00Z',
            end_time: '2026-07-15T12:00:00Z',
            location: 'Private Field',
            created_by_user_id: userIds.orgAdmin,
            visibility: 'private',
        })
        .select('id')
        .single();
    if (privEventErr) throw new Error(`Seed private event failed: ${privEventErr.message}`);
    const privateEventId = privEvent.id;

    // 7. Create an athlete
    const athleteName = testName('athlete');
    const { data: athlete, error: athErr } = await svc
        .from('athletes')
        .insert({
            org_id: orgId,
            first_name: athleteName,
            last_name: 'Test',
            birthdate: '2015-01-15',
        })
        .select('id')
        .single();
    if (athErr) throw new Error(`Seed athlete failed: ${athErr.message}`);
    const athleteId = athlete.id;

    // 8. Create team membership for the athlete
    const { error: tmErr } = await svc
        .from('team_memberships')
        .insert({
            athlete_id: athleteId,
            team_id: teamId,
            season_id: seasonId,
            status: 'active',
        });
    if (tmErr) throw new Error(`Seed team_membership failed: ${tmErr.message}`);

    // 9. Create athlete_guardian link (parent → athlete)
    const { data: guardianship, error: guardErr } = await svc
        .from('athlete_guardians')
        .insert({
            athlete_id: athleteId,
            user_id: userIds.parent,
            org_id: orgId,
            status: 'active',
        })
        .select('id')
        .single();
    if (guardErr) throw new Error(`Seed guardianship failed: ${guardErr.message}`);
    const guardianshipId = guardianship.id;

    // 9b. Create second athlete (sibling) for athlete isolation tests
    const athlete2Name = testName('athlete2');
    const { data: athlete2, error: ath2Err } = await svc
        .from('athletes')
        .insert({
            org_id: orgId,
            first_name: athlete2Name,
            last_name: 'Test',
            birthdate: '2016-01-15',
        })
        .select('id')
        .single();
    if (ath2Err) throw new Error(`Seed athlete2 failed: ${ath2Err.message}`);
    const athlete2Id = athlete2.id;

    // 9c. Create team membership for athlete2
    const { error: tm2Err } = await svc
        .from('team_memberships')
        .insert({
            athlete_id: athlete2Id,
            team_id: teamId,
            season_id: seasonId,
            status: 'active',
        });
    if (tm2Err) throw new Error(`Seed team_membership for athlete2 failed: ${tm2Err.message}`);

    // 9d. Create athlete user and link to first athlete
    const athleteUserId = await getUserId(TEST_USERS.athlete);
    userIds.athlete = athleteUserId;
    
    // Link athlete user to athlete record
    const { error: linkErr } = await svc
        .from('athletes')
        .update({ user_id: athleteUserId })
        .eq('id', athleteId);
    if (linkErr) throw new Error(`Link athlete user failed: ${linkErr.message}`);

    // Add athlete role to organization_members
    const { data: athleteMembership, error: athleteMemErr } = await svc
        .from('organization_members')
        .insert({
            user_id: athleteUserId,
            org_id: orgId,
            role: 'athlete',
        })
        .select('id')
        .single();
    if (athleteMemErr) throw new Error(`Seed athlete membership failed: ${athleteMemErr.message}`);

    // 10. Create an announcement
    const { data: announcement, error: annErr } = await svc
        .from('announcements')
        .insert({
            org_id: orgId,
            team_id: teamId,
            author_id: userIds.orgAdmin,
            title: testName('announcement'),
            content: 'Contract test announcement content',
            priority: 'normal',
            type: 'general',
        })
        .select('id')
        .single();
    if (annErr) throw new Error(`Seed announcement failed: ${annErr.message}`);
    const announcementId = announcement.id;

    // 11. Create a gallery
    const { data: gallery, error: galErr } = await svc
        .from('galleries')
        .insert({
            org_id: orgId,
            gallery_type: 'org',
            name: testName('gallery'),
            allow_contributions: true,
            require_approval: false,
        })
        .select('id')
        .single();
    if (galErr) throw new Error(`Seed gallery failed: ${galErr.message}`);
    const galleryId = gallery.id;

    // 12. Create a fee
    let feeId: string | undefined;
    let feeAssignmentId: string | undefined;
    try {
        const { data: fee, error: feeErr } = await svc
            .from('fees')
            .insert({
                org_id: orgId,
                team_id: teamId,
                name: testName('fee'),
                amount_cents: 5000,
                currency: 'usd',
                status: 'published',
                type: 'registration',
                scope: 'team',
                created_by_user_id: userIds.orgAdmin,
            })
            .select('id')
            .single();
        if (!feeErr && fee) {
            feeId = fee.id;

            // Create fee assignment to parent's athlete
            const { data: feeAssign, error: faErr } = await svc
                .from('fee_assignments')
                .insert({
                    org_id: orgId,
                    fee_id: feeId,
                    athlete_id: athleteId,
                    parent_id: userIds.parent,
                    amount_cents: 5000,
                    status: 'unpaid',
                })
                .select('id')
                .single();
            if (!faErr && feeAssign) {
                feeAssignmentId = feeAssign.id;
            }
        }
    } catch {
        // Fees table might have additional constraints; ignore
    }

    // 12b. Create videos for RLS contract tests (guardian/athlete video library)
    let videoTeamId: string | undefined;
    let videoPrivateId: string | undefined;
    let videoGuardianAthleteId: string | undefined;
    let videoGuardianAthlete2Id: string | undefined;
    try {
        const { data: vTeam, error: vTeamErr } = await svc
            .from('videos')
            .insert({
                org_id: orgId,
                team_id: teamId,
                title: testName('video_team'),
                uploaded_by: userIds.coach,
                visibility: 'team',
                status: 'ready',
            })
            .select('id')
            .single();
        if (!vTeamErr && vTeam) videoTeamId = vTeam.id;

        const { data: vPrivate, error: vPrivateErr } = await svc
            .from('videos')
            .insert({
                org_id: orgId,
                team_id: teamId,
                title: testName('video_private'),
                uploaded_by: userIds.coach,
                visibility: 'private',
                status: 'ready',
            })
            .select('id')
            .single();
        if (!vPrivateErr && vPrivate) videoPrivateId = vPrivate.id;

        const { data: vGuardAth, error: vGuardAthErr } = await svc
            .from('videos')
            .insert({
                org_id: orgId,
                team_id: teamId,
                title: testName('video_guardians_athlete'),
                uploaded_by: userIds.coach,
                visibility: 'guardians',
                status: 'ready',
            })
            .select('id')
            .single();
        if (!vGuardAthErr && vGuardAth) {
            videoGuardianAthleteId = vGuardAth.id;
            await svc.from('video_athlete_links').insert({
                video_id: vGuardAth.id,
                athlete_id: athleteId,
                created_by: userIds.coach,
                link_type: 'appears',
            });
        }

        const { data: vGuardAth2, error: vGuardAth2Err } = await svc
            .from('videos')
            .insert({
                org_id: orgId,
                team_id: teamId,
                title: testName('video_guardians_athlete2'),
                uploaded_by: userIds.coach,
                visibility: 'guardians',
                status: 'ready',
            })
            .select('id')
            .single();
        if (!vGuardAth2Err && vGuardAth2) {
            videoGuardianAthlete2Id = vGuardAth2.id;
            await svc.from('video_athlete_links').insert({
                video_id: vGuardAth2.id,
                athlete_id: athlete2Id,
                created_by: userIds.coach,
                link_type: 'appears',
            });
        }
    } catch {
        // videos / video_athlete_links may have constraints; best-effort
    }

    // 13. Create a ticketed event
    let ticketedEventId: string | undefined;
    try {
        const { data: tEvt, error: teErr } = await svc
            .from('ticketed_events')
            .insert({
                org_id: orgId,
                title: testName('ticketed_event'),
                starts_at: '2026-07-01T18:00:00Z',
                ends_at: '2026-07-01T21:00:00Z',
                status: 'published',
                visibility: 'public',
            })
            .select('id')
            .single();
        if (!teErr && tEvt) {
            ticketedEventId = tEvt.id;
        }
    } catch {
        // ticketed_events might not exist or have different constraints
    }

    return {
        testRunId: TEST_RUN_ID,
        orgId,
        orgName,
        teamId,
        teamName,
        seasonId,
        eventId,
        privateEventId,
        athleteId,
        athleteName,
        guardianshipId,
        announcementId,
        galleryId,
        videoTeamId,
        videoPrivateId,
        videoGuardianAthleteId,
        videoGuardianAthlete2Id,
        feeId,
        feeAssignmentId,
        ticketedEventId,
        userIds,
        membershipIds: {
            ...membershipIds,
            athlete: athleteMembership?.id,
        },
        athlete2Id,
        athleteUserId,
    };
}
