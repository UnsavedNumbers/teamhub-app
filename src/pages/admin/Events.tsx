import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getEvents, getEventsCount } from '../../data/services/eventsService'
import { getLink } from '../../utils/routes'
import { getErrorMessage } from '../../utils/errorUtils'
import { supabase } from '../../lib/supabase'
import { showSuccess, showError } from '../../utils/toast'
import { validateCancelEvent, EVENT_ERRORS } from '../../utils/eventValidation'
import { useOrganization } from '../../contexts/OrganizationContext'
import { ConfirmDialog, AdminPageHeader, EmptyState } from '../../components/admin'
import EventsHeader from '../../components/admin/EventsHeader'
import EventsFilters from '../../components/admin/EventsFilters'
import EventsList from '../../components/admin/EventsList'
import EventsCalendar from '../../components/admin/EventsCalendar'
import EventsAgenda from '../../components/admin/EventsAgenda'
import BulkActionsBar from '../../components/admin/BulkActionsBar'
import EventDetailSlideOver from '../../components/admin/EventDetailSlideOver'
import type { CalendarEvent } from '../../types/calendar'
import type { EventTimeContext, EventViewMode, EventsFilters as EventsFiltersType } from '../../types/eventsManagement'

const supabaseAny = supabase as any
interface Team {
    id: string
    name: string
}

interface Sport {
    id: string
    name: string
}

interface Season {
    id: string
    name: string
}

const DEFAULT_FILTERS: EventsFiltersType = {
    search: '',
    dateFrom: '',
    dateTo: '',
    eventTypes: [],
    teamIds: [],
    sportIds: [],
    seasonIds: [],
    status: [],
    locationSearch: '',
}

export default function Events() {
    const { id: eventIdParam } = useParams<{ id: string }>()
    
    // View state
    const [timeContext, setTimeContext] = useState<EventTimeContext>('upcoming')
    const [viewMode, setViewMode] = useState<EventViewMode>('list')
    const [filters, setFilters] = useState<EventsFiltersType>(DEFAULT_FILTERS)
    
    // Data state
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    
    // Pagination and sorting
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(50)
    const [orderBy, setOrderBy] = useState('start_time')
    const [order, setOrder] = useState<'asc' | 'desc'>('asc')
    
    // Selection and bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    
    // Detail slide-over
    const [detailEventId, setDetailEventId] = useState<string | null>(null)
    
    // Calendar state
    const [calendarDate, setCalendarDate] = useState(new Date())
    
    // Dialogs
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; event: CalendarEvent | null }>({ open: false, event: null })
    const [cancelDialog, setCancelDialog] = useState<{ open: boolean; event: CalendarEvent | null }>({ open: false, event: null })
    const [bulkCancelDialog, setBulkCancelDialog] = useState(false)
    const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    
    // Filter data
    const [teams, setTeams] = useState<Team[]>([])
    const [sports, setSports] = useState<Sport[]>([])
    const [seasons, setSeasons] = useState<Season[]>([])
    
    const { context, isReady } = useUserContext()
    const { currentOrganization } = useOrganization()
    const navigate = useNavigate()
    const t = useT()

    // Load filter data (teams, sports, seasons)
    useEffect(() => {
        if (!isReady) return

        const loadFilterData = async () => {
            try {
                // Load teams
                const { data: teamsData } = await supabase
                    .from('teams')
                    .select('id, name')
                    .eq('org_id', context.orgId)
                    .order('name')
                if (teamsData) setTeams(teamsData)

                // Load sports
                const { data: sportsData } = await supabase
                    .from('sports')
                    .select('id, name')
                    .order('name')
                if (sportsData) setSports(sportsData)

                // Load seasons
                const { data: seasonsData } = await supabase
                    .from('seasons')
                    .select('id, name')
                    .order('name')
                if (seasonsData) setSeasons(seasonsData)
            } catch (err) {
                console.error('Error loading filter data:', err)
            }
        }

        loadFilterData()
    }, [context.orgId, isReady])

    // Persist view preferences to localStorage
    useEffect(() => {
        localStorage.setItem('eventsViewMode', viewMode)
        localStorage.setItem('eventsTimeContext', timeContext)
    }, [viewMode, timeContext])

    // Load view preferences from localStorage on mount
    useEffect(() => {
        const savedViewMode = localStorage.getItem('eventsViewMode') as EventViewMode
        const savedTimeContext = localStorage.getItem('eventsTimeContext') as EventTimeContext
        if (savedViewMode) setViewMode(savedViewMode)
        if (savedTimeContext) setTimeContext(savedTimeContext)
    }, [])

    // Sync detail event ID with route param (events/:id)
    useEffect(() => {
        setDetailEventId(eventIdParam ?? null)
    }, [eventIdParam])

    const fetchEvents = useCallback(async () => {
        if (!isReady) return

        setLoading(true)
        try {
            const queryParams = {
                timeContext,
                search: filters.search || undefined,
                dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
                dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
                eventTypes: filters.eventTypes.length > 0 ? filters.eventTypes : undefined,
                teamIds: filters.teamIds.length > 0 ? filters.teamIds : undefined,
                seasonIds: filters.seasonIds.length > 0 ? filters.seasonIds : undefined,
                status: filters.status.length > 0 ? filters.status : undefined,
                orderBy,
                order,
                offset: page * rowsPerPage,
                limit: rowsPerPage,
                includeCancelled: true,
            }

            // For calendar view, fetch events for the visible month
            if (viewMode === 'calendar') {
                const year = calendarDate.getFullYear()
                const month = calendarDate.getMonth()
                queryParams.dateFrom = new Date(year, month, 1)
                queryParams.dateTo = new Date(year, month + 1, 0, 23, 59, 59)
                delete (queryParams as any).offset
                delete (queryParams as any).limit
            }

            const [{ data: eventsData, error: eventsError }, { data: count, error: countError }] = await Promise.all([
                getEvents(context, queryParams),
                viewMode === 'list' ? getEventsCount(context, queryParams) : Promise.resolve({ data: 0, error: null }),
            ])

            if (eventsError) throw eventsError
            if (countError) throw countError

            setEvents(eventsData || [])
            setTotalCount(viewMode === 'list' ? count : eventsData?.length || 0)
        } catch (err) {
            console.error('Error fetching events:', err)
            showError(getErrorMessage(err) || 'Failed to load events')
            setEvents([])
            setTotalCount(0)
        } finally {
            setLoading(false)
        }
    }, [context, isReady, timeContext, filters, page, rowsPerPage, orderBy, order, viewMode, calendarDate])

    useEffect(() => {
        fetchEvents()
    }, [fetchEvents])

    const handleSort = (column: string) => {
        if (orderBy === column) {
            setOrder(order === 'asc' ? 'desc' : 'asc')
        } else {
            setOrderBy(column)
            setOrder('asc')
        }
        setPage(0)
    }

    const handleDelete = async (_reason: string) => {
        if (!deleteDialog.event) return

        setActionLoading(true)
        setActionError(null)

        try {
            const { error } = await supabase.from('events').delete().eq('id', deleteDialog.event.id)

            if (error) throw error

            showSuccess('Event deleted successfully')
            setDeleteDialog({ open: false, event: null })
            fetchEvents()
        } catch (err) {
            const errorMessage = getErrorMessage(err) || 'Failed to delete event'
            setActionError(errorMessage)
            showError(errorMessage)
        } finally {
            setActionLoading(false)
        }
    }

    const handleCancel = async (reason: string) => {
        if (!cancelDialog.event) return

        setActionLoading(true)
        setActionError(null)

        try {
            const { data: eventData } = await supabaseAny
                .from('events')
                .select('id, start_time, is_cancelled, status, type, org_id, team_id')
                .eq('id', cancelDialog.event.id)
                .single()

            if (!eventData) {
                throw new Error('Event not found')
            }

            const validation = await validateCancelEvent(context, eventData, currentOrganization, false)
            if (!validation.allowed) {
                throw new Error(validation.error || EVENT_ERRORS.CANCEL_BLOCKED_PERMISSION)
            }

            const { error } = await supabase
                .from('events')
                .update({
                    is_cancelled: true,
                    cancellation_reason: reason || null,
                    cancelled_at: new Date().toISOString(),
                    cancelled_by_user_id: context.userId,
                })
                .eq('id', cancelDialog.event.id)

            if (error) throw error

            showSuccess('Event cancelled successfully')
            setCancelDialog({ open: false, event: null })
            fetchEvents()
        } catch (err) {
            const errorMessage = getErrorMessage(err) || 'Failed to cancel event'
            setActionError(errorMessage)
            showError(errorMessage)
        } finally {
            setActionLoading(false)
        }
    }

    const handleDuplicate = async (event: CalendarEvent) => {
        try {
            const { data: fullEvent, error: fetchError } = await supabase
                .from('events')
                .select(`
                    *,
                    event_location:event_locations(*),
                    recurring_pattern:recurring_event_patterns(*)
                `)
                .eq('id', event.id)
                .single()

            if (fetchError) throw fetchError
            if (!fullEvent) throw new Error('Event not found')

            const { data: newEvent, error: insertError } = await supabase
                .from('events')
                .insert({
                    title: `${fullEvent.title} (Copy)`,
                    type: fullEvent.type,
                    team_id: fullEvent.team_id,
                    season_id: fullEvent.season_id,
                    start_time: fullEvent.start_time,
                    end_time: fullEvent.end_time,
                    arrival_time: fullEvent.arrival_time,
                    timezone: fullEvent.timezone,
                    notes: fullEvent.notes,
                    uniform_notes: fullEvent.uniform_notes,
                    equipment_notes: fullEvent.equipment_notes,
                    weather_dependent: fullEvent.weather_dependent,
                    external_link: fullEvent.external_link,
                    rsvp_enabled: fullEvent.rsvp_enabled,
                    rsvp_type: fullEvent.rsvp_type,
                    created_by_user_id: context.userId,
                })
                .select()
                .single()

            if (insertError) throw insertError
            if (!newEvent) throw new Error('Failed to create duplicate event')

            if (fullEvent.event_location) {
                await supabase.from('event_locations').insert({
                    event_id: (newEvent as any).id,
                    venue_name: fullEvent.event_location.venue_name,
                    address_line1: fullEvent.event_location.address_line1,
                    address_line2: fullEvent.event_location.address_line2,
                    city: fullEvent.event_location.city,
                    state: fullEvent.event_location.state,
                    postal_code: fullEvent.event_location.postal_code,
                    is_tbd: fullEvent.event_location.is_tbd,
                    is_virtual: fullEvent.event_location.is_virtual,
                    virtual_link: fullEvent.event_location.virtual_link,
                })
            }

            showSuccess('Event duplicated successfully')
            navigate(getLink('admin.events.edit', { id: (newEvent as any).id }))
        } catch (err) {
            const errorMessage = getErrorMessage(err) || 'Failed to duplicate event'
            showError(errorMessage)
        }
    }

    const handleBulkCancel = async (reason: string) => {
        setActionLoading(true)
        setActionError(null)

        try {
            const ids = Array.from(selectedIds)
            const { error } = await supabase
                .from('events')
                .update({
                    is_cancelled: true,
                    cancellation_reason: reason || null,
                    cancelled_at: new Date().toISOString(),
                    cancelled_by_user_id: context.userId,
                })
                .in('id', ids)

            if (error) throw error

            showSuccess(`${ids.length} events cancelled successfully`)
            setBulkCancelDialog(false)
            setSelectedIds(new Set())
            fetchEvents()
        } catch (err) {
            const errorMessage = getErrorMessage(err) || 'Failed to cancel events'
            setActionError(errorMessage)
            showError(errorMessage)
        } finally {
            setActionLoading(false)
        }
    }

    const handleBulkDelete = async (_reason: string) => {
        setActionLoading(true)
        setActionError(null)

        try {
            const ids = Array.from(selectedIds)
            const { error } = await supabase.from('events').delete().in('id', ids)

            if (error) throw error

            showSuccess(`${ids.length} events deleted successfully`)
            setBulkDeleteDialog(false)
            setSelectedIds(new Set())
            fetchEvents()
        } catch (err) {
            const errorMessage = getErrorMessage(err) || 'Failed to delete events'
            setActionError(errorMessage)
            showError(errorMessage)
        } finally {
            setActionLoading(false)
        }
    }

    const handleClearFilters = () => {
        setFilters(DEFAULT_FILTERS)
        setPage(0)
    }

    const handleEventClick = (event: CalendarEvent) => {
        navigate(getLink('admin.events.detail', { id: event.id }))
    }

    const handleCloseDetail = () => {
        navigate(getLink('admin.events.list'))
    }

    if (!isReady) {
        return (
            <div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
                    <div className="animate-pulse rounded bg-slate-200 dark:bg-slate-700" style={{ width: '100%', height: '400px' }} />
                </div>
            </div>
        )
    }

    return (
        <div>
            <AdminPageHeader title={t('admin.events.title')} subtitle={t('admin.events.subtitle')} />

            <EventsHeader
                timeContext={timeContext}
                viewMode={viewMode}
                onTimeContextChange={(context) => {
                    setTimeContext(context)
                    setPage(0)
                }}
                onViewModeChange={(mode) => {
                    setViewMode(mode)
                    setPage(0)
                }}
                onCreateClick={() => navigate('/admin/events/new')}
            />

            <EventsFilters
                filters={filters}
                onFiltersChange={(newFilters) => {
                    setFilters(newFilters)
                    setPage(0)
                }}
                teams={teams}
                sports={sports}
                seasons={seasons}
                onClearAll={handleClearFilters}
            />

            {events.length === 0 && !loading ? (
                <EmptyState
                    icon="event"
                    title="NO EVENTS"
                    description="No events match your current filters."
                    action={{ label: t('admin.events.create'), onClick: () => navigate('/admin/events/new') }}
                />
            ) : (
                <>
                    {viewMode === 'list' && (
                        <EventsList
                            events={events}
                            loading={loading}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            totalCount={totalCount}
                            onPageChange={setPage}
                            onRowsPerPageChange={(value) => {
                                setRowsPerPage(value)
                                setPage(0)
                            }}
                            onRowClick={handleEventClick}
                            onEdit={(event) => navigate(getLink('admin.events.edit', { id: event.id }))}
                            onDuplicate={handleDuplicate}
                            onCancel={(event) => setCancelDialog({ open: true, event })}
                            onDelete={(event) => setDeleteDialog({ open: true, event })}
                            orderBy={orderBy}
                            order={order}
                            onSort={handleSort}
                            selectable
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                        />
                    )}

                    {viewMode === 'calendar' && (
                        <EventsCalendar
                            events={events}
                            currentDate={calendarDate}
                            onDateChange={setCalendarDate}
                            onEventClick={handleEventClick}
                        />
                    )}

                    {viewMode === 'agenda' && (
                        <EventsAgenda
                            events={events}
                            loading={loading}
                            onEventClick={handleEventClick}
                            onEdit={(event) => navigate(getLink('admin.events.edit', { id: event.id }))}
                            onDuplicate={handleDuplicate}
                            onCancel={(event) => setCancelDialog({ open: true, event })}
                            onDelete={(event) => setDeleteDialog({ open: true, event })}
                        />
                    )}
                </>
            )}

            <BulkActionsBar
                selectedCount={selectedIds.size}
                onCancel={() => setBulkCancelDialog(true)}
                onReschedule={() => showError('Reschedule feature coming soon')}
                onDelete={() => setBulkDeleteDialog(true)}
                onClearSelection={() => setSelectedIds(new Set())}
            />

            <EventDetailSlideOver
                eventId={detailEventId}
                onClose={handleCloseDetail}
                onEdit={(eventId) => navigate(getLink('admin.events.edit', { id: eventId }))}
                onDuplicate={(eventId) => {
                    const event = events.find((e) => e.id === eventId)
                    if (event) handleDuplicate(event)
                }}
                onCancel={(eventId) => {
                    const event = events.find((e) => e.id === eventId)
                    if (event) setCancelDialog({ open: true, event })
                }}
                onDelete={(eventId) => {
                    const event = events.find((e) => e.id === eventId)
                    if (event) setDeleteDialog({ open: true, event })
                }}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteDialog.open}
                title="Delete Event"
                description={
                    deleteDialog.event
                        ? `Are you sure you want to delete "${deleteDialog.event.title}"? This action cannot be undone and will delete all associated data (RSVPs, attendance, etc.).`
                        : ''
                }
                confirmLabel="Delete"
                variant="danger"
                requireReason
                loading={actionLoading}
                error={actionError}
                onConfirm={handleDelete}
                onCancel={() => {
                    setDeleteDialog({ open: false, event: null })
                    setActionError(null)
                }}
            />

            {/* Cancel Event Dialog */}
            <ConfirmDialog
                open={cancelDialog.open}
                title="Cancel Event"
                description={
                    cancelDialog.event
                        ? `Are you sure you want to cancel "${cancelDialog.event.title}"? This will mark the event as cancelled and notify participants.`
                        : ''
                }
                confirmLabel="Cancel Event"
                variant="warning"
                requireReason
                loading={actionLoading}
                error={actionError}
                onConfirm={handleCancel}
                onCancel={() => {
                    setCancelDialog({ open: false, event: null })
                    setActionError(null)
                }}
            />

            {/* Bulk Cancel Dialog */}
            <ConfirmDialog
                open={bulkCancelDialog}
                title="Cancel Events"
                description={`Are you sure you want to cancel ${selectedIds.size} events? This will mark all selected events as cancelled and notify participants.`}
                confirmLabel="Cancel Events"
                variant="warning"
                requireReason
                loading={actionLoading}
                error={actionError}
                onConfirm={handleBulkCancel}
                onCancel={() => {
                    setBulkCancelDialog(false)
                    setActionError(null)
                }}
            />

            {/* Bulk Delete Dialog */}
            <ConfirmDialog
                open={bulkDeleteDialog}
                title="Delete Events"
                description={`Are you sure you want to delete ${selectedIds.size} events? This action cannot be undone and will delete all associated data (RSVPs, attendance, etc.).`}
                confirmLabel="Delete Events"
                variant="danger"
                requireReason
                loading={actionLoading}
                error={actionError}
                onConfirm={handleBulkDelete}
                onCancel={() => {
                    setBulkDeleteDialog(false)
                    setActionError(null)
                }}
            />
        </div>
    )
}
