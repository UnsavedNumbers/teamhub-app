/**
 * Levels Management
 *
 * Table view with filtering and contextual creation.
 */

import { useEffect, useState } from 'react'
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
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingLevelId, setDeletingLevelId] = useState<string | null>(null)
  const [levelToDelete, setLevelToDelete] = useState<{ id: string; name: string } | null>(null)

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
      // Clear the state to prevent showing it again on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const [levels, setLevels] = useState<Level[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filterProgramId, setFilterProgramId] = useState<string>('')

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [levelsResult, programsResult, teamsResult] = await Promise.all([
          getLevels(context), 
          getPrograms(context),
          getTeams(context)
        ])

        setLevels(Array.isArray(levelsResult.data) ? levelsResult.data : [])
        setPrograms(Array.isArray(programsResult.data) ? programsResult.data : [])
        setTeams(Array.isArray(teamsResult.data) ? teamsResult.data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  const programById = new Map(programs.map((p) => [p.id, p]))
  const filteredLevels = filterProgramId ? levels.filter((l) => l.program_id === filterProgramId) : levels
  const canCreateLevel = programs.length > 0

  const levelTeams = (levelId: string) => teams.filter((t) => t.level_id === levelId)

  const handleDeleteLevel = (levelId: string, levelName: string) => {
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

    setLevelToDelete({ id: levelId, name: levelName })
  }

  const confirmDeleteLevel = async (_reason: string) => {
    if (!levelToDelete) return

    setDeletingLevelId(levelToDelete.id)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const result = await deleteLevel(context, levelToDelete.id)

      if (result.error) {
        setActionError(result.error.message || 'Failed to remove level. Please try again.')
      } else {
        // Remove from local state
        setLevels((prev) => prev.filter((l) => l.id !== levelToDelete.id))
        setSuccessMessage(`"${levelToDelete.name}" has been removed from your organization.`)

        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null)
        }, 5000)
      }
    } catch (err) {
      console.error('[LevelsManagement] Unexpected error deleting level:', err)
      setActionError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
    } finally {
      setDeletingLevelId(null)
      setLevelToDelete(null)
    }
  }

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

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
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
        <Card className="pa-mb-4">
          <div className="pa-text-danger">{error}</div>
        </Card>
      )}

      {successMessage && (
        <Card className="pa-mb-4">
          <div className="pa-text-success">{successMessage}</div>
        </Card>
      )}

      {actionError && (
        <Card className="pa-mb-4">
          <div className="pa-text-danger">{actionError}</div>
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
            <Link to={`${getLink('admin.organization.forms')}?type=program`}>
              <Button>Add a Program</Button>
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
                  onChange={(e) => setFilterProgramId(e.target.value)}
                  options={[
                    { value: '', label: 'All programs' },
                    ...programs.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </div>
              <Link to={`${getLink('admin.organization.forms')}?type=level&returnUrl=${encodeURIComponent(getLink('admin.organization.levels'))}`} className="w-full md:w-auto">
                <Button style={{ width: '100%' }} disabled={!canCreateLevel} title={!canCreateLevel ? 'Add a Program first' : undefined}>
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
                    const teamCount = levelTeams(level.id).length

                    return (
                      <tr key={level.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{level.name}</div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-700">{program?.name || '—'}</td>
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
                            <Link to={`${getLink('admin.organization.forms')}?edit=level&id=${level.id}&returnUrl=${encodeURIComponent(getLink('admin.organization.levels'))}`} className="invisible group-hover:visible focus:visible">
                              <button className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                                Edit
                              </button>
                            </Link>
                            <div className="flex flex-col items-end gap-1">
                              <button
                                onClick={() => handleDeleteLevel(level.id, level.name)}
                                disabled={deletingLevelId === level.id || isOffline || USE_FAKE_DATA || teamCount > 0 || !!level.deleted_at}
                                className="invisible group-hover:visible focus:visible inline-flex items-center justify-center h-8 px-3 font-medium text-xs text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={
                                  level.deleted_at
                                    ? 'Cannot remove archived level'
                                    : USE_FAKE_DATA 
                                    ? 'Sign in to remove level' 
                                    : isOffline 
                                    ? 'Offline - cannot remove level' 
                                    : teamCount > 0
                                    ? `Cannot remove: This level contains ${teamCount} ${teamCount === 1 ? 'team' : 'teams'} and cannot be removed.`
                                    : 'Remove level from organization'
                                }
                              >
                                {deletingLevelId === level.id ? (
                                  <>
                                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '14px', marginRight: '4px' }}>refresh</span>
                                    Removing...
                                  </>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '4px' }}>delete</span>
                                    Remove
                                  </>
                                )}
                              </button>
                              {teamCount > 0 && (
                                <p className="text-xs text-slate-500 text-right max-w-[180px] invisible group-hover:visible">
                                  Contains sub-items
                                </p>
                              )}
                            </div>
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
        onConfirm={confirmDeleteLevel}
        onCancel={() => setLevelToDelete(null)}
      />
    </div>
  )
}
