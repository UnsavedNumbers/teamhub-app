/**
 * Notification Helper Functions
 * 
 * Helper functions to collect user IDs by role for notification distribution.
 * These functions abstract the database queries needed to find users with specific roles.
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import { debug } from '../../lib/debug'

/**
 * Collect team manager user IDs for a specific team.
 * Team managers are stored in the team_coaches table with role='team_manager'.
 * 
 * @param teamId - The team ID to collect managers for
 * @param excludeUserId - Optional user ID to exclude from results (e.g., the creator)
 * @returns Array of user IDs for team managers
 */
export async function collectTeamManagers(
  teamId: string,
  excludeUserId?: string | null
): Promise<string[]> {
  if (USE_FAKE_DATA) {
    debug.data('NotificationHelpers.collectTeamManagers', 'Skipped (fake data)', { teamId })
    return []
  }

  try {
    const { data: teamManagers, error } = await (supabase as any)
      .from('team_coaches')
      .select('coach_user_id')
      .eq('team_id', teamId)
      .eq('role', 'team_manager')
      .eq('status', 'active')

    if (error) {
      debug.error('NotificationHelpers.collectTeamManagers', 'Failed to query team managers', {
        error,
        teamId,
      })
      return []
    }

    if (!teamManagers || teamManagers.length === 0) {
      return []
    }

    const userIds = (teamManagers as Array<{ coach_user_id: string | null }>)
      .map((tm: { coach_user_id: string | null }) => tm.coach_user_id)
      .filter((id: string | null | undefined): id is string => id !== null && id !== undefined)
      .filter((id: string) => id !== excludeUserId)

    return userIds
  } catch (err) {
    debug.error('NotificationHelpers.collectTeamManagers', 'Exception collecting team managers', {
      error: err,
      teamId,
    })
    return []
  }
}

/**
 * Collect staff member user IDs for an organization.
 * Staff members are stored in organization_members with role='staff'.
 * 
 * Note: Currently collects all active staff for the org. Future enhancement could
 * filter by team assignments based on permissions JSONB.
 * 
 * @param orgId - The organization ID to collect staff for
 * @param teamId - Optional team ID to filter staff by team assignments (not yet implemented)
 * @param excludeUserId - Optional user ID to exclude from results
 * @returns Array of user IDs for staff members
 */
export async function collectStaffMembers(
  orgId: string,
  teamId?: string | null,
  excludeUserId?: string | null
): Promise<string[]> {
  if (USE_FAKE_DATA) {
    debug.data('NotificationHelpers.collectStaffMembers', 'Skipped (fake data)', { orgId, teamId })
    return []
  }

  try {
    // Query organization_members for staff role
    const { data: staffMembers, error } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('role', 'staff')
      .eq('is_active', true)

    if (error) {
      debug.error('NotificationHelpers.collectStaffMembers', 'Failed to query staff members', {
        error,
        orgId,
      })
      return []
    }

    if (!staffMembers || staffMembers.length === 0) {
      return []
    }

    let userIds = staffMembers
      .map((sm) => sm.user_id)
      .filter((id): id is string => id !== null && id !== undefined)
      .filter((id) => id !== excludeUserId)

    // TODO: Filter by team assignments if teamId is provided
    // This would require checking permissions JSONB or team assignment tables
    // For now, return all staff for the org
    if (teamId) {
      debug.data('NotificationHelpers.collectStaffMembers', 'Team filtering not yet implemented', {
        orgId,
        teamId,
      })
    }

    return userIds
  } catch (err) {
    debug.error('NotificationHelpers.collectStaffMembers', 'Exception collecting staff members', {
      error: err,
      orgId,
    })
    return []
  }
}

/**
 * Collect platform admin user IDs.
 * Platform admins are stored in the platform_admins table.
 * 
 * @param excludeUserId - Optional user ID to exclude from results
 * @returns Array of user IDs for platform admins
 */
export async function collectPlatformAdmins(excludeUserId?: string | null): Promise<string[]> {
  if (USE_FAKE_DATA) {
    debug.data('NotificationHelpers.collectPlatformAdmins', 'Skipped (fake data)', {})
    return []
  }

  try {
    const { data: platformAdmins, error } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('is_active', true)

    if (error) {
      debug.error('NotificationHelpers.collectPlatformAdmins', 'Failed to query platform admins', {
        error,
      })
      return []
    }

    if (!platformAdmins || platformAdmins.length === 0) {
      return []
    }

    const userIds = platformAdmins
      .map((pa) => pa.user_id)
      .filter((id): id is string => id !== null && id !== undefined)
      .filter((id) => id !== excludeUserId)

    return userIds
  } catch (err) {
    debug.error('NotificationHelpers.collectPlatformAdmins', 'Exception collecting platform admins', {
      error: err,
    })
    return []
  }
}

/**
 * Collect athlete user IDs for a specific team.
 * 
 * Note: Currently, athletes don't have user accounts, so this returns an empty array.
 * This function is provided for future use when athletes may have their own user accounts.
 * For now, athlete notifications should go to their guardians.
 * 
 * @param teamId - The team ID to collect athletes for
 * @param excludeUserId - Optional user ID to exclude from results
 * @returns Array of user IDs for athletes (currently always empty)
 */
export async function collectAthletes(
  teamId: string,
  _excludeUserId?: string | null
): Promise<string[]> {
  if (USE_FAKE_DATA) {
    debug.data('NotificationHelpers.collectAthletes', 'Skipped (fake data)', { teamId })
    return []
  }

  // TODO: When athletes have user accounts, implement query:
  // SELECT DISTINCT a.user_id
  // FROM team_memberships tm
  // JOIN athletes a ON tm.athlete_id = a.id
  // WHERE tm.team_id = teamId
  //   AND tm.status = 'active'
  //   AND a.user_id IS NOT NULL
  //   AND a.user_id != excludeUserId

  debug.data('NotificationHelpers.collectAthletes', 'Athletes do not yet have user accounts', {
    teamId,
  })
  return []
}
