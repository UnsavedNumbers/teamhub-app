import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner'
import { OrgAdminButton } from '@/components/admin/OrgAdminButton'
import SeatMapBulkGenerator from '@/components/ticketing/SeatMapBulkGenerator'
import EmptyState from '@/components/platformAdmin/EmptyState'
import { showError, showSuccess } from '@/utils/toast'
import { useRouteLink } from '@/utils/routes'
import {
  bulkAddSeats,
  deleteSeat,
  getSeatMapWithSeats,
  getTicketedEventByIdAdmin,
  importSeatRows,
  updateSeat,
  updateSeatMap,
  uploadSeatMapChart,
} from '@/data/services'
import { useT } from '@/i18n/useI18n'

function parseBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'y'].includes(value.trim().toLowerCase())
}

export default function SeatMapBuilder() {
  const t = useT()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { eventId, seatMapId } = useParams<{ eventId: string; seatMapId: string }>()

  const detailPath = useRouteLink(
    eventId ? 'admin.ticketingEvents.detail' : 'admin.ticketingEvents.list',
    eventId ? { id: eventId } : undefined,
  )
  const returnTo = new URLSearchParams(location.search).get('returnTo') ?? detailPath

  const [seatMapName, setSeatMapName] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const eventQuery = useQuery({
    queryKey: ['ticketed-event', eventId],
    queryFn: () => getTicketedEventByIdAdmin(eventId!),
    enabled: Boolean(eventId),
  })

  const seatMapQuery = useQuery({
    queryKey: ['seat-map-builder', seatMapId],
    queryFn: () => getSeatMapWithSeats(seatMapId!),
    enabled: Boolean(seatMapId),
  })

  useEffect(() => {
    if (seatMapQuery.data?.name) {
      setSeatMapName(seatMapQuery.data.name)
    }
  }, [seatMapQuery.data?.name])

  const updateNameMutation = useMutation({
    mutationFn: async () => {
      if (!seatMapId) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.seatMapMissing'))
      }
      await updateSeatMap(seatMapId, { name: seatMapName.trim() })
    },
    onSuccess: async () => {
      showSuccess(t('ticketing.reservedSeating.builder.nameSaved'))
      await queryClient.invalidateQueries({ queryKey: ['seat-map-builder', seatMapId] })
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.saveFailed')),
  })

  const chartUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!seatMapId) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.seatMapMissing'))
      }
      await uploadSeatMapChart(seatMapId, file)
    },
    onSuccess: async () => {
      showSuccess(t('ticketing.reservedSeating.builder.chartUploaded'))
      await queryClient.invalidateQueries({ queryKey: ['seat-map-builder', seatMapId] })
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.chartUploadFailed')),
  })

  const bulkMutation = useMutation({
    mutationFn: async (payload: Parameters<typeof bulkAddSeats>[1]) => {
      if (!seatMapId) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.seatMapMissing'))
      }
      return bulkAddSeats(seatMapId, payload)
    },
    onSuccess: async (count) => {
      showSuccess(t('ticketing.reservedSeating.builder.bulkSuccess', { count }))
      await queryClient.invalidateQueries({ queryKey: ['seat-map-builder', seatMapId] })
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.bulkFailed')),
  })

  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!seatMapId) {
        throw new Error(t('ticketing.reservedSeating.builder.errors.seatMapMissing'))
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

      return importSeatRows(seatMapId, rows)
    },
    onSuccess: async (count) => {
      setCsvFile(null)
      showSuccess(t('ticketing.reservedSeating.builder.csvSuccess', { count }))
      await queryClient.invalidateQueries({ queryKey: ['seat-map-builder', seatMapId] })
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
      await updateSeat(sectionId, {
        seat_attributes: {
          ...currentAttributes,
          [key]: value,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['seat-map-builder', seatMapId] })
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.seatUpdateFailed')),
  })

  const deleteSeatMutation = useMutation({
    mutationFn: deleteSeat,
    onSuccess: async () => {
      showSuccess(t('ticketing.reservedSeating.builder.seatDeleted'))
      await queryClient.invalidateQueries({ queryKey: ['seat-map-builder', seatMapId] })
    },
    onError: (error: any) => showError(error.message || t('ticketing.reservedSeating.builder.errors.seatDeleteFailed')),
  })

  const seats = seatMapQuery.data?.sections ?? []
  const seatCount = useMemo(() => seats.length, [seats])

  if (!eventId || !seatMapId) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="event_seat"
          title={t('ticketing.reservedSeating.builder.missingParamsTitle')}
          description={t('ticketing.reservedSeating.builder.missingParamsDescription')}
          action={{ label: t('common.back'), onClick: () => navigate(returnTo) }}
          noCard
        />
      </div>
    )
  }

  if (eventQuery.isLoading || seatMapQuery.isLoading) {
    return (
      <div className="oa-flex oa-justify-center oa-pt-12">
        <AdminLoadingSpinner />
      </div>
    )
  }

  if (!eventQuery.data || !seatMapQuery.data) {
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
        subtitle={`${eventQuery.data.title} • ${t('ticketing.reservedSeating.builder.totalSeats', { count: seatCount })}`}
        actions={
          <OrgAdminButton as={Link} to={returnTo} icon="arrow_back">
            {t('ticketing.reservedSeating.builder.backToEvent')}
          </OrgAdminButton>
        }
      />

      <div className="oa-card oa-space-y-4">
        <h2 className="oa-card-title">{t('ticketing.reservedSeating.builder.mapDetails')}</h2>
        <div className="oa-form-grid oa-form-grid-2 oa-gap-4">
          <div>
            <label className="oa-label">{t('ticketing.reservedSeating.builder.mapName')}</label>
            <input
              className="oa-input"
              value={seatMapName}
              onChange={(event) => setSeatMapName(event.target.value)}
            />
          </div>
          <div className="oa-flex oa-items-end oa-gap-2">
            <button
              className="oa-btn oa-btn-secondary"
              type="button"
              disabled={!seatMapName.trim() || updateNameMutation.isPending}
              onClick={() => updateNameMutation.mutate()}
            >
              {updateNameMutation.isPending ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>

        <div className="oa-space-y-2">
          <label className="oa-label">{t('ticketing.reservedSeating.builder.chartUploadLabel')}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                chartUploadMutation.mutate(file)
              }
            }}
          />
          <p className="oa-text-muted">{t('ticketing.reservedSeating.builder.chartUploadHint')}</p>
          {seatMapQuery.data.chart_image_url && (
            <img
              src={seatMapQuery.data.chart_image_url}
              alt={t('ticketing.reservedSeating.builder.chartPreviewAlt')}
              style={{ maxHeight: 220, borderRadius: 8, border: '1px solid var(--oa-border-light)' }}
            />
          )}
        </div>
      </div>

      <div className="oa-card oa-space-y-4">
        <h2 className="oa-card-title">{t('ticketing.reservedSeating.builder.bulkGeneratorTitle')}</h2>
        <SeatMapBulkGenerator onGenerate={(config) => bulkMutation.mutateAsync(config)} loading={bulkMutation.isPending} />
      </div>

      <div className="oa-card oa-space-y-4">
        <h2 className="oa-card-title">{t('ticketing.reservedSeating.builder.csvTitle')}</h2>
        <div className="oa-flex oa-gap-3 oa-items-center">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
          />
          <button
            className="oa-btn oa-btn-secondary"
            type="button"
            disabled={!csvFile || csvImportMutation.isPending}
            onClick={() => csvFile && csvImportMutation.mutate(csvFile)}
          >
            {csvImportMutation.isPending ? t('ticketing.reservedSeating.builder.csvImporting') : t('ticketing.reservedSeating.builder.csvImport')}
          </button>
        </div>
      </div>

      <div className="oa-card">
        <h2 className="oa-card-title oa-mb-4">{t('ticketing.reservedSeating.builder.seatsTableTitle')}</h2>
        {seats.length === 0 ? (
          <p className="oa-text-muted">{t('ticketing.reservedSeating.builder.noSeats')}</p>
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

                  return (
                    <tr key={seat.id}>
                      <td>{seat.section_name}</td>
                      <td>{seat.row_identifier}</td>
                      <td>{seat.seat_identifier}</td>
                      <td>
                        <div className="oa-flex oa-gap-2 oa-flex-wrap">
                          <label className="oa-checkbox-wrapper">
                            <input
                              type="checkbox"
                              checked={Boolean(attributes.accessible)}
                              onChange={(event) => {
                                toggleSeatAttributeMutation.mutate({
                                  sectionId: seat.id,
                                  key: 'accessible',
                                  value: event.target.checked,
                                  currentAttributes: attributes,
                                })
                              }}
                            />
                            <span>{t('ticketing.reservedSeating.builder.attributes.accessible')}</span>
                          </label>
                          <label className="oa-checkbox-wrapper">
                            <input
                              type="checkbox"
                              checked={Boolean(attributes.obstructed_view)}
                              onChange={(event) => {
                                toggleSeatAttributeMutation.mutate({
                                  sectionId: seat.id,
                                  key: 'obstructed_view',
                                  value: event.target.checked,
                                  currentAttributes: attributes,
                                })
                              }}
                            />
                            <span>{t('ticketing.reservedSeating.builder.attributes.obstructed')}</span>
                          </label>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="oa-btn oa-btn-text oa-text-danger"
                          onClick={() => deleteSeatMutation.mutate(seat.id)}
                          disabled={deleteSeatMutation.isPending}
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
      </div>
    </div>
  )
}

