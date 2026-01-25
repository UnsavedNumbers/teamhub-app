/**
 * Seasons Management
 *
 * Table view for organization-wide time periods.
 */

import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getSeasons, deleteSeason, isSeasonEmpty } from '../../data/services/seasonsService'
import type { Season } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, ConfirmDialog } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'

export default function SeasonsManagement() {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [emptySeasons, setEmptySeasons] = useState<Set<string>>(new Set())
  const [checkingEmpty, setCheckingEmpty] = useState(false)
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const checkedSeasonIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await getSeasons(context)
        setSeasons(result.data as Season[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load seasons')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  // Check which seasons are empty
  useEffect(() => {
    if (!isReady || seasons.length === 0 || checkingEmpty) return

    // Get current season IDs
    const currentSeasonIds = new Set(seasons.map(s => s.id))
    const seasonIdsString = Array.from(currentSeasonIds).sort().join(',')

    // Only check if the season IDs have changed
    if (checkedSeasonIds.current.has(seasonIdsString)) return

    const checkEmpty = async () => {
      setCheckingEmpty(true)
      const emptySet = new Set<string>()

      for (const season of seasons) {
        const { isEmpty, error } = await isSeasonEmpty(context, season.id)
        if (!error && isEmpty) {
          emptySet.add(season.id)
        }
      }

      setEmptySeasons(emptySet)
      // Clear old entries and add new one
      checkedSeasonIds.current.clear()
      checkedSeasonIds.current.add(seasonIdsString)
      setCheckingEmpty(false)
    }

    checkEmpty()
  }, [context, isReady, seasons])

  const handleDeleteClick = (season: Season) => {
    setSeasonToDelete(season)
    setDeleteError(null)
  }

  const handleConfirmDelete = async () => {
    if (!seasonToDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      const { error } = await deleteSeason(context, seasonToDelete.id)
      if (error) {
        setDeleteError(error.message)
        setDeleting(false)
        return
      }

      // Remove the season from the list
      setSeasons(seasons.filter(s => s.id !== seasonToDelete.id))
      setEmptySeasons(prev => {
        const next = new Set(prev)
        next.delete(seasonToDelete.id)
        return next
      })
      setSeasonToDelete(null)
      setDeleting(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete season')
      setDeleting(false)
    }
  }

  // const statusBadgeStyle = (status: string) => {
  //   const styles = {
  //     upcoming: { background: 'var(--pa-n300)', color: 'var(--pa-n700)' },
  //     active: { background: 'var(--pa-success-bg)', color: 'var(--pa-success)' },
  //     locked: { background: 'var(--pa-warning-bg)', color: 'var(--pa-warning)' },
  //     archived: { background: 'var(--pa-n200)', color: 'var(--pa-n600)' },
  //   }
  //   return styles[status as keyof typeof styles] || styles.upcoming
  // }

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  return (
    <div className="pa-root">
      <OfflineBanner />
      <AdminPageHeader
        title="Seasons"
        subtitle="Manage organization-wide time periods"
        breadcrumbs={[
          { label: 'Organizations', path: getLink('admin.organization.structure') },
          { label: 'Seasons' },
        ]}
      />

      {error && (
        <Card className="pa-mb-4">
          <div className="pa-text-danger">{error}</div>
        </Card>
      )}

      {seasons.length === 0 ? (
        <Card>
          <div className="pa-flex pa-flex-col pa-items-center pa-justify-center pa-text-center pa-p-6">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n300)', marginBottom: '16px' }}>
              calendar_month
            </span>
            <h3 className="pa-h3">No seasons yet</h3>
            <p className="pa-body-m pa-text-muted pa-mb-4">Create your first season to start organizing teams and events.</p>
            <Link to={`${getLink('admin.organization.forms')}?type=season&returnUrl=${encodeURIComponent(getLink('admin.seasons.list'))}`}>
              <Button>Add Season</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="pa-flex pa-justify-end pa-mb-4">
            <Link to={`${getLink('admin.organization.forms')}?type=season&returnUrl=${encodeURIComponent(getLink('admin.seasons.list'))}`}>
              <Button>Add Season</Button>
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Season Name</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Term</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seasons.map((season) => (
                    <tr 
                      key={season.id} 
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(getLink('admin.seasons.detail', { id: season.id }))}
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{season.name}</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500">—</td>
                      <td className="py-4 px-6 text-sm text-slate-500">{season.start_date ? new Date(season.start_date).toLocaleDateString() : '—'}</td>
                      <td className="py-4 px-6 text-sm text-slate-500">{season.end_date ? new Date(season.end_date).toLocaleDateString() : '—'}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            season.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {season.is_active ? 'Active' : 'Upcoming'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3">
                          <Link to={`${getLink('admin.organization.forms')}?edit=season&id=${season.id}&returnUrl=${encodeURIComponent(getLink('admin.seasons.list'))}`} className="invisible group-hover:visible focus:visible">
                            <button className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                              Edit
                            </button>
                          </Link>
                          {emptySeasons.has(season.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(season)
                              }}
                              disabled={deleting}
                              className="invisible group-hover:visible focus:visible inline-flex items-center justify-center h-8 px-3 font-medium text-xs text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete empty season"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '4px' }}>delete</span>
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(seasonToDelete)}
        title="Delete season?"
        description={
          seasonToDelete
            ? `Are you sure you want to delete "${seasonToDelete.name}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setSeasonToDelete(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
