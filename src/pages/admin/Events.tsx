import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getEvents } from '../../data/services/eventsService'
import { getRSVPSummary } from '../../data/services/rsvpService'
import { getLink } from '../../utils/routes'
import { getErrorMessage } from '../../utils/errorUtils'
import { supabase } from '../../lib/supabase'
import { showSuccess, showError } from '../../utils/toast'
import { ConfirmDialog } from '../../components/platformAdmin/ConfirmDialog'
import { 
  AdminPageHeader, 
  Card, 
  Badge, 
  PlatformDataTable, 
  Button, 
  EmptyState,
  type ColumnConfig 
} from '../../components/platformAdmin'
import { cn } from '../../utils/cn'

interface Event {
  id: string
  title: string
  type: string
  start_time: string
  end_time: string
  location: string | null
  team: { name: string }
  rsvp_config?: { enabled: boolean; type: string | null }
  rsvp_summary?: string
  is_cancelled?: boolean
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; event: Event | null }>({ open: false, event: null })
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; event: Event | null }>({ open: false, event: null })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const fetchEvents = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    try {
      const now = new Date()
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
      
      const { data, error } = await getEvents(context, {
        startDate: now,
        endDate: sixtyDaysFromNow,
        includeCancelled: true,
      })
      
      if (error) {
        console.error('Error fetching events:', error)
        setEvents([])
        setTotalCount(0)
        return
      }

      // Transform to display format and fetch RSVP summaries with safe defaults
      const displayEvents: Event[] = await Promise.all((data || []).map(async (event) => {
        let rsvpSummary = ''
        const rsvpConfig = event.rsvp_config || { enabled: false, type: null }
        
        if (rsvpConfig.enabled && isReady && context) {
          try {
            const { data: summary, error: summaryError } = await getRSVPSummary(context, event.id)
            if (!summaryError && summary) {
              if (summary.general) {
                rsvpSummary = `Going: ${summary.general.going_count || 0}, Not: ${summary.general.not_going_count || 0}, Maybe: ${summary.general.maybe_count || 0}`
              } else if (summary.athlete) {
                rsvpSummary = `Going: ${summary.athlete.going_count || 0}, Late: ${summary.athlete.late_count || 0}, Not: ${summary.athlete.not_going_count || 0}, Unknown: ${summary.athlete.unknown_count || 0}`
              }
            }
          } catch (err) {
            console.warn('Failed to fetch RSVP summary:', err)
          }
        }
        
        return {
          id: event.id || '',
          title: event.title || 'Untitled Event',
          type: event.type || 'practice',
          start_time: event.start_time || new Date().toISOString(),
          end_time: event.end_time || new Date().toISOString(),
          location: event.event_location?.venue_name || event.location || (event.event_location?.is_tbd ? 'TBD' : null),
          team: { name: event.team?.name ?? 'Unknown Team' },
          rsvp_config: rsvpConfig,
          rsvp_summary: rsvpSummary,
          is_cancelled: event.is_cancelled
        }
      }))

      setTotalCount(displayEvents.length)
      
      // Client-side pagination
      const from = page * rowsPerPage
      const to = from + rowsPerPage
      setEvents(displayEvents.slice(from, to))
    } finally { 
      setLoading(false) 
    }
  }, [context, isReady, page, rowsPerPage])

  useEffect(() => { 
    fetchEvents() 
  }, [fetchEvents])

  const handleDelete = async (_reason: string) => {
    if (!deleteDialog.event) return
    
    setActionLoading(true)
    setActionError(null)
    
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', deleteDialog.event.id)
      
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
      const { error } = await supabase
        .from('events')
        .update({
          is_cancelled: true,
          cancellation_reason: reason || null,
          cancelled_at: new Date().toISOString(),
          cancelled_by_user_id: context.userId
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

  const handleDuplicate = async (event: Event) => {
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
          created_by_user_id: context.userId
        })
        .select()
        .single()
      
      if (insertError) throw insertError
      if (!newEvent) throw new Error('Failed to create duplicate event')
      
      if (fullEvent.event_location) {
        await supabase
          .from('event_locations')
          .insert({
            event_id: (newEvent as any).id,
            venue_name: fullEvent.event_location.venue_name,
            address_line1: fullEvent.event_location.address_line1,
            address_line2: fullEvent.event_location.address_line2,
            city: fullEvent.event_location.city,
            state: fullEvent.event_location.state,
            postal_code: fullEvent.event_location.postal_code,
            is_tbd: fullEvent.event_location.is_tbd,
            is_virtual: fullEvent.event_location.is_virtual,
            virtual_link: fullEvent.event_location.virtual_link
          })
      }
      
      const recurringPattern = Array.isArray(fullEvent.recurring_pattern) 
        ? fullEvent.recurring_pattern[0] 
        : fullEvent.recurring_pattern
      if (recurringPattern) {
        await supabase
          .from('recurring_event_patterns')
          .insert({
            parent_event_id: (newEvent as any).id,
            frequency: recurringPattern.frequency,
            days_of_week: recurringPattern.days_of_week,
            end_date: recurringPattern.end_date,
            max_occurrences: recurringPattern.max_occurrences
          })
      }
      
      showSuccess('Event duplicated successfully')
      navigate(getLink('admin.events.edit', { id: (newEvent as any).id }))
    } catch (err) {
      const errorMessage = getErrorMessage(err) || 'Failed to duplicate event'
      showError(errorMessage)
    }
  }

  const getTypeVariant = (type: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'error' => {
    switch (type) {
      case 'practice': return 'info'
      case 'game': return 'success'
      case 'tournament': return 'warning'
      case 'tryout': return 'warning'
      case 'blackout': return 'neutral'
      default: return 'neutral'
    }
  }

  const columns: ColumnConfig<Event>[] = [
    { 
        id: 'date', 
        label: 'Date', 
        render: (row) => (
            <div className="pa-flex pa-flex-col">
                <span className="pa-font-bold pa-text-slate-900">{new Date(row.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                <span className="pa-text-xs pa-text-slate-500 pa-font-medium">{new Date(row.start_time).toLocaleDateString(undefined, { weekday: 'short' })}</span>
            </div>
        )
    },
    { 
        id: 'time', 
        label: 'Time', 
        render: (row) => (
            <span className="pa-text-sm pa-font-medium pa-text-slate-600">
                {new Date(row.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
        )
    },
    { 
        id: 'title', 
        label: 'Title',
        render: (row) => (
            <div className="pa-flex pa-flex-col">
                <span className={cn('pa-font-bold', row.is_cancelled ? 'pa-text-slate-400 pa-line-through' : 'pa-text-slate-900')}>{row.title}</span>
                {row.is_cancelled && <span className="pa-text-[10px] pa-font-bold pa-text-danger" style={{ letterSpacing: '0.05em' }}>CANCELLED</span>}
            </div>
        )
    },
    { id: 'type', label: 'Type', render: (row) => <Badge variant={getTypeVariant(row.type)}>{row.type.toUpperCase()}</Badge> },
    { id: 'team_name', label: 'Team', render: (row) => <span className="pa-text-sm pa-font-medium pa-text-slate-700">{row.team?.name}</span> },
    { id: 'location', label: 'Location', render: (row) => <span className="pa-text-sm pa-text-slate-500">{row.location || '—'}</span> },
    { 
      id: 'rsvp', 
      label: 'RSVP', 
      render: (row) => {
        if (!row.rsvp_config?.enabled) return <span className="pa-text-slate-300">—</span>
        return (
          <div className="pa-flex pa-flex-col">
            <span className="pa-text-[11px] pa-font-bold pa-text-slate-500">{row.rsvp_config.type?.toUpperCase() || 'N/A'}</span>
            {row.rsvp_summary && <span className="pa-text-[11px] pa-text-slate-400">{row.rsvp_summary}</span>}
          </div>
        )
      }
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <div className="pa-flex pa-gap-1 pa-justify-end">
          <Button
            variant="ghost"
            size="dense"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              navigate(getLink('admin.events.edit', { id: row.id }))
            }}
            title="Edit event"
          >
            <span className="material-symbols-outlined pa-icon-sm">edit</span>
          </Button>
          <Button
            variant="ghost"
            size="dense"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              handleDuplicate(row)
            }}
            title="Duplicate event"
          >
            <span className="material-symbols-outlined pa-icon-sm">content_copy</span>
          </Button>
          {!row.is_cancelled && (
            <Button
              variant="ghost"
              size="dense"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                setCancelDialog({ open: true, event: row })
              }}
              title="Cancel event"
            >
              <span className="material-symbols-outlined pa-icon-sm">cancel</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="dense"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              setDeleteDialog({ open: true, event: row })
            }}
            title="Delete event"
            className="pa-text-danger hover:pa-bg-danger-surface"
          >
            <span className="material-symbols-outlined pa-icon-sm">delete</span>
          </Button>
        </div>
      ),
    }
  ]

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Events" 
        actions={
          <Button onClick={() => navigate('/admin/events/new')} icon="add">
            {t('admin.events.create')}
          </Button>
        } 
      />
      {events.length === 0 && !loading ? (
        <Card>
          <EmptyState 
            icon="event" 
            title="NO UPCOMING EVENTS" 
            description="Create your first event to get started." 
            action={{ label: t('admin.events.create'), onClick: () => navigate('/admin/events/new') }} 
          />
        </Card>
      ) : (
        <PlatformDataTable 
            columns={columns} 
            rows={events} 
            loading={loading} 
            totalCount={totalCount} 
            page={page} 
            rowsPerPage={rowsPerPage} 
            onPageChange={setPage} 
            onRowsPerPageChange={setRowsPerPage} 
            onRowClick={(row) => navigate(getLink('admin.events.edit', { id: row.id }))}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Event"
        description={deleteDialog.event ? `Are you sure you want to delete "${deleteDialog.event.title}"? This action cannot be undone and will delete all associated data (RSVPs, attendance, etc.).` : ''}
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
        description={cancelDialog.event ? `Are you sure you want to cancel "${cancelDialog.event.title}"? This will mark the event as cancelled and notify participants.` : ''}
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
    </div>
  )
}
