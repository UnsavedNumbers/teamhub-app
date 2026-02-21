/**
 * Filter Slide-Over Component
 *
 * Right-side slide-over panel for filters with:
 * - Shared filters (date range, season, sport, program, team)
 * - Category-specific filters slot
 * - Apply and Reset actions
 * - URL persistence
 */

import { useEffect, useState } from 'react'
import { useReporting } from '../../contexts/ReportingContext'
import { Select } from '../admin/Select'
import { DatePicker } from '../admin/DatePicker'
import { useT } from '../../i18n/useI18n'
import { supabase } from '../../lib/supabase'
import { useQuery } from '@tanstack/react-query'

interface FilterSlideOverProps {
  isOpen: boolean
  onClose: () => void
  categorySpecificFilters?: React.ReactNode
}

export function FilterSlideOver({ isOpen, onClose, categorySpecificFilters }: FilterSlideOverProps) {
  const t = useT()
  const { scope, setScope, dateRange, setDateRange, setDatePreset, datePreset } = useReporting()
  const [localScope, setLocalScope] = useState(scope)
  const [localDateRange, setLocalDateRange] = useState(dateRange)
  const [localDatePreset, setLocalDatePreset] = useState(datePreset)

  // Sync local state when props change
  useEffect(() => {
    setLocalScope(scope)
    setLocalDateRange(dateRange)
    setLocalDatePreset(datePreset)
  }, [scope, dateRange, datePreset])

  // Fetch filter options
  const { data: seasons } = useQuery({
    queryKey: ['seasons', scope.orgId],
    queryFn: async () => {
      if (!scope.orgId) return []
      const { data } = await supabase.from('seasons').select('id, name').eq('org_id', scope.orgId).order('name')
      return (data || []).map((s) => ({ id: s.id, name: s.name }))
    },
    enabled: !!scope.orgId,
  })

  const { data: sports } = useQuery({
    queryKey: ['sports', scope.orgId],
    queryFn: async () => {
      if (!scope.orgId) return []
      const { data } = await supabase.from('sports').select('id, name').eq('org_id', scope.orgId).order('name')
      return (data || []).map((s) => ({ id: s.id, name: s.name }))
    },
    enabled: !!scope.orgId,
  })

  const { data: programs } = useQuery({
    queryKey: ['programs', scope.orgId, localScope.sportId],
    queryFn: async () => {
      if (!scope.orgId) return []
      let query = supabase.from('programs').select('id, name').eq('org_id', scope.orgId)
      if (localScope.sportId) {
        query = query.eq('sport_id', localScope.sportId)
      }
      const { data } = await query.order('name')
      return (data || []).map((p) => ({ id: p.id, name: p.name }))
    },
    enabled: !!scope.orgId,
  })

  const { data: teams } = useQuery({
    queryKey: ['teams', scope.orgId, localScope.programId],
    queryFn: async () => {
      if (!scope.orgId) return []
      let query = supabase.from('teams').select('id, name').eq('org_id', scope.orgId)
      if (localScope.programId) {
        query = query.eq('program_id', localScope.programId)
      }
      const { data } = await query.order('name')
      return (data || []).map((t) => ({ id: t.id, name: t.name }))
    },
    enabled: !!scope.orgId,
  })

  const handleApply = () => {
    setScope(localScope)
    if (localDatePreset) {
      setDatePreset(localDatePreset)
    } else if (localDateRange) {
      setDateRange(localDateRange)
    } else {
      setDateRange(null)
      setDatePreset(null)
    }
    onClose()
  }

  const handleReset = () => {
    const resetScope = {
      orgId: scope.orgId,
      subOrgId: null,
      seasonId: null,
      sportId: null,
      programId: null,
      levelId: null,
      teamId: null,
      athleteId: null,
    }
    setLocalScope(resetScope)
    setLocalDateRange(null)
    setLocalDatePreset(null)
    setScope(resetScope)
    setDateRange(null)
    setDatePreset(null)
    onClose()
  }

  const handleDatePresetChange = (value: string) => {
    if (value === '') {
      setLocalDatePreset(null)
      setLocalDateRange(null)
    } else {
      setLocalDatePreset(value as typeof datePreset)
      // Calculate date range based on preset
      const today = new Date()
      let start: Date
      let end: Date = new Date(today)

      switch (value) {
        case 'today':
          start = new Date(today)
          end = new Date(today)
          break
        case 'this_week':
          start = new Date(today)
          start.setDate(today.getDate() - today.getDay())
          end = new Date(start)
          end.setDate(start.getDate() + 6)
          break
        case 'this_month':
          start = new Date(today.getFullYear(), today.getMonth(), 1)
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          break
        case 'last_7_days':
          start = new Date(today)
          start.setDate(today.getDate() - 7)
          break
        case 'last_30_days':
          start = new Date(today)
          start.setDate(today.getDate() - 30)
          break
        case 'last_90_days':
          start = new Date(today)
          start.setDate(today.getDate() - 90)
          break
        default:
          return
      }

      setLocalDateRange({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      })
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          transition: 'opacity 0.3s',
          opacity: isOpen ? 1 : 0,
        }}
        onClick={onClose}
      />

      {/* Slide-Over Panel */}
      <div
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          width: '480px',
          maxWidth: '90vw',
          height: '100%',
          background: 'var(--org-surface-card)',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px',
            borderBottom: '1px solid var(--org-border-default)',
          }}
        >
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--org-text-primary)',
              margin: 0,
            }}
          >
            Filters
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--org-text-secondary)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Date Range */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--org-text-primary)',
                marginBottom: '8px',
              }}
            >
              Date Range
            </label>
            <Select
              label=""
              value={localDatePreset || ''}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              options={[
                { value: '', label: 'All Dates' },
                { value: 'last_7_days', label: 'Last 7 Days' },
                { value: 'last_30_days', label: 'Last 30 Days' },
                { value: 'last_90_days', label: 'Last 90 Days' },
                { value: 'this_season', label: 'Season to Date' },
                { value: 'custom', label: 'Custom Range' },
              ]}
            />
            {localDatePreset === 'custom' && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <DatePicker
                  label="From"
                  value={localDateRange?.start || ''}
                  onChange={(e) =>
                    setLocalDateRange({
                      start: e.target.value,
                      end: localDateRange?.end || e.target.value,
                    })
                  }
                  max={localDateRange?.end}
                />
                <DatePicker
                  label="To"
                  value={localDateRange?.end || ''}
                  onChange={(e) =>
                    setLocalDateRange({
                      start: localDateRange?.start || e.target.value,
                      end: e.target.value,
                    })
                  }
                  min={localDateRange?.start}
                />
              </div>
            )}
          </div>

          {/* Season */}
          <div>
            <Select
              label="Season"
              value={localScope.seasonId || ''}
              onChange={(e) =>
                setLocalScope({
                  ...localScope,
                  seasonId: e.target.value || null,
                })
              }
              options={[
                { value: '', label: 'All Seasons' },
                ...(seasons || []).map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>

          {/* Sport */}
          <div>
            <Select
              label="Sport"
              value={localScope.sportId || ''}
              onChange={(e) =>
                setLocalScope({
                  ...localScope,
                  sportId: e.target.value || null,
                  programId: null,
                  levelId: null,
                  teamId: null,
                })
              }
              options={[
                { value: '', label: 'All Sports' },
                ...(sports || []).map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>

          {/* Program */}
          <div>
            <Select
              label="Program"
              value={localScope.programId || ''}
              onChange={(e) =>
                setLocalScope({
                  ...localScope,
                  programId: e.target.value || null,
                  levelId: null,
                  teamId: null,
                })
              }
              disabled={!localScope.sportId && (programs?.length || 0) > 0}
              options={[
                { value: '', label: 'All Programs' },
                ...(programs || []).map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>

          {/* Team */}
          <div>
            <Select
              label="Team"
              value={localScope.teamId || ''}
              onChange={(e) =>
                setLocalScope({
                  ...localScope,
                  teamId: e.target.value || null,
                })
              }
              disabled={!localScope.programId && (teams?.length || 0) > 0}
              options={[
                { value: '', label: 'All Teams' },
                ...(teams || []).map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </div>

          {/* Category-Specific Filters */}
          {categorySpecificFilters && (
            <div>
              <div
                style={{
                  height: '1px',
                  background: 'var(--org-border-default)',
                  margin: '24px 0',
                }}
              />
              {categorySpecificFilters}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '24px',
            borderTop: '1px solid var(--org-border-default)',
          }}
        >
          <button
            onClick={handleReset}
            style={{
              flex: 1,
              padding: '12px',
              background: 'var(--org-surface-secondary)',
              border: '1px solid var(--org-border-default)',
              borderRadius: '8px',
              color: 'var(--org-text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 1,
              padding: '12px',
              background: 'var(--org-color-primary)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  )
}
