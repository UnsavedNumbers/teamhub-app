import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useUserContext } from './useUserContext'
import { getTeamsForCoach } from '../data/services/teamsService'
import { useQuery } from '@tanstack/react-query'

const STORAGE_KEY = 'coach_selected_team_id'
const URL_PARAM = 'team'

/**
 * Hook for coaches to manage team selection across portal pages
 * Reads from URL param, localStorage, or defaults to first team
 * Returns selectedTeamId, teams list, and helper functions
 */
export function useCoachTeamSelection() {
  const { context, isReady } = useUserContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  // Load coach's teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['coach-teams', context?.userId, context?.orgId],
    queryFn: async () => {
      if (!context) return []
      const { data, error } = await getTeamsForCoach(context)
      if (error) {
        console.error('Failed to load coach teams:', error)
        return []
      }
      return data || []
    },
    enabled: !!context && !!context.userId && !!context.orgId && isReady,
  })

  // Initialize selection from URL or localStorage
  useEffect(() => {
    if (!isReady || teamsLoading || teams.length === 0) return

    const urlTeamId = searchParams.get(URL_PARAM)
    const storedTeamId = localStorage.getItem(STORAGE_KEY)

    if (urlTeamId && teams.some(t => t.id === urlTeamId)) {
      setSelectedTeamId(urlTeamId)
    } else if (storedTeamId && teams.some(t => t.id === storedTeamId)) {
      setSelectedTeamId(storedTeamId)
    } else if (teams.length > 0) {
      // Default to first team
      setSelectedTeamId(teams[0].id)
    } else {
      setSelectedTeamId(null)
    }
  }, [teams, teamsLoading, isReady, searchParams])

  // Update URL and localStorage when selection changes
  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem(STORAGE_KEY, selectedTeamId)
      const newParams = new URLSearchParams(searchParams)
      newParams.set(URL_PARAM, selectedTeamId)
      setSearchParams(newParams, { replace: true })
    } else {
      localStorage.removeItem(STORAGE_KEY)
      const newParams = new URLSearchParams(searchParams)
      newParams.delete(URL_PARAM)
      setSearchParams(newParams, { replace: true })
    }
  }, [selectedTeamId, searchParams, setSearchParams])

  const updateTeamSelection = (teamId: string | null) => {
    setSelectedTeamId(teamId)
  }

  return {
    selectedTeamId,
    teams,
    isLoading: teamsLoading,
    updateTeamSelection,
    hasTeams: teams.length > 0,
  }
}
