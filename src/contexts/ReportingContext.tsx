/**
 * Reporting Context
 *
 * Global state management for the reporting console.
 * Manages scope, filters, drilldown paths, and compare mode.
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOrganization } from './OrganizationContext'
import type {
  ReportScope,
  ReportFilters,
  DateRange,
  DrilldownPath,
  CompareConfig,
} from '../types/reporting'

interface ReportingContextType {
  // Scope state
  scope: ReportScope
  filters: ReportFilters
  dateRange: DateRange | null
  datePreset: 'today' | 'this_week' | 'this_month' | 'this_season' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom' | null

  // Drilldown state
  drilldownPath: DrilldownPath[]

  // Compare mode state
  compareConfig: CompareConfig | null

  // Actions
  setScope: (scope: Partial<ReportScope>) => void
  setFilters: (filters: Partial<ReportFilters>) => void
  setDateRange: (range: DateRange | null) => void
  setDatePreset: (preset: 'today' | 'this_week' | 'this_month' | 'this_season' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom' | null) => void
  addDrilldown: (level: DrilldownPath['level'], id: string, name: string) => void
  removeDrilldown: (level: DrilldownPath['level']) => void
  clearDrilldown: () => void
  setCompareConfig: (config: CompareConfig | null) => void
  resetScope: () => void
}

const ReportingContext = createContext<ReportingContextType | undefined>(undefined)

interface ReportingProviderProps {
  children: ReactNode
}

export function ReportingProvider({ children }: ReportingProviderProps) {
  const { currentOrganization } = useOrganization()
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize scope from organization context
  const [scope, setScopeState] = useState<ReportScope>(() => ({
    orgId: currentOrganization?.id || '',
    subOrgId: null,
    seasonId: null,
    sportId: null,
    programId: null,
    levelId: null,
    teamId: null,
    athleteId: null,
  }))

  // Initialize filters
  const [filters, setFiltersState] = useState<ReportFilters>(() => ({
    orgId: currentOrganization?.id || '',
    subOrgId: null,
    seasonId: null,
    sportId: null,
    programId: null,
    levelId: null,
    teamId: null,
    athleteId: null,
  }))

  // Date range state
  const [dateRange, setDateRangeState] = useState<DateRange | null>(null)
  const [datePreset, setDatePresetState] = useState<'today' | 'this_week' | 'this_month' | 'this_season' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom' | null>(null)

  // Drilldown path
  const [drilldownPath, setDrilldownPath] = useState<DrilldownPath[]>([])

  // Compare mode
  const [compareConfig, setCompareConfigState] = useState<CompareConfig | null>(null)

  // Update scope when organization changes
  useEffect(() => {
    if (currentOrganization?.id && currentOrganization.id !== scope.orgId) {
      setScopeState((prev) => ({
        ...prev,
        orgId: currentOrganization.id,
      }))
      setFiltersState((prev) => ({
        ...prev,
        orgId: currentOrganization.id,
      }))
    }
  }, [currentOrganization?.id, scope.orgId])

  // Load state from URL params on mount
  useEffect(() => {
    const orgId = searchParams.get('orgId') || currentOrganization?.id || ''
    const subOrgId = searchParams.get('subOrgId') || null
    const seasonId = searchParams.get('seasonId') || null
    const sportId = searchParams.get('sportId') || null
    const programId = searchParams.get('programId') || null
    const levelId = searchParams.get('levelId') || null
    const teamId = searchParams.get('teamId') || null
    const athleteId = searchParams.get('athleteId') || null
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const preset = searchParams.get('datePreset') as typeof datePreset

    setScopeState({
      orgId,
      subOrgId,
      seasonId,
      sportId,
      programId,
      levelId,
      teamId,
      athleteId,
    })

    setFiltersState({
      orgId,
      subOrgId,
      seasonId,
      sportId,
      programId,
      levelId,
      teamId,
      athleteId,
      dateRange: dateFrom && dateTo ? { start: dateFrom, end: dateTo } : undefined,
      datePreset: preset || undefined,
    })

    if (dateFrom && dateTo) {
      setDateRangeState({ start: dateFrom, end: dateTo })
    }
    if (preset) {
      setDatePresetState(preset)
    }
  }, []) // Only on mount

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (scope.orgId) params.set('orgId', scope.orgId)
    if (scope.subOrgId) params.set('subOrgId', scope.subOrgId)
    if (scope.seasonId) params.set('seasonId', scope.seasonId)
    if (scope.sportId) params.set('sportId', scope.sportId)
    if (scope.programId) params.set('programId', scope.programId)
    if (scope.levelId) params.set('levelId', scope.levelId)
    if (scope.teamId) params.set('teamId', scope.teamId)
    if (scope.athleteId) params.set('athleteId', scope.athleteId)
    if (dateRange) {
      params.set('dateFrom', dateRange.start)
      params.set('dateTo', dateRange.end)
    }
    if (datePreset) {
      params.set('datePreset', datePreset)
    }

    setSearchParams(params, { replace: true })
  }, [scope, dateRange, datePreset, setSearchParams])

  // Set scope
  const setScope = useCallback((newScope: Partial<ReportScope>) => {
    setScopeState((prev) => ({
      ...prev,
      ...newScope,
    }))
    setFiltersState((prev) => ({
      ...prev,
      ...newScope,
    }))
  }, [])

  // Set filters
  const setFilters = useCallback((newFilters: Partial<ReportFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
    }))
  }, [])

  // Set date range
  const setDateRange = useCallback((range: DateRange | null) => {
    setDateRangeState(range)
    setFiltersState((prev) => ({
      ...prev,
      dateRange: range || undefined,
      datePreset: range ? 'custom' : undefined,
    }))
    if (!range) {
      setDatePresetState(null)
    }
  }, [])

  // Set date preset
  const setDatePreset = useCallback((preset: typeof datePreset) => {
    setDatePresetState(preset)
    if (preset === 'custom') {
      // Don't change dateRange, user will set it manually
      return
    }

    const today = new Date()
    let start: Date
    let end: Date = new Date(today)

    switch (preset) {
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

    const range: DateRange = {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    }

    setDateRangeState(range)
    setFiltersState((prev) => ({
      ...prev,
      dateRange: range,
      datePreset: preset,
    }))
  }, [])

  // Add drilldown
  const addDrilldown = useCallback((level: DrilldownPath['level'], id: string, name: string) => {
    setDrilldownPath((prev) => {
      // Remove any drilldowns at or below this level
      const filtered = prev.filter((p) => {
        const levels: DrilldownPath['level'][] = ['org', 'sub_org', 'sport', 'program', 'level', 'team', 'athlete']
        const currentIndex = levels.indexOf(level)
        const pathIndex = levels.indexOf(p.level)
        return pathIndex < currentIndex
      })
      return [...filtered, { level, id, name }]
    })

    // Update scope based on drilldown level
    const scopeUpdate: Partial<ReportScope> = {}
    switch (level) {
      case 'sub_org':
        scopeUpdate.subOrgId = id
        scopeUpdate.seasonId = null
        scopeUpdate.sportId = null
        scopeUpdate.programId = null
        scopeUpdate.levelId = null
        scopeUpdate.teamId = null
        scopeUpdate.athleteId = null
        break
      case 'sport':
        scopeUpdate.sportId = id
        scopeUpdate.programId = null
        scopeUpdate.levelId = null
        scopeUpdate.teamId = null
        scopeUpdate.athleteId = null
        break
      case 'program':
        scopeUpdate.programId = id
        scopeUpdate.levelId = null
        scopeUpdate.teamId = null
        scopeUpdate.athleteId = null
        break
      case 'level':
        scopeUpdate.levelId = id
        scopeUpdate.teamId = null
        scopeUpdate.athleteId = null
        break
      case 'team':
        scopeUpdate.teamId = id
        scopeUpdate.athleteId = null
        break
      case 'athlete':
        scopeUpdate.athleteId = id
        break
    }
    setScope(scopeUpdate)
  }, [setScope])

  // Remove drilldown
  const removeDrilldown = useCallback((level: DrilldownPath['level']) => {
    setDrilldownPath((prev) => prev.filter((p) => p.level !== level))

    // Update scope
    const scopeUpdate: Partial<ReportScope> = {}
    const levels: DrilldownPath['level'][] = ['org', 'sub_org', 'sport', 'program', 'level', 'team', 'athlete']
    const levelIndex = levels.indexOf(level)
    if (levelIndex >= 1) scopeUpdate.subOrgId = null
    if (levelIndex >= 2) scopeUpdate.sportId = null
    if (levelIndex >= 3) scopeUpdate.programId = null
    if (levelIndex >= 4) scopeUpdate.levelId = null
    if (levelIndex >= 5) scopeUpdate.teamId = null
    if (levelIndex >= 6) scopeUpdate.athleteId = null

    setScope(scopeUpdate)
  }, [setScope])

  // Clear drilldown
  const clearDrilldown = useCallback(() => {
    setDrilldownPath([])
    setScope({
      subOrgId: null,
      seasonId: null,
      sportId: null,
      programId: null,
      levelId: null,
      teamId: null,
      athleteId: null,
    })
  }, [setScope])

  // Set compare config
  const setCompareConfig = useCallback((config: CompareConfig | null) => {
    setCompareConfigState(config)
  }, [])

  // Reset scope
  const resetScope = useCallback(() => {
    setScopeState({
      orgId: currentOrganization?.id || '',
      subOrgId: null,
      seasonId: null,
      sportId: null,
      programId: null,
      levelId: null,
      teamId: null,
      athleteId: null,
    })
    setFiltersState({
      orgId: currentOrganization?.id || '',
      subOrgId: null,
      seasonId: null,
      sportId: null,
      programId: null,
      levelId: null,
      teamId: null,
      athleteId: null,
    })
    setDateRangeState(null)
    setDatePresetState(null)
    setDrilldownPath([])
    setCompareConfigState(null)
  }, [currentOrganization?.id])

  const value: ReportingContextType = {
    scope,
    filters,
    dateRange,
    datePreset,
    drilldownPath,
    compareConfig,
    setScope,
    setFilters,
    setDateRange,
    setDatePreset,
    addDrilldown,
    removeDrilldown,
    clearDrilldown,
    setCompareConfig,
    resetScope,
  }

  return <ReportingContext.Provider value={value}>{children}</ReportingContext.Provider>
}

export function useReporting() {
  const context = useContext(ReportingContext)
  if (!context) {
    throw new Error('useReporting must be used within ReportingProvider')
  }
  return context
}
