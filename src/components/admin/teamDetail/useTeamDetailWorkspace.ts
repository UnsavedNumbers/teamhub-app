import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUserContext } from '../../../hooks/useUserContext'
import { getTeamDetails } from '../../../data/services/teamsService'
import { supabase } from '../../../lib/supabase'
import type { TeamDetailStats, TeamDetailSummary, TeamRosterMemberSummary, TeamSeasonSummary } from './types'

interface UseTeamDetailWorkspaceResult {
  team: TeamDetailSummary | null
  activeSeason: TeamSeasonSummary | null
  seasons: TeamSeasonSummary[]
  roster: TeamRosterMemberSummary[]
  teamStats: TeamDetailStats
  loading: boolean
  rosterLoading: boolean
  error: string | null
  refreshRoster: () => Promise<void>
}

function normalizeRosterStatus(status: string | null | undefined): 'active' | 'inactive' | 'pending' {
  if (status === 'inactive' || status === 'removed') return 'inactive'
  if (status === 'pending' || status === 'invited') return 'pending'
  return 'active'
}

function computeProfileCompletion(row: {
  first_name: string | null
  last_name: string | null
  birthdate: string | null
  phone: string | null
  email: string | null
  preferred_name: string | null
}): number {
  const checks = [row.first_name, row.last_name, row.birthdate, row.phone, row.email, row.preferred_name]
  const complete = checks.filter((value) => Boolean(value)).length
  return Math.round((complete / checks.length) * 100)
}

export function useTeamDetailWorkspace(teamId: string | null | undefined): UseTeamDetailWorkspaceResult {
  const { context, isReady } = useUserContext()
  const isMountedRef = useRef(true)
  const [team, setTeam] = useState<TeamDetailSummary | null>(null)
  const [activeSeason, setActiveSeason] = useState<TeamSeasonSummary | null>(null)
  const [seasons, setSeasons] = useState<TeamSeasonSummary[]>([])
  const [roster, setRoster] = useState<TeamRosterMemberSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchTeam = useCallback(async () => {
    if (!teamId || !isReady) {
      if (isMountedRef.current) {
        setLoading(false)
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: teamError } = await getTeamDetails(context, teamId)
      if (teamError || !data) {
        if (isMountedRef.current) {
          setError(teamError?.message || 'Team not found')
          setLoading(false)
        }
        return
      }

      const nextTeam: TeamDetailSummary = {
        id: data.id,
        name: data.name,
        orgId: (data as { org_id?: string | null }).org_id ?? context.orgId,
        sport: (data as { sport?: { name: string; id?: string | null } | null }).sport ?? null,
        program: (data as { program?: { name: string; id?: string | null } | null }).program ?? null,
        level: (data as { level?: { name: string; id?: string | null } | null }).level ?? null,
        minRosterSize: (data as { min_roster_size?: number | null }).min_roster_size ?? null,
        maxRosterSize: (data as { max_roster_size?: number | null }).max_roster_size ?? null,
        inviteCode: (data as { invite_code?: string | null }).invite_code ?? null,
      }

      const nextSeasons = (((data as { seasons?: TeamSeasonSummary[] }).seasons ?? []) as TeamSeasonSummary[])
        .map((season) => ({
          id: season.id,
          name: season.name,
          start_date: season.start_date,
          end_date: season.end_date,
          is_active: Boolean(season.is_active),
        }))
      const nextActiveSeason = nextSeasons.find((season) => season.is_active) ?? nextSeasons[0] ?? null

      if (!isMountedRef.current) return
      setTeam(nextTeam)
      setSeasons(nextSeasons)
      setActiveSeason(nextActiveSeason)
      if (!nextActiveSeason) {
        setLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load team')
        setLoading(false)
      }
    }
  }, [context, isReady, teamId])

  const fetchRoster = useCallback(async () => {
    if (!teamId || !activeSeason?.id || !isReady) {
      if (isMountedRef.current) {
        setRoster([])
        setRosterLoading(false)
        setLoading(false)
      }
      return
    }

    setRosterLoading(true)

    try {
      const { data, error: rosterError } = await supabase
        .from('team_memberships')
        .select(`
          id,
          athlete_id,
          jersey_number,
          position,
          status,
          role,
          registration_status,
          athlete:athletes(
            id,
            first_name,
            last_name,
            preferred_name,
            birthdate,
            phone,
            email,
            has_profile_photo,
            profile_photo_updated_at,
            jersey_number
          )
        `)
        .eq('team_id', teamId)
        .eq('season_id', activeSeason.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (rosterError) {
        throw rosterError
      }

      const rows = (data ?? []) as Array<{
        id: string
        athlete_id: string
        jersey_number: string | null
        position: string | null
        status: string | null
        role: string | null
        registration_status: string | null
        athlete: {
          id: string
          first_name: string | null
          last_name: string | null
          preferred_name: string | null
          birthdate: string | null
          phone: string | null
          email: string | null
          has_profile_photo: boolean | null
          profile_photo_updated_at: string | null
          jersey_number: string | null
        } | null
      }>

      const nextRoster: TeamRosterMemberSummary[] = rows.map((row) => {
        const athlete = row.athlete
        const firstName = athlete?.first_name ?? ''
        const lastName = athlete?.last_name ?? ''
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown Athlete'
        const status = normalizeRosterStatus(row.status)
        const profileCompletionScore = athlete
          ? computeProfileCompletion({
              first_name: athlete.first_name,
              last_name: athlete.last_name,
              birthdate: athlete.birthdate,
              phone: athlete.phone,
              email: athlete.email,
              preferred_name: athlete.preferred_name,
            })
          : 0

        const badges: string[] = []
        if (profileCompletionScore < 60) badges.push('needs profile')
        if (row.registration_status && row.registration_status !== 'registered') {
          badges.push(row.registration_status)
        }
        if (status === 'pending') badges.push('pending')

        return {
          membershipId: row.id,
          athleteId: row.athlete_id,
          firstName,
          lastName,
          fullName,
          preferredName: athlete?.preferred_name ?? null,
          jerseyNumber: row.jersey_number,
          fallbackJerseyNumber: athlete?.jersey_number ?? null,
          displayJerseyNumber: row.jersey_number ?? athlete?.jersey_number ?? null,
          position: row.position,
          status,
          role: row.role,
          registrationStatus: row.registration_status,
          birthdate: athlete?.birthdate ?? null,
          hasProfilePhoto: Boolean(athlete?.has_profile_photo),
          profilePhotoUpdatedAt: athlete?.profile_photo_updated_at ?? null,
          email: athlete?.email ?? null,
          phone: athlete?.phone ?? null,
          hasGuardian: null,
          profileCompletionScore,
          badges,
        }
      })

      if (!isMountedRef.current) return
      setRoster(nextRoster)
    } catch (err) {
      if (isMountedRef.current) {
        setRoster([])
        setError(err instanceof Error ? err.message : 'Failed to load roster')
      }
    } finally {
      if (isMountedRef.current) {
        setRosterLoading(false)
        setLoading(false)
      }
    }
  }, [activeSeason?.id, isReady, teamId])

  useEffect(() => {
    void fetchTeam()
  }, [fetchTeam])

  useEffect(() => {
    void fetchRoster()
  }, [fetchRoster])

  const teamStats = useMemo<TeamDetailStats>(() => {
    const activeAthletes = roster.filter((member) => member.status === 'active').length
    const pendingAthletes = roster.filter((member) => member.status === 'pending').length
    const inactiveAthletes = roster.filter((member) => member.status === 'inactive').length
    const maxRosterSize = team?.maxRosterSize ?? 0

    return {
      totalAthletes: roster.length,
      activeAthletes,
      pendingAthletes,
      inactiveAthletes,
      vacancies: maxRosterSize > 0 ? Math.max(0, maxRosterSize - activeAthletes) : 0,
    }
  }, [roster, team?.maxRosterSize])

  return {
    team,
    activeSeason,
    seasons,
    roster,
    teamStats,
    loading,
    rosterLoading,
    error,
    refreshRoster: fetchRoster,
  }
}

