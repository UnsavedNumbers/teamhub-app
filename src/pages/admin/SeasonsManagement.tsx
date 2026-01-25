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
          <div className="pa-flex pa-justify-end" style={{ marginBottom: 'var(--pa-space-4)' }}>
            <Link to={`${getLink('admin.organization.forms')}?type=season&returnUrl=${encodeURIComponent(getLink('admin.seasons.list'))}`}>
              <Button>Add Season</Button>
            </Link>
          </div>

          <Card noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: 'var(--pa-n50)', borderBottom: '1px solid var(--pa-n200)' }} className="dark:bg-slate-800/50 dark:border-slate-700">
                    <th className="pa-overline" style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', color: 'var(--pa-n500)', textAlign: 'left' }}>Season Name</th>
                    <th className="pa-overline" style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', color: 'var(--pa-n500)', textAlign: 'left' }}>Term</th>
                    <th className="pa-overline" style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', color: 'var(--pa-n500)', textAlign: 'left' }}>Start Date</th>
                    <th className="pa-overline" style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', color: 'var(--pa-n500)', textAlign: 'left' }}>End Date</th>
                    <th className="pa-overline" style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', color: 'var(--pa-n500)', textAlign: 'left' }}>Status</th>
                    <th className="pa-overline" style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', color: 'var(--pa-n500)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((season, index) => (
                    <tr 
                      key={season.id}
                      className="pa-stacked-list-row group"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(getLink('admin.seasons.detail', { id: season.id }))}
                    >
                      <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)' }}>
                        <div className="pa-body-m" style={{ fontWeight: 700, color: 'var(--pa-n900)' }}>{season.name}</div>
                      </td>
                      <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)' }} className="pa-body-s pa-text-muted">—</td>
                      <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)' }} className="pa-body-s pa-text-muted">{season.start_date ? new Date(season.start_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)' }} className="pa-body-s pa-text-muted">{season.end_date ? new Date(season.end_date).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)' }}>
                        <span
                          className={`pa-badge ${season.is_active ? 'pa-badge--success' : ''}`}
                          style={{
                            background: season.is_active ? 'rgba(16, 185, 129, 0.1)' : 'var(--pa-n100)',
                            color: season.is_active ? 'rgb(16, 185, 129)' : 'var(--pa-n600)',
                            border: season.is_active ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--pa-n200)'
                          }}
                        >
                          {season.is_active ? 'Active' : 'Upcoming'}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="pa-flex pa-items-center pa-justify-end" style={{ gap: 'var(--pa-space-3)' }}>
                          <Link to={`${getLink('admin.organization.forms')}?edit=season&id=${season.id}&returnUrl=${encodeURIComponent(getLink('admin.seasons.list'))}`} className="pa-opacity-0 group-hover:pa-opacity-100 focus:pa-opacity-100" style={{ transition: 'opacity 200ms' }}>
                            <Button variant="ghost" size="dense">
                              Edit
                            </Button>
                          </Link>
                          {emptySeasons.has(season.id) && (
                            <Button
                              variant="danger"
                              size="dense"
                              icon="delete"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                handleDeleteClick(season)
                              }}
                              disabled={deleting}
                              className="pa-opacity-0 group-hover:pa-opacity-100 focus:pa-opacity-100"
                              style={{ transition: 'opacity 200ms' }}
                              title="Delete empty season"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
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
