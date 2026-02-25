/**
 * Hook to check if a coach can access a specific team
 * 
 * Coaches can only access teams they are assigned to via team_coaches table.
 * This hook verifies team access for coaches and provides loading/error states.
 */

import { useQuery } from '@tanstack/react-query'
import { useUserContext } from './useUserContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { getTeamsForCoach } from '@/data/services/teamsService'
import { hasAnyRole } from '@/utils/roleHelpers'

/**
 * Check if current user (coach) can access a specific team
 * @param teamId - Team ID to check access for
 * @returns Object with canAccess boolean, isLoading, and error
 */
export function useCoachTeamAccess(teamId: string | null | undefined) {
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  
  const isOrgAdmin = hasAnyRole(currentOrganization, ['org_admin'])
  const isCoach = hasAnyRole(currentOrganization, ['coach'])
  
  // Org admins can access all teams
  if (isOrgAdmin || !isCoach) {
    return {
      canAccess: true,
      isLoading: false,
      error: null,
    }
  }
  
  // If not a coach or no teamId, cannot access
  if (!isCoach || !teamId) {
    return {
      canAccess: false,
      isLoading: false,
      error: null,
    }
  }
  
  // For coaches, check if team is in their assigned teams
  const { data: coachTeams = [], isLoading, error } = useQuery({
    queryKey: ['coach-teams', context?.userId, context?.orgId],
    queryFn: async () => {
      if (!context) return []
      const { data, error: fetchError } = await getTeamsForCoach(context)
      if (fetchError) {
        console.error('Failed to load coach teams:', fetchError)
        return []
      }
      return data || []
    },
    enabled: !!context && !!context.userId && !!context.orgId && isReady && isCoach,
  })
  
  const canAccess = coachTeams.some(team => team.id === teamId)
  
  return {
    canAccess,
    isLoading,
    error: error ? (error instanceof Error ? error : new Error('Unknown error')) : null,
  }
}
