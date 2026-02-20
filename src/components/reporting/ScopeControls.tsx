/**
 * Scope Controls Component
 *
 * Global scope selector for the reporting console.
 * Provides cascading selectors for org, sub-org, season, sport, program, level, team, and date range.
 */

import { useReporting } from '../../contexts/ReportingContext'
import { Select } from '../admin/Select'
import { DatePicker } from '../admin/DatePicker'
import { useT } from '../../i18n/useI18n'
import { supabase } from '../../lib/supabase'
import { useQuery } from '@tanstack/react-query'

interface ScopeControlsProps {
  className?: string
}

export function ScopeControls({ className = '' }: ScopeControlsProps) {
  const t = useT()
  const { scope, setScope, dateRange, setDateRange, setDatePreset, datePreset } = useReporting()

  // Fetch sub-orgs
  const { data: subOrgs } = useQuery({
    queryKey: ['subOrgs', scope.orgId],
    queryFn: async () => {
      if (!scope.orgId) return []
      const { data } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('parent_org_id', scope.orgId)
        .order('name')
      return (data || []).map((org) => ({ id: org.id, name: org.name }))
    },
    enabled: !!scope.orgId,
  })

  // Fetch seasons
  const { data: seasons } = useQuery({
    queryKey: ['seasons', scope.orgId],
    queryFn: async () => {
      if (!scope.orgId) return []
      const { data } = await supabase
        .from('seasons')
        .select('id, name')
        .eq('org_id', scope.orgId)
        .order('name')
      return (data || []).map((s) => ({ id: s.id, name: s.name }))
    },
    enabled: !!scope.orgId,
  })

  // Fetch sports
  const { data: sports } = useQuery({
    queryKey: ['sports', scope.orgId],
    queryFn: async () => {
      if (!scope.orgId) return []
      const { data } = await supabase
        .from('sports')
        .select('id, name')
        .eq('org_id', scope.orgId)
        .order('name')
      return (data || []).map((s) => ({ id: s.id, name: s.name }))
    },
    enabled: !!scope.orgId,
  })

  // Fetch programs (filtered by sport if selected)
  const { data: programs } = useQuery({
    queryKey: ['programs', scope.orgId, scope.sportId],
    queryFn: async () => {
      if (!scope.orgId) return []
      let query = supabase
        .from('programs')
        .select('id, name')
        .eq('org_id', scope.orgId)
      if (scope.sportId) {
        query = query.eq('sport_id', scope.sportId)
      }
      const { data } = await query.order('name')
      return (data || []).map((p) => ({ id: p.id, name: p.name }))
    },
    enabled: !!scope.orgId,
  })

  // Fetch levels (filtered by program if selected)
  const { data: levels } = useQuery({
    queryKey: ['levels', scope.orgId, scope.programId],
    queryFn: async () => {
      if (!scope.orgId) return []
      let query = supabase
        .from('levels')
        .select('id, name')
        .eq('org_id', scope.orgId)
      if (scope.programId) {
        query = query.eq('program_id', scope.programId)
      }
      const { data } = await query.order('name')
      return (data || []).map((l) => ({ id: l.id, name: l.name }))
    },
    enabled: !!scope.orgId,
  })

  // Fetch teams (filtered by level if selected)
  const { data: teams } = useQuery({
    queryKey: ['teams', scope.orgId, scope.levelId],
    queryFn: async () => {
      if (!scope.orgId) return []
      let query = supabase
        .from('teams')
        .select('id, name')
        .eq('org_id', scope.orgId)
      if (scope.levelId) {
        query = query.eq('level_id', scope.levelId)
      }
      const { data } = await query.order('name')
      return (data || []).map((t) => ({ id: t.id, name: t.name }))
    },
    enabled: !!scope.orgId,
  })

  const handleSubOrgChange = (value: string) => {
    setScope({ subOrgId: value || null })
  }

  const handleSeasonChange = (value: string) => {
    setScope({ seasonId: value || null })
  }

  const handleSportChange = (value: string) => {
    setScope({ sportId: value || null, programId: null, levelId: null, teamId: null })
  }

  const handleProgramChange = (value: string) => {
    setScope({ programId: value || null, levelId: null, teamId: null })
  }

  const handleLevelChange = (value: string) => {
    setScope({ levelId: value || null, teamId: null })
  }

  const handleTeamChange = (value: string) => {
    setScope({ teamId: value || null })
  }

  const handleDatePresetChange = (value: string) => {
    if (value === '') {
      setDatePreset(null)
      setDateRange(null)
    } else {
      setDatePreset(value as typeof datePreset)
    }
  }

  const handleDateFromChange = (value: string) => {
    if (!value) {
      setDateRange(null)
      return
    }
    const end = dateRange?.end || value
    setDateRange({ start: value, end })
    setDatePreset('custom')
  }

  const handleDateToChange = (value: string) => {
    if (!value) {
      setDateRange(null)
      return
    }
    const start = dateRange?.start || value
    setDateRange({ start, end: value })
    setDatePreset('custom')
  }

  return (
    <div className={`oa-reporting-scope-controls ${className}`} style={{ padding: '16px', borderBottom: '1px solid var(--org-border-color)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Sub-Organization */}
        {subOrgs && subOrgs.length > 0 && (
          <Select
            label={t('admin.reporting.scope.subOrg')}
            value={scope.subOrgId || ''}
            onChange={(e) => handleSubOrgChange(e.target.value)}
            options={[
              { value: '', label: t('admin.reporting.scope.allSubOrgs') },
              ...subOrgs.map((org) => ({ value: org.id, label: org.name })),
            ]}
          />
        )}

        {/* Season */}
        <Select
          label={t('admin.reporting.scope.season')}
          value={scope.seasonId || ''}
          onChange={(e) => handleSeasonChange(e.target.value)}
          options={[
            { value: '', label: t('admin.reporting.scope.allSeasons') },
            ...(seasons || []).map((s) => ({ value: s.id, label: s.name })),
          ]}
        />

        {/* Sport */}
        <Select
          label={t('admin.reporting.scope.sport')}
          value={scope.sportId || ''}
          onChange={(e) => handleSportChange(e.target.value)}
          options={[
            { value: '', label: t('admin.reporting.scope.allSports') },
            ...(sports || []).map((s) => ({ value: s.id, label: s.name })),
          ]}
        />

        {/* Program */}
        <Select
          label={t('admin.reporting.scope.program')}
          value={scope.programId || ''}
          onChange={(e) => handleProgramChange(e.target.value)}
          disabled={!scope.sportId && (programs?.length || 0) > 0}
          options={[
            { value: '', label: t('admin.reporting.scope.allPrograms') },
            ...(programs || []).map((p) => ({ value: p.id, label: p.name })),
          ]}
        />

        {/* Level */}
        <Select
          label={t('admin.reporting.scope.level')}
          value={scope.levelId || ''}
          onChange={(e) => handleLevelChange(e.target.value)}
          disabled={!scope.programId && (levels?.length || 0) > 0}
          options={[
            { value: '', label: t('admin.reporting.scope.allLevels') },
            ...(levels || []).map((l) => ({ value: l.id, label: l.name })),
          ]}
        />

        {/* Team */}
        <Select
          label={t('admin.reporting.scope.team')}
          value={scope.teamId || ''}
          onChange={(e) => handleTeamChange(e.target.value)}
          disabled={!scope.levelId && (teams?.length || 0) > 0}
          options={[
            { value: '', label: t('admin.reporting.scope.allTeams') },
            ...(teams || []).map((t) => ({ value: t.id, label: t.name })),
          ]}
        />

        {/* Date Preset */}
        <Select
          label={t('admin.reporting.scope.datePreset')}
          value={datePreset || ''}
          onChange={(e) => handleDatePresetChange(e.target.value)}
          options={[
            { value: '', label: t('admin.reporting.scope.allDates') },
            { value: 'today', label: t('admin.reporting.scope.today') },
            { value: 'this_week', label: t('admin.reporting.scope.thisWeek') },
            { value: 'this_month', label: t('admin.reporting.scope.thisMonth') },
            { value: 'last_7_days', label: t('admin.reporting.scope.last7Days') },
            { value: 'last_30_days', label: t('admin.reporting.scope.last30Days') },
            { value: 'last_90_days', label: t('admin.reporting.scope.last90Days') },
            { value: 'custom', label: t('admin.reporting.scope.custom') },
          ]}
        />

        {/* Date From */}
        {datePreset === 'custom' && (
          <DatePicker
            label={t('admin.reporting.scope.dateFrom')}
            value={dateRange?.start || ''}
            onChange={(e) => handleDateFromChange(e.target.value)}
            max={dateRange?.end}
          />
        )}

        {/* Date To */}
        {datePreset === 'custom' && (
          <DatePicker
            label={t('admin.reporting.scope.dateTo')}
            value={dateRange?.end || ''}
            onChange={(e) => handleDateToChange(e.target.value)}
            min={dateRange?.start}
          />
        )}
      </div>
    </div>
  )
}
