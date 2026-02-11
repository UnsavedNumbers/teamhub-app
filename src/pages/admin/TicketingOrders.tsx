import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'

import AdminPageHeader from '@/components/admin/AdminPageHeader'
import EmptyState from '@/components/platformAdmin/EmptyState'
import { Badge, Button, DatePicker } from '@/components/platformAdmin'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  deleteTicketOrder,
  fetchTicketingEvents,
  fetchTicketingOrders,
  type TicketingOrdersQuery,
  type TicketingOrdersResponse,
  type TicketOrderWithRelations,
} from '@/data/services/ticketingOrdersAdminService'
import { formatCurrency } from '@/types/ticketing'
import { cn } from '@/utils/cn'
import { showError, showSuccess } from '@/utils/toast'
import '../../styles/orgAdmin.css'

type ViewMode = 'list' | 'table'

interface Filters extends TicketingOrdersQuery {
  view: ViewMode
  eventIds: string[]
  page: number
  perPage: number
}

const ORDER_STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'pending_payment', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
]

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_30_days', label: 'Last 30 days' },
]

const DEFAULT_PER_PAGE = 20
const VIEW_STORAGE_KEY = 'admin.ticketingOrders.view'

function parseFilters(params: URLSearchParams): Filters {
  const viewParam = (params.get('view') as ViewMode | null) || (typeof window !== 'undefined' ? (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null) : null)
  const statusParam = params.get('status')
  const status: Filters['status'] =
    statusParam === 'paid' || statusParam === 'pending_payment' || statusParam === 'refunded' || statusParam === 'cancelled'
      ? statusParam
      : null
  return {
    search: params.get('search') || '',
    eventIds: params.getAll('event_id'),
    status,
    dateFrom: params.get('date_from'),
    dateTo: params.get('date_to'),
    datePreset: params.get('date_preset'),
    sortBy: params.get('sort_by') || 'created_at',
    page: Number(params.get('page') || 1),
    perPage: Number(params.get('per_page') || DEFAULT_PER_PAGE),
    view: viewParam || 'list',
  }
}

function buildSearchParams(filters: Filters) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  filters.eventIds?.forEach((id) => params.append('event_id', id))
  if (filters.status) params.set('status', filters.status)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.datePreset) params.set('date_preset', filters.datePreset)
  if (filters.sortBy) params.set('sort_by', filters.sortBy)
  params.set('page', String(filters.page))
  params.set('per_page', String(filters.perPage))
  params.set('view', filters.view)
  return params
}

function ActiveFilterChips({
  filters,
  events,
  onRemove,
  onClearAll,
}: {
  filters: Filters
  events: Array<{ id: string; title: string }>
  onRemove: (key: string, value?: string) => void
  onClearAll: () => void
}) {
  const chips: Array<{ label: string; key: string; value?: string }> = []
  if (filters.search) chips.push({ label: `Search: ${filters.search}`, key: 'search' })
  if (filters.status) chips.push({ label: `Status: ${filters.status}`, key: 'status' })
  if (filters.datePreset) chips.push({ label: `Date: ${filters.datePreset.replace('_', ' ')}`, key: 'datePreset' })
  if (filters.dateFrom || filters.dateTo) chips.push({ label: `Date range`, key: 'dateRange' })
  filters.eventIds?.forEach((id) => {
    const event = events.find((e) => e.id === id)
    chips.push({ label: `Event: ${event?.title || id}`, key: 'eventIds', value: id })
  })

  if (chips.length === 0) return null

  return (
    <div className="oa-flex oa-flex-wrap oa-gap-2 oa-mt-3 oa-filter-chips">
      {chips.map((chip) => (
        <span
          key={`${chip.key}-${chip.value || 'all'}`}
          className="oa-filter-chip"
        >
          <span className="oa-filter-chip__label">{chip.label}</span>
          <button
            className="oa-filter-chip__remove"
            onClick={() => onRemove(chip.key, chip.value)}
            aria-label="Remove filter"
          >
            ×
          </button>
        </span>
      ))}
      <Button variant="ghost" size="dense" onClick={onClearAll} icon="filter_alt_off" className="oa-filter-chip__clear">
        Clear filters
      </Button>
    </div>
  )
}

function StatsBar({ totalOrders, totalRevenue }: { totalOrders?: number; totalRevenue?: number }) {
  const stats = [
    { key: 'orders', label: 'Total Orders', value: totalOrders ?? 0 },
    { key: 'revenue', label: 'Total Revenue', value: totalRevenue !== undefined ? formatCurrency(totalRevenue || 0) : '$0.00' },
  ]
  return (
    <div className="oa-ticketing-metrics">
      {stats.map((stat) => (
        <div key={stat.key} className={cn('oa-ticketing-metric', `oa-ticketing-metric--${stat.key}`)}>
          <p className="oa-ticketing-metric__label">{stat.label}</p>
          <p className="oa-ticketing-metric__value">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: Array<{ value: ViewMode; icon: string; label: string }> = [
    { value: 'list', icon: 'view_agenda', label: 'List' },
    { value: 'table', icon: 'table', label: 'Table' },
  ]
  return (
    <div className="oa-view-toggle" role="group" aria-label="View mode">
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant="ghost"
          size="compact"
          icon={opt.icon}
          className={cn('oa-view-toggle__btn', value === opt.value && 'is-active')}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  )
}

function FilterDrawer({
  open,
  onClose,
  filters,
  events,
  onApply,
}: {
  open: boolean
  onClose: () => void
  filters: Filters
  events: Array<{ id: string; title: string }>
  onApply: (next: Partial<Filters>) => void
}) {
  const [draft, setDraft] = useState<Filters>(filters)

  useEffect(() => {
    setDraft(filters)
  }, [filters, open])

  const toggleSet = (key: 'eventIds', id: string) => {
    setDraft((prev) => {
      const current = new Set(prev[key])
      current.has(id) ? current.delete(id) : current.add(id)
      return { ...prev, [key]: Array.from(current) }
    })
  }

  const apply = () => {
    onApply({ ...draft, page: 1 })
    onClose()
  }

  const clearLocal = () => {
    setDraft({
      ...draft,
      eventIds: [],
      status: null,
      dateFrom: null,
      dateTo: null,
      datePreset: null,
    })
  }

  return (
    <>
      <div className={cn('oa-filter-backdrop', open && 'is-open')} onClick={onClose} />
      <div className={cn('oa-filter-panel', open && 'is-open')}>
        <div className="oa-flex oa-items-center oa-justify-between oa-mb-4">
          <div className="oa-text-lg oa-font-semibold">Filters</div>
          <Button variant="ghost" icon="close" onClick={onClose} />
        </div>

        <div className="oa-space-y-4">
          <div>
            <label className="oa-label">Date preset</label>
            <select
              className="oa-input"
              value={draft.datePreset || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, datePreset: e.target.value || null, page: 1 }))}
            >
              <option value="">All</option>
              {DATE_PRESETS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-2 oa-gap-3">
            <div>
              <DatePicker
                label="Start date"
                value={draft.dateFrom || ''}
                onChange={(date) => setDraft((prev) => ({ ...prev, dateFrom: date || null, page: 1 }))}
              />
            </div>
            <div>
              <DatePicker
                label="End date"
                value={draft.dateTo || ''}
                onChange={(date) => setDraft((prev) => ({ ...prev, dateTo: date || null, page: 1 }))}
              />
            </div>
          </div>

          <div>
            <label className="oa-label">Events</label>
            <div className="oa-flex oa-flex-wrap oa-gap-2">
              {events.slice(0, 10).map((e) => (
                <Button
                  key={e.id}
                  variant={draft.eventIds.includes(e.id) ? 'primary' : 'secondary'}
                  size="dense"
                  onClick={() => toggleSet('eventIds', e.id)}
                >
                  {e.title}
                </Button>
              ))}
              {events.length === 0 && <div className="oa-text-sm oa-text-muted">No events</div>}
            </div>
          </div>

          <div>
            <label className="oa-label">Order status</label>
            <select
              className="oa-input"
              value={draft.status || ''}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  status:
                    e.target.value === 'paid' ||
                    e.target.value === 'pending_payment' ||
                    e.target.value === 'refunded' ||
                    e.target.value === 'cancelled'
                      ? (e.target.value as Filters['status'])
                      : null,
                }))
              }
            >
              <option value="">All</option>
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="oa-flex oa-justify-between oa-gap-2 oa-mt-6">
          <Button variant="ghost" onClick={clearLocal}>Clear</Button>
          <div className="oa-flex oa-gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon="check" onClick={apply}>Apply</Button>
          </div>
        </div>
      </div>
    </>
  )
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  paid: 'success',
  pending_payment: 'warning',
  refunded: 'danger',
  cancelled: 'neutral',
}

function ListView({
  orders,
  onView,
  onDelete,
}: {
  orders: TicketOrderWithRelations[]
  onView: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="oa-card oa-shadow-sm oa-ticket-list">
      {orders.map((order) => (
        <div key={order.id} className="oa-ticket-list__row">
          <div className="oa-ticket-list__info">
            <div className="oa-ticket-list__chips">
              <Badge variant={statusVariant[order.status] || 'neutral'}>{order.status}</Badge>
            </div>
            <div className="oa-ticket-list__titles">
              <div className="oa-ticket-list__title">
                {order.purchaser_name || order.purchaser_email}
              </div>
              <div className="oa-ticket-list__meta">
                Order #{order.id.slice(-8).toUpperCase()}
                {order.event?.title && ` · ${order.event.title}`}
              </div>
              <div className="oa-ticket-list__meta oa-ticket-list__meta--sub">
                {order.created_at ? new Date(order.created_at).toLocaleString() : ''}
                {order.ticket_count !== undefined && ` · ${order.ticket_count} ticket${order.ticket_count !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
          <div className="oa-ticket-list__actions">
            <div className="oa-ticket-list__price">{formatCurrency(order.total_cents)}</div>
            <Button variant="secondary" size="dense" onClick={() => onView(order.id)} icon="visibility">
              View
            </Button>
            {order.status !== 'paid' && (
              <Button variant="danger" size="dense" onClick={() => onDelete(order.id)} icon="delete" />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function TableView({
  orders,
  onView,
  onDelete,
}: {
  orders: TicketOrderWithRelations[]
  onView: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="oa-card oa-shadow-sm oa-overflow-x-auto">
      <table className="oa-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Purchaser</th>
            <th>Event</th>
            <th>Tickets</th>
            <th>Total</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} onClick={() => onView(order.id)} style={{ cursor: 'pointer' }}>
              <td className="font-mono text-sm">{order.id.slice(-8).toUpperCase()}</td>
              <td>
                <div>{order.purchaser_name || order.purchaser_email}</div>
                {order.purchaser_name && (
                  <div className="oa-text-xs oa-text-muted">{order.purchaser_email}</div>
                )}
              </td>
              <td>{order.event?.title || '—'}</td>
              <td>{order.ticket_count || 0}</td>
              <td className="oa-font-semibold">{formatCurrency(order.total_cents)}</td>
              <td>
                <Badge variant={statusVariant[order.status] || 'neutral'}>{order.status}</Badge>
              </td>
              <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="oa-flex oa-gap-2">
                  <Button variant="secondary" size="dense" onClick={() => onView(order.id)} icon="visibility" />
                  {order.status !== 'paid' && (
                    <Button variant="danger" size="dense" onClick={() => onDelete(order.id)} icon="delete" />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TicketingOrders() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id

  console.log('[TicketingOrders] currentOrganization:', currentOrganization?.id, currentOrganization?.name)

  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  const filters = parseFilters(searchParams)

  useEffect(() => {
    setSearchInput(filters.search || '')
  }, [filters.search])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(VIEW_STORAGE_KEY, filters.view)
    }
  }, [filters.view])

  const updateFilters = (next: Partial<Filters>) => {
    const updated = { ...filters, ...next }
    setSearchParams(buildSearchParams(updated))
  }

  const eventsQuery = useQuery({
    queryKey: ['ticketing-events-simple', orgId],
    queryFn: () => fetchTicketingEvents(orgId!),
    enabled: !!orgId,
  })

  const ordersQuery = useQuery<TicketingOrdersResponse>({
    queryKey: ['ticketing-orders-admin', orgId, JSON.stringify({ ...filters, view: undefined })],
    queryFn: () => fetchTicketingOrders(orgId!, filters),
    enabled: !!orgId,
    placeholderData: (previousData) => previousData,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTicketOrder(orgId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketing-orders-admin', orgId] })
      showSuccess('Order deleted')
    },
    onError: (err: any) => showError(err?.message || 'Delete failed'),
  })

  const orders = ordersQuery.data?.data ?? []
  const meta = ordersQuery.data?.meta
  const events = eventsQuery.data ?? []

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        updateFilters({ search: searchInput, page: 1 })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, filters.search])

  const onView = (id: string) => {
    navigate(`/admin/ticketing/orders/${id}`)
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this order? This cannot be undone.')) return
    deleteMutation.mutate(id)
  }

  const hasActiveFilters =
    filters.search ||
    filters.eventIds.length ||
    filters.status ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.datePreset

  const emptyState = !ordersQuery.isLoading && orders.length === 0
  const isLoading = ordersQuery.isLoading

  const onRemoveChip = (key: string, value?: string) => {
    if (key === 'search') return updateFilters({ search: '', page: 1 })
    if (key === 'status') return updateFilters({ status: null, page: 1 })
    if (key === 'datePreset') return updateFilters({ datePreset: null, page: 1 })
    if (key === 'dateRange') return updateFilters({ dateFrom: null, dateTo: null, page: 1 })
    if (key === 'eventIds' && value) return updateFilters({ eventIds: filters.eventIds.filter((id) => id !== value), page: 1 })
  }

  const clearAllFilters = () => {
    updateFilters({
      search: '',
      eventIds: [],
      status: null,
      dateFrom: null,
      dateTo: null,
      datePreset: null,
      page: 1,
    })
  }

  return (
    <div className="oa-page-container oa-ticketing-dashboard">
      <AdminPageHeader
        title="Ticket Orders"
        subtitle="View and manage all ticket orders and sales across your organization."
      />

      <StatsBar totalOrders={meta?.total} totalRevenue={meta?.total_revenue_cents} />

      <div className="oa-card oa-shadow-sm oa-ticketing-toolbar">
        <div className="oa-ticketing-toolbar__left">
          <div className="oa-search">
            <span className="material-symbols-outlined oa-search__icon">search</span>
            <input
              className="oa-input oa-search__input"
              placeholder="Search by email, name, or order ID..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <Button variant="secondary" icon="tune" onClick={() => setFiltersOpen(true)} className="oa-filter-btn">
            Filters
          </Button>
        </div>
        <div className="oa-ticketing-toolbar__right">
          <select
            className="oa-input oa-sort-select"
            value={filters.sortBy || 'created_at'}
            onChange={(e) => updateFilters({ sortBy: e.target.value, page: 1 })}
          >
            <option value="created_at">Sort: Date</option>
            <option value="amount">Sort: Amount</option>
          </select>
          <ViewToggle value={filters.view} onChange={(v) => updateFilters({ view: v })} />
        </div>
      </div>

      <ActiveFilterChips
        filters={filters}
        events={events}
        onRemove={onRemoveChip}
        onClearAll={clearAllFilters}
      />

      {filtersOpen && (
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filters}
          events={events}
          onApply={(next) => updateFilters(next)}
        />
      )}

      <div className="oa-mt-4">
        {isLoading && (
          <div className="oa-card oa-shadow-sm oa-p-4">
            <div className="oa-skeleton oa-skeleton-line oa-skeleton-line--short" />
            <div className="oa-skeleton oa-skeleton-line oa-skeleton-line--medium" />
            <div className="oa-skeleton oa-skeleton-line oa-skeleton-line--full" />
          </div>
        )}

        {!isLoading && emptyState && (
          <div className="oa-card oa-shadow-sm oa-p-6">
            <EmptyState
              icon="receipt_long"
              title={hasActiveFilters ? 'No orders match these filters' : 'No ticket orders yet'}
              description={hasActiveFilters ? 'Try adjusting filters or resetting search.' : 'Orders will appear here when customers purchase tickets.'}
              action={
                hasActiveFilters
                  ? { label: 'Clear filters', onClick: clearAllFilters }
                  : { label: 'View Events', onClick: () => navigate('/admin/ticketing/events') }
              }
              noCard
            />
          </div>
        )}

        {!isLoading && !emptyState && (
          <>
            {filters.view === 'list' && (
              <ListView orders={orders} onView={onView} onDelete={handleDelete} />
            )}
            {filters.view === 'table' && (
              <TableView orders={orders} onView={onView} onDelete={handleDelete} />
            )}
          </>
        )}
      </div>

      {meta && meta.total > filters.perPage && (
        <div className="oa-flex oa-justify-center oa-gap-2 oa-mt-4">
          <Button
            variant="secondary"
            disabled={filters.page === 1}
            onClick={() => updateFilters({ page: filters.page - 1 })}
          >
            Previous
          </Button>
          <span className="oa-flex oa-items-center oa-px-4">
            Page {filters.page} of {meta.total_pages}
          </span>
          <Button
            variant="secondary"
            disabled={filters.page >= meta.total_pages}
            onClick={() => updateFilters({ page: filters.page + 1 })}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
