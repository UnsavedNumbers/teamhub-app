/**
 * Levels Management
 *
 * Table view with filtering and contextual creation.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getLevels, deleteLevel } from '../../data/services/levelsService'
import { getPrograms } from '../../data/services/sportsService'
import { getTeams } from '../../data/services/teamsService'
import type { Level, Program, Team } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Select, ConfirmDialog } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'

export default function LevelsManagement() {
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const location = useLocation()
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

  const programById = new Map(programs.map((p) => [p.id, p]))
  const filteredLevels = filterProgramId ? levels.filter((l) => l.program_id === filterProgramId) : levels
  const canCreateLevel = programs.length > 0

  const handleDeleteLevel = useCallback((levelId: string, levelName: string) => {
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

  if (loading && !refreshing) {
    return (
      <div className="pa-root">
        <OfflineBanner />
        <div className="pa-skeleton" style={{ height: '500px' }} />
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
        <Card className="pa-mb-4" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
          <div className="pa-flex pa-items-center pa-justify-between" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
            <div className="pa-body-m pa-text-danger">{error}</div>
            <Button variant="ghost" size="dense" onClick={handleRetry} disabled={loading || refreshing}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {successMessage && (
        <Card className="pa-mb-4" style={{ borderLeft: '3px solid var(--pa-success)' }}>
          <div className="pa-body-m" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)', color: 'var(--pa-n900)' }}>
            {successMessage}
          </div>
        </Card>
      )}

      {actionError && (
        <Card className="pa-mb-4" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
          <div className="pa-body-m pa-text-danger" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
            {actionError}
          </div>
        </Card>
      )}

      {levels.length === 0 ? (
        <Card>
          <div className="pa-flex pa-flex-col pa-items-center pa-justify-center pa-text-center pa-p-6">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n300)', marginBottom: '16px' }}>
              grade
            </span>
            <h3 className="pa-h3">No levels yet</h3>
            <p className="pa-body-m pa-text-muted pa-mb-4">Create programs first, then add levels to define eligibility.</p>
            <Link
              to={`${getLink('admin.organization.forms')}?type=program&returnUrl=${encodeURIComponent(getLink('admin.organization.levels'))}`}
              onClick={(e) => {
                if (loading || refreshing) {
                  e.preventDefault()
                }
              }}
            >
              <Button disabled={loading || refreshing}>
                Add a Program
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <Card className="pa-mb-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="w-full md:w-auto md:min-w-[200px]">
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
                className={isOffline || USE_FAKE_DATA || !canCreateLevel ? 'pa-disabled-link' : 'w-full md:w-auto'}
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
                  style={{ width: '100%' }}
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

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Level Name</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Program</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Eligibility</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLevels.map((level) => {
                    const program = programById.get(level.program_id)
                    const eligibility = level.age_min && level.age_max ? `${level.age_min}-${level.age_max} years` : level.grade_min && level.grade_max ? `Grades ${level.grade_min}-${level.grade_max}` : level.description || '—'
                    const teamCount = teams.filter((t) => t.level_id === level.id).length

                    return (
                      <tr key={level.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          {level.id ? (
                            <Link
                              to={getLink('admin.levels.detail', { id: level.id })}
                              className="font-bold text-slate-900 hover:text-blue-600 transition-colors"
                              style={{ textDecoration: 'none' }}
                              onClick={(e) => {
                                if (!level.id) {
                                  e.preventDefault()
                                  setActionError('Invalid level ID')
                                } else if (loading || refreshing) {
                                  e.preventDefault()
                                }
                              }}
                              title={loading || refreshing ? 'Loading...' : 'View level details'}
                            >
                              {level.name}
                            </Link>
                          ) : (
                            <div className="font-bold text-slate-900">{level.name}</div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-700">
                          {program && program.id ? (
                            <Link
                              to={getLink('admin.programs.detail', { id: program.id })}
                              className="hover:text-blue-600 transition-colors"
                              style={{ textDecoration: 'none' }}
                              onClick={(e) => {
                                if (!program.id) {
                                  e.preventDefault()
                                  setActionError('Invalid program ID')
                                } else if (loading || refreshing) {
                                  e.preventDefault()
                                }
                              }}
                              title={loading || refreshing ? 'Loading...' : 'View program details'}
                            >
                              {program.name}
                            </Link>
                          ) : (
                            <span>{program?.name || '—'}</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-500">{levelTypeLabel(level.level_type)}</td>
                        <td className="py-4 px-6 text-sm text-slate-500">{eligibility}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              level.deleted_at
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}
                          >
                            {level.deleted_at ? 'Archived' : 'Active'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {level.id ? (
                              <Link
                                to={getLink('admin.levels.detail', { id: level.id })}
                                className="invisible group-hover:visible focus:visible"
                                onClick={(e) => {
                                  if (!level.id) {
                                    e.preventDefault()
                                    setActionError('Invalid level ID')
                                  }
                                }}
                              >
                                <Button
                                  variant="ghost"
                                  size="dense"
                                  disabled={loading || refreshing}
                                  title={loading || refreshing ? 'Loading...' : 'View level details'}
                                >
                                  View
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                variant="ghost"
                                size="dense"
                                disabled
                                className="invisible group-hover:visible focus:visible"
                                title="Invalid level ID"
                              >
                                View
                              </Button>
                            )}
                            {level.id ? (
                              <Link
                                to={`${getLink('admin.organization.forms')}?edit=level&id=${level.id}&returnUrl=${encodeURIComponent(getLink('admin.levels.list'))}`}
                                className="invisible group-hover:visible focus:visible"
                                onClick={(e) => {
                                  if (!level.id) {
                                    e.preventDefault()
                                    setActionError('Invalid level ID')
                                  } else if (loading || refreshing) {
                                    e.preventDefault()
                                  }
                                }}
                              >
                                <Button
                                  variant="ghost"
                                  size="dense"
                                  disabled={loading || refreshing}
                                  title={loading || refreshing ? 'Loading...' : 'Edit level'}
                                >
                                  Edit
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                variant="ghost"
                                size="dense"
                                disabled
                                className="invisible group-hover:visible focus:visible"
                                title="Invalid level ID"
                              >
                                Edit
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="dense"
                              icon="delete"
                              onClick={() => {
                                if (level.id && level.name) {
                                  handleDeleteLevel(level.id, level.name)
                                } else {
                                  setActionError('Invalid level information')
                                }
                              }}
                              disabled={
                                !level.id ||
                                deletingLevelId === level.id ||
                                isOffline ||
                                USE_FAKE_DATA ||
                                teamCount > 0 ||
                                !!level.deleted_at ||
                                loading ||
                                refreshing
                              }
                              loading={deletingLevelId === level.id}
                              className="invisible group-hover:visible focus:visible"
                              title={
                                !level.id
                                  ? 'Invalid level ID'
                                  : level.deleted_at
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
                              {deletingLevelId === level.id ? 'Removing...' : 'Remove'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
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
