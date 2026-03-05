/**
 * Filter Summary Component
 *
 * Displays active filters as compact chips in a horizontal row.
 * Shows date range, season, sport, program, team, and other active filters.
 */

import { useReporting } from '../../contexts/ReportingContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function FilterSummary() {
  const { scope, dateRange, datePreset } = useReporting()

  // Fetch filter option names for display
  const { data: season } = useQuery({
    queryKey: ['season', scope.seasonId],
    queryFn: async () => {
      if (!scope.seasonId) return null
      const { data } = await supabase.from('seasons').select('name').eq('id', scope.seasonId).single()
      return data?.name || null
    },
    enabled: !!scope.seasonId,
  })

  const { data: sport } = useQuery({
    queryKey: ['sport', scope.sportId],
    queryFn: async () => {
      if (!scope.sportId) return null
      const { data } = await supabase.from('sports').select('name').eq('id', scope.sportId).single()
      return data?.name || null
    },
    enabled: !!scope.sportId,
  })

  const { data: program } = useQuery({
    queryKey: ['program', scope.programId],
    queryFn: async () => {
      if (!scope.programId) return null
      const { data } = await supabase.from('programs').select('name').eq('id', scope.programId).single()
      return data?.name || null
    },
    enabled: !!scope.programId,
  })

  const { data: team } = useQuery({
    queryKey: ['team', scope.teamId],
    queryFn: async () => {
      if (!scope.teamId) return null
      const { data } = await supabase.from('teams').select('name').eq('id', scope.teamId).single()
      return data?.name || null
    },
    enabled: !!scope.teamId,
  })

  const activeFilters: Array<{ label: string; value: string }> = []

  // Date range
  if (datePreset) {
    const presetLabels: Record<string, string> = {
      today: 'Today',
      this_week: 'This Week',
      this_month: 'This Month',
      this_season: 'Season to Date',
      last_7_days: 'Last 7 Days',
      last_30_days: 'Last 30 Days',
      last_90_days: 'Last 90 Days',
      custom: 'Custom Range',
    }
    activeFilters.push({ label: 'Date', value: presetLabels[datePreset] || datePreset })
  } else if (dateRange) {
    const start = new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const end = new Date(dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    activeFilters.push({ label: 'Date', value: `${start} - ${end}` })
  }

  // Season
  if (season) {
    activeFilters.push({ label: 'Season', value: season })
  }

  // Sport
  if (sport) {
    activeFilters.push({ label: 'Sport', value: sport })
  }

  // Program
  if (program) {
    activeFilters.push({ label: 'Program', value: program })
  }

  // Team
  if (team) {
    activeFilters.push({ label: 'Team', value: team })
  }

  if (activeFilters.length === 0) {
    return (
      <span
        style={{
          fontSize: '14px',
          color: 'var(--org-text-secondary)',
          fontStyle: 'italic',
        }}
      >
        No filters applied
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {activeFilters.map((filter, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'var(--org-surface-secondary)',
            border: '1px solid var(--org-border-default)',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          <span style={{ color: 'var(--org-text-secondary)', fontWeight: '500' }}>{filter.label}:</span>
          <span style={{ color: 'var(--org-text-primary)', fontWeight: '600' }}>{filter.value}</span>
        </div>
      ))}
    </div>
  )
}
