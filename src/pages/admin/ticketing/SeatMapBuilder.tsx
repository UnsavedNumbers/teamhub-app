import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner'
import { Card } from '@/components/admin/Card'
import { OrgAdminButton } from '@/components/admin/OrgAdminButton'
import SeatMapBulkGenerator from '@/components/ticketing/SeatMapBulkGenerator'
import EmptyState from '@/components/platformAdmin/EmptyState'
import { showError, showSuccess } from '@/utils/toast'
import { getLink, useRouteLink } from '@/utils/routes'
import { useOffline } from '@/hooks/useOffline'
import { USE_FAKE_DATA } from '@/data/config'
import {
  bulkAddSeats,
  createSeatMap,
  deleteSeat,
  getSeatMapWithSeats,
  getTicketedEventByIdAdmin,
  importSeatRows,
  removeSeatMapChart,
  updateSeat,
  updateSeatMap,
  uploadSeatMapChart,
} from '@/data/services'
import { useT } from '@/i18n/useI18n'
import { NotFoundError, RLSError } from '@/utils/supabaseErrorHandler'
import { cn } from '@/utils/cn'

function parseBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase())
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export default function SeatMapBuilder() {
  useDebugLifecycle('SeatMapBuilder')
  const t = useT()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { isOffline, retry } = useOffline()
  const { eventId: eventIdParam, seatMapId } = useParams<{ eventId?: string; seatMapId: string }>()
  const eventId = eventIdParam ?? null
  const hasEventContext = Boolean(eventId)
  const isDraftSeatMap = seatMapId === 'new'
  const persistedSeatMapId = !isDraftSeatMap ? seatMapId : null
  const hasValidEventId = !eventId || USE_FAKE_DATA || isUuid(eventId)
  const hasValidSeatMapId = !!seatMapId && (isDraftSeatMap || USE_FAKE_DATA || isUuid(seatMapId))
  const hasInvalidParams = !hasValidEventId || !hasValidSeatMapId || (!eventId && isDraftSeatMap)

  const eventsPath = useRouteLink('admin.ticketingEvents.list')
  const seatMapsPath = useRouteLink('admin.ticketingEvents.seatMaps.list')

  const [seatMapName, setSeatMapName] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [hasDeletedAllSeats, setHasDeletedAllSeats] = useState(false)
  const csvInputRef = useRef<HTMLInputElement | null>(null)
  const isWriteBlocked = isOffline || USE_FAKE_DATA

  const invalidateSeatMapCaches = async (seatMapKey?: string | null) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-seat-maps'] }),
      queryClient.invalidateQueries({ queryKey: ['seat-maps'] }),
      ...(seatMapKey ? [queryClient.invalidateQueries({ queryKey: ['seat-map-builder', seatMapKey] })] : []),
    ])
  }

  const eventQuery = useQuery({
    queryKey: ['ticketed-event', eventId],
    queryFn: () => getTicketedEventByIdAdmin(eventId!),
    enabled: Boolean(eventId && (USE_FAKE_DATA || isUuid(eventId))),
  })

  const detailPath = eventQuery.data?.event_id
    ? `${getLink('admin.events.detail', { id: eventQuery.data.event_id })}?view=ticketing`
    : eventsPath

  const returnTo = new URLSearchParams(location.search).get('returnTo') ?? (hasEventContext ? detailPath : seatMapsPath)

  const seatMapQuery = useQuery({
    queryKey: ['seat-map-builder', seatMapId],
    queryFn: () => getSeatMapWithSeats(seatMapId!),
    enabled: Boolean(persistedSeatMapId && (USE_FAKE_DATA || isUuid(persistedSeatMapId))),
    refetchInterval: persistedSeatMapId ? 15000 : false,
  })

  useEffect(() => {
    if (isDraftSeatMap) {
      setSeatMapName((current) => (
        current || t('ticketing.reservedSeating.builder.defaultMapName', { date: new Date().toLocaleDateString() })
      ))
      return
    }

    if (seatMapQuery.data?.name) {
      setSeatMapName(seatMapQuery.data.name)
    }
  }, [isDraftSeatMap, seatMapQuery.data?.name, t])

  const createSeatMapMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.seatMapMissing'))
      }
      if (isWriteBlocked) {
        throw new Error(
          USE_FAKE_DATA
            ? t('ticketing.reservedSeating.builder.errors.demoModeWriteBlocked')
            : t('ticketing.reservedSeating.builder.errors.offlineWriteBlocked'),
        )
      }
      // Resolve org_id from event context if available
      const orgId = eventQuery.data?.org_id ?? ''
      const venueId = eventQuery.data?.venue_id ?? null
      return createSeatMap({
        name: seatMapName.trim(),
        org_id: orgId,
        venue_id: venueId,
        ticketed_event_id: eventId,
      })
    },
    onSuccess: async (created) => {
      showSuccess(t('ticketing.reservedSeating.builder.seatMapSaved'))
      await invalidateSeatMapCaches(created.id)

      const nextReturnTo = returnTo.includes('seatMapId=')
        ? returnTo
        : `${returnTo}${returnTo.includes('?') ? '&' : '?'}seatMapId=${created.id}`

      const builderPath = getLink('admin.ticketingEvents.seatMaps.builder', {
        eventId: eventId!,
        seatMapId: created.id,
      })
      navigate(`${builderPath}?returnTo=${encodeURIComponent(nextReturnTo)}`, { replace: true })
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.saveFailed')),
  })

  const updateNameMutation = useMutation({
    mutationFn: async () => {
      if (!persistedSeatMapId) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.seatMapMissing'))
      }
      if (isWriteBlocked) {
        throw new Error(
          USE_FAKE_DATA
            ? t('ticketing.reservedSeating.builder.errors.demoModeWriteBlocked')
            : t('ticketing.reservedSeating.builder.errors.offlineWriteBlocked'),
        )
      }
      await updateSeatMap(persistedSeatMapId, { name: seatMapName.trim() })
    },
    onSuccess: async () => {
      showSuccess(t('ticketing.reservedSeating.builder.nameSaved'))
      await invalidateSeatMapCaches(persistedSeatMapId)
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.saveFailed')),
  })

  const chartUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!persistedSeatMapId) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.seatMapMissing'))
      }
      if (isWriteBlocked) {
        throw new Error(
          USE_FAKE_DATA
            ? t('ticketing.reservedSeating.builder.errors.demoModeWriteBlocked')
            : t('ticketing.reservedSeating.builder.errors.offlineWriteBlocked'),
        )
      }
      await uploadSeatMapChart(persistedSeatMapId, file, { ticketedEventId: eventId })
    },
    onSuccess: async () => {
      showSuccess(t('ticketing.reservedSeating.builder.chartUploaded'))
      await invalidateSeatMapCaches(persistedSeatMapId)
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.chartUploadFailed')),
  })

  const chartRemoveMutation = useMutation({
    mutationFn: async () => {
      if (!persistedSeatMapId) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.seatMapMissing'))
      }
      if (isWriteBlocked) {
        throw new Error(
          USE_FAKE_DATA
            ? t('ticketing.reservedSeating.builder.errors.demoModeWriteBlocked')
            : t('ticketing.reservedSeating.builder.errors.offlineWriteBlocked'),
        )
      }
      await removeSeatMapChart(persistedSeatMapId, seatMapQuery.data?.chart_image_url)
    },
    onSuccess: async () => {
      showSuccess(t('ticketing.reservedSeating.builder.chartRemoved'))
      await invalidateSeatMapCaches(persistedSeatMapId)
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.chartRemoveFailed')),
  })

  const bulkMutation = useMutation({
    mutationFn: async (payload: Parameters<typeof bulkAddSeats>[1]) => {
      if (!persistedSeatMapId) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.seatMapMissing'))
      }
      if (isWriteBlocked) {
        throw new Error(
          USE_FAKE_DATA
            ? t('ticketing.reservedSeating.builder.errors.demoModeWriteBlocked')
            : t('ticketing.reservedSeating.builder.errors.offlineWriteBlocked'),
        )
      }
      return bulkAddSeats(persistedSeatMapId, payload)
    },
    onSuccess: async (count) => {
      showSuccess(t('ticketing.reservedSeating.builder.bulkSuccess', { count }))
      await invalidateSeatMapCaches(persistedSeatMapId)
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.bulkFailed')),
  })

  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!persistedSeatMapId) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.seatMapMissing'))
      }
      if (isWriteBlocked) {
        throw new Error(
          USE_FAKE_DATA
            ? t('ticketing.reservedSeating.builder.errors.demoModeWriteBlocked')
            : t('ticketing.reservedSeating.builder.errors.offlineWriteBlocked'),
        )
      }

      const content = await file.text()
      const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
      if (lines.length < 2) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.csvInvalid'))
      }

      const header = lines[0].split(',').map((value) => value.trim().toLowerCase())
      const sectionIndex = header.indexOf('section')
      const rowIndex = header.indexOf('row')
      const seatIndex = header.indexOf('seat')
      const accessibleIndex = header.indexOf('accessible')
      const obstructedIndex = header.indexOf('obstructed_view')

      if (sectionIndex < 0 || rowIndex < 0 || seatIndex < 0) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.csvHeaders'))
      }

      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((value) => value.trim())
        return {
          section: cols[sectionIndex] || '',
          row: cols[rowIndex] || '',
          seat: cols[seatIndex] || '',
          seat_attributes: {
            accessible: accessibleIndex >= 0 ? parseBoolean(cols[accessibleIndex] || '') : false,
            obstructed_view: obstructedIndex >= 0 ? parseBoolean(cols[obstructedIndex] || '') : false,
          },
        }
      }).filter((row) => row.section && row.row && row.seat)

      if (rows.length === 0) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.csvInvalid'))
      }

      return importSeatRows(persistedSeatMapId, rows)
    },
    onSuccess: async (count) => {
      setCsvFile(null)
      showSuccess(t('ticketing.reservedSeating.builder.csvSuccess', { count }))
      await invalidateSeatMapCaches(persistedSeatMapId)
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.csvFailed')),
  })

  const toggleSeatAttributeMutation = useMutation({
    mutationFn: async ({
      sectionId,
      key,
      value,
      currentAttributes,
    }: {
      sectionId: string
      key: 'accessible' | 'obstructed_view' | 'companion_required' | 'vip'
      value: boolean
      currentAttributes: Record<string, unknown>
    }) => {
      if (isWriteBlocked) {
        throw new Error(
          USE_FAKE_DATA
            ? t('ticketing.reservedSeating.builder.errors.demoModeWriteBlocked')
            : t('ticketing.reservedSeating.builder.errors.offlineWriteBlocked'),
        )
      }
      await updateSeat(sectionId, {
        seat_attributes: {
          ...currentAttributes,
          [key]: value,
        },
      })
    },
    onSuccess: async () => {
      await invalidateSeatMapCaches(persistedSeatMapId)
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.seatUpdateFailed')),
  })

  const seats = seatMapQuery.data?.sections ?? []
  const seatCount = useMemo(() => seats.length, [seats])

  const deleteSeatMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      if (isWriteBlocked) {
        throw new Error(
          USE_FAKE_DATA
            ? t('ticketing.reservedSeating.builder.errors.demoModeWriteBlocked')
            : t('ticketing.reservedSeating.builder.errors.offlineWriteBlocked'),
        )
      }
      await deleteSeat(sectionId)
    },
    onSuccess: async () => {
      if (seatCount <= 1) {
        setHasDeletedAllSeats(true)
      }
      showSuccess(t('ticketing.reservedSeating.builder.seatDeleted'))
      await invalidateSeatMapCaches(persistedSeatMapId)
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.seatDeleteFailed')),
  })

  useEffect(() => {
    if (seats.length > 0) {
      setHasDeletedAllSeats(false)
    }
  }, [seats.length])

  const loadError = ((hasEventContext ? eventQuery.error : null) ?? seatMapQuery.error) as Error | null
  const loadErrorMessage = loadError?.message?.toLowerCase() ?? ''
  const isPermissionError = loadError instanceof RLSError || loadErrorMessage.includes('permission') || loadErrorMessage.includes('access denied') || loadErrorMessage.includes('rls')
  const isNotFoundError = loadError instanceof NotFoundError || loadErrorMessage.includes('not found')

  if (hasInvalidParams) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="event_seat"
          title={t('ticketing.reservedSeating.builder.missingParamsTitle')}
          description={t('ticketing.reservedSeating.builder.invalidParamsDescription')}
          action={{ label: t('common.back'), onClick: () => navigate(returnTo) }}
          noCard
        />
      </div>
    )
  }

  if ((hasEventContext && eventQuery.isLoading) || (!isDraftSeatMap && seatMapQuery.isLoading)) {
    return (
      <div className="oa-flex oa-justify-center oa-pt-12">
        <AdminLoadingSpinner />
      </div>
    )
  }

  if (isOffline && ((hasEventContext && !eventQuery.data) || (!isDraftSeatMap && !seatMapQuery.data))) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="wifi_off"
          title={t('ticketing.reservedSeating.builder.offlineTitle')}
          description={t('ticketing.reservedSeating.builder.offlineDescription')}
          action={{
            label: t('ticketing.reservedSeating.builder.retry'),
            onClick: () => {
              retry()
              if (hasEventContext) {
                eventQuery.refetch()
              }
              if (!isDraftSeatMap) {
                seatMapQuery.refetch()
              }
            },
          }}
          noCard
        />
      </div>
    )
  }

  if (isPermissionError) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="lock"
          title={t('ticketing.reservedSeating.builder.permissionTitle')}
          description={t('ticketing.reservedSeating.builder.permissionDescription')}
          action={{ label: t('common.back'), onClick: () => navigate(returnTo) }}
          noCard
        />
      </div>
    )
  }

  if ((hasEventContext && !eventQuery.data) || (!isDraftSeatMap && !seatMapQuery.data) || isNotFoundError) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="event_busy"
          title={t('ticketing.reservedSeating.builder.notFoundTitle')}
          description={t('ticketing.reservedSeating.builder.notFoundDescription')}
          action={{ label: t('common.back'), onClick: () => navigate(returnTo) }}
          noCard
        />
      </div>
    )
  }

  return (
    <div className="oa-page-container oa-space-y-6">
      <AdminPageHeader
        title={t('ticketing.reservedSeating.builder.title')}
        subtitle={
          hasEventContext && eventQuery.data
            ? `${eventQuery.data.title} | ${t('ticketing.reservedSeating.builder.totalSeats', { count: seatCount })}`
            : t('ticketing.reservedSeating.builder.totalSeats', { count: seatCount })
        }
        actions={
          <OrgAdminButton as={Link} to={returnTo} icon="arrow_back">
            {t('ticketing.reservedSeating.builder.backToEvent')}
          </OrgAdminButton>
        }
      />

      <div className="oa-ticketing-form-stack">
        {USE_FAKE_DATA && (
          <Card>
            <p className="oa-text-muted">{t('ticketing.reservedSeating.builder.demoModeNotice')}</p>
          </Card>
        )}

        {isOffline && (
          <Card>
            <p className="oa-text-muted">{t('ticketing.reservedSeating.builder.offlineWriteNotice')}</p>
          </Card>
        )}

        <Card title={t('ticketing.reservedSeating.builder.mapDetails')}>
          <div className="oa-form-grid oa-form-grid-2 oa-gap-6">
            <div className="oa-ticketing-field-stack">
              <div className="oa-form-grid oa-form-grid-2 oa-gap-4">
                <div className="oa-form-group">
                  <label className="oa-label oa-label">{t('ticketing.reservedSeating.builder.mapName')}</label>
                  <input
                    className="oa-input"
                    value={seatMapName}
                    onChange={(event) => setSeatMapName(event.target.value)}
                  />
                </div>
                <div className="oa-form-group">
                  <label className="oa-label oa-label" style={{ visibility: 'hidden' }} aria-hidden="true">
                    {t('ticketing.reservedSeating.builder.mapName')}
                  </label>
                  <button
                    className="oa-btn oa-btn-secondary"
                    type="button"
                    disabled={
                      !seatMapName.trim() ||
                      createSeatMapMutation.isPending ||
                      updateNameMutation.isPending ||
                      isWriteBlocked
                    }
                    onClick={() => {
                      if (isDraftSeatMap) {
                        createSeatMapMutation.mutate()
                        return
                      }
                      updateNameMutation.mutate()
                    }}
                  >
                    {createSeatMapMutation.isPending || updateNameMutation.isPending
                      ? t('common.saving')
                      : (isDraftSeatMap ? t('ticketing.reservedSeating.builder.saveSeatMapCta') : t('common.save'))}
                  </button>
                </div>
              </div>

              <div className="oa-form-group">
                <label className="oa-label oa-label">{t('ticketing.reservedSeating.builder.chartUploadLabel')}</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isDraftSeatMap || chartUploadMutation.isPending || isWriteBlocked}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      chartUploadMutation.mutate(file)
                    }
                  }}
                />
                <p className="oa-text-muted">
                  {isDraftSeatMap
                    ? t('ticketing.reservedSeating.builder.saveBeforeChartUpload')
                    : t('ticketing.reservedSeating.builder.chartUploadHint')}
                </p>
              </div>
            </div>

            <div className="oa-form-group">
              <label className="oa-label oa-label">{t('ticketing.reservedSeating.builder.chartPreviewTitle')}</label>
              <div
                style={{
                  position: 'relative',
                  minHeight: 220,
                  border: '1px solid var(--oa-border-light)',
                  borderRadius: 10,
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
                  overflow: 'hidden',
                }}
              >
                {seatMapQuery.data?.chart_image_url ? (
                  <>
                    <img
                      src={seatMapQuery.data.chart_image_url}
                      alt={t('ticketing.reservedSeating.builder.chartPreviewAlt')}
                      style={{
                        width: '100%',
                        maxHeight: 320,
                        objectFit: 'contain',
                        borderRadius: 8,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => chartRemoveMutation.mutate()}
                      disabled={chartRemoveMutation.isPending || isWriteBlocked}
                      aria-label={t('ticketing.reservedSeating.builder.removeChart')}
                      title={t('ticketing.reservedSeating.builder.removeChart')}
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.7)',
                        background: 'rgba(17,24,39,0.6)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: chartRemoveMutation.isPending || isWriteBlocked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        close
                      </span>
                    </button>
                  </>
                ) : (
                  <p className="oa-text-muted" style={{ margin: 0 }}>
                    {t('ticketing.reservedSeating.builder.chartPreviewEmpty')}
                  </p>
                )}
              </div>
              {seatMapQuery.data?.chart_image_url && (
                <button
                  type="button"
                  className="oa-btn oa-btn-text oa-text-danger"
                  onClick={() => chartRemoveMutation.mutate()}
                  disabled={chartRemoveMutation.isPending || isWriteBlocked}
                  style={{ marginTop: 8 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>
                    delete
                  </span>
                  {chartRemoveMutation.isPending
                    ? t('common.saving')
                    : t('ticketing.reservedSeating.builder.removeChart')}
                </button>
              )}
            </div>
          </div>
        </Card>

        {isDraftSeatMap ? (
          <Card>
            <p className="oa-text-muted">{t('ticketing.reservedSeating.builder.saveBeforeTools')}</p>
          </Card>
        ) : (
          <>
            <Card title={t('ticketing.reservedSeating.builder.bulkGeneratorTitle')}>
              <SeatMapBulkGenerator onGenerate={(config) => bulkMutation.mutateAsync(config)} loading={bulkMutation.isPending} />
            </Card>

            <Card title={t('ticketing.reservedSeating.builder.csvTitle')}>
              <div className="oa-ticketing-field-stack">
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  disabled={csvImportMutation.isPending || isWriteBlocked}
                  onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
                />
                <div className="oa-flex oa-gap-3 oa-items-center">
                  <button
                    className="oa-btn oa-btn-secondary"
                    type="button"
                    disabled={!csvFile || csvImportMutation.isPending || isWriteBlocked}
                    onClick={() => csvFile && csvImportMutation.mutate(csvFile)}
                  >
                    {csvImportMutation.isPending ? t('ticketing.reservedSeating.builder.csvImporting') : t('ticketing.reservedSeating.builder.csvImport')}
                  </button>
                </div>
              </div>
            </Card>

            <Card title={t('ticketing.reservedSeating.builder.seatsTableTitle')}>
              {seats.length === 0 ? (
                <EmptyState
                  icon={hasDeletedAllSeats ? 'delete_sweep' : 'event_seat'}
                  title={
                    hasDeletedAllSeats
                      ? t('ticketing.reservedSeating.builder.noSeatsAfterDeleteTitle')
                      : t('ticketing.reservedSeating.builder.noSeatsFirstTimeTitle')
                  }
                  description={
                    hasDeletedAllSeats
                      ? t('ticketing.reservedSeating.builder.noSeatsAfterDeleteDescription')
                      : t('ticketing.reservedSeating.builder.noSeatsFirstTimeDescription')
                  }
                  action={{
                    label: t('ticketing.reservedSeating.builder.primaryEmptyAction'),
                    onClick: () => {
                      csvInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      csvInputRef.current?.focus()
                    },
                  }}
                  noCard
                />
              ) : (
                <div className="oa-table-container">
                  <table className="oa-table">
                    <thead>
                      <tr>
                        <th>{t('ticketing.reservedSeating.builder.columns.section')}</th>
                        <th>{t('ticketing.reservedSeating.builder.columns.row')}</th>
                        <th>{t('ticketing.reservedSeating.builder.columns.seat')}</th>
                        <th>{t('ticketing.reservedSeating.builder.columns.attributes')}</th>
                        <th>{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seats.map((seat) => {
                        const attributes = (seat.seat_attributes ?? {}) as Record<string, unknown>
                        const seatAttributeOptions: Array<{
                          key: 'accessible' | 'obstructed_view' | 'companion_required' | 'vip'
                          label: string
                        }> = [
                          {
                            key: 'accessible',
                            label: t('ticketing.reservedSeating.builder.attributes.accessible'),
                          },
                          {
                            key: 'obstructed_view',
                            label: t('ticketing.reservedSeating.builder.attributes.obstructed'),
                          },
                          {
                            key: 'companion_required',
                            label: t('ticketing.reservedSeating.builder.attributes.companion'),
                          },
                          {
                            key: 'vip',
                            label: t('ticketing.reservedSeating.builder.attributes.vip'),
                          },
                        ]

                        return (
                          <tr key={seat.id}>
                            <td>{seat.section_name}</td>
                            <td>{seat.row_identifier}</td>
                            <td>{seat.seat_identifier}</td>
                            <td>
                              <div
                                className="oa-toggle-group"
                                role="group"
                                aria-label={`${seat.section_name} ${seat.row_identifier} ${seat.seat_identifier} attributes`}
                              >
                                {seatAttributeOptions.map((option) => {
                                  const isActive = Boolean(attributes[option.key])
                                  return (
                                    <button
                                      key={option.key}
                                      type="button"
                                      className={cn('oa-toggle-btn', isActive && 'active')}
                                      onClick={() => {
                                        toggleSeatAttributeMutation.mutate({
                                          sectionId: seat.id,
                                          key: option.key,
                                          value: !isActive,
                                          currentAttributes: attributes,
                                        })
                                      }}
                                      disabled={toggleSeatAttributeMutation.isPending || isWriteBlocked}
                                    >
                                      {option.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="oa-btn oa-btn-text oa-text-danger"
                                onClick={() => deleteSeatMutation.mutate(seat.id)}
                                disabled={deleteSeatMutation.isPending || isWriteBlocked}
                              >
                                {t('common.delete')}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}


