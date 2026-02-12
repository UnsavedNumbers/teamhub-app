import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'

import { getTicketedEventByIdAdmin, getTicketTypesForEventAdmin, createTicketType, createSeatMap, getSeatMapsForEvent } from '@/data/services'
import type { TicketType, TicketSeatingMode } from '@/types/ticketing'
import { getLink, useRouteLink } from '@/utils/routes'
import { showError, showSuccess } from '@/utils/toast'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner'
import { OrgAdminButton } from '@/components/admin/OrgAdminButton'
import EmptyState from '@/components/platformAdmin/EmptyState'
import { DatePicker, TimePicker, Input, Checkbox, Button } from '@/components/platformAdmin'
import type { SupabaseExtended as Database } from '@/lib/supabase.extended.types'
import { useT } from '@/i18n/useI18n'
import '../../styles/orgAdmin.css'

type TicketTypeInsert = Database['public']['Tables']['ticket_types']['Insert'] & {
  seating_mode?: TicketSeatingMode
  seat_map_id?: string | null
}

export default function CreateTicketType() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const detailPath = useRouteLink(
    id ? 'admin.ticketingEvents.detail' : 'admin.ticketingEvents.list',
    id ? { id } : undefined,
  )
  const eventsPath = useRouteLink('admin.ticketingEvents.list')

  const {
    data: event,
    isLoading: eventLoading,
    isError: eventError,
  } = useQuery({
    queryKey: ['ticketed-event', id],
    queryFn: () => getTicketedEventByIdAdmin(id!),
    enabled: Boolean(id),
  })

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticket-types', id, 'count'],
    queryFn: () => getTicketTypesForEventAdmin(id!),
    enabled: Boolean(id),
  })

  const { data: seatMaps } = useQuery({
    queryKey: ['seat-maps', id],
    queryFn: () => getSeatMapsForEvent(id!),
    enabled: Boolean(id),
  })

  const ticketTypesList = Array.isArray(ticketTypes) ? ticketTypes : (ticketTypes as TicketType[] | undefined) ?? []
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('0.00')
  const [capacity, setCapacity] = useState('')
  const [salesStartDate, setSalesStartDate] = useState('')
  const [salesStartTime, setSalesStartTime] = useState('')
  const [salesEndDate, setSalesEndDate] = useState('')
  const [salesEndTime, setSalesEndTime] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [seatingMode, setSeatingMode] = useState<TicketSeatingMode>('general_admission')
  const [seatMapId, setSeatMapId] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)

  const sortOrder = ticketTypesList.length
  const seatMapList = seatMaps ?? []

  useEffect(() => {
    const query = new URLSearchParams(location.search)
    const seatMapFromQuery = query.get('seatMapId')
    if (seatMapFromQuery) {
      setSeatingMode('reserved_seating')
      setSeatMapId(seatMapFromQuery)
    }
  }, [location.search])

  const combineDateAndTimeIso = (date: string, time: string): string | null => {
    if (!date || !time) return null
    return new Date(`${date}T${time}`).toISOString()
  }

  const mutation = useMutation<TicketType, Error, TicketTypeInsert>({
    mutationFn: async (payload) => {
      const result = await createTicketType(payload)
      if (result.error) {
        throw result.error
      }
      if (!result.data) {
        throw new Error('Failed to create ticket type')
      }
      return result.data
    },
    onSuccess: () => {
      showSuccess('Ticket type created')
      navigate(detailPath)
    },
    onError: (error) => {
      const message = error.message || 'Failed to create ticket type'
      setFormError(message)
      showError(message)
    },
  })

  const handleSubmit = (eventSubmit: FormEvent<HTMLFormElement>) => {
    eventSubmit.preventDefault()

    if (!event) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setFormError('Ticket type name is required')
      return
    }

    const priceValue = parseFloat(price)
    if (Number.isNaN(priceValue) || priceValue < 0) {
      setFormError('Price must be zero or greater and use a valid number')
      return
    }
    const priceCents = Math.round(priceValue * 100)

    let capacityValue: number | null = null
    if (seatingMode === 'general_admission' && capacity.trim() !== '') {
      const numeric = parseInt(capacity, 10)
      if (Number.isNaN(numeric) || numeric <= 0) {
        setFormError('Capacity must be a whole number greater than zero')
        return
      }
      capacityValue = numeric
    }

    if (seatingMode === 'reserved_seating' && !seatMapId) {
      setFormError(t('ticketing.reservedSeating.admin.reservedRequiresSeatMap'))
      return
    }

    const salesStartIso = combineDateAndTimeIso(salesStartDate, salesStartTime)
    const salesEndIso = combineDateAndTimeIso(salesEndDate, salesEndTime)
    if (salesStartIso && salesEndIso && new Date(salesEndIso) <= new Date(salesStartIso)) {
      setFormError('Sales end must occur after the sales start')
      return
    }

    setFormError(null)

    mutation.mutate({
      org_id: event.org_id,
      ticketed_event_id: event.id,
      name: trimmedName,
      description: description.trim() || null,
      price_cents: priceCents,
      currency: 'USD',
      capacity_total: capacityValue,
      capacity_remaining: capacityValue,
      seating_mode: seatingMode,
      seat_map_id: seatingMode === 'reserved_seating' ? seatMapId : null,
      sales_start_at: salesStartIso,
      sales_end_at: salesEndIso,
      sort_order: sortOrder,
      is_active: isActive,
    })
  }

  if (!id) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="event"
          title="Missing event"
          description="We cannot determine which ticketed event this ticket type belongs to."
          action={{ label: 'Back to ticketed events', onClick: () => navigate(eventsPath) }}
          noCard
        />
      </div>
    )
  }

  if (eventLoading) {
    return (
      <div className="oa-flex oa-justify-center oa-pt-12">
        <AdminLoadingSpinner />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="event_busy"
          title={eventError ? 'Unable to load event' : 'Event not found'}
          description={eventError ? 'Something went wrong while loading the ticketed event.' : 'This ticketed event may have been removed.'}
          action={{ label: 'Back to ticketed events', onClick: () => navigate(eventsPath) }}
          noCard
        />
      </div>
    )
  }

  return (
    <div className="oa-page-container">
      <AdminPageHeader
        title="Add Ticket Type"
        subtitle={`For ${event.title}`}
        actions={
          <OrgAdminButton as={Link} to={detailPath} icon="arrow_back">
            Back to event
          </OrgAdminButton>
        }
      />

      <div className="oa-card oa-max-w-3xl">
        {formError && (
          <div className="oa-card oa-card--bordered oa-mb-4 oa-text-danger" style={{ background: 'var(--oa-danger-bg)', border: 'none' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="oa-space-y-6">
          <Input
            label="Ticket type name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            helper="Examples: GA, VIP, Donation Pass"
          />

          <div>
            <label className="oa-label oa-mb-2 block">Description (optional)</label>
            <textarea
              className="oa-input oa-textarea"
              rows={3}
              placeholder="Provide guests with some context about this ticket type."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="oa-form-grid oa-form-grid-2 oa-gap-4">
            <Input
              label="Price ($)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              required
            />
            {seatingMode === 'general_admission' ? (
              <Input
                label="Capacity (optional)"
                type="number"
                min="1"
                step="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                helper="Leave empty for unlimited capacity"
              />
            ) : (
              <Input
                label="Capacity"
                type="text"
                value={t('ticketing.reservedSeating.admin.capacityAutoCalculated')}
                onChange={() => undefined}
                disabled
              />
            )}
          </div>

          <div className="oa-space-y-2">
            <span className="oa-label">{t('ticketing.reservedSeating.admin.seatingMode')}</span>
            <div className="oa-flex oa-gap-4">
              <label className="oa-checkbox-wrapper">
                <input
                  type="radio"
                  name="seating-mode"
                  checked={seatingMode === 'general_admission'}
                  onChange={() => setSeatingMode('general_admission')}
                />
                <span>{t('ticketing.reservedSeating.mode.generalAdmission')}</span>
              </label>
              <label className="oa-checkbox-wrapper">
                <input
                  type="radio"
                  name="seating-mode"
                  checked={seatingMode === 'reserved_seating'}
                  onChange={() => setSeatingMode('reserved_seating')}
                />
                <span>{t('ticketing.reservedSeating.mode.reservedSeating')}</span>
              </label>
            </div>
          </div>

          {seatingMode === 'reserved_seating' && (
            <div className="oa-space-y-3">
              <label className="oa-label">{t('ticketing.reservedSeating.admin.seatMap')}</label>
              <select
                className="oa-input"
                value={seatMapId}
                onChange={(event) => setSeatMapId(event.target.value)}
              >
                <option value="">{t('ticketing.reservedSeating.admin.selectSeatMap')}</option>
                {seatMapList.map((seatMap) => (
                  <option key={seatMap.id} value={seatMap.id}>
                    {seatMap.name}
                  </option>
                ))}
              </select>
              <div className="oa-flex oa-gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    if (!id) return
                    try {
                      const created = await createSeatMap(id, `Seat Map ${new Date().toLocaleDateString()}`)
                      setSeatMapId(created.id)
                      setSeatingMode('reserved_seating')
                      const builderPath = getLink('admin.ticketingEvents.seatMaps.builder', {
                        eventId: id,
                        seatMapId: created.id,
                      })
                      navigate(`${builderPath}?returnTo=${encodeURIComponent(`${location.pathname}?seatMapId=${created.id}`)}`)
                    } catch (error: any) {
                      showError(error.message || t('ticketing.reservedSeating.admin.createSeatMapFailed'))
                    }
                  }}
                >
                  {t('ticketing.reservedSeating.admin.createSeatMap')}
                </Button>
                {seatMapId && (
                  <Button
                    type="button"
                    variant="secondary"
                    as={Link}
                    to={`${getLink('admin.ticketingEvents.seatMaps.builder', {
                      eventId: id!,
                      seatMapId,
                    })}?returnTo=${encodeURIComponent(`${location.pathname}?seatMapId=${seatMapId}`)}`}
                  >
                    {t('ticketing.reservedSeating.admin.manageSeats')}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="oa-form-grid oa-form-grid-2 oa-gap-4">
            <div className="oa-space-y-2">
              <span className="oa-label">Sales start</span>
              <div className="oa-form-grid oa-form-grid-2 oa-gap-3">
                <DatePicker
                  label="Date"
                  value={salesStartDate}
                  minValue={new Date().toISOString().slice(0, 10)}
                  onChange={(value) => setSalesStartDate(value)}
                  helper="Optional"
                />
                <TimePicker
                  label="Time"
                  value={salesStartTime}
                  onChange={(value) => setSalesStartTime(value)}
                  helper="Begin sales"
                />
              </div>
            </div>
            <div className="oa-space-y-2">
              <span className="oa-label">Sales end</span>
              <div className="oa-form-grid oa-form-grid-2 oa-gap-3">
                <DatePicker
                  label="Date"
                  value={salesEndDate}
                  minValue={salesStartDate || undefined}
                  onChange={(value) => setSalesEndDate(value)}
                  helper="Optional"
                />
                <TimePicker
                  label="Time"
                  value={salesEndTime}
                  onChange={(value) => setSalesEndTime(value)}
                  helper="Cutoff time"
                />
              </div>
            </div>
          </div>

          <Checkbox
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            label="Active"
            helperText="Inactive ticket types are hidden from guest sales"
          />

          <div className="oa-flex oa-justify-end oa-gap-3">
            <Button
              variant="secondary"
              as={Link}
              to={detailPath}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={mutation.status === 'pending'}
            >
              {mutation.status === 'pending' ? 'Saving...' : 'Save ticket type'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
