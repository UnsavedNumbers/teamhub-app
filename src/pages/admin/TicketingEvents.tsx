
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { OrgAdminButton } from '@/components/admin/OrgAdminButton'
import PublicUrlBanner from '@/components/admin/PublicUrlBanner'
import EmptyState from '@/components/platformAdmin/EmptyState'
import { Badge, Button, PlatformDataTable, ProgressBar } from '@/components/platformAdmin'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  bulkTicketingEvents,
  deleteTicketingEvent,
  duplicateTicketingEvent,
  fetchTicketingEvents,
  fetchTicketingPrograms,
  fetchTicketingSeasons,
  fetchTicketingVenues,
  type TicketingEventsQuery,
} from '@/data/services/ticketingEventsAdminService'
import type { TicketSaleStatus, TicketedEvent, TicketingProgram, TicketingSeason, TicketingVenue } from '@/types/ticketing'
import { formatCurrency } from '@/types/ticketing'
import { useRouteLink } from '@/utils/routes'
import { showError, showSuccess } from '@/utils/toast'

type ViewMode = 'grid' | 'list' | 'table' | 'calendar'

interface Filters extends TicketingEventsQuery {
  view: ViewMode
}

const EVENT_STATUS_OPTIONS: Array<{ value: TicketedEvent['status']; label: string }> = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
]

const SALE_STATUS_OPTIONS: Array<{ value: TicketSaleStatus; label: string }> = [
  { value: 'on_sale', label: 'On sale' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'ended', label: 'Sales ended' },
  { value: 'sold_out', label: 'Sold out' },
  { value: 'off', label: 'Offline' },
]

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
]

const DEFAULT_PER_PAGE = 12
const VIEW_STORAGE_KEY = 'admin.ticketingEvents.view'

const formatDateTimeRange = (start: string, end: string, timezone?: string | null) => {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const sameDay = startDate.toDateString() === endDate.toDateString()
  const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: timezone || undefined })
  const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: timezone || undefined })
  if (sameDay) {
    return `${dateFormatter.format(startDate)} · ${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)}`
  }
  return `${dateFormatter.format(startDate)} ${timeFormatter.format(startDate)} - ${dateFormatter.format(endDate)} ${timeFormatter.format(endDate)}`
}

const saleStatusTone: Record<TicketSaleStatus, { color: string; label: string }> = {
  on_sale: { color: 'success', label: 'On sale' },
  scheduled: { color: 'blue', label: 'Scheduled' },
  ended: { color: 'secondary', label: 'Sales ended' },
  sold_out: { color: 'volt', label: 'Sold out' },
  off: { color: 'default', label: 'Offline' },
}

function parseFilters(params: URLSearchParams): Filters {
  const viewParam = (params.get('view') as ViewMode | null) || (typeof window !== 'undefined' ? (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null) : null)
  return {
    search: params.get('search') || '',
    programIds: params.getAll('program_id'),
    seasonIds: params.getAll('season_id'),
    venueIds: params.getAll('venue_id'),
    status: (params.get('status') as TicketedEvent['status'] | null) || null,
    saleStatus: (params.get('sale_status') as TicketSaleStatus | null) || null,
    dateFrom: params.get('date_from'),
    dateTo: params.get('date_to'),
    datePreset: params.get('date_preset'),
    sortBy: params.get('sort_by') || 'starts_at',
    page: Number(params.get('page') || 1),
    perPage: Number(params.get('per_page') || DEFAULT_PER_PAGE),
    view: viewParam || 'grid',
  }
}

function buildSearchParams(filters: Filters) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  filters.programIds?.forEach((id) => params.append('program_id', id))
  filters.seasonIds?.forEach((id) => params.append('season_id', id))
  filters.venueIds?.forEach((id) => params.append('venue_id', id))
  if (filters.status) params.set('status', filters.status)
  if (filters.saleStatus) params.set('sale_status', filters.saleStatus)
  if (filters.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters.dateTo) params.set('date_to', filters.dateTo)
  if (filters.datePreset) params.set('date_preset', filters.datePreset)
  if (filters.sortBy) params.set('sort_by', filters.sortBy)
  params.set('page', String(filters.page))
  params.set('per_page', String(filters.perPage))
  params.set('view', filters.view)
  return params
}

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function ActiveFilterChips({
  filters,
  programs,
  seasons,
  venues,
  onRemove,
  onClearAll,
}: {
  filters: Filters
  programs: TicketingProgram[]
  seasons: TicketingSeason[]
  venues: TicketingVenue[]
  onRemove: (key: string, value?: string) => void
  onClearAll: () => void
}) {
  const chips: Array<{ label: string; key: string; value?: string }> = []
  if (filters.search) chips.push({ label: `Search: ${filters.search}`, key: 'search' })
  if (filters.status) chips.push({ label: `Status: ${filters.status}`, key: 'status' })
  if (filters.saleStatus) chips.push({ label: `Sale: ${filters.saleStatus}`, key: 'saleStatus' })
  if (filters.datePreset) chips.push({ label: `Date: ${filters.datePreset.replace('_', ' ')}`, key: 'datePreset' })
  if (filters.dateFrom || filters.dateTo) chips.push({ label: `Date: ${filters.dateFrom || '8'} ? ${filters.dateTo || '8'}`, key: 'dateRange' })
  filters.programIds?.forEach((id) => {
    const program = programs.find((p) => p.id === id)
    chips.push({ label: `Program: ${program?.name || id}`, key: 'programIds', value: id })
  })
  filters.seasonIds?.forEach((id) => {
    const season = seasons.find((s) => s.id === id)
    chips.push({ label: `Season: ${season?.name || id}`, key: 'seasonIds', value: id })
  })
  filters.venueIds?.forEach((id) => {
    const venue = venues.find((v) => v.id === id)
    chips.push({ label: `Venue: ${venue?.name || id}`, key: 'venueIds', value: id })
  })

  if (chips.length === 0) return null

  return (
    <div className="pa-flex pa-flex-wrap pa-gap-2 pa-mt-3">
      {chips.map((chip) => (
        <span
          key={`${chip.key}-${chip.value || 'all'}`}
          className="pa-badge pa-badge-pill pa-badge-muted"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          {chip.label}
          <button
            className="pa-link"
            onClick={() => onRemove(chip.key, chip.value)}
            aria-label="Remove filter"
            style={{ fontSize: 12 }}
          >
            ×
          </button>
        </span>
      ))}
      <Button variant="ghost" size="dense" onClick={onClearAll} icon="filter_alt_off">
        Clear filters
      </Button>
    </div>
  )
}

function StatsBar({ total, ticketsSold, revenue }: { total?: number; ticketsSold?: number; revenue?: number }) {
  const stats = [
    { label: 'Events', value: total ?? 0, icon: 'event' },
    { label: 'Tickets sold', value: ticketsSold ?? 0, icon: 'confirmation_number' },
    { label: 'Revenue', value: revenue !== undefined ? formatCurrency(revenue || 0) : '$0.00', icon: 'paid' },
  ]
  return (
    <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-3 pa-gap-3 pa-mb-4">
      {stats.map((stat) => (
        <div key={stat.label} className="pa-card pa-shadow-sm pa-p-4 pa-flex pa-items-center pa-gap-3">
          <span className="material-symbols-outlined pa-text-lg" style={{ color: 'var(--pa-primary)' }}>{stat.icon}</span>
          <div>
            <div className="pa-text-sm pa-text-muted">{stat.label}</div>
            <div className="pa-text-xl pa-font-semibold">{stat.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const options: Array<{ value: ViewMode; icon: string; label: string }> = [
    { value: 'grid', icon: 'grid_view', label: 'Grid' },
    { value: 'list', icon: 'view_agenda', label: 'List' },
    { value: 'table', icon: 'table', label: 'Table' },
    { value: 'calendar', icon: 'calendar_month', label: 'Calendar' },
  ]
  return (
    <div className="pa-flex pa-gap-1" role="group" aria-label="View mode">
      {options.map((opt) => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'primary' : 'ghost'}
          size="compact"
          icon={opt.icon}
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
  programs,
  seasons,
  venues,
  onApply,
}: {
  open: boolean
  onClose: () => void
  filters: Filters
  programs: TicketingProgram[]
  seasons: TicketingSeason[]
  venues: TicketingVenue[]
  onApply: (next: Partial<Filters>) => void
}) {
  const [draft, setDraft] = useState<Filters>(filters)

  useEffect(() => {
    setDraft(filters)
  }, [filters, open])

  const toggleSet = (key: 'programIds' | 'seasonIds' | 'venueIds', id: string) => {
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
      programIds: [],
      seasonIds: [],
      venueIds: [],
      status: null,
      saleStatus: null,
      dateFrom: null,
      dateTo: null,
      datePreset: null,
    })
  }

  const backdropStyle: CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 30,
    display: open ? 'block' : 'none',
  }
  const panelStyle: CSSProperties = {
    position: 'fixed', top: 0, right: 0, height: '100%', width: 'min(480px, 100%)', background: '#fff', zIndex: 31,
    padding: 24, overflowY: 'auto', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', display: open ? 'block' : 'none',
  }

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={panelStyle}>
        <div className="pa-flex pa-items-center pa-justify-between pa-mb-4">
          <div className="pa-text-lg pa-font-semibold">Filters</div>
          <Button variant="ghost" icon="close" onClick={onClose} />
        </div>

        <div className="pa-space-y-4">
          <div>
            <label className="pa-label">Date preset</label>
            <select
              className="pa-input"
              value={draft.datePreset || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, datePreset: e.target.value || null, page: 1 }))}
            >
              <option value="">All</option>
              {DATE_PRESETS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 pa-gap-3">
            <div>
              <label className="pa-label">Start date</label>
              <input
                type="date"
                className="pa-input"
                value={draft.dateFrom || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, dateFrom: e.target.value || null, page: 1 }))}
              />
            </div>
            <div>
              <label className="pa-label">End date</label>
              <input
                type="date"
                className="pa-input"
                value={draft.dateTo || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, dateTo: e.target.value || null, page: 1 }))}
              />
            </div>
          </div>

          <div>
            <label className="pa-label">Programs</label>
            <div className="pa-flex pa-flex-wrap pa-gap-2">
              {programs.map((p) => (
                <Button
                  key={p.id}
                  variant={draft.programIds.includes(p.id) ? 'primary' : 'secondary'}
                  size="dense"
                  onClick={() => toggleSet('programIds', p.id)}
                >
                  {p.name}
                </Button>
              ))}
              {programs.length === 0 && <div className="pa-text-sm pa-text-muted">No programs</div>}
            </div>
          </div>

          <div>
            <label className="pa-label">Seasons</label>
            <div className="pa-flex pa-flex-wrap pa-gap-2">
              {seasons.map((s) => (
                <Button
                  key={s.id}
                  variant={draft.seasonIds.includes(s.id) ? 'primary' : 'secondary'}
                  size="dense"
                  onClick={() => toggleSet('seasonIds', s.id)}
                >
                  {s.name}
                </Button>
              ))}
              {seasons.length === 0 && <div className="pa-text-sm pa-text-muted">No seasons</div>}
            </div>
          </div>

          <div>
            <label className="pa-label">Venues</label>
            <div className="pa-flex pa-flex-wrap pa-gap-2">
              {venues.map((v) => (
                <Button
                  key={v.id}
                  variant={draft.venueIds.includes(v.id) ? 'primary' : 'secondary'}
                  size="dense"
                  onClick={() => toggleSet('venueIds', v.id)}
                >
                  {v.name}
                </Button>
              ))}
              {venues.length === 0 && <div className="pa-text-sm pa-text-muted">No venues</div>}
            </div>
          </div>

          <div className="pa-grid pa-grid-cols-2 pa-gap-3">
            <div>
              <label className="pa-label">Event status</label>
              <select
                className="pa-input"
                value={draft.status || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, status: (e.target.value as TicketedEvent['status']) || null }))}
              >
                <option value="">All</option>
                {EVENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="pa-label">Sale status</label>
              <select
                className="pa-input"
                value={draft.saleStatus || ''}
                onChange={(e) => setDraft((prev) => ({ ...prev, saleStatus: (e.target.value as TicketSaleStatus) || null }))}
              >
                <option value="">All</option>
                {SALE_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="pa-flex pa-justify-between pa-gap-2 pa-mt-6">
          <Button variant="ghost" onClick={clearLocal}>Clear</Button>
          <div className="pa-flex pa-gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon="check" onClick={apply}>Apply</Button>
          </div>
        </div>
      </div>
    </>
  )
}
function GridView({ events, onView, onDuplicate, onDelete }: { events: TicketedEvent[]; onView: (id: string) => void; onDuplicate: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="pa-grid pa-grid-cols-1 md:pa-grid-cols-2 xl:pa-grid-cols-3 pa-gap-4">
      {events.map((event) => (
        <div key={event.id} className="pa-card pa-shadow-sm pa-flex pa-flex-col pa-gap-3 pa-p-4">
          <div className="pa-flex pa-justify-between pa-items-start pa-gap-2">
            <div>
              <div className="pa-flex pa-gap-2 pa-items-center">
                <Badge tone={event.status === 'published' ? 'success' : event.status === 'cancelled' ? 'danger' : 'secondary'}>
                  {event.status}
                </Badge>
                {event.sale_status && (
                  <Badge tone={saleStatusTone[event.sale_status].color as any}>{saleStatusTone[event.sale_status].label}</Badge>
                )}
              </div>
              <h3 className="pa-text-lg pa-font-semibold pa-mt-1">{event.title}</h3>
              <div className="pa-text-sm pa-text-muted">{formatDateTimeRange(event.starts_at, event.ends_at, event.timezone)}</div>
              <div className="pa-text-sm pa-mt-1 pa-text-muted">
                {event.venue?.name || event.venue_name || 'TBD'}
                {event.program?.name ? ` · ${event.program.name}` : ''}
              </div>
            </div>
            <Button variant="ghost" size="dense" icon="open_in_new" onClick={() => onView(event.id)} />
          </div>

          <div className="pa-flex pa-gap-3 pa-items-center">
            {event.ticket_progress_pct !== null && event.ticket_progress_pct !== undefined ? (
              <div className="pa-flex-1">
                <ProgressBar
                  value={event.ticket_progress_pct}
                  label="Ticket progress"
                  showPercentage
                />
                <div className="pa-text-xs pa-text-muted pa-mt-1">
                  {event.tickets_sold || 0} / {event.capacity_total || '—'} sold
                </div>
              </div>
            ) : (
              <div className="pa-text-sm pa-text-muted">No ticket limits</div>
            )}
          </div>

          <div className="pa-flex pa-justify-between pa-items-center">
            <div className="pa-text-sm pa-font-semibold">{formatCurrency(event.revenue_cents || 0)}</div>
            <div className="pa-flex pa-gap-2">
              {event.opponent && <Badge tone="secondary">{event.is_home ? 'Home' : 'Away'} vs {event.opponent}</Badge>}
              {event.program?.name && <Badge tone="secondary">{event.program.name}</Badge>}
            </div>
          </div>
          <div className="pa-flex pa-justify-end pa-gap-2">
            <Button variant="secondary" size="dense" icon="content_copy" onClick={() => onDuplicate(event.id)}>Duplicate</Button>
            <Button variant="danger" size="dense" icon="delete" onClick={() => onDelete(event.id)}>Delete</Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ListView({ events, onView, onDuplicate, onDelete }: { events: TicketedEvent[]; onView: (id: string) => void; onDuplicate: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="pa-card pa-shadow-sm pa-divide-y pa-divide-slate-200">
      {events.map((event) => (
        <div key={event.id} className="pa-p-3 pa-flex pa-gap-3 pa-justify-between pa-items-center">
          <div className="pa-flex pa-gap-3 pa-items-center">
            <Badge tone={event.status === 'published' ? 'success' : event.status === 'cancelled' ? 'danger' : 'secondary'}>{event.status}</Badge>
            <div>
              <div className="pa-font-semibold">{event.title}</div>
              <div className="pa-text-sm pa-text-muted">
                {formatDateTimeRange(event.starts_at, event.ends_at, event.timezone)}
                {event.venue?.name ? ` · ${event.venue.name}` : ''}
              </div>
              <div className="pa-text-xs pa-text-muted">
                {event.program?.name ? `${event.program.name}` : ''}{event.opponent ? ` · ${event.is_home ? 'Home' : 'Away'} vs ${event.opponent}` : ''}
              </div>
            </div>
          </div>
          <div className="pa-flex pa-gap-3 pa-items-center">
            {event.ticket_progress_pct !== null && event.ticket_progress_pct !== undefined && (
              <div className="pa-text-sm pa-text-muted">
                {event.tickets_sold || 0}/{event.capacity_total || '—'}
              </div>
            )}
            <div className="pa-font-semibold">{formatCurrency(event.revenue_cents || 0)}</div>
            <Button variant="secondary" size="dense" onClick={() => onView(event.id)} icon="visibility">View</Button>
            <Button variant="secondary" size="dense" onClick={() => onDuplicate(event.id)} icon="content_copy" />
            <Button variant="danger" size="dense" onClick={() => onDelete(event.id)} icon="delete" />
          </div>
        </div>
      ))}
    </div>
  )
}

function TableView({
  events,
  meta,
  selectedIds,
  onSelectionChange,
  onView,
  onDuplicate,
  onDelete,
  onPageChange,
  onRowsPerPageChange,
  onSort,
}: {
  events: TicketedEvent[]
  meta?: { page: number; per_page: number; total: number }
  selectedIds: Set<string>
  onSelectionChange: (next: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  onView: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onPageChange: (page: number) => void
  onRowsPerPageChange: (size: number) => void
  onSort: (column: string) => void
}) {
  const columns = useMemo(() => {
    const cols: any[] = [
      { id: 'title', label: 'Event', sortable: true, render: (row: TicketedEvent) => <div className="pa-font-semibold">{row.title}</div> },
      { id: 'starts_at', label: 'Date', sortable: true, render: (row: TicketedEvent) => <span className="pa-text-sm pa-text-muted">{formatDateTimeRange(row.starts_at, row.ends_at, row.timezone)}</span> },
      { id: 'program', label: 'Program', render: (row: TicketedEvent) => row.program?.name || '—' },
      { id: 'season', label: 'Season', render: (row: TicketedEvent) => row.season?.name || '—' },
      { id: 'venue', label: 'Venue', render: (row: TicketedEvent) => row.venue?.name || row.venue_name || '—' },
      { id: 'status', label: 'Status', render: (row: TicketedEvent) => <Badge tone={row.status === 'published' ? 'success' : row.status === 'cancelled' ? 'danger' : 'secondary'}>{row.status}</Badge> },
      { id: 'sale_status', label: 'Sale', render: (row: TicketedEvent) => row.sale_status ? <Badge tone={saleStatusTone[row.sale_status].color as any}>{saleStatusTone[row.sale_status].label}</Badge> : '—' },
      { id: 'tickets', label: 'Tickets', sortable: true, render: (row: TicketedEvent) => `${row.tickets_sold || 0}${row.capacity_total ? ` / ${row.capacity_total}` : ''}` },
      { id: 'revenue', label: 'Revenue', sortable: true, render: (row: TicketedEvent) => formatCurrency(row.revenue_cents || 0) },
      { id: 'actions', label: '', render: (row: TicketedEvent) => (
        <div className="pa-flex pa-gap-1">
          <Button size="dense" variant="secondary" icon="open_in_new" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onView(row.id) }}>Open</Button>
          <Button size="dense" variant="secondary" icon="content_copy" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDuplicate(row.id) }} />
          <Button size="dense" variant="danger" icon="delete" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(row.id) }} />
        </div>
      ) },
    ]
    return cols
  }, [onView])

  return (
    <PlatformDataTable
      columns={columns}
      rows={events}
      page={(meta?.page || 1) - 1}
      rowsPerPage={meta?.per_page || DEFAULT_PER_PAGE}
      totalCount={meta?.total || 0}
      onPageChange={(p) => onPageChange(p + 1)}
      onRowsPerPageChange={(size) => onRowsPerPageChange(size)}
      onSort={onSort}
      selectable
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      onSelectAllChange={() => {}}
      onRowClick={(row) => onView(row.id)}
    />
  )
}
function CalendarView({ events, month, onMonthChange }: { events: TicketedEvent[]; month: Date; onMonthChange: (next: Date) => void }) {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const daysInMonth = endOfMonth.getDate()

  const dayEvents: Record<number, TicketedEvent[]> = {}
  events.forEach((event) => {
    const date = new Date(event.starts_at)
    if (date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()) {
      const day = date.getDate()
      dayEvents[day] = dayEvents[day] || []
      dayEvents[day].push(event)
    }
  })

  const offset = startOfMonth.getDay()
  const cells = Array.from({ length: offset + daysInMonth }, (_, idx) => idx - offset + 1)

  return (
    <div className="pa-card pa-shadow-sm pa-p-3">
      <div className="pa-flex pa-justify-between pa-items-center pa-mb-3">
        <Button variant="ghost" icon="chevron_left" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
        <div className="pa-text-lg pa-font-semibold">
          {month.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <Button variant="ghost" icon="chevron_right" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
      </div>

      <div className="pa-grid pa-grid-cols-7 pa-gap-2 pa-text-xs pa-font-semibold pa-text-muted pa-mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="pa-text-center">{d}</div>
        ))}
      </div>
      <div className="pa-grid pa-grid-cols-7 pa-gap-2">
        {cells.map((day, idx) => (
          <div key={idx} className="pa-border pa-border-slate-200 pa-rounded pa-min-h-[90px] pa-p-2 pa-bg-white">
            {day > 0 && (
              <>
                <div className="pa-text-xs pa-font-semibold">{day}</div>
                <div className="pa-flex pa-flex-col pa-gap-1 pa-mt-1">
                  {(dayEvents[day] || []).map((event) => (
                    <div
                      key={event.id}
                      className="pa-text-[11px] pa-rounded pa-px-2 pa-py-1"
                      style={{ background: event.program?.color || 'var(--pa-n100)', color: '#111' }}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PaginationControls({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
}: {
  page: number
  perPage: number
  total: number
  onPageChange: (page: number) => void
  onPerPageChange: (size: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  return (
    <div className="pa-flex pa-justify-between pa-items-center pa-mt-4 pa-flex-wrap pa-gap-2">
      <div className="pa-text-sm pa-text-muted">
        Page {page} of {totalPages} · {total} results
      </div>
      <div className="pa-flex pa-gap-2 pa-items-center">
        <select className="pa-input" value={perPage} onChange={(e) => onPerPageChange(Number(e.target.value))}>
          {[10, 12, 20, 30].map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
        <Button variant="secondary" size="dense" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} icon="chevron_left">
          Prev
        </Button>
        <Button variant="secondary" size="dense" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} iconRight="chevron_right">
          Next
        </Button>
      </div>
    </div>
  )
}

export default function TicketingEvents() {
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const [searchInput, setSearchInput] = useState(filters.search || '')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()

  const createEventPath = useRouteLink('admin.ticketingEvents.create') || useRouteLink('admin.events.create') || '/admin/ticketing/events/new'
  const detailRouteTemplate = useRouteLink('admin.ticketingEvents.detail', { id: '__ID__' })

  useEffect(() => {
    setSearchInput(filters.search || '')
  }, [filters.search])

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null) : null
    if (saved && saved !== filters.view) {
      setSearchParams(buildSearchParams({ ...filters, view: saved }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateFilters = (changes: Partial<Filters>) => {
    const next: Filters = { ...filters, ...changes }
    if (changes.view && typeof window !== 'undefined') {
      localStorage.setItem(VIEW_STORAGE_KEY, changes.view as string)
    }
    setSearchParams(buildSearchParams(next))
  }

  const programsQuery = useQuery(['ticketing-programs', orgId], () => fetchTicketingPrograms(orgId!), { enabled: !!orgId })
  const seasonsQuery = useQuery(['ticketing-seasons', orgId], () => fetchTicketingSeasons(orgId!), { enabled: !!orgId })
  const venuesQuery = useQuery(['ticketing-venues', orgId], () => fetchTicketingVenues(orgId!), { enabled: !!orgId })

  const eventsQuery = useQuery(
    ['ticketing-events-admin', orgId, JSON.stringify({ ...filters, view: undefined })],
    () => fetchTicketingEvents(orgId!, filters),
    { enabled: !!orgId, keepPreviousData: true },
  )

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTicketingEvent(orgId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketing-events-admin', orgId] })
      showSuccess('Event deleted')
    },
    onError: (err: any) => showError(err?.message || 'Delete failed'),
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateTicketingEvent(orgId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketing-events-admin', orgId] })
      showSuccess('Event duplicated')
    },
    onError: (err: any) => showError(err?.message || 'Duplicate failed'),
  })

  const bulkMutation = useMutation({
    mutationFn: (payload: { event_ids: string[]; action: string; [key: string]: any }) => bulkTicketingEvents(orgId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketing-events-admin', orgId] })
      setSelectedIds(new Set())
      showSuccess('Bulk action applied')
    },
    onError: (err: any) => showError(err?.message || 'Bulk action failed'),
  })

  const events = eventsQuery.data?.data ?? []
  const meta = eventsQuery.data?.meta
  const programs = programsQuery.data ?? []
  const seasons = seasonsQuery.data ?? []
  const venues = venuesQuery.data ?? []

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  useEffect(() => setSelectedIds(new Set()), [filters.view, filters.page, events.length])

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
    if (detailRouteTemplate) {
      navigate(detailRouteTemplate.replace('__ID__', id))
    } else {
      navigate(`/admin/ticketing/events/${id}`)
    }
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this event?')) return
    deleteMutation.mutate(id)
  }

  const handleBulkDelete = () => {
    if (!selectedIds.size) return
    if (!window.confirm(`Delete ${selectedIds.size} events?`)) return
    bulkMutation.mutate({ event_ids: Array.from(selectedIds), action: 'delete' })
  }

  const handleBulkStatus = (status: TicketedEvent['status']) => {
    if (!selectedIds.size || !status) return
    bulkMutation.mutate({ event_ids: Array.from(selectedIds), action: 'update', updates: { status } })
  }

  const handleBulkMove = (programId?: string, seasonId?: string) => {
    if (!selectedIds.size) return
    bulkMutation.mutate({ event_ids: Array.from(selectedIds), action: 'move', program_id: programId, season_id: seasonId })
  }

  const hasActiveFilters =
    filters.search ||
    filters.programIds.length ||
    filters.seasonIds.length ||
    filters.venueIds.length ||
    filters.status ||
    filters.saleStatus ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.datePreset

  const emptyState =
    !eventsQuery.isLoading &&
    events.length === 0

  const isLoading = eventsQuery.isLoading

  const onRemoveChip = (key: string, value?: string) => {
    if (key === 'search') return updateFilters({ search: '', page: 1 })
    if (key === 'status') return updateFilters({ status: null, page: 1 })
    if (key === 'saleStatus') return updateFilters({ saleStatus: null, page: 1 })
    if (key === 'datePreset') return updateFilters({ datePreset: null, page: 1 })
    if (key === 'dateRange') return updateFilters({ dateFrom: null, dateTo: null, page: 1 })
    if (key === 'programIds' && value) return updateFilters({ programIds: filters.programIds.filter((id) => id !== value), page: 1 })
    if (key === 'seasonIds' && value) return updateFilters({ seasonIds: filters.seasonIds.filter((id) => id !== value), page: 1 })
    if (key === 'venueIds' && value) return updateFilters({ venueIds: filters.venueIds.filter((id) => id !== value), page: 1 })
  }

  const clearAllFilters = () => {
    updateFilters({
      search: '',
      programIds: [],
      seasonIds: [],
      venueIds: [],
      status: null,
      saleStatus: null,
      dateFrom: null,
      dateTo: null,
      datePreset: null,
      page: 1,
    })
  }

  return (
    <div className="pa-page-container">
      <AdminPageHeader
        title="Ticketed Events"
        subtitle="Search, filter, and manage every ticketed event across programs and seasons."
        actions={
          <OrgAdminButton as={Link} to={createEventPath} icon="add">
            Create Event
          </OrgAdminButton>
        }
      />

      {orgId && (
        <div className="pa-mb-4">
          <PublicUrlBanner
            orgId={orgId}
            title="Your public ticketing page"
            description="Share this link so guests can browse and buy tickets."
            path="tickets"
          />
        </div>
      )}

      <StatsBar
        total={meta?.total}
        ticketsSold={meta?.total_tickets_sold}
        revenue={meta?.total_revenue_cents}
      />

      <div className="pa-card pa-shadow-sm pa-p-4 pa-flex pa-flex-wrap pa-gap-3 pa-justify-between pa-items-center">
        <div className="pa-flex pa-gap-2 pa-items-center pa-flex-wrap">
          <div className="pa-relative">
            <span className="material-symbols-outlined pa-text-muted" style={{ position: 'absolute', left: 10, top: 10 }}>search</span>
            <input
              className="pa-input"
              style={{ paddingLeft: 36, minWidth: 240 }}
              placeholder="Search events, opponents, venues..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <Button variant="secondary" icon="tune" onClick={() => setFiltersOpen(true)}>
            Filters
          </Button>
          <select
            className="pa-input"
            value={filters.sortBy || 'starts_at'}
            onChange={(e) => updateFilters({ sortBy: e.target.value, page: 1 })}
          >
            <option value="starts_at">Sort: Date</option>
            <option value="revenue">Sort: Revenue</option>
            <option value="tickets_sold">Sort: Tickets</option>
            <option value="created_at">Sort: Created</option>
          </select>
        </div>
        <ViewToggle value={filters.view} onChange={(v) => updateFilters({ view: v })} />
      </div>

      <ActiveFilterChips
        filters={filters}
        programs={programs}
        seasons={seasons}
        venues={venues}
        onRemove={onRemoveChip}
        onClearAll={clearAllFilters}
      />

      {filtersOpen && (
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filters}
          programs={programs}
          seasons={seasons}
          venues={venues}
          onApply={(next) => updateFilters(next)}
        />
      )}

      {/* Bulk toolbar (table view only) */}
      {filters.view === 'table' && selectedIds.size > 0 && (
        <div className="pa-card pa-shadow-sm pa-border pa-border-primary pa-p-3 pa-flex pa-gap-3 pa-items-center pa-mt-3">
          <div className="pa-font-semibold">{selectedIds.size} selected</div>
          <select className="pa-input" onChange={(e) => handleBulkStatus(e.target.value as TicketedEvent['status'])} defaultValue="">
            <option value="">Set status...</option>
            {EVENT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select className="pa-input" onChange={(e) => handleBulkMove(e.target.value || undefined, undefined)} defaultValue="">
            <option value="">Move to program...</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="pa-input" onChange={(e) => handleBulkMove(undefined, e.target.value || undefined)} defaultValue="">
            <option value="">Move to season...</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Button variant="danger" icon="delete" onClick={handleBulkDelete}>Delete</Button>
        </div>
      )}

      <div className="pa-mt-4">
        {isLoading && (
          <div className="pa-grid pa-grid-cols-1 md:pa-grid-cols-2 xl:pa-grid-cols-3 pa-gap-3">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="pa-card pa-shadow-sm pa-p-4">
                <div className="pa-skeleton pa-mb-3" style={{ height: 18, width: '50%' }} />
                <div className="pa-skeleton pa-mb-3" style={{ height: 14, width: '80%' }} />
                <div className="pa-skeleton" style={{ height: 8, width: '100%' }} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && emptyState && (
          <div className="pa-card pa-shadow-sm pa-p-6">
            <EmptyState
              icon="search_off"
              title={hasActiveFilters ? 'No events match these filters' : 'No ticketed events yet'}
              description={hasActiveFilters ? 'Try adjusting filters or resetting search.' : 'Create your first ticketed event to start selling tickets.'}
              action={hasActiveFilters ? { label: 'Clear filters', onClick: clearAllFilters } : { label: 'Create event', onClick: () => navigate(createEventPath) }}
              noCard
            />
          </div>
        )}

        {!isLoading && !emptyState && (
          <>
            {filters.view === 'grid' && (
              <GridView
                events={events}
                onView={onView}
                onDuplicate={(id) => duplicateMutation.mutate(id)}
                onDelete={handleDelete}
              />
            )}
            {filters.view === 'list' && (
              <ListView
                events={events}
                onView={onView}
                onDuplicate={(id) => duplicateMutation.mutate(id)}
                onDelete={handleDelete}
              />
            )}
            {filters.view === 'table' && (
              <TableView
                events={events}
                meta={meta}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onView={onView}
                onDuplicate={(id) => duplicateMutation.mutate(id)}
                onDelete={handleDelete}
                onPageChange={(page) => updateFilters({ page })}
                onRowsPerPageChange={(size) => updateFilters({ perPage: size, page: 1 })}
                onSort={(column) => updateFilters({ sortBy: column })}
              />
            )}
            {filters.view === 'calendar' && (
              <CalendarView
                events={events}
                month={calendarMonth}
                onMonthChange={(next) => setCalendarMonth(next)}
              />
            )}
          </>
        )}
      </div>

      {meta && meta.total > 0 && filters.view !== 'calendar' && (
        <PaginationControls
          page={filters.page}
          perPage={filters.perPage}
          total={meta.total}
          onPageChange={(page) => updateFilters({ page })}
          onPerPageChange={(size) => updateFilters({ perPage: size, page: 1 })}
        />
      )}

      {isMobile && (
        <button
          className="pa-btn pa-btn--primary"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            borderRadius: '999px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            padding: '12px 18px',
            zIndex: 40,
          }}
          onClick={() => navigate(createEventPath)}
        >
          <span className="material-symbols-outlined">add</span> Create
        </button>
      )}
    </div>
  )
}
