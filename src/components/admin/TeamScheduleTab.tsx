/**
 * Team Schedule Tab
 * 
 * Displays events for a specific team within the Team Detail page.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getEvents } from '../../data/services/eventsService'
import { Button, EmptyState } from '../platformAdmin'
import type { CalendarEvent } from '../../types/calendar'

interface TeamScheduleTabProps {
  teamId: string
  seasonId: string | null
  teamName: string
}

export function TeamScheduleTab({ teamId, seasonId, teamName }: TeamScheduleTabProps) {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const handleViewOrganizationSchedule = useCallback(() => {
    navigate(`/admin/events?teamId=${teamId}`)
  }, [navigate, teamId])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // If no season, show message
  if (!seasonId) {
    return (
      <div className="pa-card">
        <EmptyState
          icon="event"
          title="No active season"
          description="Please select an active season to view the team schedule."
          noCard
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--pa-space-4)' }}>
          <Button variant="secondary" onClick={() => navigate(`/admin/events?teamId=${teamId}`)}>
            View All Organization Events
          </Button>
        </div>
      </div>
    )
  }

  const fetchEvents = useCallback(async () => {
    if (!isReady || !teamId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch events for this team (team-scoped query)
      const { data, error: eventsError } = await getEvents(context, {
        teamId,
        seasonId: seasonId || undefined,
        includeCancelled: false,
      })

      if (eventsError) {
        if (isMountedRef.current) {
          setError(eventsError.message)
          setEvents([])
        }
        return
      }

      if (isMountedRef.current) {
        setEvents(data || [])
        setError(null)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load events')
        setEvents([])
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [context, isReady, teamId, seasonId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleViewAllEvents = useCallback(() => {
    navigate(`/admin/events?teamId=${teamId}`)
  }, [navigate, teamId])

  if (loading) {
    return (
      <div className="pa-card">
        <div className="pa-skeleton" style={{ height: '200px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pa-card">
        <div style={{ padding: 'var(--pa-space-5)' }}>
          <p className="pa-body-m" style={{ color: 'var(--pa-danger)', marginBottom: 'var(--pa-space-4)' }}>
            {error}
          </p>
          <Button variant="secondary" onClick={fetchEvents}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="pa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--pa-space-4)' }}>
          <EmptyState
            icon="event"
            title="No events scheduled"
            description={`No events are currently scheduled for ${teamName}.`}
            noCard
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--pa-space-4)' }}>
          <Button variant="secondary" onClick={handleViewOrganizationSchedule}>
            View organization schedule
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pa-space-4)' }}>
        <h3 className="pa-h3" style={{ margin: 0 }}>
          Upcoming Events ({events.length})
        </h3>
        <Button variant="secondary" size="small" onClick={handleViewAllEvents}>
          View All Organization Events
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-3)' }}>
        {events.slice(0, 10).map((event) => {
          const eventDate = new Date(event.start_time)
          const isPast = eventDate < new Date()

          return (
            <div
              key={event.id}
              className="pa-card"
              style={{
                padding: 'var(--pa-space-4)',
                opacity: isPast ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 className="pa-h4" style={{ margin: '0 0 var(--pa-space-2) 0' }}>
                    {event.title}
                  </h4>
                  <p className="pa-body-s" style={{ color: 'var(--pa-n500)', margin: 0 }}>
                    {eventDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                  {event.event_location?.venue_name && (
                    <p className="pa-body-s" style={{ color: 'var(--pa-n500)', margin: 'var(--pa-space-1) 0 0 0' }}>
                      📍 {event.event_location.venue_name}
                    </p>
                  )}
                  {event.type && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 'var(--pa-space-2)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'var(--pa-n100)',
                        color: 'var(--pa-n700)',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {event.type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
