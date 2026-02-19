/**
 * Admin Ticketed Event Detail Page
 *
 * View event details, manage ticket types, generate staff links
 */

import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getLink, RouteKeys, useRouteLink } from '@/utils/routes'
import { supabase } from '@/lib/supabase'
import { USE_FAKE_DATA } from '@/data/config'
import {
  createStaffValidationLinkForEventAdmin,
  getAllTicketTypesForEventAdmin,
  getTicketedEventByIdAdmin,
  getTicketTypesTotalCountForEventAdmin,
  updateTicketType,
} from '@/data/services'
import { formatCurrency, type TicketedEvent, type TicketType } from '@/types/ticketing'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { showError, showSuccess } from '@/utils/toast'
import { classifySupabaseError, NetworkError, NotFoundError, RLSError, ValidationError } from '@/utils/supabaseErrorHandler'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { OrgAdminButton } from '@/components/admin/OrgAdminButton'
import EmptyState from '@/components/platformAdmin/EmptyState'
import PublicUrlShare from '@/components/ticketing/PublicUrlShare'
import { useT } from '@/i18n/useI18n'
import '../../styles/orgAdmin.css'

interface TicketedEventDetailProps {
  ticketedEventId?: string
  embedded?: boolean
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_PATTERN.test(value)
}

function isSupportedTicketedEventId(value: string | null | undefined): value is string {
  if (!value) return false
  if (isUuid(value)) return true
  return USE_FAKE_DATA
}

function formatDateRange(start: string, end: string, fallback: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return fallback

  return `${startDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })} - ${endDate.toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

function formatSalesWindow(
  start: string | null | undefined,
  end: string | null | undefined,
  fallback: string,
  startLabel: string,
  endLabel: string,
): string {
  if (start && end) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return fallback

    return `${startDate.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })} - ${endDate.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`
  }

  if (start) {
    const startDate = new Date(start)
    if (Number.isNaN(startDate.getTime())) return fallback
    return `${startLabel} ${startDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
  }

  if (end) {
    const endDate = new Date(end)
    if (Number.isNaN(endDate.getTime())) return fallback
    return `${endLabel} ${endDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
  }

  return fallback
}

function shouldRetryQuery(attempt: number, error: unknown): boolean {
  const classified = classifySupabaseError(error)
  return classified.retryable && attempt < 1
}

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export default function TicketedEventDetail({ ticketedEventId, embedded = false }: TicketedEventDetailProps) {
  useDebugLifecycle('TicketedEventDetail')
  const t = useT()
  const queryClient = useQueryClient()
  const { id: routeId } = useParams<{ id: string }>()
  const { isOnline } = useOnlineStatus()
  const id = (ticketedEventId ?? routeId ?? '').trim()
  const hasEventId = id.length > 0
  const hasValidEventId = isSupportedTicketedEventId(id)
  const navigate = useNavigate()
  const scannerPath = useRouteLink('admin.ticketingScannerEvent', { eventId: id || '' })
  const addTicketTypePath = useRouteLink('admin.ticketingEvents.ticketTypes.create', { id: id || '' })
  const eventsPath = useRouteLink('admin.ticketingEvents.list')
  const [statusChangeTarget, setStatusChangeTarget] = useState<TicketType | null>(null)
  const [pendingVisibilityChange, setPendingVisibilityChange] = useState<'visible' | 'hidden' | null>(null)
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)

  const {
    data: event,
    isLoading: eventLoading,
    isFetching: eventFetching,
    error: eventError,
    refetch: refetchEvent,
  } = useQuery<TicketedEvent>({
    queryKey: ['ticketed-event', id],
    queryFn: () => getTicketedEventByIdAdmin(id),
    enabled: hasValidEventId,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: shouldRetryQuery,
  })

  const {
    data: ticketTypes,
    isLoading: ticketTypesLoading,
    error: ticketTypesError,
    refetch: refetchTicketTypes,
  } = useQuery<TicketType[]>({
    queryKey: ['ticket-types', id, 'all'],
    queryFn: () => getAllTicketTypesForEventAdmin(id),
    enabled: hasValidEventId && !!event,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: shouldRetryQuery,
  })

  const {
    data: totalTicketTypeCount = 0,
    refetch: refetchTicketTypeCount,
  } = useQuery<number>({
    queryKey: ['ticket-types-total-count', id],
    queryFn: () => getTicketTypesTotalCountForEventAdmin(id),
    enabled: hasValidEventId && !!event,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: shouldRetryQuery,
  })

  const ticketTypesList = ticketTypes ?? []
  const hadTicketTypesRef = useRef(false)

  useEffect(() => {
    if (ticketTypesList.length > 0) {
      hadTicketTypesRef.current = true
    }
  }, [ticketTypesList.length])

  useEffect(() => {
    if (!hasValidEventId) return

    const channel = supabase
      .channel(`ticketing-event-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticketed_events',
          filter: `id=eq.${id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['ticketed-event', id] })
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ticket_types',
          filter: `ticketed_event_id=eq.${id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['ticket-types', id] })
          void queryClient.invalidateQueries({ queryKey: ['ticket-types', id, 'all'] })
          void queryClient.invalidateQueries({ queryKey: ['ticket-types-total-count', id] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [hasValidEventId, id, queryClient])

  const eventLoadError = eventError ? classifySupabaseError(eventError, 'Ticketed event') : null
  const ticketTypesLoadError = ticketTypesError ? classifySupabaseError(ticketTypesError, 'Ticket types') : null

  const toggleTicketTypeStatusMutation = useMutation<TicketType, Error, { ticketType: TicketType; nextActive: boolean }>({
    mutationFn: async ({ ticketType, nextActive }) => {
      const result = await updateTicketType(ticketType.id, { is_active: nextActive })
      if (result.error) {
        throw classifySupabaseError(result.error, 'Ticket type')
      }
      if (!result.data) {
        throw new Error('Failed to update ticket type status.')
      }
      return result.data
    },
    onSuccess: async (_updatedType, variables) => {
      showSuccess(
        variables.nextActive
          ? `"${variables.ticketType.name}" is now active.`
          : `"${variables.ticketType.name}" is now inactive.`,
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ticket-types', id] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-types', id, 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['ticket-types-total-count', id] }),
      ])
      setStatusChangeTarget(null)
    },
    onError: (error) => {
      showError(classifySupabaseError(error, 'Ticket type').message || 'Failed to update ticket type status.')
    },
  })

  const retryAll = () => {
    void refetchEvent()
    void refetchTicketTypes()
    void refetchTicketTypeCount()
  }

  const eventIsPermissionDenied = eventLoadError instanceof RLSError
  const eventIsOffline = eventLoadError instanceof NetworkError || (!isOnline && !event)
  const eventIsNotFound = eventLoadError instanceof NotFoundError

  const generateStaffLinkMutation = useMutation<string>({
    mutationFn: async () => {
      if (!hasValidEventId) throw new ValidationError(t('ticketing.detail.staffLink.missingEventId'))
      if (USE_FAKE_DATA) throw new ValidationError(t('ticketing.detail.staffLink.demoBlocked'))
      if (!isOnline) throw new NetworkError()
      return createStaffValidationLinkForEventAdmin(id)
    },
    onSuccess: async (link) => {
      try {
        await navigator.clipboard.writeText(link)
        showSuccess(t('ticketing.detail.staffLink.copied'))
      } catch {
        showError(t('ticketing.detail.staffLink.copyFailed'))
      }
    },
    onError: (error) => {
      const classified = classifySupabaseError(error)
      if (classified instanceof NetworkError) {
        showError(t('ticketing.detail.staffLink.offlineBlocked'))
        return
      }
      if (classified instanceof RLSError) {
        showError(t('common.error.permissionDenied'))
        return
      }
      showError(classified.message || t('ticketing.detail.staffLink.createFailed'))
    },
  })

  if (!hasEventId) {
    if (embedded) {
      return (
        <div className="oa-card oa-p-6">
          <EmptyState
            icon="event"
            title={t('ticketing.detail.states.missingEventIdTitle')}
            description={t('ticketing.detail.states.missingEventIdDescription')}
            noCard
          />
        </div>
      )
    }

    return (
      <div className="oa-page-container">
        <EmptyState
          icon="event"
          title={t('ticketing.detail.states.missingEventIdTitle')}
          description={t('ticketing.detail.states.missingEventIdDescription')}
          action={{ label: t('ticketing.detail.actions.backToEvents'), onClick: () => navigate(eventsPath) }}
          noCard
        />
      </div>
    )
  }

  if (!hasValidEventId) {
    if (embedded) {
      return (
        <div className="oa-card oa-p-6">
          <EmptyState
            icon="link_off"
            title={t('ticketing.detail.states.invalidEventIdTitle')}
            description={t('ticketing.detail.states.invalidEventIdDescription')}
            noCard
          />
        </div>
      )
    }

    return (
      <div className="oa-page-container">
        <EmptyState
          icon="link_off"
          title={t('ticketing.detail.states.invalidEventIdTitle')}
          description={t('ticketing.detail.states.invalidEventIdDescription')}
          action={{ label: t('ticketing.detail.actions.backToEvents'), onClick: () => navigate(eventsPath) }}
          noCard
        />
      </div>
    )
  }

  if (eventLoading && !event) {
    if (embedded) {
      return (
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div className="oa-skeleton" style={{ height: '250px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="oa-skeleton" style={{ height: '60px' }} />
              ))}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="oa-page-container">
        <div style={{ padding: '24px' }}>
          <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div className="oa-skeleton" style={{ height: '250px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="oa-skeleton" style={{ height: '60px' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="oa-skeleton" style={{ height: '200px' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    let title = t('ticketing.detail.states.eventLoadFailedTitle')
    let description = t('ticketing.detail.states.eventLoadFailedDescription')
    let icon = 'event_busy'

    if (eventIsPermissionDenied) {
      title = t('ticketing.detail.states.permissionTitle')
      description = t('ticketing.detail.states.permissionDescription')
      icon = 'lock'
    } else if (eventIsOffline) {
      title = t('ticketing.detail.states.offlineTitle')
      description = t('ticketing.detail.states.offlineDescription')
      icon = 'cloud_off'
    } else if (eventIsNotFound) {
      title = t('ticketing.detail.states.eventNotFoundTitle')
      description = t('ticketing.detail.states.eventNotFoundDescription')
      icon = 'event_busy'
    }

    if (embedded) {
      return (
        <div className="oa-card oa-p-6">
          <EmptyState
            icon={icon}
            title={title}
            description={description}
            action={eventIsPermissionDenied ? undefined : { label: t('ticketing.detail.actions.retry'), onClick: retryAll }}
            noCard
          />
        </div>
      )
    }

    return (
      <div className="oa-page-container">
        <EmptyState
          icon={icon}
          title={title}
          description={description}
          action={
            eventIsPermissionDenied
              ? { label: t('ticketing.detail.actions.backToTicketedEvents'), onClick: () => navigate(eventsPath) }
              : { label: t('ticketing.detail.actions.retry'), onClick: retryAll }
          }
          noCard
        />
      </div>
    )
  }

  const statusLabel = (() => {
    if (event.status === 'published') return t('ticketing.detail.values.status.published')
    if (event.status === 'draft') return t('ticketing.detail.values.status.draft')
    if (event.status === 'cancelled') return t('ticketing.detail.values.status.cancelled')
    if (event.status === 'completed') return t('ticketing.detail.values.status.completed')
    return t('ticketing.detail.values.status.unknown')
  })()

  const eventDateRange = formatDateRange(event.starts_at, event.ends_at, t('ticketing.detail.values.unavailable'))
  const salesWindow = formatSalesWindow(
    event.sales_start_at,
    event.sales_end_at,
    t('ticketing.detail.values.unavailable'),
    t('ticketing.detail.labels.salesStartLabel'),
    t('ticketing.detail.labels.salesEndLabel'),
  )
  const venueLabel = event.venue_name
    ? `${event.venue_name} (${[event.venue_city, event.venue_state].filter(Boolean).join(', ')})`
    : [event.venue_city, event.venue_state].filter(Boolean).join(', ') || t('ticketing.detail.values.tbd')

  const lastUpdatedAt = (() => {
    const updatedAt = new Date(event.updated_at)
    if (Number.isNaN(updatedAt.getTime())) return t('ticketing.detail.values.unavailable')
    return updatedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  })()
  const internalDescription = event.description?.trim() || t('ticketing.detail.values.notProvided')
  const publicDescription = event.event_description?.trim() || t('ticketing.detail.values.notProvided')
  const bannerUrl = event.ticket_banner_url || event.cover_image_path || null
  const editTicketTypePath = getLink('admin.ticketingEvents.ticketTypes.edit', { id })
  const eventVisibility = event.status === 'draft' ? 'hidden' : (event.visibility ?? 'visible')

  const hasOfflineReadOnlyNotice = !isOnline
  const hasDemoReadOnlyNotice = USE_FAKE_DATA
  const displayedTotalTicketTypeCount = Math.max(totalTicketTypeCount, ticketTypesList.length)
  const activeTicketTypesCount = ticketTypesList.filter((type) => type.is_active).length
  const hasOnlyInactiveTicketTypes = displayedTotalTicketTypeCount > 0 && activeTicketTypesCount === 0
  const hasDeletedAllVisibleTicketTypes = hadTicketTypesRef.current && ticketTypesList.length === 0 && displayedTotalTicketTypeCount === 0
  const fanVisible = event.status === 'published' && eventVisibility === 'visible'
  const statusChangeNextActive = statusChangeTarget ? !(statusChangeTarget.is_active === true) : false
  const isLastActiveTicketType =
    !!statusChangeTarget && statusChangeTarget.is_active === true && activeTicketTypesCount === 1
  const statusChangeDescription = (() => {
    if (!statusChangeTarget) return ''
    if (statusChangeNextActive) {
      return `Activate "${statusChangeTarget.name}" so fans can purchase this ticket type when the event is visible.`
    }
    if (fanVisible && isLastActiveTicketType) {
      return `Deactivate "${statusChangeTarget.name}"? This is the last active ticket type. Fans will still see the event but will not be able to buy tickets.`
    }
    return `Deactivate "${statusChangeTarget.name}"? Fans will no longer be able to purchase this ticket type. Existing ticket holders are not affected.`
  })()
  const hasFiniteCapacity = ticketTypesList.some((type) => type.capacity_total !== null)
  const totalCapacity = hasFiniteCapacity
    ? ticketTypesList.reduce((sum, type) => sum + (type.capacity_total ?? 0), 0)
    : null
  const totalRemainingCapacity = hasFiniteCapacity
    ? ticketTypesList.reduce((sum, type) => sum + (type.capacity_remaining ?? 0), 0)
    : null

  const salesStatusLabel = (() => {
    if (event.status === 'published' && eventVisibility === 'hidden') return 'Hidden'
    if (event.status === 'published' && activeTicketTypesCount === 0) return 'Visible - No tickets'
    if (event.status === 'published') return t('ticketing.detail.values.salesStatus.live')
    if (event.status === 'draft') return t('ticketing.detail.values.salesStatus.preparing')
    if (event.status === 'completed') return t('ticketing.detail.values.salesStatus.closed')
    if (event.status === 'cancelled') return t('ticketing.detail.values.salesStatus.closed')
    return t('ticketing.detail.values.unavailable')
  })()
  const salesStatusIsAlert = salesStatusLabel === 'Visible - No tickets'
  const visibilityToggleLinkLabel = eventVisibility === 'visible' ? 'Hide from fans' : 'Make Visible'
  const visibilityToggleDisabled = event.status !== 'published' || !isOnline || USE_FAKE_DATA || isUpdatingVisibility
  const visibilityConfirmTitle = pendingVisibilityChange === 'hidden' ? 'Hide Event from Fans' : 'Make Event Visible'
  const visibilityConfirmDescription = pendingVisibilityChange === 'hidden'
    ? 'Fans will no longer see this event. Existing ticket holders will still have valid tickets.'
    : 'This event has no active ticket types. Fans will see the event but cannot purchase tickets.'
  const visibilityConfirmLabel = pendingVisibilityChange === 'hidden' ? 'Hide from Fans' : 'Make Visible'

  const applyVisibilityChange = async (nextVisibility: 'visible' | 'hidden') => {
    setIsUpdatingVisibility(true)
    try {
      const supabaseAny = supabase as any
      const { error } = await supabaseAny
        .from('ticketed_events')
        .update({ visibility: nextVisibility })
        .eq('id', id)

      if (error) {
        showError(classifySupabaseError(error).message || 'Failed to update event visibility.')
        return false
      }

      showSuccess(nextVisibility === 'visible' ? 'Event is now visible to fans.' : 'Event is now hidden from fans.')
      await queryClient.invalidateQueries({ queryKey: ['ticketed-event', id] })
      await queryClient.invalidateQueries({ queryKey: ['ticketed-events'] })
      return true
    } finally {
      setIsUpdatingVisibility(false)
    }
  }

  const handleToggleVisibility = async () => {
    if (event.status !== 'published') {
      showError('Publish this event before changing visibility.')
      return
    }
    if (!isOnline) {
      showError(t('ticketing.detail.staffLink.offlineBlocked'))
      return
    }
    if (USE_FAKE_DATA) {
      showError(t('ticketing.detail.notices.demoModeReadOnly'))
      return
    }

    const nextVisibility = eventVisibility === 'visible' ? 'hidden' : 'visible'
    if (nextVisibility === 'hidden') {
      setPendingVisibilityChange(nextVisibility)
      return
    }
    if (nextVisibility === 'visible' && activeTicketTypesCount === 0) {
      setPendingVisibilityChange(nextVisibility)
      return
    }

    await applyVisibilityChange(nextVisibility)
  }

  const ticketingContent = (
    <div className="oa-ticketing-detail oa-space-y-6">
      {(hasOfflineReadOnlyNotice || hasDemoReadOnlyNotice) && (
        <div className="oa-card oa-p-4 oa-ticketing-notice-card" role="status" aria-live="polite">
          {hasOfflineReadOnlyNotice && (
            <p className="oa-text-muted">{t('ticketing.detail.notices.offlineReadOnly')}</p>
          )}
          {hasDemoReadOnlyNotice && (
            <p className="oa-text-muted">{t('ticketing.detail.notices.demoModeReadOnly')}</p>
          )}
        </div>
      )}

      {fanVisible && activeTicketTypesCount === 0 && (
        <div className="oa-card oa-p-4 oa-ticketing-notice-card" role="alert">
          <p className="oa-text-muted">This event is visible to fans but has no tickets available for purchase.</p>
          <div className="oa-flex oa-gap-2 oa-mt-3">
            <OrgAdminButton
              size="compact"
              icon={hasOnlyInactiveTicketTypes ? 'toggle_on' : 'add'}
              onClick={() => navigate(hasOnlyInactiveTicketTypes ? editTicketTypePath : addTicketTypePath)}
              disabled={!isOnline || USE_FAKE_DATA}
            >
              {hasOnlyInactiveTicketTypes ? 'Activate Ticket Type' : t('ticketing.detail.actions.addTicketType')}
            </OrgAdminButton>
          </div>
        </div>
      )}

      <section className="oa-card oa-ticketing-overview-card" aria-label={t('ticketing.detail.sections.overview')}>
        <div className="oa-ticketing-overview__header">
          <div>
            <h2 className="oa-card-title">{t('ticketing.detail.sections.eventDetails')}</h2>
            <p className="oa-ticketing-overview__subtitle">{t('ticketing.detail.overview.subtitle')}</p>
          </div>
          <span className={`oa-badge oa-badge-${event.status === 'published' ? 'success' : event.status === 'draft' ? 'info' : 'default'}`}>
            {statusLabel}
          </span>
        </div>

        <div className="oa-ticketing-kpi-grid">
          <div className="oa-ticketing-kpi">
            <span className="material-symbols-outlined">confirmation_number</span>
            <div>
              <p className="oa-ticketing-kpi__label">{t('ticketing.detail.labels.activeTicketTypes')}</p>
              <p className="oa-ticketing-kpi__value">
                {activeTicketTypesCount}/{displayedTotalTicketTypeCount}
              </p>
            </div>
          </div>
          <div className="oa-ticketing-kpi">
            <span className="material-symbols-outlined">inventory_2</span>
            <div>
              <p className="oa-ticketing-kpi__label">{t('ticketing.detail.labels.availableCapacity')}</p>
              <p className="oa-ticketing-kpi__value">
                {totalRemainingCapacity !== null && totalCapacity !== null
                  ? `${totalRemainingCapacity}/${totalCapacity}`
                  : t('ticketing.detail.values.unlimited')}
              </p>
            </div>
          </div>
          <div className={`oa-ticketing-kpi ${salesStatusIsAlert ? 'oa-ticketing-kpi--alert' : ''}`}>
            <span className="material-symbols-outlined">storefront</span>
            <div>
              <p className="oa-ticketing-kpi__label">{t('ticketing.detail.labels.salesStatus')}</p>
              <p className="oa-ticketing-kpi__value">{salesStatusLabel}</p>
            </div>
          </div>
          <div className="oa-ticketing-kpi">
            <span className="material-symbols-outlined">wifi</span>
            <div>
              <p className="oa-ticketing-kpi__label">{t('ticketing.detail.labels.connection')}</p>
              <p className="oa-ticketing-kpi__value">
                {isOnline ? t('ticketing.detail.values.connection.online') : t('ticketing.detail.values.connection.offline')}
              </p>
            </div>
          </div>
        </div>

        <div className="oa-ticketing-meta-grid">
          <div className="oa-ticketing-meta-item">
            <span className="oa-ticketing-meta-item__label">{t('ticketing.detail.labels.date')}</span>
            <p className="oa-ticketing-meta-item__value">{eventDateRange}</p>
          </div>
          <div className="oa-ticketing-meta-item">
            <span className="oa-ticketing-meta-item__label">{t('ticketing.detail.labels.venue')}</span>
            <p className="oa-ticketing-meta-item__value">{venueLabel}</p>
          </div>
          <div className="oa-ticketing-meta-item">
            <span className="oa-ticketing-meta-item__label">{t('ticketing.detail.labels.timezone')}</span>
            <p className="oa-ticketing-meta-item__value">{event.timezone || t('ticketing.detail.values.unavailable')}</p>
          </div>
          <div className="oa-ticketing-meta-item">
            <span className="oa-ticketing-meta-item__label">{t('ticketing.detail.labels.salesWindow')}</span>
            <p className="oa-ticketing-meta-item__value">{salesWindow}</p>
          </div>
          <div className="oa-ticketing-meta-item">
            <span className="oa-ticketing-meta-item__label">Visibility</span>
            <div className="oa-ticketing-meta-item__value-row">
              <p className="oa-ticketing-meta-item__value">{eventVisibility === 'visible' ? 'Visible to fans' : 'Hidden from fans'}</p>
              <button
                type="button"
                className="oa-visibility-toggle-link"
                onClick={() => { void handleToggleVisibility() }}
                disabled={visibilityToggleDisabled}
                title={event.status !== 'published' ? 'Publish event to enable visibility' : undefined}
              >
                {visibilityToggleLinkLabel}
              </button>
            </div>
          </div>
          <div className="oa-ticketing-meta-item">
            <span className="oa-ticketing-meta-item__label">{t('ticketing.detail.labels.teamScope')}</span>
            <p className="oa-ticketing-meta-item__value">
              {event.team_id ? t('ticketing.detail.values.teamScoped') : t('ticketing.detail.values.orgWide')}
            </p>
          </div>
          <div className="oa-ticketing-meta-item">
            <span className="oa-ticketing-meta-item__label">{t('ticketing.detail.labels.lastUpdated')}</span>
            <p className="oa-ticketing-meta-item__value">{lastUpdatedAt}</p>
          </div>
        </div>

        <div className="oa-grid oa-grid-cols-1 md:oa-grid-cols-2 oa-gap-4" style={{ marginTop: 'var(--pa-space-4)' }}>
          <div className="oa-ticketing-meta-item">
            <span className="oa-ticketing-meta-item__label">{t('ticketing.detail.labels.internalDescription')}</span>
            <p className="oa-ticketing-meta-item__value">{internalDescription}</p>
          </div>
          <div className="oa-ticketing-meta-item">
            <span className="oa-ticketing-meta-item__label">{t('ticketing.detail.labels.publicDescription')}</span>
            <p className="oa-ticketing-meta-item__value">{publicDescription}</p>
          </div>
        </div>

        {bannerUrl && (
          <div style={{ marginTop: 'var(--pa-space-4)' }}>
            <span className="oa-ticketing-meta-item__label">{t('ticketing.detail.labels.banner')}</span>
            <img
              src={bannerUrl}
              alt={t('ticketing.detail.labels.bannerAlt')}
              className="oa-w-full"
              style={{ marginTop: 'var(--pa-space-2)', maxHeight: 220, objectFit: 'cover', borderRadius: 'var(--pa-radius-lg)' }}
            />
          </div>
        )}

        <div className="oa-ticketing-overview__actions">
          <OrgAdminButton
            variant="secondary"
            icon={generateStaffLinkMutation.isPending ? 'hourglass_empty' : 'admin_panel_settings'}
            onClick={handleGenerateStaffLink}
            disabled={generateStaffLinkMutation.isPending || eventFetching || !isOnline || USE_FAKE_DATA}
          >
            {generateStaffLinkMutation.isPending
              ? t('ticketing.detail.actions.generatingStaffLink')
              : t('ticketing.detail.actions.generateStaffLink')}
          </OrgAdminButton>

          <OrgAdminButton as={Link} to={scannerPath} icon="qr_code_scanner">
            {t('ticketing.detail.actions.openScanner')}
          </OrgAdminButton>

          <OrgAdminButton as={Link} to={editTicketTypePath} icon="edit_note">
            {t('ticketing.detail.actions.editTicketingDetails')}
          </OrgAdminButton>

          <OrgAdminButton
            variant="secondary"
            icon={eventVisibility === 'visible' ? 'visibility_off' : 'visibility'}
            onClick={() => { void handleToggleVisibility() }}
            disabled={visibilityToggleDisabled}
            title={event.status !== 'published' ? 'Publish event to enable visibility' : undefined}
          >
            {eventVisibility === 'visible' ? 'Hide from Fans' : 'Make Visible'}
          </OrgAdminButton>

          <OrgAdminButton
            size="compact"
            icon="add"
            onClick={() => navigate(addTicketTypePath)}
            disabled={!isOnline || USE_FAKE_DATA}
            title={!isOnline ? t('ticketing.detail.staffLink.offlineBlocked') : undefined}
          >
            {t('ticketing.detail.actions.addTicketType')}
          </OrgAdminButton>
        </div>
      </section>

      {fanVisible ? (
        <PublicUrlShare
          orgId={event.org_id}
          path={getLink(RouteKeys.PORTAL_TICKET_EVENT_DETAIL, { eventId: event.id })}
          title={t('ticketing.detail.share.title')}
          description={t('ticketing.detail.share.description')}
        />
      ) : (
        <div className="oa-card oa-flex oa-flex-col oa-gap-3 oa-justify-center oa-p-8 oa-ticketing-share-locked">
          <h2 className="oa-card-title">{t('ticketing.detail.sections.publicLink')}</h2>
          <p className="oa-text-muted">
            {t('ticketing.detail.notices.publishToShareDescription')}
          </p>
        </div>
      )}

      <div className="oa-card oa-ticketing-types-card">
        <div className="oa-ticketing-types-card__header">
          <h2 className="oa-card-title">{t('ticketing.detail.sections.ticketTypes')}</h2>
          <span className="oa-ticketing-types-card__count">
            {t('ticketing.detail.labels.totalTicketTypes', { count: displayedTotalTicketTypeCount })}
          </span>
        </div>

        {ticketTypesLoading ? (
          <div className="oa-flex oa-justify-center oa-py-9">
            <span className="oa-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
          </div>
        ) : ticketTypesLoadError && ticketTypesList.length === 0 ? (
          <div className="oa-p-8">
            {ticketTypesLoadError instanceof RLSError ? (
              <EmptyState
                icon="lock"
                title={t('ticketing.detail.states.ticketTypesPermissionTitle')}
                description={t('ticketing.detail.states.ticketTypesPermissionDescription')}
                noCard
              />
            ) : ticketTypesLoadError instanceof NetworkError ? (
              <EmptyState
                icon="cloud_off"
                title={t('ticketing.detail.states.ticketTypesOfflineTitle')}
                description={t('ticketing.detail.states.ticketTypesOfflineDescription')}
                action={{ label: t('ticketing.detail.actions.retry'), onClick: retryAll }}
                noCard
              />
            ) : (
              <EmptyState
                icon="error"
                title={t('ticketing.detail.states.ticketTypesLoadFailedTitle')}
                description={t('ticketing.detail.states.ticketTypesLoadFailedDescription')}
                action={{ label: t('ticketing.detail.actions.retry'), onClick: retryAll }}
                noCard
              />
            )}
          </div>
        ) : ticketTypesList.length === 0 ? (
          <div className="oa-p-8">
            {hasDeletedAllVisibleTicketTypes ? (
              <EmptyState
                icon="delete_outline"
                title={t('ticketing.detail.states.deletedTicketTypesTitle')}
                description={t('ticketing.detail.states.deletedTicketTypesDescription')}
                action={
                  !isOnline || USE_FAKE_DATA
                    ? undefined
                    : { label: t('ticketing.detail.actions.addTicketType'), onClick: () => navigate(addTicketTypePath) }
                }
                noCard
              />
            ) : hasOnlyInactiveTicketTypes ? (
              <EmptyState
                icon="toggle_off"
                title={t('ticketing.detail.states.inactiveTicketTypesTitle')}
                description={t('ticketing.detail.states.inactiveTicketTypesDescription')}
                action={
                  !isOnline || USE_FAKE_DATA
                    ? undefined
                    : { label: t('ticketing.detail.actions.addTicketType'), onClick: () => navigate(addTicketTypePath) }
                }
                noCard
              />
            ) : (
              <EmptyState
                icon="confirmation_number"
                title={t('ticketing.detail.states.firstTimeTicketTypesTitle')}
                description={t('ticketing.detail.states.firstTimeTicketTypesDescription')}
                action={
                  !isOnline || USE_FAKE_DATA
                    ? undefined
                    : { label: t('ticketing.detail.actions.addTicketType'), onClick: () => navigate(addTicketTypePath) }
                }
                noCard
              />
            )}
          </div>
        ) : (
          <div className="oa-table-container oa-ticketing-types-table-wrap">
            <table className="oa-table oa-ticketing-types-table">
              <thead>
                <tr>
                  <th>{t('ticketing.detail.labels.name')}</th>
                  <th>{t('ticketing.reservedSeating.admin.modeColumn')}</th>
                  <th>{t('ticketing.detail.labels.price')}</th>
                  <th>{t('ticketing.detail.labels.capacity')}</th>
                  <th>{t('ticketing.detail.labels.status')}</th>
                  <th>{t('ticketing.reservedSeating.admin.actionsColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {ticketTypesList.map((type) => (
                  <tr key={type.id}>
                    <td className="oa-ticketing-types-table__name-cell">
                      <Link
                        to={`${editTicketTypePath}?ticketTypeId=${encodeURIComponent(type.id)}`}
                        className={`oa-link oa-ticketing-types-table__name-link ${
                          type.is_active ? 'oa-ticketing-types-table__name-link--active' : 'oa-ticketing-types-table__name-link--inactive'
                        }`}
                      >
                        {type.name}
                      </Link>
                    </td>
                    <td>
                      <span className={`oa-badge oa-ticketing-types-table__pill oa-badge--${type.seating_mode === 'reserved_seating' ? 'info' : 'neutral'}`}>
                        {type.seating_mode === 'reserved_seating'
                          ? t('ticketing.reservedSeating.mode.reservedSeating')
                          : t('ticketing.reservedSeating.mode.generalAdmission')}
                      </span>
                    </td>
                    <td>{formatCurrency(type.price_cents)}</td>
                    <td>
                      {type.seating_mode === 'reserved_seating' && type.capacity_total !== null
                        ? t('ticketing.reservedSeating.admin.reservedCapacitySummary', {
                            total: type.capacity_total,
                            available: type.capacity_remaining ?? 0,
                            sold: type.capacity_total - (type.capacity_remaining ?? 0),
                          })
                        : type.capacity_total !== null
                        ? `${type.capacity_remaining ?? 0}/${type.capacity_total}`
                        : t('ticketing.detail.values.unlimited')}
                    </td>
                    <td>
                      <span
                        className={`oa-badge oa-ticketing-types-table__pill oa-ticketing-types-table__status-pill ${
                          type.is_active
                            ? 'oa-ticketing-types-table__status-pill--active'
                            : 'oa-ticketing-types-table__status-pill--inactive'
                        }`}
                      >
                        {type.is_active
                          ? t('ticketing.detail.values.status.active')
                          : t('ticketing.detail.values.status.inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="oa-ticketing-types-table__actions">
                        <Link
                          to={`${editTicketTypePath}?ticketTypeId=${encodeURIComponent(type.id)}`}
                          className="oa-btn oa-btn--ghost oa-btn--dense oa-ticketing-types-table__action-btn"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          className={`oa-btn ${type.is_active ? 'oa-btn--secondary' : 'oa-btn--primary'} oa-btn--dense oa-ticketing-types-table__action-btn`}
                          onClick={() => setStatusChangeTarget(type)}
                          disabled={!isOnline || USE_FAKE_DATA || toggleTicketTypeStatusMutation.isPending}
                        >
                          {type.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!statusChangeTarget}
        title={statusChangeNextActive ? 'Activate Ticket Type' : 'Deactivate Ticket Type'}
        description={statusChangeDescription}
        confirmLabel={
          toggleTicketTypeStatusMutation.isPending
            ? (statusChangeNextActive ? 'Activating...' : 'Deactivating...')
            : (statusChangeNextActive ? 'Activate' : 'Deactivate')
        }
        variant={statusChangeNextActive ? 'primary' : 'danger'}
        onCancel={() => {
          if (toggleTicketTypeStatusMutation.isPending) return
          setStatusChangeTarget(null)
        }}
        onConfirm={() => {
          if (!statusChangeTarget || toggleTicketTypeStatusMutation.isPending) return
          toggleTicketTypeStatusMutation.mutate({
            ticketType: statusChangeTarget,
            nextActive: statusChangeNextActive,
          })
        }}
      />

      <ConfirmDialog
        open={pendingVisibilityChange !== null}
        title={visibilityConfirmTitle}
        description={visibilityConfirmDescription}
        confirmLabel={isUpdatingVisibility ? 'Updating...' : visibilityConfirmLabel}
        variant={pendingVisibilityChange === 'hidden' ? 'danger' : 'primary'}
        onCancel={() => {
          if (isUpdatingVisibility) return
          setPendingVisibilityChange(null)
        }}
        onConfirm={() => {
          if (!pendingVisibilityChange || isUpdatingVisibility) return
          void (async () => {
            const success = await applyVisibilityChange(pendingVisibilityChange)
            if (success) {
              setPendingVisibilityChange(null)
            }
          })()
        }}
      />
    </div>
  )

  function handleGenerateStaffLink() {
    if (generateStaffLinkMutation.isPending || eventFetching) return

    if (USE_FAKE_DATA) {
      showError(t('ticketing.detail.staffLink.demoBlocked'))
      return
    }

    if (!isOnline) {
      showError(t('ticketing.detail.staffLink.offlineBlocked'))
      return
    }

    generateStaffLinkMutation.mutate()
  }

  if (embedded) {
    return ticketingContent
  }

  return (
    <div className="oa-page-container">
      <AdminPageHeader
        title={event.title}
        subtitle={t('ticketing.detail.subtitle', { status: statusLabel })}
        actions={
          <div className="flex flex-wrap gap-2">
            <OrgAdminButton
              variant="secondary"
              icon={generateStaffLinkMutation.isPending ? 'hourglass_empty' : 'admin_panel_settings'}
              onClick={handleGenerateStaffLink}
              disabled={generateStaffLinkMutation.isPending || eventFetching || !isOnline || USE_FAKE_DATA}
            >
              {generateStaffLinkMutation.isPending
                ? t('ticketing.detail.actions.generatingStaffLink')
                : t('ticketing.detail.actions.generateStaffLink')}
            </OrgAdminButton>
            <OrgAdminButton as={Link} to={scannerPath} icon="qr_code_scanner">
              {t('ticketing.detail.actions.openScanner')}
            </OrgAdminButton>
          </div>
        }
      >
        {event.description && <p className="oa-page-description">{event.description}</p>}
      </AdminPageHeader>

      {ticketingContent}
    </div>
  )
}
