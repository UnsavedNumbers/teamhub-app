/**
 * Seasons Management
 *
 * Table view for organization-wide time periods.
 */

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getSeasons, deleteSeason, isSeasonEmpty } from '../../data/services/seasonsService'
import type { Season } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, ConfirmDialog, EmptyState, Badge, InlineNotice } from '../../components/admin'
import OrgDataTable from '../../components/admin/OrgDataTable'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import type { ColumnConfig } from '../../components/admin/OrgDataTable'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import '../../styles/orgAdmin.css'

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const checkedSeasonIds = useRef<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!isReady) return
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
  }, [context, isReady])

  useEffect(() => {
    load()
  }, [load])

  // Check which seasons are empty
  useEffect(() => {
    if (!isReady || seasons.length === 0 || checkingEmpty) return

    const currentSeasonIds = new Set(seasons.map(s => s.id))
    const seasonIdsString = Array.from(currentSeasonIds).sort().join(',')

    if (checkedSeasonIds.current.has(seasonIdsString)) return

    const checkEmpty = async () => {
      setCheckingEmpty(true)
      const emptySet = new Set<string>()

      for (const season of seasons) {
        const { isEmpty, error: checkError } = await isSeasonEmpty(context, season.id)
        if (!checkError && isEmpty) {
          emptySet.add(season.id)
        }
      }

      setEmptySeasons(emptySet)
      checkedSeasonIds.current.clear()
      checkedSeasonIds.current.add(seasonIdsString)
      setCheckingEmpty(false)
    }

    checkEmpty()
  }, [context, isReady, seasons, checkingEmpty])

  const handleDeleteClick = (season: Season, e: React.MouseEvent) => {
    e.stopPropagation()
    setSeasonToDelete(season)
    setDeleteError(null)
  }

  const handleConfirmDelete = async () => {
    if (!seasonToDelete) return

    setDeleting(true)
    setDeleteError(null)

    try {
      const { error: deleteErrorResult } = await deleteSeason(context, seasonToDelete.id)
      if (deleteErrorResult) {
        setDeleteError(deleteErrorResult.message)
        setDeleting(false)
        return
      }

      setSeasons(seasons.filter(s => s.id !== seasonToDelete.id))
      setEmptySeasons(prev => {
        const next = new Set(prev)
        next.delete(seasonToDelete.id)
        return next
      })
      setSuccessMessage(`"${seasonToDelete.name}" has been removed.`)
      setTimeout(() => setSuccessMessage(null), 5000)
      setSeasonToDelete(null)
      setDeleting(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete season')
      setDeleting(false)
    }
  }

  const columns: ColumnConfig<Season>[] = useMemo(() => [
    {
      id: 'name',
      label: 'Season Name',
      sortable: true,
      render: (row) => (
        <div className="oa-font-bold oa-text-slate-900">
          {row.name}
        </div>
      )
    },
    {
      id: 'term',
      label: 'Term',
      render: () => <span className="oa-text-xs oa-text-slate-400 oa-font-medium">SYSTEM DEFAULT</span>
    },
    {
      id: 'start_date',
      label: 'Start Date',
      sortable: true,
      render: (row) => (
        <span className="oa-text-sm oa-text-slate-600">
          {row.start_date ? new Date(row.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      )
    },
    {
      id: 'end_date',
      label: 'End Date',
      sortable: true,
      render: (row) => (
        <span className="oa-text-sm oa-text-slate-600">
          {row.end_date ? new Date(row.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
      )
    },
    {
      id: 'is_active',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'neutral'}>
          {row.is_active ? 'Active' : 'Upcoming'}
        </Badge>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="oa-flex oa-items-center oa-justify-end oa-gap-2">
          <Button 
            variant="ghost" 
            size="dense" 
            icon="edit"
            onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                navigate(`${getLink('admin.seasons.update', { id: row.id })}?returnUrl=${encodeURIComponent(getLink('admin.seasons.list'))}`)
            }}
          >
            Edit
          </Button>
          {emptySeasons.has(row.id) && (
            <Button
              variant="ghost"
              size="dense"
              icon="delete"
              disabled={deleting}
              onClick={(e: React.MouseEvent) => handleDeleteClick(row, e)}
              className="oa-text-danger hover:oa-bg-danger-surface"
              title="Delete empty season"
            >
              Delete
            </Button>
          )}
        </div>
      )
    }
  ], [emptySeasons, deleting, navigate])

  if (loading) {
    return (
      <div className="oa-root">
        <div className="oa-skeleton oa-mb-8" style={{ width: '40%', height: '40px' }} />
        <div className="oa-skeleton" style={{ width: '100%', height: '400px' }} />
      </div>
    )
  }

  return (
    <div className="oa-root">
      <OfflineBanner />
      <AdminPageHeader
        title="Seasons"
        subtitle="Manage organization-wide time periods"
        breadcrumbs={[
          { label: 'Organizations', path: getLink('admin.organization.structure') },
          { label: 'Seasons' },
        ]}
        actions={
          seasons.length > 0 && (
            <OrgAdminButton
                icon="add"
                variant="primary"
                onClick={() => navigate(`${getLink('admin.organization.forms')}?type=season&returnUrl=${encodeURIComponent(getLink('admin.seasons.list'))}`)}
                className="w-full sm:w-auto"
            >
                Add Season
            </OrgAdminButton>
          )
        }
      />

      {error && (
        <InlineNotice
          tone="error"
          title="Unable to load seasons"
          message={error}
          onClose={() => setError(null)}
          className="oa-mb-6"
        />
      )}

      {successMessage && (
        <InlineNotice
          tone="success"
          title={successMessage}
          onClose={() => setSuccessMessage(null)}
          className="oa-mb-6"
        />
      )}

      {seasons.length === 0 ? (
        <Card>
          <EmptyState
            icon="calendar_month"
            title="No seasons yet"
            description="Create your first season to start organizing teams and events."
            noCard
          >
             <Button 
                icon="add"
                onClick={() => navigate(`${getLink('admin.organization.forms')}?type=season&returnUrl=${encodeURIComponent(getLink('admin.seasons.list'))}`)}
            >
                Add Season
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <OrgDataTable
           rows={seasons}
           columns={columns}
           onRowClick={(row) => navigate(getLink('admin.seasons.detail', { id: row.id }))}
           page={0}
           rowsPerPage={seasons.length || 10}
           totalCount={seasons.length}
           onPageChange={() => {}}
           onRowsPerPageChange={() => {}}
        />
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
