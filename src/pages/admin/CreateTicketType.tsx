import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'

import { getTicketedEventByIdAdmin, getTicketTypesForEventAdmin, createTicketType } from '@/data/services'
import type { TicketType } from '@/types/ticketing'
import { useRouteLink } from '@/utils/routes'
import { showError, showSuccess } from '@/utils/toast'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import AdminLoadingSpinner from '@/components/admin/AdminLoadingSpinner'
import { OrgAdminButton } from '@/components/admin/OrgAdminButton'
import EmptyState from '@/components/platformAdmin/EmptyState'
import { DatePicker, TimePicker, Input, Checkbox, Button } from '@/components/platformAdmin'
import type { SupabaseExtended as Database } from '@/lib/supabase.extended.types'

type TicketTypeInsert = Database['public']['Tables']['ticket_types']['Insert']

export default function CreateTicketType() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const detailPath = useRouteLink(
    id ? 'admin.ticketingEvents.detail' : 'admin.ticketingEvents.list',
    id ? { id } : undefined,
  )

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
  const [formError, setFormError] = useState<string | null>(null)

  const sortOrder = ticketTypesList.length

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
    if (capacity.trim() !== '') {
      const numeric = parseInt(capacity, 10)
      if (Number.isNaN(numeric) || numeric <= 0) {
        setFormError('Capacity must be a whole number greater than zero')
        return
      }
      capacityValue = numeric
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
      sales_start_at: salesStartIso,
      sales_end_at: salesEndIso,
      sort_order: sortOrder,
      is_active: isActive,
    })
  }

  if (!id) {
    return (
      <div className="pa-page-container">
        <EmptyState
          icon="event"
          title="Missing event"
          description="We cannot determine which ticketed event this ticket type belongs to."
          action={{ label: 'Back to ticketed events', onClick: () => navigate('/admin/ticketing/events') }}
          noCard
        />
      </div>
    )
  }

  if (eventLoading) {
    return (
      <div className="pa-flex pa-justify-center pa-pt-12">
        <AdminLoadingSpinner />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="pa-page-container">
        <EmptyState
          icon="event_busy"
          title={eventError ? 'Unable to load event' : 'Event not found'}
          description={eventError ? 'Something went wrong while loading the ticketed event.' : 'This ticketed event may have been removed.'}
          action={{ label: 'Back to ticketed events', onClick: () => navigate('/admin/ticketing/events') }}
          noCard
        />
      </div>
    )
  }

  return (
    <div className="pa-page-container">
      <AdminPageHeader
        title="Add Ticket Type"
        subtitle={`For ${event.title}`}
        actions={
          <OrgAdminButton as={Link} to={detailPath} icon="arrow_back">
            Back to event
          </OrgAdminButton>
        }
      />

      <div className="pa-card pa-max-w-3xl">
        {formError && (
          <div className="pa-card pa-card--bordered pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="pa-space-y-6">
          <Input
            label="Ticket type name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            helper="Examples: GA, VIP, Donation Pass"
          />

          <div>
            <label className="pa-label pa-mb-2 block">Description (optional)</label>
            <textarea
              className="pa-input pa-textarea"
              rows={3}
              placeholder="Provide guests with some context about this ticket type."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="pa-form-grid pa-form-grid-2 pa-gap-4">
            <Input
              label="Price ($)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              required
            />
            <Input
              label="Capacity (optional)"
              type="number"
              min="1"
              step="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              helper="Leave empty for unlimited capacity"
            />
          </div>

          <div className="pa-form-grid pa-form-grid-2 pa-gap-4">
            <div className="pa-space-y-2">
              <span className="pa-label">Sales start</span>
              <div className="pa-form-grid pa-form-grid-2 pa-gap-3">
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
            <div className="pa-space-y-2">
              <span className="pa-label">Sales end</span>
              <div className="pa-form-grid pa-form-grid-2 pa-gap-3">
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

          <div className="pa-flex pa-justify-end pa-gap-3">
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
              disabled={mutation.isLoading}
            >
              {mutation.isLoading ? 'Saving...' : 'Save ticket type'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
