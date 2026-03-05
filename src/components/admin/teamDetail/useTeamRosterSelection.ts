import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AthleteWorkspaceTab, TeamDetailPrimaryTab, TeamRosterSort, TeamRosterStatusFilter } from './types'

const VALID_PRIMARY_TABS: TeamDetailPrimaryTab[] = ['overview', 'schedule', 'attendance', 'payments', 'staff', 'settings', 'media']
const LEGACY_PRIMARY_TABS = new Map<string, TeamDetailPrimaryTab>([['coaches', 'staff'], ['galleries', 'media'], ['roster', 'overview']])
const VALID_ATHLETE_TABS: AthleteWorkspaceTab[] = ['summary', 'profile', 'sports', 'teams', 'guardians', 'medical', 'media']
const VALID_STATUS_FILTERS: TeamRosterStatusFilter[] = ['active', 'inactive', 'pending', 'all']
const VALID_SORTS: TeamRosterSort[] = ['name', 'jersey', 'status', 'attendance_risk']

interface UseTeamRosterSelectionArgs {
  rosterAthleteIds: string[]
}

export function useTeamRosterSelection({ rosterAthleteIds }: UseTeamRosterSelectionArgs) {
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = useMemo<TeamDetailPrimaryTab>(() => {
    const raw = searchParams.get('tab') || 'overview'
    const normalized = LEGACY_PRIMARY_TABS.get(raw) ?? raw
    return VALID_PRIMARY_TABS.includes(normalized as TeamDetailPrimaryTab)
      ? (normalized as TeamDetailPrimaryTab)
      : 'overview'
  }, [searchParams])

  const activeAthleteTab = useMemo<AthleteWorkspaceTab>(() => {
    const raw = searchParams.get('athleteTab') || 'summary'
    return VALID_ATHLETE_TABS.includes(raw as AthleteWorkspaceTab)
      ? (raw as AthleteWorkspaceTab)
      : 'summary'
  }, [searchParams])

  const selectedAthleteId = searchParams.get('athlete')
  const statusFilter = VALID_STATUS_FILTERS.includes((searchParams.get('status') || 'all') as TeamRosterStatusFilter)
    ? ((searchParams.get('status') || 'all') as TeamRosterStatusFilter)
    : 'all'
  const sort = VALID_SORTS.includes((searchParams.get('sort') || 'name') as TeamRosterSort)
    ? ((searchParams.get('sort') || 'name') as TeamRosterSort)
    : 'name'
  const search = searchParams.get('search') || ''

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    let changed = false

    if (!searchParams.get('tab')) {
      next.set('tab', 'overview')
      changed = true
    }

    if (selectedAthleteId && rosterAthleteIds.length > 0 && !rosterAthleteIds.includes(selectedAthleteId)) {
      next.delete('athlete')
      changed = true
    }

    if (!selectedAthleteId && rosterAthleteIds.length > 0 && activeTab === 'overview') {
      next.set('athlete', rosterAthleteIds[0])
      changed = true
    }

    if (changed) {
      setSearchParams(next, { replace: true })
    }
  }, [activeTab, rosterAthleteIds, searchParams, selectedAthleteId, setSearchParams])

  const updateParam = useCallback(
    (key: string, value: string | null, replace = false) => {
      const next = new URLSearchParams(searchParams)
      if (!value) {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      setSearchParams(next, { replace })
    },
    [searchParams, setSearchParams]
  )

  return {
    activeTab,
    activeAthleteTab,
    selectedAthleteId,
    statusFilter,
    sort,
    search,
    setActiveTab: (value: TeamDetailPrimaryTab) => updateParam('tab', value),
    setSelectedAthleteId: (value: string | null) => updateParam('athlete', value),
    setActiveAthleteTab: (value: AthleteWorkspaceTab) => updateParam('athleteTab', value),
    setStatusFilter: (value: TeamRosterStatusFilter) => updateParam('status', value === 'all' ? null : value, true),
    setSort: (value: TeamRosterSort) => updateParam('sort', value === 'name' ? null : value, true),
    setSearch: (value: string) => updateParam('search', value || null, true),
  }
}

