/**
 * Levels Management
 *
 * Table view with filtering and contextual creation.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getLevels, deleteLevel } from '../../data/services/levelsService'
import { getPrograms } from '../../data/services/sportsService'
import { getTeams } from '../../data/services/teamsService'
import type { Level, Program, Team } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Select, ConfirmDialog, EmptyState, Badge, PlatformDataTable } from '../../components/platformAdmin'
import type { ColumnConfig } from '../../components/platformAdmin/PlatformDataTable'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import { cn } from '../../utils/cn'

export default function LevelsManagement() {
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingLevelId, setDeletingLevelId] = useState<string | null>(null)
  const [levelToDelete, setLevelToDelete] = useState<{ id: string; name: string } | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
      // Clear the state to prevent showing it again on refresh
      window.history.replaceState({}, document.title)
      // Refresh data after successful form submission
      if (isReady) {
        setRefreshing(true)
        loadData()
      }
    }
  }, [location.state, isReady])

  const [levels, setLevels] = useState<Level[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filterProgramId, setFilterProgramId] = useState<string>('')

  const loadData = useCallback(async () => {
    if (!isReady) return

    if (!refreshing) {
      setLoading(true)
    }
    setError(null)
    setActionError(null)

    try {
      const [levelsResult, programsResult, teamsResult] = await Promise.all([
        getLevels(context), 
        getPrograms(context),
        getTeams(context)
      ])

      if (!isMountedRef.current) return

      if (levelsResult.error) {
        throw levelsResult.error
      }
      if (programsResult.error) {
        throw programsResult.error
      }
      if (teamsResult.error) {
        throw teamsResult.error
      }

      setLevels(Array.isArray(levelsResult.data) ? levelsResult.data : [])
      setPrograms(Array.isArray(programsResult.data) ? programsResult.data : [])
      setTeams(Array.isArray(teamsResult.data) ? teamsResult.data : [])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [context, isReady, refreshing])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRetry = useCallback(() => {
    setError(null)
    setActionError(null)
    loadData()
  }, [loadData])

  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs])
  const filteredLevels = useMemo(() => filterProgramId ? levels.filter((l) => l.program_id === filterProgramId) : levels, [levels, filterProgramId])
  const canCreateLevel = programs.length > 0

  const handleDeleteLevel = useCallback((levelId: string, levelName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    
    if (!levelId || !levelName) {
      setActionError('Invalid level information')
      return
    }

    // Block if offline
    if (isOffline) {
      setActionError('You appear to be offline. Please reconnect and try again.')
      return
    }

    // Block if in demo mode
    if (USE_FAKE_DATA) {
      setActionError('This action is not available in demo mode. Please sign in to remove levels from your organization.')
      return
    }

    // Check if level has teams
    const teamCount = teams.filter((t) => t.level_id === levelId).length
    if (teamCount > 0) {
      setActionError(`Cannot remove: This level contains ${teamCount} ${teamCount === 1 ? 'team' : 'teams'} and cannot be removed.`)
      return
    }

    setDialogError(null)
    setLevelToDelete({ id: levelId, name: levelName })
  }, [isOffline, teams])

  const confirmDeleteLevel = useCallback(async () => {
    if (!levelToDelete) return

    setDeletingLevelId(levelToDelete.id)
    setDialogError(null)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const result = await deleteLevel(context, levelToDelete.id)

      if (!isMountedRef.current) return

      if (result.error) {
        setDialogError(result.error.message || 'Failed to remove level. Please try again.')
        setDeletingLevelId(null)
        return
      }

      // Remove from local state
      setLevels((prev) => prev.filter((l) => l.id !== levelToDelete.id))
      setSuccessMessage(`"${levelToDelete.name}" has been removed from your organization.`)

      // Clear success message after 5 seconds
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          setSuccessMessage(null)
        }
      }, 5000)

      // Close dialog
      setLevelToDelete(null)
      setDeletingLevelId(null)

      return () => clearTimeout(timeoutId)
    } catch (err) {
      if (!isMountedRef.current) return
      console.error('[LevelsManagement] Unexpected error deleting level:', err)
      setDialogError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
      setDeletingLevelId(null)
    }
  }, [levelToDelete, context])

  const handleCancelDelete = useCallback(() => {
    setLevelToDelete(null)
    setDialogError(null)
    setDeletingLevelId(null)
  }, [])

  const levelTypeLabel = (type: string) => {
    switch (type) {
      case 'age_based':
        return 'Age-based'
      case 'grade_based':
        return 'Grade-based'
      case 'skill_based':
        return 'Skill-based'
      default:
        return type
    }
  }

  const columns: ColumnConfig<Level>[] = useMemo(() => [
    {
        id: 'name',
        label: 'Level Name',
        sortable: true,
        render: (row) => (
             <div className="pa-font-bold pa-text-slate-900">{row.name}</div>
        )
    },
    {
        id: 'program_id',
        label: 'Program',
        sortable: true,
        render: (row) => {
            const program = programById.get(row.program_id)
            return program?.name || '—'
        }
    },
    {
        id: 'level_type',
        label: 'Type',
        sortable: true,
        render: (row) => <span className="pa-text-sm pa-text-slate-500">{levelTypeLabel(row.level_type)}</span>
    },
    {
        id: 'eligibility',
        label: 'Eligibility',
        render: (row) => {
            const eligibility = row.age_min && row.age_max ? `${row.age_min}-${row.age_max} years` : row.grade_min && row.grade_max ? `Grades ${row.grade_min}-${row.grade_max}` : row.description || '—'
            return <span className="pa-text-sm pa-text-slate-500">{eligibility}</span>
        }
    },
    {
        id: 'status',
        label: 'Status',
        render: (row) => (
            <Badge variant={row.deleted_at ? 'neutral' : 'success'}>
                {row.deleted_at ? 'Archived' : 'Active'}
            </Badge>
        )
    },
    {
        id: 'actions',
        label: 'Actions',
        align: 'right',
        render: (row) => {
            const teamCount = teams.filter((t) => t.level_id === row.id).length
            return (
                <div className="pa-flex pa-items-center pa-justify-end pa-gap-2">
                    <Button
                        variant="ghost"
                        size="dense"
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            navigate(getLink('admin.levels.detail', { id: row.id }))
                        }}
                    >
                        View
                    </Button>
                    <Button
                        variant="ghost"
                        size="dense"
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            navigate(`${getLink('admin.organization.forms')}?edit=level&id=${row.id}&returnUrl=${encodeURIComponent(getLink('admin.levels.list'))}`)
                        }}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="danger"
                        size="dense"
                        icon="delete"
                        onClick={(e: React.MouseEvent) => {
                            handleDeleteLevel(row.id, row.name, e)
                        }}
                        disabled={
                            !row.id ||
                            deletingLevelId === row.id ||
                            isOffline ||
                            USE_FAKE_DATA ||
                            teamCount > 0 ||
                            !!row.deleted_at ||
                            loading ||
                            refreshing
                        }
                        loading={deletingLevelId === row.id}
                        title={
                            !row.id
                                ? 'Invalid level ID'
                                : row.deleted_at
                                    ? 'Cannot remove archived level'
                                    : USE_FAKE_DATA
                                        ? 'Sign in to remove level'
                                        : isOffline
                                            ? 'Offline - cannot remove level'
                                            : teamCount > 0
                                                ? `Cannot remove: This level contains ${teamCount} ${teamCount === 1 ? 'team' : 'teams'} and cannot be removed.`
                                                : loading || refreshing
                                                    ? 'Loading...'
                                                    : 'Remove level from organization'
                        }
                    >
                        {deletingLevelId === row.id ? 'Removing...' : 'Remove'}
                    </Button>
                </div>
            )
        }
    }
  ], [programById, teams, deletingLevelId, isOffline, loading, refreshing, navigate, handleDeleteLevel])

  if (loading && !refreshing) {
    return (
      <div className="pa-root">
        <div className="pa-skeleton pa-mb-8" style={{ width: '100%', height: '300px' }} />
      </div>
    )
  }

  return (
    <div className="pa-root">
      <OfflineBanner />
      <AdminPageHeader
        title="Levels"
        subtitle="Define eligibility boundaries (age, grade, or skill)"
        breadcrumbs={[
          { label: 'Organizations', path: getLink('admin.organization.structure') },
          { label: 'Levels' },
        ]}
      />

      {error && (
        <Card className="pa-mb-6" noPadding>
             <div className="pa-p-4 pa-flex pa-items-center pa-justify-between" style={{ background: 'var(--pa-danger-bg, #fef2f2)', borderLeft: '4px solid var(--pa-danger, #ef4444)' }}>
                <div className="pa-body-m pa-text-danger-dark" style={{ color: 'var(--pa-danger-dark, #991b1b)' }}>{error}</div>
                <Button variant="ghost" size="dense" onClick={handleRetry} disabled={loading || refreshing}>
                Retry
                </Button>
            </div>
        </Card>
      )}

      {successMessage && (
        <Card className="pa-mb-6" noPadding>
            <div className="pa-p-4" style={{ background: 'var(--pa-success-bg, #ecfdf5)', borderLeft: '4px solid var(--pa-success, #10b981)' }}>
                <div className="pa-body-m pa-text-success-dark" style={{ color: 'var(--pa-success-dark, #065f46)' }}>
                    {successMessage}
                </div>
            </div>
        </Card>
      )}

      {actionError && (
        <Card className="pa-mb-6" noPadding>
            <div className="pa-p-4" style={{ background: 'var(--pa-danger-bg, #fef2f2)', borderLeft: '4px solid var(--pa-danger, #ef4444)' }}>
                <div className="pa-body-m pa-text-danger-dark" style={{ color: 'var(--pa-danger-dark, #991b1b)' }}>
                    {actionError}
                </div>
            </div>
        </Card>
      )}

      {levels.length === 0 ? (
        <Card>
          <EmptyState
            icon="grade"
            title="No levels yet"
            description="Create programs first, then add levels to define eligibility."
          >
            <Link
              to={`${getLink('admin.organization.forms')}?type=program&returnUrl=${encodeURIComponent(getLink('admin.organization.levels'))}`}
              className={loading || refreshing ? 'pa-pointer-events-none pa-opacity-50' : ''}
            >
              <Button disabled={loading || refreshing}>
                Add a Program
              </Button>
            </Link>
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="pa-mb-6">
            <div className={cn('pa-flex', 'pa-flex-col', 'md:pa-flex-row', 'pa-justify-between', 'pa-items-center', 'pa-gap-4')}>
              <div className={cn('pa-w-full', 'md:pa-w-auto', 'md:pa-min-w-[200px]')}>
                <Select
                  label="Filter by program"
                  value={filterProgramId}
                  onChange={(e) => {
                    const value = e.target.value
                    setFilterProgramId(value)
                  }}
                  disabled={loading || refreshing}
                  options={[
                    { value: '', label: 'All programs' },
                    ...programs.map((p) => ({ value: p.id, label: p.name || 'Unnamed Program' })),
                  ]}
                />
              </div>
              <Link
                to={`${getLink('admin.organization.forms')}?type=level&returnUrl=${encodeURIComponent(getLink('admin.levels.list'))}`}
                className={cn({ 'pa-pointer-events-none pa-opacity-50': isOffline || USE_FAKE_DATA || !canCreateLevel || loading || refreshing, 'pa-w-full md:pa-w-auto': true })}
                onClick={(e) => {
                  if (isOffline || USE_FAKE_DATA || !canCreateLevel || loading || refreshing) {
                    e.preventDefault()
                    if (isOffline) {
                      setActionError('You appear to be offline. Please reconnect and try again.')
                    } else if (USE_FAKE_DATA) {
                      setActionError('Sign in to add levels')
                    } else if (!canCreateLevel) {
                      setActionError('Add a Program first before creating levels')
                    }
                  }
                }}
              >
                <Button
                  className="pa-w-full"
                  disabled={!canCreateLevel || isOffline || USE_FAKE_DATA || loading || refreshing}
                  title={
                    loading || refreshing
                      ? 'Loading...'
                      : !canCreateLevel
                        ? 'Add a Program first'
                        : isOffline
                          ? 'Offline - cannot add levels'
                          : USE_FAKE_DATA
                            ? 'Sign in to add levels'
                            : undefined
                  }
                >
                  Add Level
                </Button>
              </Link>
            </div>
          </Card>

          <PlatformDataTable
            rows={filteredLevels}
            columns={columns}
            loading={loading || refreshing}
            onRowClick={(row) => navigate(getLink('admin.levels.detail', { id: row.id }))}
            page={0}
            rowsPerPage={filteredLevels.length || 10}
            totalCount={filteredLevels.length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
          />
        </>
      )}
      <ConfirmDialog
        open={Boolean(levelToDelete)}
        title="Remove level?"
        description={
          levelToDelete
            ? `Are you sure you want to remove "${levelToDelete.name}" from your organization? This action cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        variant="danger"
        loading={deletingLevelId !== null}
        error={dialogError}
        onConfirm={confirmDeleteLevel}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}
