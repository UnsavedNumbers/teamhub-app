import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useUserContext } from '@/hooks/useUserContext'
import { useT } from '@/i18n/useI18n'
import { getEventDetails } from '@/data/services/eventsService'
import { supabase } from '@/lib/supabase'
import { showError, showSuccess } from '@/utils/toast'
import { getLink } from '@/utils/routes'
import { getReasonIcon, getReasonMessage, shouldShowUpgradePrompt, useFeatureGate } from '@/lib/featureGate'
import type { ReasonCode } from '@/lib/featureGate/types'
import type { CalendarEvent, EventLocation } from '@/types/calendar'
import { formatEventDate, formatEventTimeRange } from '@/types/calendar'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { ConfirmDialog, EmptyState } from '@/components/admin'
import TicketedEventDetail from '@/pages/admin/TicketedEventDetail'
import '../../styles/orgAdmin.css'

interface CommuteSummary {
  distance: string
  duration: string
  durationInTraffic?: string
}

interface WeatherSummary {
  temperature: number
  feelsLike: number
  condition: string
  description: string
  humidity: number
  windSpeed: number
  precipitation: number
}

function buildVenueAddress(location: EventLocation | null | undefined): string {
  if (!location) return ''

  const parts: string[] = []
  if (location.venue_name) parts.push(location.venue_name)

  const lineParts: string[] = []
  if (location.address_line1) lineParts.push(location.address_line1)
  if (location.address_line2) lineParts.push(location.address_line2)
  if (lineParts.length > 0) parts.push(lineParts.join(' '))

  const cityParts: string[] = []
  if (location.city) cityParts.push(location.city)
  if (location.state) cityParts.push(location.state)
  if (location.postal_code) cityParts.push(location.postal_code)
  if (cityParts.length > 0) parts.push(cityParts.join(', '))

  return parts.join(', ')
}

function googleMapsLink(query: string | null | undefined): string | null {
  if (!query || query.trim() === '') return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`
}

function getDirectionsUrl(origin: string | null | undefined, destination: string | null | undefined): string | null {
  if (!origin || !destination) return null
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin.trim())}&destination=${encodeURIComponent(destination.trim())}&traffic=1`
}

function getWeatherIcon(condition: string): string {
  const c = condition.toLowerCase()
  if (c.includes('clear') || c.includes('sunny')) return 'wb_sunny'
  if (c.includes('cloud') || c.includes('overcast')) return 'cloud'
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'rainy'
  if (c.includes('snow') || c.includes('sleet') || c.includes('ice')) return 'ac_unit'
  if (c.includes('thunder') || c.includes('storm')) return 'thunderstorm'
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return 'foggy'
  if (c.includes('wind')) return 'air'
  return 'thermostat'
}

function getEventTypeIcon(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('game') || t.includes('match')) return 'sports'
  if (t.includes('practice') || t.includes('training')) return 'fitness_center'
  if (t.includes('meeting')) return 'groups'
  if (t.includes('tournament')) return 'emoji_events'
  if (t.includes('travel')) return 'flight_takeoff'
  if (t.includes('tryout')) return 'person_search'
  if (t.includes('camp')) return 'camping'
  if (t.includes('fundraiser') || t.includes('social')) return 'celebration'
  return 'event'
}

function formatScheduleDateTime(date: string, timeZone: string | null | undefined): string {
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return date

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
  }).format(parsedDate)
}

function formatTimezoneDisplay(timeZone: string | null | undefined, referenceDate: string): string {
  if (!timeZone) return ''

  const parsedDate = new Date(referenceDate)
  if (Number.isNaN(parsedDate.getTime())) return timeZone

  try {
    const longParts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'long',
    }).formatToParts(parsedDate)
    const shortParts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(parsedDate)

    const longName = longParts.find(part => part.type === 'timeZoneName')?.value
    const shortName = shortParts.find(part => part.type === 'timeZoneName')?.value

    if (longName && shortName) return `${longName} (${shortName})`
    return longName || shortName || timeZone
  } catch {
    return timeZone
  }
}

function hasRecurringSchedule(recurringPattern: CalendarEvent['recurring_pattern']): boolean {
  if (!recurringPattern || typeof recurringPattern !== 'object') return false

  const pattern = recurringPattern as {
    frequency?: string
    days_of_week?: number[]
    interval?: number
  }

  const frequency = pattern.frequency?.toLowerCase()
  const hasFrequency = Boolean(frequency && frequency !== 'none' && frequency !== 'once')
  const hasDays = Array.isArray(pattern.days_of_week) && pattern.days_of_week.length > 0
  const hasInterval = typeof pattern.interval === 'number' && pattern.interval > 0

  return hasFrequency || hasDays || hasInterval
}

export default function AdminEventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const t = useT()
  const { context, isReady } = useUserContext()
  const { allowed: ticketingAllowed, loading: ticketingGateLoading, reason_code: ticketingReasonCode } = useFeatureGate('ticketing')

  const [event, setEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [confirmTicketingStatusOpen, setConfirmTicketingStatusOpen] = useState(false)
  const [pendingTicketingStatus, setPendingTicketingStatus] = useState<'draft' | 'published' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [commuteStartLocation, setCommuteStartLocation] = useState<string>(() => {
    const saved = localStorage.getItem('commuteStartLocation')
    return saved || ''
  })
  const [isEditingCommute, setIsEditingCommute] = useState(false)
  const [commuteInputValue, setCommuteInputValue] = useState(commuteStartLocation)
  const [commuteSummary, setCommuteSummary] = useState<CommuteSummary | null>(null)
  const [loadingCommute, setLoadingCommute] = useState(false)

  const [weatherData, setWeatherData] = useState<WeatherSummary | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(false)

  const venueAddress = useMemo(() => {
    if (!event?.event_location) return ''
    return buildVenueAddress(event.event_location)
  }, [event?.event_location])

  const fetchEvent = useCallback(async () => {
    if (!isReady || !id) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await getEventDetails(context, id)
      if (fetchError) throw fetchError
      if (!data) {
        setEvent(null)
        return
      }
      setEvent(data)
    } catch (err) {
      console.error('[AdminEventDetail] Failed to fetch event details:', err)
      setError(err instanceof Error ? err.message : t('common.error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [context, id, isReady, t])

  useEffect(() => {
    void fetchEvent()
  }, [fetchEvent])

  useEffect(() => {
    const fetchCommuteSummary = async () => {
      if (!commuteStartLocation || !venueAddress) {
        setCommuteSummary(null)
        return
      }

      setLoadingCommute(true)
      setCommuteSummary(null)

      try {
        const origins = encodeURIComponent(commuteStartLocation)
        const destinations = encodeURIComponent(venueAddress)
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/distance-matrix?origins=${origins}&destinations=${destinations}`

        const { data } = await supabase.auth.getSession()
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        })

        if (!response.ok) return

        const result = await response.json()
        if (result?.status === 'OK' && result.rows?.[0]?.elements?.[0]?.status === 'OK') {
          const element = result.rows[0].elements[0]
          setCommuteSummary({
            distance: element.distance?.text || '',
            duration: element.duration?.text || '',
            durationInTraffic: element.duration_in_traffic?.text,
          })
        }
      } catch (err) {
        console.error('[AdminEventDetail] Error fetching commute summary:', err)
      } finally {
        setLoadingCommute(false)
      }
    }

    void fetchCommuteSummary()
  }, [commuteStartLocation, venueAddress])

  useEffect(() => {
    const fetchWeather = async () => {
      if (!venueAddress || !event?.start_time) {
        setWeatherData(null)
        return
      }

      setLoadingWeather(true)
      setWeatherData(null)

      try {
        const location = encodeURIComponent(venueAddress)
        const date = encodeURIComponent(event.start_time)
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather?location=${location}&date=${date}`

        const { data } = await supabase.auth.getSession()
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        })

        if (!response.ok) return

        const result = await response.json()
        if (result.temperature !== undefined) {
          setWeatherData({
            temperature: result.temperature,
            feelsLike: result.feelsLike,
            condition: result.condition,
            description: result.description,
            humidity: result.humidity,
            windSpeed: result.windSpeed,
            precipitation: result.precipitation,
          })
        }
      } catch (err) {
        console.error('[AdminEventDetail] Error fetching weather:', err)
      } finally {
        setLoadingWeather(false)
      }
    }

    void fetchWeather()
  }, [venueAddress, event?.start_time])

  const handleSaveCommuteLocation = () => {
    const trimmed = commuteInputValue.trim()
    setCommuteStartLocation(trimmed)
    if (trimmed) {
      localStorage.setItem('commuteStartLocation', trimmed)
    } else {
      localStorage.removeItem('commuteStartLocation')
    }
    setIsEditingCommute(false)
  }

  const handleDuplicate = async () => {
    if (!event) return

    try {
      setActionLoading(true)

      const { data: fullEvent, error: fetchError } = await supabase
        .from('events')
        .select(`
          *,
          event_location:event_locations(*)
        `)
        .eq('id', event.id)
        .single()

      if (fetchError) throw fetchError
      if (!fullEvent) throw new Error(t('admin.events.detailPage.errors.notFound'))

      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert({
          org_id: fullEvent.org_id,
          title: `${fullEvent.title} (${t('admin.events.detailPage.actions.copySuffix')})`,
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
          visibility: fullEvent.visibility,
          created_by_user_id: context.userId,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      if (fullEvent.event_location) {
        await supabase.from('event_locations').insert({
          event_id: newEvent.id,
          venue_name: fullEvent.event_location.venue_name,
          address_line1: fullEvent.event_location.address_line1,
          address_line2: fullEvent.event_location.address_line2,
          city: fullEvent.event_location.city,
          state: fullEvent.event_location.state,
          postal_code: fullEvent.event_location.postal_code,
          is_tbd: fullEvent.event_location.is_tbd,
          is_virtual: fullEvent.event_location.is_virtual,
          virtual_link: fullEvent.event_location.virtual_link,
          latitude: fullEvent.event_location.latitude,
          longitude: fullEvent.event_location.longitude,
          place_id: fullEvent.event_location.place_id,
        })
      }

      showSuccess(t('admin.events.detailPage.toast.duplicated'))
      navigate(getLink('admin.events.edit', { id: newEvent.id }))
    } catch (err) {
      showError(err instanceof Error ? err.message : t('admin.events.detailPage.errors.duplicate'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelEvent = async () => {
    if (!event) return

    try {
      setActionLoading(true)
      const { error: updateError } = await supabase
        .from('events')
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by_user_id: context.userId || null,
        })
        .eq('id', event.id)

      if (updateError) throw updateError
      showSuccess(t('admin.events.detailPage.toast.cancelled'))
      setConfirmCancelOpen(false)
      await fetchEvent()
    } catch (err) {
      showError(err instanceof Error ? err.message : t('admin.events.detailPage.errors.cancel'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!event) return

    try {
      setActionLoading(true)
      const { error: deleteError } = await supabase.from('events').delete().eq('id', event.id)
      if (deleteError) throw deleteError

      showSuccess(t('admin.events.detailPage.toast.deleted'))
      navigate(getLink('admin.events.list'))
    } catch (err) {
      showError(err instanceof Error ? err.message : t('admin.events.detailPage.errors.delete'))
    } finally {
      setActionLoading(false)
      setConfirmDeleteOpen(false)
    }
  }

  const handleUpdateTicketingStatus = async (nextStatus: 'draft' | 'published') => {
    if (!event?.ticketed_event?.id) return

    try {
      setActionLoading(true)
      const { data: updatedTicketedEvent, error: updateError } = await supabase
        .from('ticketed_events')
        .update({ status: nextStatus })
        .eq('id', event.ticketed_event.id)
        .select('id, status')
        .maybeSingle()

      if (updateError) throw updateError
      if (!updatedTicketedEvent) {
        throw new Error('Unable to update ticketing status. Please refresh and try again.')
      }

      setEvent((prev) => {
        if (!prev?.ticketed_event) return prev
        return {
          ...prev,
          ticketed_event: {
            ...prev.ticketed_event,
            status: nextStatus,
          },
        }
      })

      showSuccess(nextStatus === 'published' ? 'Ticketing published' : 'Ticketing switched to draft')
      await fetchEvent()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update ticketing status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRequestTicketingStatusChange = (nextStatus: 'draft' | 'published') => {
    setPendingTicketingStatus(nextStatus)
    setConfirmTicketingStatusOpen(true)
  }

  const handleConfirmTicketingStatusChange = async () => {
    if (!pendingTicketingStatus) return
    setConfirmTicketingStatusOpen(false)
    await handleUpdateTicketingStatus(pendingTicketingStatus)
    setPendingTicketingStatus(null)
  }

  const isPast = event ? new Date(event.end_time || event.start_time) < new Date() : false

  // Relative time helper
  const getRelativeTimeLabel = (dateStr: string): string => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return t('admin.events.detailPage.relativeTime.today')
    if (diffDays === 1) return t('admin.events.detailPage.relativeTime.tomorrow')
    if (diffDays === -1) return t('admin.events.detailPage.relativeTime.yesterday')
    if (diffDays > 0) return t('admin.events.detailPage.relativeTime.inDays', { count: diffDays })
    return t('admin.events.detailPage.relativeTime.daysAgo', { count: Math.abs(diffDays) })
  }

  /* ------------------------------------------------------------------ */
  /*  Loading skeleton                                                   */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="oa-page-container">
        {/* Header skeleton */}
        <div style={{ marginBottom: 24 }}>
          <div className="oa-skeleton" style={{ height: 14, width: 200, marginBottom: 16 }} />
          <div className="oa-skeleton" style={{ height: 48, width: '55%', marginBottom: 8 }} />
          <div className="oa-skeleton" style={{ height: 18, width: 160 }} />
        </div>

        {/* Hero card skeleton */}
        <div className="oa-card" style={{ padding: 24, marginBottom: 24 }}>
          <div className="flex gap-2" style={{ marginBottom: 20 }}>
            <div className="oa-skeleton" style={{ height: 26, width: 80, borderRadius: 14 }} />
            <div className="oa-skeleton" style={{ height: 26, width: 56, borderRadius: 14 }} />
            <div className="oa-skeleton" style={{ height: 26, width: 64, borderRadius: 14 }} />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex gap-3">
                <div className="oa-skeleton" style={{ height: 20, width: 20, borderRadius: 4, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="oa-skeleton" style={{ height: 10, width: 72, marginBottom: 6 }} />
                  <div className="oa-skeleton" style={{ height: 16, width: '90%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2-column grid skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            {[140, 100, 160].map((h, i) => (
              <div key={i} className="oa-card" style={{ padding: 24 }}>
                <div className="oa-skeleton" style={{ height: 18, width: 120, marginBottom: 16 }} />
                <div className="oa-skeleton" style={{ height: h }} />
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {[110, 90, 80, 80].map((h, i) => (
              <div key={i} className="oa-card" style={{ padding: 24 }}>
                <div className="oa-skeleton" style={{ height: 18, width: 100, marginBottom: 16 }} />
                <div className="oa-skeleton" style={{ height: h }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Empty / error state                                                */
  /* ------------------------------------------------------------------ */
  if (!id || error || !event) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="event_busy"
          title={t('admin.events.detailPage.empty.title')}
          description={error || t('admin.events.detailPage.empty.description')}
          noCard
        >
          <button className="oa-btn oa-btn--secondary" onClick={() => navigate(getLink('admin.events.list'))}>
            {t('admin.events.detailPage.actions.backToEvents')}
          </button>
        </EmptyState>
      </div>
    )
  }

  /* ------------------------------------------------------------------ */
  /*  Derived values                                                     */
  /* ------------------------------------------------------------------ */
  const eventMeta = event as CalendarEvent & {
    visibility?: 'public' | 'private'
    rsvp_enabled?: boolean
    rsvp_type?: string | null
  }
  const visibilityValue = eventMeta.visibility || t('common.public')
  const rsvpEnabledValue = Boolean(eventMeta.rsvp_enabled ?? event.rsvp_config?.enabled)
  const rsvpTypeValue = eventMeta.rsvp_type || event.rsvp_config?.type || null
  const routeToAttendance = rsvpEnabledValue
  const directionsUrl = getDirectionsUrl(commuteStartLocation, venueAddress)
  const relativeTime = getRelativeTimeLabel(event.start_time)
  const timezoneDisplay = formatTimezoneDisplay(event.timezone, event.start_time)
  const isRecurring = hasRecurringSchedule(event.recurring_pattern)
  const currentView = searchParams.get('view') === 'ticketing' ? 'ticketing' : 'details'
  const ticketingReason = (ticketingReasonCode || 'error') as ReasonCode

  const setView = (view: 'details' | 'ticketing') => {
    const next = new URLSearchParams(searchParams)
    next.set('view', view)
    setSearchParams(next, { replace: true })
  }

  /* ------------------------------------------------------------------ */
  /*  Main render                                                        */
  /* ------------------------------------------------------------------ */
  return (
    <div className="oa-page-container">
      {/* ── Header with breadcrumbs ────────────────────────────────── */}
      <AdminPageHeader
        title={event.title}
        subtitle={t('admin.events.detailPage.subtitle', { type: event.type })}
        breadcrumbs={[
          { label: t('admin.events.title'), path: getLink('admin.events.list') },
          { label: event.title },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {!isPast && (
              <button
                className="oa-btn oa-btn--primary"
                onClick={() => navigate(getLink('admin.events.edit', { id: event.id }))}
                disabled={actionLoading}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                {t('admin.events.edit')}
              </button>
            )}
            {!isPast && event.ticketed_event?.id && event.ticketed_event.status === 'published' && (
              <button
                className="oa-btn oa-btn--secondary"
                onClick={() => handleRequestTicketingStatusChange('draft')}
                disabled={actionLoading}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit_note</span>
                Switch to Draft
              </button>
            )}
            {!isPast && event.ticketed_event?.id && event.ticketed_event.status === 'draft' && (
              <button
                type="button"
                className="oa-btn oa-btn--primary"
                onClick={() => { void handleUpdateTicketingStatus('published') }}
                disabled={actionLoading}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>publish</span>
                Publish
              </button>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        <div className="oa-segmented" role="tablist" aria-label={t('admin.events.detailPage.tabs.ariaLabel')}>
          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'details'}
            className={`oa-segmented__button ${currentView === 'details' ? 'is-active' : ''}`}
            onClick={() => setView('details')}
          >
            {t('admin.events.detailPage.tabs.details')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentView === 'ticketing'}
            className={`oa-segmented__button ${currentView === 'ticketing' ? 'is-active' : ''}`}
            onClick={() => setView('ticketing')}
          >
            {t('admin.events.detailPage.tabs.ticketing')}
          </button>
        </div>

        {currentView === 'ticketing' ? (
          // If event has ticketing enabled, show it regardless of feature gate
          event.ticketed_event?.id ? (
            <TicketedEventDetail ticketedEventId={event.ticketed_event.id} embedded />
          ) : ticketingGateLoading ? (
            <div className="oa-card" style={{ padding: 'var(--pa-space-6)' }}>
              <div className="oa-skeleton" style={{ height: 120 }} />
            </div>
          ) : !ticketingAllowed ? (
            <section className="oa-card" style={{ padding: 'var(--pa-space-6)' }}>
              <div className="text-center" style={{ maxWidth: 560, margin: '0 auto' }}>
                <span className="material-symbols-rounded text-6xl text-amber-500 mb-4 block">
                  {getReasonIcon(ticketingReason)}
                </span>
                <h2 className="text-xl font-semibold" style={{ marginBottom: 'var(--pa-space-2)' }}>
                  {t('admin.events.detailPage.featureGate.title')}
                </h2>
                <p style={{ color: 'var(--pa-text-muted)', marginBottom: 'var(--pa-space-5)' }}>
                  {getReasonMessage(ticketingReason)}
                </p>
                {shouldShowUpgradePrompt(ticketingReason) && (
                  <a href={getLink('admin.organization.billing')} className="oa-btn oa-btn--primary">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>workspace_premium</span>
                    {t('admin.events.detailPage.actions.upgradePlan')}
                  </a>
                )}
              </div>
            </section>
          ) : (
            <section className="oa-card" style={{ padding: 'var(--pa-space-6)' }}>
              <div className="oa-empty-hint" style={{ marginBottom: 'var(--pa-space-4)' }}>
                <span className="material-symbols-outlined">confirmation_number</span>
                <p>{t('admin.events.detailPage.noTicketing')}</p>
              </div>
              <button
                className="oa-btn oa-btn--secondary oa-btn--compact"
                onClick={() => navigate(getLink('admin.events.edit', { id: event.id }))}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                {t('admin.events.detailPage.actions.addTicketing')}
              </button>
            </section>
          )
        ) : (
          <>
        {/* ── Cancelled banner ────────────────────────────────────── */}
        {event.is_cancelled && (
          <div className="oa-cancelled-banner">
            <span className="material-symbols-outlined">cancel</span>
            {t('admin.events.detailPage.cancelledBanner')}
          </div>
        )}

        {/* ── Hero summary card ───────────────────────────────────── */}
        <section className="oa-card" style={{ padding: 'var(--pa-space-6)' }}>
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 'var(--pa-space-5)' }}>
            <span className="oa-badge oa-badge--neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{getEventTypeIcon(event.type)}</span>
              {event.type}
            </span>

            {event.is_cancelled ? (
              <span className="oa-badge oa-badge--danger">{t('admin.events.detailPage.status.cancelled')}</span>
            ) : isPast ? (
              <span className="oa-badge oa-badge--neutral">{t('admin.events.detailPage.status.past')}</span>
            ) : (
              <span className="oa-badge oa-badge--success">{t('admin.events.detailPage.status.active')}</span>
            )}

            <span className="oa-badge oa-badge--info">{visibilityValue}</span>

            {event.weather_dependent && (
              <span className="oa-badge oa-badge--warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>cloud</span>
                {t('admin.events.detailPage.weatherDependent')}
              </span>
            )}
          </div>

          {/* Quick-glance stats */}
          <div className="oa-stat-grid">
            <div className="oa-stat-item">
              <span className="material-symbols-outlined">calendar_month</span>
              <div>
                <div className="oa-stat-item__label">{t('common.date')}</div>
                <div className="oa-stat-item__value">{formatEventDate(event.start_time, event.timezone)}</div>
                <div className="oa-stat-item__hint">{relativeTime}</div>
              </div>
            </div>
            <div className="oa-stat-item">
              <span className="material-symbols-outlined">schedule</span>
              <div>
                <div className="oa-stat-item__label">{t('admin.events.detailPage.timeWindow')}</div>
                <div className="oa-stat-item__value">{formatEventTimeRange(event.start_time, event.end_time, event.timezone)}</div>
              </div>
            </div>
            <div className="oa-stat-item">
              <span className="material-symbols-outlined">groups</span>
              <div>
                <div className="oa-stat-item__label">{t('admin.events.detailPage.teamScope')}</div>
                <div className="oa-stat-item__value">{event.team?.name || t('admin.events.detailPage.orgWide')}</div>
              </div>
            </div>
            <div className="oa-stat-item">
              <span className="material-symbols-outlined">sports_score</span>
              <div>
                <div className="oa-stat-item__label">{t('admin.events.fields.season')}</div>
                <div className="oa-stat-item__value">{event.season?.name || t('admin.events.detailPage.notSet')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2/3 + 1/3 content grid ─────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Left column — primary content ──────────────────────── */}
          <div className="xl:col-span-2 space-y-6">

            {/* Schedule ─────────────────────────────────────────────── */}
            <section className="oa-card" style={{ padding: 'var(--pa-space-6)' }}>
              <h2 className="oa-card-title" style={{ marginBottom: 'var(--pa-space-5)' }}>
                <span className="material-symbols-outlined">schedule</span>
                {t('admin.events.detailPage.sections.schedule')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="oa-stat-item">
                  <span className="material-symbols-outlined">play_circle</span>
                  <div>
                    <div className="oa-stat-item__label">{t('admin.events.detailPage.startsAt')}</div>
                    <div className="oa-stat-item__value">{formatScheduleDateTime(event.start_time, event.timezone)}</div>
                  </div>
                </div>
                <div className="oa-stat-item">
                  <span className="material-symbols-outlined">stop_circle</span>
                  <div>
                    <div className="oa-stat-item__label">{t('admin.events.detailPage.endsAt')}</div>
                    <div className="oa-stat-item__value">{formatScheduleDateTime(event.end_time, event.timezone)}</div>
                  </div>
                </div>
                <div className="oa-stat-item">
                  <span className="material-symbols-outlined">login</span>
                  <div>
                    <div className="oa-stat-item__label">{t('admin.events.detailPage.arrivalTime')}</div>
                    <div className="oa-stat-item__value">
                      {event.arrival_time
                        ? formatScheduleDateTime(event.arrival_time, event.timezone)
                        : t('admin.events.detailPage.notSet')}
                    </div>
                  </div>
                </div>
                <div className="oa-stat-item">
                  <span className="material-symbols-outlined">public</span>
                  <div>
                    <div className="oa-stat-item__label">{t('admin.events.detailPage.timezone')}</div>
                    <div className="oa-stat-item__value">{timezoneDisplay || event.timezone || t('admin.events.detailPage.notSet')}</div>
                  </div>
                </div>
              </div>

              {isRecurring && (
                <>
                  <hr className="oa-detail-divider" />
                  <div className="oa-stat-item">
                    <span className="material-symbols-outlined">repeat</span>
                    <div>
                      <div className="oa-stat-item__label">{t('admin.events.recurring.title')}</div>
                      <div className="oa-stat-item__value">
                        {(() => {
                          const recurring = event.recurring_pattern as {
                            frequency?: string
                            days_of_week?: number[]
                          }
                          const days = Array.isArray(recurring.days_of_week)
                            ? recurring.days_of_week.join(', ')
                            : t('admin.events.detailPage.notSet')
                          return t('admin.events.detailPage.recurringSummary', {
                            frequency: recurring.frequency || t('admin.events.detailPage.notSet'),
                            days,
                          })
                        })()}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Location ─────────────────────────────────────────────── */}
            <section className="oa-card" style={{ padding: 'var(--pa-space-6)' }}>
              <h2 className="oa-card-title" style={{ marginBottom: 'var(--pa-space-5)' }}>
                <span className="material-symbols-outlined">location_on</span>
                {t('admin.events.location.title')}
              </h2>

              {event.event_location ? (
                <div className="space-y-4">
                  <div className="oa-stat-item">
                    <span className="material-symbols-outlined">stadium</span>
                    <div>
                      <div className="oa-stat-item__label">{t('admin.events.location.venueName')}</div>
                      <div className="oa-stat-item__value">{event.event_location.venue_name || t('admin.events.detailPage.notSet')}</div>
                    </div>
                  </div>
                  <div className="oa-stat-item">
                    <span className="material-symbols-outlined">pin_drop</span>
                    <div>
                      <div className="oa-stat-item__label">{t('admin.events.location.address')}</div>
                      <div className="oa-stat-item__value">{venueAddress || t('admin.events.detailPage.notSet')}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {googleMapsLink(venueAddress) && (
                      <a href={googleMapsLink(venueAddress)!} target="_blank" rel="noreferrer" className="oa-btn oa-btn--secondary oa-btn--compact">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>map</span>
                        {t('admin.events.detailPage.openInMaps')}
                      </a>
                    )}
                    {event.external_link && (
                      <a href={event.external_link} target="_blank" rel="noreferrer" className="oa-btn oa-btn--secondary oa-btn--compact">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                        {t('admin.events.detailPage.externalLink')}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="oa-empty-hint">
                  <span className="material-symbols-outlined">location_off</span>
                  <p>{t('admin.events.detailPage.locationUnavailable')}</p>
                </div>
              )}
            </section>

            {/* Preparation ──────────────────────────────────────────── */}
            <section className="oa-card" style={{ padding: 'var(--pa-space-6)' }}>
              <h2 className="oa-card-title" style={{ marginBottom: 'var(--pa-space-5)' }}>
                <span className="material-symbols-outlined">checklist</span>
                {t('admin.events.detailPage.sections.prep')}
              </h2>

              <div>
                <div className="oa-prep-item">
                  <span className="material-symbols-outlined">checkroom</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="oa-stat-item__label">{t('admin.events.detailPage.uniform')}</div>
                    <p className="whitespace-pre-wrap" style={{ margin: '4px 0 0' }}>
                      {event.uniform_notes || <span style={{ color: 'var(--pa-text-muted)' }}>{t('admin.events.detailPage.notSet')}</span>}
                    </p>
                  </div>
                </div>
                <div className="oa-prep-item">
                  <span className="material-symbols-outlined">fitness_center</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="oa-stat-item__label">{t('admin.events.detailPage.equipment')}</div>
                    <p className="whitespace-pre-wrap" style={{ margin: '4px 0 0' }}>
                      {event.equipment_notes || <span style={{ color: 'var(--pa-text-muted)' }}>{t('admin.events.detailPage.notSet')}</span>}
                    </p>
                  </div>
                </div>
                <div className="oa-prep-item">
                  <span className="material-symbols-outlined">description</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="oa-stat-item__label">{t('common.notes')}</div>
                    <p className="whitespace-pre-wrap" style={{ margin: '4px 0 0' }}>
                      {event.notes || <span style={{ color: 'var(--pa-text-muted)' }}>{t('admin.events.detailPage.notSet')}</span>}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ── Right column — sidebar ─────────────────────────────── */}
          <div className="space-y-6">

            {/* Weather ──────────────────────────────────────────────── */}
            <section className="oa-card" style={{ padding: 'var(--pa-space-6)' }}>
              <h2 className="oa-card-title" style={{ marginBottom: 'var(--pa-space-5)' }}>
                <span className="material-symbols-outlined">wb_sunny</span>
                {t('admin.events.detailPage.sections.weather')}
              </h2>

              {loadingWeather ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="oa-skeleton" style={{ height: 44, width: 44, borderRadius: 8 }} />
                    <div>
                      <div className="oa-skeleton" style={{ height: 32, width: 72, marginBottom: 4 }} />
                      <div className="oa-skeleton" style={{ height: 14, width: 100 }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3" style={{ paddingTop: 16 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div className="oa-skeleton" style={{ height: 16, width: '60%', margin: '0 auto 4px' }} />
                        <div className="oa-skeleton" style={{ height: 10, width: '50%', margin: '0 auto' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : weatherData ? (
                <div>
                  <div className="oa-weather-hero">
                    <span className="material-symbols-outlined oa-weather-hero__icon">
                      {getWeatherIcon(weatherData.condition)}
                    </span>
                    <div>
                      <div className="oa-weather-hero__temp">{weatherData.temperature}°</div>
                      <div className="oa-weather-hero__condition">{weatherData.description}</div>
                    </div>
                  </div>

                  <div className="oa-weather-stats">
                    <div className="oa-weather-stat">
                      <div className="oa-weather-stat__value">{weatherData.feelsLike}°</div>
                      <div className="oa-weather-stat__label">{t('admin.events.detailPage.weatherFeelsLikeShort')}</div>
                    </div>
                    <div className="oa-weather-stat">
                      <div className="oa-weather-stat__value">{weatherData.humidity}%</div>
                      <div className="oa-weather-stat__label">{t('admin.events.detailPage.weatherHumidityShort')}</div>
                    </div>
                    <div className="oa-weather-stat">
                      <div className="oa-weather-stat__value">{weatherData.windSpeed}<span style={{ fontSize: '0.75rem' }}> mph</span></div>
                      <div className="oa-weather-stat__label">{t('admin.events.detailPage.weatherWindShort')}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="oa-empty-hint">
                  <span className="material-symbols-outlined">cloud_off</span>
                  <p>{t('admin.events.detailPage.noWeatherData')}</p>
                </div>
              )}
            </section>

            {/* Commute ──────────────────────────────────────────────── */}
            <section className="oa-card" style={{ padding: 'var(--pa-space-6)' }}>
              <h2 className="oa-card-title" style={{ marginBottom: 'var(--pa-space-5)' }}>
                <span className="material-symbols-outlined">directions_car</span>
                {t('admin.events.detailPage.sections.commute')}
              </h2>

              {!isEditingCommute ? (
                <div className="space-y-4">
                  {commuteStartLocation && (
                    <div>
                      <div className="oa-stat-item__label">{t('admin.events.detailPage.startingPoint')}</div>
                      <div className="text-sm" style={{ marginTop: 2 }}>{commuteStartLocation}</div>
                    </div>
                  )}

                  {loadingCommute && (
                    <div className="oa-commute-metrics">
                      {[1, 2].map(i => (
                        <div key={i} className="oa-commute-metric">
                          <div className="oa-skeleton" style={{ height: 20, width: '60%', margin: '0 auto 4px' }} />
                          <div className="oa-skeleton" style={{ height: 10, width: '40%', margin: '0 auto' }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {commuteSummary && !loadingCommute && (
                    <div className="oa-commute-metrics">
                      <div className="oa-commute-metric">
                        <div className="oa-commute-metric__value">{commuteSummary.distance}</div>
                        <div className="oa-commute-metric__label">{t('admin.events.detailPage.commuteDistance')}</div>
                      </div>
                      <div className="oa-commute-metric">
                        <div className="oa-commute-metric__value">{commuteSummary.durationInTraffic || commuteSummary.duration}</div>
                        <div className="oa-commute-metric__label">{t('admin.events.detailPage.commuteDuration')}</div>
                      </div>
                    </div>
                  )}

                  {!commuteStartLocation && !loadingCommute && (
                    <div className="oa-empty-hint">
                      <span className="material-symbols-outlined">add_location_alt</span>
                      <p>{t('admin.events.detailPage.noCommuteSet')}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="oa-btn oa-btn--secondary oa-btn--compact"
                      onClick={() => { setIsEditingCommute(true); setCommuteInputValue(commuteStartLocation) }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {commuteStartLocation ? 'edit' : 'add_location_alt'}
                      </span>
                      {commuteStartLocation ? t('common.edit') : t('admin.events.detailPage.setStartingPoint')}
                    </button>

                    {directionsUrl && (
                      <a href={directionsUrl} target="_blank" rel="noreferrer" className="oa-btn oa-btn--primary oa-btn--compact">
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>navigation</span>
                        {t('admin.events.detailPage.getDirections')}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!commuteInputValue.trim()) return
                    handleSaveCommuteLocation()
                  }}
                >
                  <label className="oa-stat-item__label" htmlFor="commute-origin-input">
                    {t('admin.events.detailPage.enterStartingPoint')}
                  </label>
                  <input
                    id="commute-origin-input"
                    className="oa-input"
                    type="text"
                    value={commuteInputValue}
                    onChange={(e) => setCommuteInputValue(e.target.value)}
                    placeholder={t('admin.events.detailPage.commutePlaceholder')}
                  />
                  <div className="flex gap-2">
                    <button className="oa-btn oa-btn--primary oa-btn--compact" type="submit" disabled={!commuteInputValue.trim()}>
                      {t('common.save')}
                    </button>
                    <button
                      className="oa-btn oa-btn--secondary oa-btn--compact"
                      type="button"
                      onClick={() => { setIsEditingCommute(false); setCommuteInputValue(commuteStartLocation) }}
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Participation ────────────────────────────────────────── */}
            <section className="oa-card" style={{ padding: 'var(--pa-space-6)' }}>
              <h2 className="oa-card-title" style={{ marginBottom: 'var(--pa-space-5)' }}>
                <span className="material-symbols-outlined">how_to_reg</span>
                {t('admin.events.detailPage.sections.participation')}
              </h2>

              <div className="space-y-3">
                <div className="oa-stat-item">
                  <span className="material-symbols-outlined">visibility</span>
                  <div>
                    <div className="oa-stat-item__label">{t('admin.events.detailPage.visibilityLabel')}</div>
                    <div className="oa-stat-item__value">{visibilityValue}</div>
                  </div>
                </div>
                <div className="oa-stat-item">
                  <span className="material-symbols-outlined">event_available</span>
                  <div>
                    <div className="oa-stat-item__label">{t('admin.events.detailPage.rsvpStatusLabel')}</div>
                    <div className="oa-stat-item__value">
                      {rsvpEnabledValue ? t('admin.events.detailPage.yes') : t('admin.events.detailPage.no')}
                      {rsvpTypeValue && ` · ${rsvpTypeValue}`}
                    </div>
                  </div>
                </div>
              </div>

              {routeToAttendance && (
                <div style={{ marginTop: 'var(--pa-space-4)' }}>
                  <button
                    className="oa-btn oa-btn--secondary oa-btn--compact"
                    onClick={() => navigate(getLink('admin.events.attendance', { id: event.id }))}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>how_to_reg</span>
                    {t('admin.events.detailPage.actions.manageAttendance')}
                  </button>
                </div>
              )}
            </section>

          </div>
        </div>

        {/* ── Danger zone ─────────────────────────────────────────── */}
        {!isPast && (
          <section className="oa-card oa-danger-zone" style={{ padding: 'var(--pa-space-6)' }}>
            <div style={{ marginBottom: 'var(--pa-space-4)' }}>
              <h2 className="oa-card-title" style={{ marginBottom: 'var(--pa-space-2)' }}>
                <span className="material-symbols-outlined">warning</span>
                {t('admin.events.detailPage.sections.dangerZone')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--pa-text-muted)', margin: 0 }}>
                {t('admin.events.detailPage.dangerZoneDesc')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button className="oa-btn oa-btn--secondary oa-btn--compact" onClick={() => void handleDuplicate()} disabled={actionLoading}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>content_copy</span>
                {t('admin.events.detailPage.actions.duplicate')}
              </button>
              <button className="oa-btn oa-btn--secondary oa-btn--compact" onClick={() => setConfirmCancelOpen(true)} disabled={actionLoading || event.is_cancelled}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
                {t('admin.events.cancel')}
              </button>
              <button className="oa-btn oa-btn--danger oa-btn--compact" onClick={() => setConfirmDeleteOpen(true)} disabled={actionLoading}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                {t('admin.events.delete')}
              </button>
            </div>
          </section>
        )}
          </>
        )}
      </div>

      {/* ── Confirm dialogs ───────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmCancelOpen}
        title={t('admin.events.detailPage.dialogs.cancelTitle')}
        description={t('admin.events.detailPage.dialogs.cancelDescription', { title: event.title })}
        confirmLabel={t('admin.events.cancel')}
        variant="primary"
        onConfirm={() => { void handleCancelEvent() }}
        onCancel={() => setConfirmCancelOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('admin.events.detailPage.dialogs.deleteTitle')}
        description={t('admin.events.detailPage.dialogs.deleteDescription', { title: event.title })}
        confirmLabel={t('admin.events.delete')}
        variant="danger"
        onConfirm={() => { void handleDeleteEvent() }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <ConfirmDialog
        open={confirmTicketingStatusOpen}
        title={pendingTicketingStatus === 'published' ? 'Publish Ticketing' : 'Switch Ticketing to Draft'}
        description={
          pendingTicketingStatus === 'published'
            ? 'This will make ticketing live for this event. Continue?'
            : 'This will move ticketing back to draft and hide public ticketing access. Continue?'
        }
        confirmLabel={pendingTicketingStatus === 'published' ? 'Publish' : 'Switch to Draft'}
        variant="primary"
        onConfirm={() => { void handleConfirmTicketingStatusChange() }}
        onCancel={() => {
          setConfirmTicketingStatusOpen(false)
          setPendingTicketingStatus(null)
        }}
      />
    </div>
  )
}
