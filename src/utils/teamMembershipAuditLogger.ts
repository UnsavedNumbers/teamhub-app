/**
 * Team Membership Audit Logger Utility
 * 
 * Provides functions to log team membership changes (transfers, additions, removals, status changes)
 * to the team_membership_audit table for compliance and tracking purposes.
 */

import { supabase } from '../lib/supabase'
import { USE_FAKE_DATA } from '../data/config'

export type TeamMembershipAuditAction = 'created' | 'transferred' | 'removed' | 'status_changed'

export interface TeamMembershipAuditParams {
  teamMembershipId: string
  athleteId: string
  fromTeamId: string | null
  toTeamId: string
  seasonId: string
  action: TeamMembershipAuditAction
  changedBy?: string | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  transferReason?: string | null
}

/**
 * Log a team membership audit event
 * 
 * This function logs changes to team memberships (transfers, additions, removals, status changes)
 * to the team_membership_audit table. Failures are logged but do not throw errors to ensure
 * that audit logging failures don't break the main operation.
 * 
 * @param params - Audit log parameters
 * @returns Promise that resolves when logging is complete (or silently fails)
 */
export async function logTeamMembershipAudit(
  params: TeamMembershipAuditParams
): Promise<void> {
  // Skip audit logging in demo/fake data mode
  if (USE_FAKE_DATA) {
    return
  }

  try {
    const { error } = await (supabase as any)
      .from('team_membership_audit')
      .insert({
        team_membership_id: params.teamMembershipId,
        athlete_id: params.athleteId,
        from_team_id: params.fromTeamId,
        to_team_id: params.toTeamId,
        season_id: params.seasonId,
        action: params.action,
        changed_by: params.changedBy || null,
        old_values: params.oldValues || null,
        new_values: params.newValues || null,
        transfer_reason: params.transferReason || null,
      })

    if (error) {
      console.error('Failed to log team membership audit:', error)
      // Don't throw - audit logging failure shouldn't break the operation
    }
  } catch (err) {
    console.error('Error logging team membership audit:', err)
    // Continue silently - audit is best effort
  }
}

/**
 * Log a player transfer audit event
 * 
 * Convenience function specifically for logging player transfers between teams.
 * 
 * @param params - Transfer audit parameters
 */
export async function logPlayerTransferAudit(params: {
  teamMembershipId: string
  athleteId: string
  fromTeamId: string
  toTeamId: string
  seasonId: string
  changedBy?: string | null
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  transferReason?: string | null
}): Promise<void> {
  return logTeamMembershipAudit({
    teamMembershipId: params.teamMembershipId,
    athleteId: params.athleteId,
    fromTeamId: params.fromTeamId,
    toTeamId: params.toTeamId,
    seasonId: params.seasonId,
    action: 'transferred',
    changedBy: params.changedBy,
    oldValues: params.oldValues,
    newValues: params.newValues,
    transferReason: params.transferReason,
  })
}
