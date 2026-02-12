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
  getTicketedEvents,
  type AdminSeatMapListItem,
} from '@/data/services'
import type { TicketedEvent } from '@/types/ticketing'
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
  const [selectedEventId, setSelectedEventId] = useState('')
  const [newSeatMapName, setNewSeatMapName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminSeatMapListItem | null>(null)

  const orgId = context.orgId || ''

  const seatMapsQuery = useQuery({
    queryKey: ['admin-seat-maps', orgId],
    queryFn: () => getSeatMapsForOrgAdmin(orgId),
    enabled: isReady && !!orgId,
  })

  const ticketedEventsQuery = useQuery<TicketedEvent[]>({
    queryKey: ['admin-ticketed-events-for-seat-maps', orgId],
    queryFn: () => getTicketedEvents({ org_id: orgId }),
    enabled: isReady && !!orgId,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEventId) throw new Error(t('ticketing.seatMaps.errors.eventRequired'))
      const name = newSeatMapName.trim()
      if (!name) throw new Error(t('ticketing.seatMaps.errors.nameRequired'))
      return createSeatMap(selectedEventId, name)
    },
    onSuccess: (created) => {
      setNewSeatMapName('')
      showSuccessToast(t('ticketing.seatMaps.toasts.created'))
      void queryClient.invalidateQueries({ queryKey: ['admin-seat-maps', orgId] })
      const builderPath = getLink('admin.ticketingEvents.seatMaps.builder', {
        eventId: created.ticketed_event_id,
        seatMapId: created.id,
      })
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
    },
    onError: (error) => {
      showErrorToast(classifySupabaseError(error).message || t('ticketing.seatMaps.errors.deleteFailed'))
    },
  })

  const isWriteBlocked = isOffline || USE_FAKE_DATA

  const filteredSeatMaps = useMemo(() => {
    const items = seatMapsQuery.data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return items

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.event_title.toLowerCase().includes(term)
      )
    })
  }, [seatMapsQuery.data, search])

  const eventOptions = useMemo(() => {
    const events = ticketedEventsQuery.data ?? []
    return [
      { value: '', label: t('ticketing.seatMaps.form.selectEvent') },
      ...events.map((event) => ({
        value: event.id,
        label: `${event.title} • ${formatDate(event.starts_at)}`,
      })),
    ]
  }, [ticketedEventsQuery.data, t])

  const columns: ColumnConfig<AdminSeatMapListItem>[] = [
    {
      id: 'name',
      label: t('ticketing.seatMaps.table.name'),
      sortable: true,
      render: (row) => (
        <div className="oa-flex oa-flex-col oa-gap-1">
          <span className="oa-font-bold oa-text-slate-900">{row.name}</span>
          <span className="oa-text-xs oa-text-slate-500">{row.id}</span>
        </div>
      ),
    },
    {
      id: 'event_title',
      label: t('ticketing.seatMaps.table.event'),
      sortable: true,
      render: (row) => (
        <div className="oa-flex oa-flex-col oa-gap-1">
          <span className="oa-text-sm oa-font-medium oa-text-slate-700">{row.event_title}</span>
          <span className="oa-text-xs oa-text-slate-500">{formatDate(row.event_starts_at)}</span>
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
          <button
            type="button"
            className="oa-btn oa-btn--danger oa-btn--dense"
            disabled={isWriteBlocked || deleteMutation.isPending}
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

      <Card className="oa-mb-4">
        <div className="oa-grid oa-grid-cols-1 md:oa-grid-cols-3 oa-gap-3">
          <div className="oa-flex oa-flex-col oa-gap-2">
            <label className="oa-label">{t('ticketing.seatMaps.form.eventLabel')}</label>
            <select
              className="oa-select"
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
            >
              {eventOptions.map((option) => (
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
              disabled={isWriteBlocked || createMutation.isPending || !selectedEventId || !newSeatMapName.trim()}
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
          loading={seatMapsQuery.isLoading || ticketedEventsQuery.isLoading}
          emptyMessage={t('ticketing.seatMaps.empty.noSeatMaps')}
          onRowClick={(row) => {
            navigate(
              getLink('admin.ticketingEvents.seatMaps.builder', {
                eventId: row.ticketed_event_id,
                seatMapId: row.id,
              }),
            )
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
    </div>
  )
}

function showSuccessToast(message: string) {
  showSuccess(message)
}

function showErrorToast(message: string) {
  showError(message)
}
