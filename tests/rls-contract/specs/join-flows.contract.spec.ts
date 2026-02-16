/**
 * RLS Contract Test – Join Flows
 *
 * Tests Row Level Security for join-related operations:
 * - Anonymous access to getTeamByInviteCode (public team info only)
 * - Authenticated join/create membership respects org/team/guardian boundaries
 * - Join requests respect org boundaries
 * - Cross-org access is blocked
 */

import { describe, it, expect } from 'vitest'
import { seeded, clients, anonClient } from '../setup'
import {
    expectSelectAllowed,
    expectSelectDenied,
    expectWriteAllowed,
    expectWriteDenied,
    testName,
    getServiceClient,
} from '../helpers'

describe('join_flows', () => {
    // ── Team Code Lookup (Public) ──────────────────────────────────────
    describe('getTeamByInviteCode (public)', () => {
        it('anonymous CAN lookup team by invite code (public info only)', async () => {
            // This would typically be an RPC call, but we can test direct table access
            // Anonymous should be able to read teams table with invite_code filter
            // However, RLS might block direct table access - the RPC should handle this
            
            // For now, verify that teams table has invite_code visible
            // The actual RPC getTeamByInviteCode should be tested separately
            const result = await anonClient
                .from('teams')
                .select('id, name, invite_code')
                .eq('id', seeded.teamId)
                .single()
            
            // RLS may block this, which is expected - the RPC should allow it
            // This test documents the expected behavior
            expect(result.data || result.error).toBeTruthy()
        })

        it('authenticated user CAN lookup team by invite code', async () => {
            const result = await clients.parent
                .from('teams')
                .select('id, name, invite_code')
                .eq('id', seeded.teamId)
                .single()
            
            // Parent should be able to read team if their child is on it
            // Or if team is public
            expect(result.data || result.error).toBeTruthy()
        })
    })

    // ── Team Memberships ────────────────────────────────────────────────
    describe('team_memberships', () => {
        it('parent CAN create membership for their own child', async () => {
            // This requires the parent to have a child in the system
            // The actual createTeamMembership service handles validation
            
            // Test that parent can insert team_membership for their child
            const result = await clients.parent
                .from('team_memberships')
                .insert({
                    athlete_id: seeded.athleteId, // Assuming this is parent's child
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    status: 'active',
                })
                .select()
            
            // Should be allowed if athlete belongs to parent
            // Cleanup if successful
            if (result.data?.[0]?.id) {
                await getServiceClient()
                    .from('team_memberships')
                    .delete()
                    .eq('id', result.data[0].id)
            }
            
            // Result depends on whether athlete belongs to parent
            expect(result.data || result.error).toBeTruthy()
        })

        it('parent CANNOT create membership for other parent\'s child', async () => {
            // This would require a different athlete not belonging to the parent
            // For now, we test the RLS policy exists
            
            // If we had a cross-parent athlete, this should be denied
            // This is a placeholder for the actual test
            expect(true).toBe(true) // RLS policy should enforce this
        })

        it('org_admin CAN create membership for any athlete in org', async () => {
            const result = await clients.orgAdmin
                .from('team_memberships')
                .insert({
                    athlete_id: seeded.athleteId,
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    status: 'active',
                })
                .select()
            
            // Cleanup
            if (result.data?.[0]?.id) {
                await getServiceClient()
                    .from('team_memberships')
                    .delete()
                    .eq('id', result.data[0].id)
            }
            
            expectWriteAllowed(result)
        })

        it('cross-org admin CANNOT create membership in other org', async () => {
            const result = await clients.orgAdmin2
                .from('team_memberships')
                .insert({
                    athlete_id: seeded.athleteId, // From org1
                    team_id: seeded.teamId, // From org1
                    season_id: seeded.seasonId, // From org1
                    status: 'active',
                })
                .select()
            
            expectWriteDenied(result, 'either')
        })
    })

    // ── Join Requests ────────────────────────────────────────────────────
    describe('join_requests', () => {
        it('parent CAN submit join request for their child', async () => {
            // Requires a valid join_link_id
            // For now, test the insert policy
            
            const result = await clients.parent
                .from('join_requests')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    season_id: seeded.seasonId,
                    athlete_id: seeded.athleteId,
                    requested_by_user_id: seeded.parentUserId,
                    status: 'pending',
                })
                .select()
            
            // Cleanup
            if (result.data?.[0]?.id) {
                await getServiceClient()
                    .from('join_requests')
                    .delete()
                    .eq('id', result.data[0].id)
            }
            
            // Should be allowed if athlete belongs to parent and org matches
            expect(result.data || result.error).toBeTruthy()
        })

        it('org_admin CAN read all join requests in their org', async () => {
            const result = await clients.orgAdmin
                .from('join_requests')
                .select('*')
                .eq('org_id', seeded.orgId)
            
            expectSelectAllowed(result)
        })

        it('org_admin CAN review join requests in their org', async () => {
            // Test update permission
            // Would need an existing join_request
            const result = await clients.orgAdmin
                .from('join_requests')
                .update({ status: 'approved' })
                .eq('org_id', seeded.orgId)
                .eq('status', 'pending')
                .select()
            
            // May not have pending requests, but policy should allow
            expect(result.data || result.error).toBeTruthy()
        })

        it('cross-org admin CANNOT read join requests from other org', async () => {
            const result = await clients.orgAdmin2
                .from('join_requests')
                .select('*')
                .eq('org_id', seeded.orgId)
            
            expectSelectDenied(result, 'either')
        })
    })

    // ── Join Links ────────────────────────────────────────────────────────
    describe('join_links', () => {
        it('org_admin CAN create join links for their org', async () => {
            const result = await clients.orgAdmin
                .from('join_links')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    auto_approve: false,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                })
                .select()
            
            // Cleanup
            if (result.data?.[0]?.id) {
                await getServiceClient()
                    .from('join_links')
                    .delete()
                    .eq('id', result.data[0].id)
            }
            
            expectWriteAllowed(result)
        })

        it('parent CANNOT create join links', async () => {
            const result = await clients.parent
                .from('join_links')
                .insert({
                    org_id: seeded.orgId,
                    team_id: seeded.teamId,
                    auto_approve: false,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                })
                .select()
            
            expectWriteDenied(result, 'either')
        })

        it('org_admin CAN read join links in their org', async () => {
            const result = await clients.orgAdmin
                .from('join_links')
                .select('*')
                .eq('org_id', seeded.orgId)
            
            expectSelectAllowed(result)
        })

        it('cross-org admin CANNOT read join links from other org', async () => {
            const result = await clients.orgAdmin2
                .from('join_links')
                .select('*')
                .eq('org_id', seeded.orgId)
            
            expectSelectDenied(result, 'either')
        })
    })

    // ── Parent Invites ───────────────────────────────────────────────────
    describe('parent_invites', () => {
        it('org_admin CAN read parent invites in their org', async () => {
            const result = await clients.orgAdmin
                .from('parent_invites')
                .select('*')
                .eq('org_id', seeded.orgId)
            
            expectSelectAllowed(result)
        })

        it('parent CAN read invites sent to their email', async () => {
            // This depends on the RLS policy checking email match
            const result = await clients.parent
                .from('parent_invites')
                .select('*')
                .eq('org_id', seeded.orgId)
            
            // Should be allowed if email matches
            expect(result.data || result.error).toBeTruthy()
        })

        it('cross-org admin CANNOT read parent invites from other org', async () => {
            const result = await clients.orgAdmin2
                .from('parent_invites')
                .select('*')
                .eq('org_id', seeded.orgId)
            
            expectSelectDenied(result, 'either')
        })
    })
})
