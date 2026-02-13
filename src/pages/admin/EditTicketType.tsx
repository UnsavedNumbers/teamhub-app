import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getAllTicketTypesForEventAdmin,
  getReservedCapacitySnapshot,
  getSeatMapsForEvent,
  getTicketTypeSalesSnapshotForEventAdmin,
  getTicketedEventByIdAdmin,
  updateTicketType,
} from '@/data/services'
import { USE_FAKE_DATA } from '@/data/config'
import type { TicketSeatingMode, TicketType } from '@/types/ticketing'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { getLink, useRouteLink } from '@/utils/routes'
import { showError, showSuccess } from '@/utils/toast'
import { classifySupabaseError, NetworkError, NotFoundError, RLSError, ValidationError } from '@/utils/supabaseErrorHandler'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner'
import { Card } from '@/components/admin/Card'
import { InlineNotice } from '@/components/admin/InlineNotice'
import { OrgAdminButton } from '@/components/admin/OrgAdminButton'
import EmptyState from '@/components/platformAdmin/EmptyState'
import { DatePicker, TimePicker, Input, Checkbox, Button } from '@/components/platformAdmin'
import type { SupabaseExtended as Database } from '@/lib/supabase.extended.types'
import { useT } from '@/i18n/useI18n'
import { cn } from '@/utils/cn'
import '../../styles/orgAdmin.css'

type TicketTypeUpdate = Database['public']['Tables']['ticket_types']['Update'] & {
  seating_mode?: TicketSeatingMode
  seat_map_id?: string | null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_PATTERN.test(value)
}

function toIsoTimestamp(date: string, time: string): string | null {
  if (!date || !time) return null
  return new Date(`${date}T${time}`).toISOString()
}

function toLocalDate(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toLocalTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  const classified = classifySupabaseError(error)
  if (classified instanceof RLSError) {
    return 'You do not have permission to manage ticket types for this event.'
  }
  if (classified instanceof NetworkError) {
    return 'You are offline or the network is unavailable. Reconnect and try again.'
  }
  if (classified instanceof ValidationError) {
    return classified.message
  }
  return classified.message || fallbackMessage
}

function shouldRetryQuery(attempt: number, error: unknown): boolean {
  const classified = classifySupabaseError(error)
  return classified.retryable && attempt < 1
}

export default function EditTicketType() {
  const t = useT()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { isOnline } = useOnlineStatus()

  const eventsPath = useRouteLink('admin.ticketingEvents.list')
  const ticketedEventId = (id ?? '').trim()
  const hasEventParam = ticketedEventId.length > 0
  const hasValidEventParam = isUuid(ticketedEventId)

  const eventQuery = useQuery({
    queryKey: ['ticketed-event', ticketedEventId],
    queryFn: () => getTicketedEventByIdAdmin(ticketedEventId),
    enabled: hasValidEventParam,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: shouldRetryQuery,
  })

  const ticketTypesQuery = useQuery({
    queryKey: ['ticket-types', ticketedEventId, 'all'],
    queryFn: () => getAllTicketTypesForEventAdmin(ticketedEventId),
    enabled: hasValidEventParam,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: shouldRetryQuery,
  })

  const ticketTypeSalesQuery = useQuery({
    queryKey: ['ticket-type-sales-snapshot', ticketedEventId],
    queryFn: () => getTicketTypeSalesSnapshotForEventAdmin(ticketedEventId),
    enabled: hasValidEventParam,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: shouldRetryQuery,
  })

  const seatMapsQuery = useQuery({
    queryKey: ['seat-maps', ticketedEventId],
    queryFn: () => getSeatMapsForEvent(ticketedEventId),
    enabled: hasValidEventParam,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: shouldRetryQuery,
  })

  const event = eventQuery.data
  const ticketTypesList = useMemo(() => ticketTypesQuery.data ?? [], [ticketTypesQuery.data])
  const seatMapList = useMemo(() => seatMapsQuery.data ?? [], [seatMapsQuery.data])
  const hasSeatMaps = seatMapList.length > 0

  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState('')
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
  const [seatMapNotice, setSeatMapNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!ticketTypesList.length) {
      setSelectedTicketTypeId('')
      return
    }

    const selectedTypeExists = ticketTypesList.some((type) => type.id === selectedTicketTypeId)
    if (selectedTypeExists) return

    const query = new URLSearchParams(location.search)
    const requestedId = query.get('ticketTypeId')
    if (requestedId && ticketTypesList.some((type) => type.id === requestedId)) {
      setSelectedTicketTypeId(requestedId)
      return
    }

    setSelectedTicketTypeId(ticketTypesList[0].id)
  }, [location.search, selectedTicketTypeId, ticketTypesList])

  const selectedTicketType = useMemo(
    () => ticketTypesList.find((type) => type.id === selectedTicketTypeId) ?? null,
    [selectedTicketTypeId, ticketTypesList],
  )

  const selectedSalesSnapshot = selectedTicketTypeId ? ticketTypeSalesQuery.data?.[selectedTicketTypeId] : null
  const soldCount = selectedSalesSnapshot?.soldCount ?? 0
  const purchasedCount = selectedSalesSnapshot?.purchasedCount ?? 0
  const hasSoldTickets = soldCount > 0
  const priceLocked = hasSoldTickets
  const seatingModeLocked = hasSoldTickets
  const salesStartLocked = Boolean(
    selectedTicketType?.sales_start_at && new Date(selectedTicketType.sales_start_at).getTime() < Date.now(),
  )

  useEffect(() => {
    if (!selectedTicketType) return

    setName(selectedTicketType.name ?? '')
    setDescription(selectedTicketType.description ?? '')
    setPrice((selectedTicketType.price_cents / 100).toFixed(2))
    setCapacity(selectedTicketType.capacity_total !== null ? String(selectedTicketType.capacity_total) : '')
    setSalesStartDate(toLocalDate(selectedTicketType.sales_start_at))
    setSalesStartTime(toLocalTime(selectedTicketType.sales_start_at))
    setSalesEndDate(toLocalDate(selectedTicketType.sales_end_at))
    setSalesEndTime(toLocalTime(selectedTicketType.sales_end_at))
    setIsActive(selectedTicketType.is_active !== false)
    setSeatingMode(selectedTicketType.seating_mode ?? 'general_admission')
    setSeatMapId(selectedTicketType.seat_map_id ?? '')
    setFormError(null)
  }, [selectedTicketType])

  const reservedCapacityPreviewQuery = useQuery({
    queryKey: ['reserved-capacity-preview', seatMapId],
    queryFn: () => getReservedCapacitySnapshot(seatMapId),
    enabled: seatingMode === 'reserved_seating' && Boolean(seatMapId),
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: shouldRetryQuery,
  })

  const detailPath = event?.event_id
    ? `${getLink('admin.events.detail', { id: event.event_id })}?view=ticketing`
    : eventsPath
  const addTicketTypePath = useRouteLink('admin.ticketingEvents.ticketTypes.create', { id: ticketedEventId })

  useEffect(() => {
    if (!seatMapId || seatMapsQuery.isLoading) return

    const selectedMapExists = seatMapList.some((map) => map.id === seatMapId)
    if (!selectedMapExists) {
      setSeatMapId('')
      setSeatMapNotice('That seat map is no longer available. Select another map before saving.')
    }
  }, [seatMapId, seatMapList, seatMapsQuery.isLoading])

  const handleCreateSeatMap = () => {
    if (!hasValidEventParam) return
    const builderPath = getLink('admin.ticketingEvents.seatMaps.builder', {
      eventId: ticketedEventId,
      seatMapId: 'new',
    })
    const returnTo = `${location.pathname}?ticketTypeId=${encodeURIComponent(selectedTicketTypeId)}`
    navigate(`${builderPath}?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const handleRetryDependencies = () => {
    void eventQuery.refetch()
    void ticketTypesQuery.refetch()
    void ticketTypeSalesQuery.refetch()
    void seatMapsQuery.refetch()
  }
  const mutation = useMutation<TicketType, Error, TicketTypeUpdate>({
    mutationFn: async (payload) => {
      if (!selectedTicketTypeId) throw new ValidationError('Select a ticket type to edit.')
      const result = await updateTicketType(selectedTicketTypeId, payload)
      if (result.error) {
        throw classifySupabaseError(result.error, 'Ticket type')
      }
      if (!result.data) {
        throw new Error('Failed to update ticket type')
      }
      return result.data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ticket-types', ticketedEventId] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-types', ticketedEventId, 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-types', ticketedEventId, 'count'] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-type-sort-metrics', ticketedEventId] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-type-sales-snapshot', ticketedEventId] }),
      ])
      showSuccess('Ticket type updated')
      navigate(detailPath)
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update ticket type')
      setFormError(message)
      showError(message)
    },
  })

  const submitDisabledReason = useMemo(() => {
    if (mutation.isPending) return 'Saving ticket type...'
    if (USE_FAKE_DATA) return 'Demo mode is enabled. Ticket types cannot be edited.'
    if (!isOnline) return 'Cannot save while offline.'
    if (!selectedTicketType) return 'Select a ticket type to edit.'
    if (ticketTypesQuery.isLoading || ticketTypeSalesQuery.isLoading || seatMapsQuery.isLoading) {
      return 'Ticket settings are still loading.'
    }
    if (ticketTypesQuery.isError || ticketTypeSalesQuery.isError || seatMapsQuery.isError) {
      return 'Resolve loading errors before saving.'
    }
    return null
  }, [
    isOnline,
    mutation.isPending,
    seatMapsQuery.isError,
    seatMapsQuery.isLoading,
    selectedTicketType,
    ticketTypeSalesQuery.isError,
    ticketTypeSalesQuery.isLoading,
    ticketTypesQuery.isError,
    ticketTypesQuery.isLoading,
  ])

  const handleSubmit = async (eventSubmit: FormEvent<HTMLFormElement>) => {
    eventSubmit.preventDefault()

    if (!event || !selectedTicketType) return
    if (mutation.isPending) return

    if (USE_FAKE_DATA) {
      const demoMessage = 'Demo mode is enabled. Sign in to a live environment to edit ticket types.'
      setFormError(demoMessage)
      showError(demoMessage)
      return
    }

    if (!isOnline) {
      const offlineMessage = 'Cannot save while offline. Reconnect, then try again.'
      setFormError(offlineMessage)
      showError(offlineMessage)
      return
    }

    if (submitDisabledReason) {
      setFormError(submitDisabledReason)
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      setFormError('Ticket type name is required.')
      return
    }

    const normalizedPrice = price.trim()
    if (!/^\d+(\.\d{1,2})?$/.test(normalizedPrice)) {
      setFormError('Price must be a valid currency value with up to 2 decimals.')
      return
    }

    const priceValue = Number(normalizedPrice)
    if (Number.isNaN(priceValue) || priceValue < 0) {
      setFormError('Price must be zero or greater.')
      return
    }
    const priceCents = Math.round(priceValue * 100)

    if (priceLocked && priceCents !== selectedTicketType.price_cents) {
      setFormError('Price cannot be changed once tickets have been sold. Create a new ticket type and make this one inactive.')
      return
    }

    const existingSeatingMode = selectedTicketType.seating_mode ?? 'general_admission'
    if (seatingModeLocked && seatingMode !== existingSeatingMode) {
      setFormError('Seating mode cannot be changed once tickets have been sold. Create a new ticket type and make this one inactive.')
      return
    }

    const hasSalesStartDate = Boolean(salesStartDate)
    const hasSalesStartTime = Boolean(salesStartTime)
    const hasSalesEndDate = Boolean(salesEndDate)
    const hasSalesEndTime = Boolean(salesEndTime)

    if (hasSalesStartDate !== hasSalesStartTime) {
      setFormError('Sales start requires both date and time.')
      return
    }

    if (hasSalesEndDate !== hasSalesEndTime) {
      setFormError('Sales end requires both date and time.')
      return
    }

    const salesStartIso = toIsoTimestamp(salesStartDate, salesStartTime)
    const salesEndIso = toIsoTimestamp(salesEndDate, salesEndTime)
    if (salesStartIso && salesEndIso && new Date(salesEndIso) <= new Date(salesStartIso)) {
      setFormError('Sales end must occur after the sales start.')
      return
    }

    let capacityTotal: number | null = null
    let capacityRemaining: number | null = null

    if (seatingMode === 'general_admission') {
      if (capacity.trim() !== '') {
        const numeric = Number(capacity)
        if (!Number.isInteger(numeric) || numeric <= 0) {
          setFormError('Capacity must be a whole number greater than zero.')
          return
        }
        if (numeric < purchasedCount) {
          setFormError(`Capacity cannot be lower than ${purchasedCount} purchased ticket(s).`)
          return
        }
        capacityTotal = numeric
        capacityRemaining = Math.max(numeric - purchasedCount, 0)
      }
    } else {
      if (!seatMapId) {
        setFormError(t('ticketing.reservedSeating.admin.reservedRequiresSeatMap'))
        return
      }

      try {
        const snapshot = await getReservedCapacitySnapshot(seatMapId)
        if (snapshot.capacityTotal <= 0) {
          setFormError('This seat map has no available seats. Add seats before saving this ticket type.')
          return
        }
        if (snapshot.capacityTotal < purchasedCount) {
          setFormError(`Capacity cannot be lower than ${purchasedCount} purchased ticket(s).`)
          return
        }
        capacityTotal = snapshot.capacityTotal
        capacityRemaining = snapshot.capacityRemaining
      } catch (error) {
        setFormError(getErrorMessage(error, 'Unable to verify seat map capacity.'))
        return
      }
    }

    setFormError(null)

    const updates: TicketTypeUpdate = {
      name: trimmedName,
      description: description.trim() || null,
      price_cents: priceLocked ? selectedTicketType.price_cents : priceCents,
      currency: 'USD',
      capacity_total: capacityTotal,
      capacity_remaining: capacityRemaining,
      seating_mode: seatingMode,
      seat_map_id: seatingMode === 'reserved_seating' ? seatMapId : null,
      sales_end_at: salesEndIso,
      is_active: isActive,
    }

    // Past sales starts are immutable; avoid sending a normalized value that can differ in precision.
    if (!salesStartLocked) {
      updates.sales_start_at = salesStartIso
    }

    mutation.mutate(updates)
  }

  if (!hasEventParam) {
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

  if (!hasValidEventParam) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="link_off"
          title="Invalid event link"
          description="This link is missing a valid event ID. Open the event again from Ticketed Events."
          action={{ label: 'Back to ticketed events', onClick: () => navigate(eventsPath) }}
          noCard
        />
      </div>
    )
  }

  if (eventQuery.isLoading && !event) {
    return (
      <div className="oa-flex oa-justify-center oa-pt-12">
        <AdminLoadingSpinner />
      </div>
    )
  }

  if (!event) {
    const eventLoadError = eventQuery.error ? classifySupabaseError(eventQuery.error, 'Ticketed event') : null

    if (eventLoadError instanceof RLSError) {
      return (
        <div className="oa-page-container">
          <EmptyState
            icon="lock"
            title="You don't have access to this event"
            description="Your account cannot view this ticketed event. Ask an organization admin for access."
            action={{ label: 'Back to ticketed events', onClick: () => navigate(eventsPath) }}
            noCard
          />
        </div>
      )
    }

    if (!isOnline || eventLoadError instanceof NetworkError) {
      return (
        <div className="oa-page-container">
          <EmptyState
            icon="wifi_off"
            title="Offline and no cached event data"
            description="This page needs event data from the server before you can edit ticket types."
            action={{ label: 'Retry', onClick: handleRetryDependencies }}
            noCard
          />
        </div>
      )
    }

    return (
      <div className="oa-page-container">
        <EmptyState
          icon="event_busy"
          title={eventLoadError instanceof NotFoundError ? 'Event not found' : 'Unable to load event'}
          description={
            eventLoadError instanceof NotFoundError
              ? 'This ticketed event may have been removed.'
              : getErrorMessage(eventQuery.error, 'Something went wrong while loading this ticketed event.')
          }
          action={{ label: 'Back to ticketed events', onClick: () => navigate(eventsPath) }}
          noCard
        />
      </div>
    )
  }

  const dependencyError =
    (ticketTypesQuery.isError && !ticketTypesQuery.data && ticketTypesQuery.error) ||
    (ticketTypeSalesQuery.isError && !ticketTypeSalesQuery.data && ticketTypeSalesQuery.error) ||
    (seatMapsQuery.isError && !seatMapsQuery.data && seatMapsQuery.error) ||
    null

  if (dependencyError) {
    const classifiedDependencyError = classifySupabaseError(dependencyError)

    if (classifiedDependencyError instanceof RLSError) {
      return (
        <div className="oa-page-container">
          <EmptyState
            icon="lock"
            title="Ticket settings are restricted"
            description="You do not have permission to load ticket type settings for this event."
            action={{ label: 'Back to event', onClick: () => navigate(detailPath) }}
            noCard
          />
        </div>
      )
    }

    if (!isOnline || classifiedDependencyError instanceof NetworkError) {
      return (
        <div className="oa-page-container">
          <EmptyState
            icon="wifi_off"
            title="Offline and no cached ticket settings"
            description="Reconnect to load seat maps and ticket metadata before editing ticket types."
            action={{ label: 'Retry', onClick: handleRetryDependencies }}
            noCard
          />
        </div>
      )
    }

    return (
      <div className="oa-page-container">
        <EmptyState
          icon="sync_problem"
          title="Ticket setup data unavailable"
          description={getErrorMessage(dependencyError, 'Unable to load ticket configuration for this event.')}
          action={{ label: 'Retry', onClick: handleRetryDependencies }}
          noCard
        />
      </div>
    )
  }

  if (ticketTypesList.length === 0) {
    return (
      <div className="oa-page-container">
        <AdminPageHeader
          title="Edit Ticket Type"
          subtitle={`For ${event.title}`}
          actions={(
            <OrgAdminButton as={Link} to={detailPath} icon="arrow_back">
              Back to event
            </OrgAdminButton>
          )}
        />
        <EmptyState
          icon="confirmation_number"
          title="No ticket types to edit"
          description="Create a ticket type first, then return here to edit it."
          action={{ label: 'Add ticket type', onClick: () => navigate(addTicketTypePath) }}
          noCard
        />
      </div>
    )
  }

  return (
    <div className="oa-page-container">
      <AdminPageHeader
        title="Edit Ticket Type"
        subtitle={`For ${event.title}`}
        actions={(
          <OrgAdminButton as={Link} to={detailPath} icon="arrow_back">
            Back to event
          </OrgAdminButton>
        )}
      />

      <div className="oa-max-w-3xl oa-ticketing-form-stack">
        {!isOnline && (
          <InlineNotice
            tone="warning"
            title="Offline mode"
            message="You're viewing cached data. Saving is disabled until your connection returns."
          />
        )}

        {USE_FAKE_DATA && (
          <InlineNotice
            tone="info"
            title="Demo mode"
            message="This environment uses demo data. Editing ticket types is disabled."
          />
        )}

        {seatMapNotice && (
          <InlineNotice
            tone="info"
            message={seatMapNotice}
            onClose={() => setSeatMapNotice(null)}
          />
        )}

        {formError && (
          <InlineNotice
            tone="error"
            title="Unable to update ticket type"
            message={formError}
            onClose={() => setFormError(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="oa-ticketing-form-stack">
          <Card title="Select Ticket Type">
            <div className="oa-ticketing-field-stack">
              <label className="oa-label oa-label">Ticket type</label>
              <select
                className="oa-input"
                value={selectedTicketTypeId}
                onChange={(eventChange) => setSelectedTicketTypeId(eventChange.target.value)}
              >
                {ticketTypesList.map((ticketType) => (
                  <option key={ticketType.id} value={ticketType.id}>
                    {ticketType.name} {ticketType.is_active ? '(active)' : '(inactive)'}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <Card title="Ticket Type Details">
            <div className="oa-ticketing-field-stack">
              {hasSoldTickets && (
                <InlineNotice
                  tone="info"
                  title="Price and seating mode are locked"
                  message="Tickets have already been sold for this type. Create a new ticket type and make this one inactive to change price or seating mode."
                />
              )}

              <Input
                label="Ticket type name"
                value={name}
                onChange={(eventChange) => setName(eventChange.target.value)}
                required
                helper="Examples: GA, VIP, Donation Pass"
              />

              <div className="oa-form-group">
                <label className="oa-label oa-label">Description (optional)</label>
                <textarea
                  className="oa-input oa-textarea"
                  rows={3}
                  placeholder="Provide guests with context about this ticket type."
                  value={description}
                  onChange={(eventChange) => setDescription(eventChange.target.value)}
                />
              </div>

              <div className="oa-form-grid oa-form-grid-2 oa-gap-4">
                <Input
                  label="Price ($)"
                  type="number"
                  value={price}
                  onChange={(eventChange) => setPrice(eventChange.target.value)}
                  min="0"
                  step="0.01"
                  required
                  disabled={priceLocked}
                  helper={priceLocked ? 'Price is locked because tickets have already been sold.' : undefined}
                />
                {seatingMode === 'general_admission' ? (
                  <Input
                    label="Capacity (optional)"
                    type="number"
                    min={purchasedCount > 0 ? String(purchasedCount) : '1'}
                    step="1"
                    value={capacity}
                    onChange={(eventChange) => setCapacity(eventChange.target.value)}
                    helper={purchasedCount > 0
                      ? `Cannot be lower than ${purchasedCount} purchased ticket(s).`
                      : 'Leave empty for unlimited capacity'}
                  />
                ) : (
                  <Input
                    label="Capacity"
                    type="text"
                    value={reservedCapacityPreviewQuery.data ? `${reservedCapacityPreviewQuery.data.capacityRemaining} available` : t('ticketing.reservedSeating.admin.capacityAutoCalculated')}
                    onChange={() => undefined}
                    disabled
                    helper={reservedCapacityPreviewQuery.isLoading ? 'Calculating from seat map...' : undefined}
                  />
                )}
              </div>
            </div>
          </Card>

          <Card title={t('ticketing.reservedSeating.admin.seatingMode')}>
            <div className="oa-ticketing-field-stack">
              <div className="oa-form-group">
                <label className="oa-label oa-label">Select seating mode</label>
                <div className="oa-toggle-group" role="group" aria-label="Seating mode">
                  <button
                    type="button"
                    onClick={() => setSeatingMode('general_admission')}
                    className={cn('oa-toggle-btn', seatingMode === 'general_admission' && 'active')}
                    disabled={seatingModeLocked}
                  >
                    {t('ticketing.reservedSeating.mode.generalAdmission')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeatingMode('reserved_seating')}
                    className={cn('oa-toggle-btn', seatingMode === 'reserved_seating' && 'active')}
                    disabled={!hasSeatMaps || seatingModeLocked}
                    aria-disabled={!hasSeatMaps || seatingModeLocked}
                  >
                    {t('ticketing.reservedSeating.mode.reservedSeating')}
                  </button>
                </div>
              </div>

              {seatMapsQuery.isLoading ? (
                <div className="oa-flex oa-justify-center oa-py-4">
                  <span className="oa-spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
                </div>
              ) : !hasSeatMaps ? (
                <EmptyState
                  icon="event_seat"
                  title="No seat maps configured"
                  description="Reserved seating needs a seat map. Create one now or continue with general admission."
                  action={{ label: 'Create a Seat Map', onClick: handleCreateSeatMap }}
                  noCard
                />
              ) : null}

              {seatingMode === 'reserved_seating' && hasSeatMaps && (
                <div className="oa-ticketing-field-stack">
                  <label className="oa-label oa-label">{t('ticketing.reservedSeating.admin.seatMap')}</label>
                  <select
                    className="oa-input"
                    value={seatMapId}
                    onChange={(eventChange) => setSeatMapId(eventChange.target.value)}
                    disabled={seatingModeLocked}
                  >
                    <option value="">{t('ticketing.reservedSeating.admin.selectSeatMap')}</option>
                    {seatMapList.map((seatMap) => (
                      <option key={seatMap.id} value={seatMap.id}>
                        {seatMap.name}
                      </option>
                    ))}
                  </select>

                  {reservedCapacityPreviewQuery.isError && (
                    <InlineNotice
                      tone="warning"
                      message={getErrorMessage(reservedCapacityPreviewQuery.error, 'Unable to load reserved seat counts.')}
                    />
                  )}

                  <div className="oa-flex oa-gap-2">
                    <Button type="button" variant="secondary" onClick={handleCreateSeatMap}>
                      {t('ticketing.reservedSeating.admin.createSeatMap')}
                    </Button>
                    {seatMapId && (
                      <Button
                        type="button"
                        variant="secondary"
                        as={Link}
                        to={`${getLink('admin.ticketingEvents.seatMaps.builder', {
                          eventId: ticketedEventId,
                          seatMapId,
                        })}?returnTo=${encodeURIComponent(`${location.pathname}?ticketTypeId=${selectedTicketTypeId}`)}`}
                      >
                        {t('ticketing.reservedSeating.admin.manageSeats')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="Sales Window">
            <div className="oa-form-grid oa-form-grid-2 oa-gap-4">
              <div className="oa-ticketing-field-stack">
                <span className="oa-label oa-label">Sales start</span>
                <div className="oa-form-grid oa-form-grid-2 oa-gap-3">
                  <DatePicker
                    label="Date"
                    value={salesStartDate}
                    minValue={new Date().toISOString().slice(0, 10)}
                    onChange={(value) => setSalesStartDate(value)}
                    helper="Optional"
                    isDisabled={salesStartLocked}
                  />
                  <TimePicker
                    label="Time"
                    value={salesStartTime}
                    onChange={(value) => setSalesStartTime(value)}
                    helper="Begin sales"
                    isDisabled={salesStartLocked}
                  />
                </div>
                {salesStartLocked && (
                  <InlineNotice
                    tone="info"
                    message="Sales start is already in the past and can no longer be edited."
                  />
                )}
              </div>
              <div className="oa-ticketing-field-stack">
                <span className="oa-label oa-label">Sales end</span>
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
          </Card>

          <Card title="Status">
            <Checkbox
              checked={isActive}
              onChange={(eventChange) => setIsActive(eventChange.target.checked)}
              label="Active"
              helperText="Inactive ticket types are hidden from guest sales."
            />
          </Card>

          <div className="oa-flex oa-justify-end oa-gap-3">
            <Button
              variant="secondary"
              as={Link}
              to={detailPath}
              type="button"
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={Boolean(submitDisabledReason)}
              title={submitDisabledReason || undefined}
            >
              {mutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

