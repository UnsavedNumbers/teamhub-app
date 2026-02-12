/**
 * Admin Ticketed Event Detail Page
 *
 * View event details, manage ticket types, generate staff links
 */

import { useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getLink, useRouteLink } from '@/utils/routes'
import { supabase } from '@/lib/supabase'
import { USE_FAKE_DATA } from '@/data/config'
import { getTicketedEventByIdAdmin, getTicketTypesForEventAdmin } from '@/data/services'
import { formatCurrency, type TicketedEvent, type TicketType } from '@/types/ticketing'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { showError, showSuccess } from '@/utils/toast'
import { classifySupabaseError, NetworkError, NotFoundError, RLSError, ValidationError } from '@/utils/supabaseErrorHandler'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
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

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
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

export default function TicketedEventDetail({ ticketedEventId, embedded = false }: TicketedEventDetailProps) {
  const t = useT()
  const queryClient = useQueryClient()
  const { id: routeId } = useParams<{ id: string }>()
  const { isOnline } = useOnlineStatus()
  const id = (ticketedEventId ?? routeId ?? '').trim()
  const hasEventId = id.length > 0
  const hasValidEventId = isUuid(id)
  const navigate = useNavigate()
  const scannerPath = useRouteLink('admin.ticketingScanner')
  const addTicketTypePath = useRouteLink('admin.ticketingEvents.ticketTypes.create', { id: id || '' })
  const eventsPath = useRouteLink('admin.ticketingEvents.list')

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
    queryKey: ['ticket-types', id],
    queryFn: () => getTicketTypesForEventAdmin(id),
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
    queryFn: async () => {
      const supabaseAny = supabase as any
      const { count, error } = await supabaseAny
        .from('ticket_types')
        .select('id', { head: true, count: 'exact' })
        .eq('ticketed_event_id', id)

      if (error) throw error
      return count ?? 0
    },
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

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new ValidationError(t('common.error.permissionDenied'))

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!userData?.org_id) throw new ValidationError(t('common.error.permissionDenied'))

      const array = new Uint8Array(32)
      window.crypto.getRandomValues(array)
      const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
      const tokenHash = await hashToken(token)

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase.from('ticket_staff_links').insert({
        org_id: userData.org_id,
        ticketed_event_id: id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_by_user_id: user.id,
      })

      if (error) throw error

      const baseUrl = window.location.origin
      return `${baseUrl}/tickets/validate/${token}`
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
    return Number.isNaN(updatedAt.getTime()) ? t('ticketing.detail.values.unavailable') : updatedAt.toLocaleString()
  })()

  const hasOfflineReadOnlyNotice = !isOnline
  const hasDemoReadOnlyNotice = USE_FAKE_DATA
  const hasOnlyInactiveTicketTypes = totalTicketTypeCount > 0 && ticketTypesList.length === 0
  const hasDeletedAllVisibleTicketTypes = hadTicketTypesRef.current && ticketTypesList.length === 0 && totalTicketTypeCount === 0

  const ticketingContent = (
    <div className="oa-space-y-6">
      {(hasOfflineReadOnlyNotice || hasDemoReadOnlyNotice) && (
        <div className="oa-card oa-p-4">
          {hasOfflineReadOnlyNotice && (
            <p className="oa-text-muted">{t('ticketing.detail.notices.offlineReadOnly')}</p>
          )}
          {hasDemoReadOnlyNotice && (
            <p className="oa-text-muted">{t('ticketing.detail.notices.demoModeReadOnly')}</p>
          )}
        </div>
      )}

      <div className="oa-grid oa-grid-cols-1 md:oa-grid-cols-2 oa-gap-6">
        <div className="oa-card">
          <h2 className="oa-card-title">{t('ticketing.detail.sections.eventDetails')}</h2>
          <div className="oa-info-grid">
            <div>
              <span className="oa-info-label">{t('ticketing.detail.labels.date')}</span>
              <span>{eventDateRange}</span>
            </div>
            <div>
              <span className="oa-info-label">{t('ticketing.detail.labels.venue')}</span>
              <span>{venueLabel}</span>
            </div>
            <div>
              <span className="oa-info-label">{t('ticketing.detail.labels.timezone')}</span>
              <span>{event.timezone || t('ticketing.detail.values.unavailable')}</span>
            </div>
            <div>
              <span className="oa-info-label">{t('ticketing.detail.labels.salesWindow')}</span>
              <span>{salesWindow}</span>
            </div>
            <div>
              <span className="oa-info-label">{t('ticketing.detail.labels.teamScope')}</span>
              <span>{event.team_id ? t('ticketing.detail.values.teamScoped') : t('ticketing.detail.values.orgWide')}</span>
            </div>
            <div>
              <span className="oa-info-label">{t('ticketing.detail.labels.lastUpdated')}</span>
              <span>{lastUpdatedAt}</span>
            </div>
          </div>
        </div>

        {event.status === 'published' ? (
          <PublicUrlShare
            orgId={event.org_id}
            path={`tickets/events/${event.id}`}
            title={t('ticketing.detail.share.title')}
            description={t('ticketing.detail.share.description')}
          />
        ) : (
          <div className="oa-card oa-flex oa-flex-col oa-gap-3 oa-justify-center oa-p-8">
            <h2 className="oa-card-title">{t('ticketing.detail.sections.publicLink')}</h2>
            <p className="oa-text-muted">
              {t('ticketing.detail.notices.publishToShareDescription')}
            </p>
          </div>
        )}
      </div>

      <div className="oa-card">
        <div className="flex justify-between items-center gap-2 mb-4">
          <h2 className="oa-card-title">{t('ticketing.detail.sections.ticketTypes')}</h2>
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
          <div className="oa-table-container">
            <table className="oa-table">
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
                    <td>{type.name}</td>
                    <td>
                      <span className={`oa-badge oa-badge-${type.seating_mode === 'reserved_seating' ? 'info' : 'default'}`}>
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
                      <span className={`oa-badge oa-badge-${type.is_active ? 'success' : 'default'}`}>
                        {type.is_active
                          ? t('ticketing.detail.values.status.active')
                          : t('ticketing.detail.values.status.inactive')}
                      </span>
                    </td>
                    <td>
                      {type.seating_mode === 'reserved_seating' && type.seat_map_id ? (
                        <Link
                          to={getLink('admin.ticketingEvents.seatMaps.builder', {
                            eventId: id,
                            seatMapId: type.seat_map_id,
                          })}
                          className="oa-link"
                        >
                          {t('ticketing.reservedSeating.admin.manageSeats')}
                        </Link>
                      ) : (
                        t('ticketing.detail.values.unavailable')
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )

  const handleGenerateStaffLink = () => {
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
