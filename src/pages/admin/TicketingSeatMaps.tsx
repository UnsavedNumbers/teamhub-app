import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserContext } from '@/hooks/useUserContext'
import { useOffline } from '@/hooks/useOffline'
import { USE_FAKE_DATA } from '@/data/config'
import {
  createSeatMap,
  deleteSeatMapAdmin,
  getSeatMapsForOrgAdmin,
  type AdminSeatMapListItem,
} from '@/data/services'
import { getVenuesForOrg, publishSeatMap, cloneSeatMap } from '@/data/services/venueService'
import type { Venue } from '@/types/ticketing'
import { classifySupabaseError } from '@/utils/supabaseErrorHandler'
import {
  AdminPageHeader,
  Card,
  ConfirmDialog,
  EmptyState,
  InlineNotice,
  OrgAdminButton,
  OrgDataTable,
  type ColumnConfig,
} from '@/components/admin'
import { getLink } from '@/utils/routes'
import { useT } from '@/i18n/useI18n'
import { showError, showSuccess } from '@/utils/toast'

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function TicketingSeatMaps() {
  const t = useT()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()

  const [search, setSearch] = useState('')
  const [selectedVenueId, setSelectedVenueId] = useState('')
  const [newSeatMapName, setNewSeatMapName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminSeatMapListItem | null>(null)
  const [cloneTarget, setCloneTarget] = useState<AdminSeatMapListItem | null>(null)

  const orgId = context.orgId || ''

  const seatMapsQuery = useQuery({
    queryKey: ['admin-seat-maps', orgId],
    queryFn: () => getSeatMapsForOrgAdmin(orgId),
    enabled: isReady && !!orgId,
  })

  const venuesQuery = useQuery<Venue[]>({
    queryKey: ['admin-venues', orgId],
    queryFn: () => getVenuesForOrg(orgId),
    enabled: isReady && !!orgId,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = newSeatMapName.trim()
      if (!name) throw new Error(t('ticketing.seatMaps.errors.nameRequired'))
      return createSeatMap({
        name,
        org_id: orgId,
        venue_id: selectedVenueId || null,
      })
    },
    onSuccess: (created) => {
      setNewSeatMapName('')
      showSuccessToast(t('ticketing.seatMaps.toasts.created'))
      void queryClient.invalidateQueries({ queryKey: ['admin-seat-maps', orgId] })
      void queryClient.invalidateQueries({ queryKey: ['seat-maps'] })
      // Navigate to builder — use legacy event-scoped route if event present, otherwise seat-map list
      const builderPath = created.ticketed_event_id
        ? getLink('admin.ticketingEvents.seatMaps.builder', {
            eventId: created.ticketed_event_id,
            seatMapId: created.id,
          })
        : getLink('admin.ticketingEvents.seatMaps.list')
      navigate(builderPath)
    },
    onError: (error) => {
      showErrorToast(classifySupabaseError(error).message || t('ticketing.seatMaps.errors.createFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (seatMapId: string) => deleteSeatMapAdmin(seatMapId),
    onSuccess: () => {
      showSuccessToast(t('ticketing.seatMaps.toasts.deleted'))
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-seat-maps', orgId] })
      void queryClient.invalidateQueries({ queryKey: ['seat-maps'] })
    },
    onError: (error) => {
      showErrorToast(classifySupabaseError(error).message || t('ticketing.seatMaps.errors.deleteFailed'))
    },
  })

  const publishMutation = useMutation({
    mutationFn: async (seatMapId: string) => publishSeatMap(seatMapId),
    onSuccess: () => {
      showSuccessToast(t('ticketing.seatMaps.toasts.published'))
      void queryClient.invalidateQueries({ queryKey: ['admin-seat-maps', orgId] })
      void queryClient.invalidateQueries({ queryKey: ['seat-maps'] })
    },
    onError: (error) => {
      showErrorToast(classifySupabaseError(error).message || t('ticketing.seatMaps.errors.publishFailed'))
    },
  })

  const cloneMutation = useMutation({
    mutationFn: async (params: { seatMapId: string; newName: string }) =>
      cloneSeatMap({ sourceSeatMapId: params.seatMapId, newName: params.newName }),
    onSuccess: () => {
      showSuccessToast(t('ticketing.seatMaps.toasts.cloned'))
      setCloneTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-seat-maps', orgId] })
      void queryClient.invalidateQueries({ queryKey: ['seat-maps'] })
    },
    onError: (error) => {
      showErrorToast(classifySupabaseError(error).message || t('ticketing.seatMaps.errors.cloneFailed'))
    },
  })

  const isWriteBlocked = isOffline || USE_FAKE_DATA
  const seatMapsLoadError = seatMapsQuery.isError
    ? classifySupabaseError(seatMapsQuery.error).message
    : null

  const filteredSeatMaps = useMemo(() => {
    const items = seatMapsQuery.data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return items

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.event_title.toLowerCase().includes(term) ||
        (item.venue_name ?? '').toLowerCase().includes(term) ||
        (item.team_name ?? '').toLowerCase().includes(term)
      )
    })
  }, [seatMapsQuery.data, search])

  const venueOptions = useMemo(() => {
    const venues = venuesQuery.data ?? []
    return [
      { value: '', label: t('ticketing.seatMaps.form.noVenue') },
      ...venues.map((v) => ({
        value: v.id,
        label: v.name + (v.city ? ` — ${v.city}` : ''),
      })),
    ]
  }, [venuesQuery.data, t])

  const columns: ColumnConfig<AdminSeatMapListItem>[] = [
    {
      id: 'name',
      label: t('ticketing.seatMaps.table.name'),
      sortable: true,
      render: (row) => (
        <div className="oa-flex oa-flex-col oa-gap-1">
          <div className="oa-flex oa-items-center oa-gap-2">
            <span className="oa-font-bold oa-text-slate-900">{row.name}</span>
            {row.status === 'published' ? (
              <span className="oa-inline-flex oa-items-center oa-rounded-full oa-bg-green-100 oa-px-2 oa-py-0.5 oa-text-xs oa-font-medium oa-text-green-700">
                {t('ticketing.seatMaps.status.published')}
              </span>
            ) : (
              <span className="oa-inline-flex oa-items-center oa-rounded-full oa-bg-amber-100 oa-px-2 oa-py-0.5 oa-text-xs oa-font-medium oa-text-amber-700">
                {t('ticketing.seatMaps.status.draft')}
              </span>
            )}
          </div>
          {row.version > 1 && (
            <span className="oa-text-xs oa-text-slate-400">v{row.version}</span>
          )}
        </div>
      ),
    },
    {
      id: 'venue_name',
      label: t('ticketing.seatMaps.table.venue'),
      sortable: true,
      render: (row) => (
        <div className="oa-flex oa-flex-col oa-gap-1">
          <span className="oa-text-sm oa-font-medium oa-text-slate-700">
            {row.venue_name ?? t('ticketing.seatMaps.table.noVenue')}
          </span>
          {row.team_name && (
            <span className="oa-text-xs oa-text-slate-500">{row.team_name}</span>
          )}
        </div>
      ),
    },
    {
      id: 'seat_count',
      label: t('ticketing.seatMaps.table.seats'),
      sortable: true,
      render: (row) => <span className="oa-font-medium">{row.seat_count}</span>,
    },
    {
      id: 'usage_count',
      label: t('ticketing.seatMaps.table.usage'),
      sortable: true,
      render: (row) => (
        <span className="oa-text-sm oa-text-slate-500">
          {row.usage_count === 1
            ? t('ticketing.seatMaps.table.usageSingular')
            : t('ticketing.seatMaps.table.usagePlural', { count: String(row.usage_count) })}
        </span>
      ),
    },
    {
      id: 'updated_at',
      label: t('ticketing.seatMaps.table.updated'),
      sortable: true,
      render: (row) => <span className="oa-text-sm oa-text-slate-500">{formatDate(row.updated_at)}</span>,
    },
    {
      id: 'actions',
      label: t('ticketing.seatMaps.table.actions'),
      align: 'right',
      render: (row) => (
        <div className="oa-flex oa-items-center oa-gap-2 oa-justify-end">
          {row.status === 'draft' && (
            <button
              type="button"
              className="oa-btn oa-btn--primary oa-btn--dense"
              disabled={isWriteBlocked || publishMutation.isPending}
              onClick={(event) => {
                event.stopPropagation()
                publishMutation.mutate(row.id)
              }}
            >
              {t('ticketing.seatMaps.actions.publish')}
            </button>
          )}
          <button
            type="button"
            className="oa-btn oa-btn--outline oa-btn--dense"
            disabled={isWriteBlocked || cloneMutation.isPending}
            onClick={(event) => {
              event.stopPropagation()
              setCloneTarget(row)
            }}
          >
            {t('ticketing.seatMaps.actions.clone')}
          </button>
          {row.ticketed_event_id ? (
            <Link
              to={getLink('admin.ticketingEvents.seatMaps.builder', {
                eventId: row.ticketed_event_id,
                seatMapId: row.id,
              })}
              className="oa-link"
              onClick={(event) => event.stopPropagation()}
            >
              {t('ticketing.seatMaps.actions.edit')}
            </Link>
          ) : (
            <Link
              to={getLink('admin.ticketingEvents.seatMaps.list') + `?edit=${row.id}`}
              className="oa-link"
              onClick={(event) => event.stopPropagation()}
            >
              {t('ticketing.seatMaps.actions.edit')}
            </Link>
          )}
          <button
            type="button"
            className="oa-btn oa-btn--danger oa-btn--dense"
            disabled={isWriteBlocked || deleteMutation.isPending || row.usage_count > 0}
            title={row.usage_count > 0 ? t('ticketing.seatMaps.actions.deleteBlockedByUsage') : undefined}
            onClick={(event) => {
              event.stopPropagation()
              setDeleteTarget(row)
            }}
          >
            {t('ticketing.seatMaps.actions.delete')}
          </button>
        </div>
      ),
    },
  ]

  if (!orgId && isReady) {
    return (
      <div className="oa-root">
        <AdminPageHeader
          title={t('ticketing.seatMaps.title')}
          subtitle={t('ticketing.seatMaps.subtitle')}
          breadcrumbs={[{ label: t('ticketing.detail.title') }, { label: t('ticketing.seatMaps.title') }]}
        />
        <Card>
          <EmptyState
            icon="business"
            title={t('ticketing.seatMaps.empty.orgMissingTitle')}
            description={t('ticketing.seatMaps.empty.orgMissingDescription')}
            noCard
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <AdminPageHeader
        title={t('ticketing.seatMaps.title')}
        subtitle={t('ticketing.seatMaps.subtitle')}
        breadcrumbs={[
          { label: t('ticketing.detail.title'), path: getLink('admin.ticketingEvents.list') },
          { label: t('ticketing.seatMaps.title') },
        ]}
      />

      {isWriteBlocked && (
        <InlineNotice
          tone="warning"
          title={t('ticketing.seatMaps.notices.readOnlyTitle')}
          message={
            isOffline
              ? t('ticketing.seatMaps.notices.offline')
              : t('ticketing.seatMaps.notices.demoMode')
          }
          className="oa-mb-4"
        />
      )}

      {seatMapsLoadError && (
        <InlineNotice
          tone="error"
          title="Unable to load seat maps"
          message={seatMapsLoadError}
          className="oa-mb-4"
        />
      )}

      <Card className="oa-mb-4">
        <div className="oa-grid oa-grid-cols-1 md:oa-grid-cols-3 oa-gap-3">
          <div className="oa-flex oa-flex-col oa-gap-2">
            <label className="oa-label">{t('ticketing.seatMaps.form.venueLabel')}</label>
            <select
              className="oa-select"
              value={selectedVenueId}
              onChange={(event) => setSelectedVenueId(event.target.value)}
            >
              {venueOptions.map((option) => (
                <option key={option.value || 'placeholder'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="oa-flex oa-flex-col oa-gap-2">
            <label className="oa-label">{t('ticketing.seatMaps.form.nameLabel')}</label>
            <input
              className="oa-input"
              value={newSeatMapName}
              onChange={(event) => setNewSeatMapName(event.target.value)}
              placeholder={t('ticketing.seatMaps.form.namePlaceholder')}
            />
          </div>

          <div className="oa-flex oa-items-end oa-justify-end">
            <OrgAdminButton
              icon="add"
              disabled={isWriteBlocked || createMutation.isPending || !newSeatMapName.trim()}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending
                ? t('ticketing.seatMaps.actions.creating')
                : t('ticketing.seatMaps.actions.create')}
            </OrgAdminButton>
          </div>
        </div>
      </Card>

      <Card>
        <div className="oa-flex oa-items-center oa-justify-between oa-gap-3 oa-mb-4">
          <div>
            <h3 className="oa-card-title">{t('ticketing.seatMaps.table.title')}</h3>
          </div>
          <input
            className="oa-input"
            style={{ maxWidth: 280 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('ticketing.seatMaps.form.searchPlaceholder')}
          />
        </div>

        <OrgDataTable
          columns={columns}
          data={filteredSeatMaps}
          totalCount={filteredSeatMaps.length}
          rowsPerPage={Math.max(filteredSeatMaps.length, 10)}
          loading={seatMapsQuery.isLoading || venuesQuery.isLoading}
          emptyMessage={t('ticketing.seatMaps.empty.noSeatMaps')}
          onRowClick={(row) => {
            if (row.ticketed_event_id) {
              navigate(
                getLink('admin.ticketingEvents.seatMaps.builder', {
                  eventId: row.ticketed_event_id,
                  seatMapId: row.id,
                }),
              )
            }
          }}
        />
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('ticketing.seatMaps.deleteDialog.title')}
        description={t('ticketing.seatMaps.deleteDialog.description', { name: deleteTarget?.name || '' })}
        confirmLabel={deleteMutation.isPending ? t('ticketing.seatMaps.actions.deleting') : t('ticketing.seatMaps.actions.delete')}
        variant="danger"
        onCancel={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null)
        }}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteMutation.mutate(deleteTarget.id)
        }}
      />

      <ConfirmDialog
        open={!!cloneTarget}
        title={t('ticketing.seatMaps.cloneDialog.title')}
        description={t('ticketing.seatMaps.cloneDialog.description', { name: cloneTarget?.name || '' })}
        confirmLabel={cloneMutation.isPending ? t('ticketing.seatMaps.actions.cloning') : t('ticketing.seatMaps.actions.clone')}
        variant="primary"
        onCancel={() => {
          if (!cloneMutation.isPending) setCloneTarget(null)
        }}
        onConfirm={() => {
          if (!cloneTarget) return
          cloneMutation.mutate({
            seatMapId: cloneTarget.id,
            newName: `${cloneTarget.name} (copy)`,
          })
        }}
      />
    </div>
  )
}

function showSuccessToast(message: string) {
  showSuccess(message)
}

function showErrorToast(message: string) {
  showError(message)
}
