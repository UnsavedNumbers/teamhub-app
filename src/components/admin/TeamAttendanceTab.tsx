/**
 * Team Attendance Tab
 * 
 * Displays attendance records for a specific team within the Team Detail page.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getAttendanceEvents } from '../../data/services/attendanceService'
import { Button, EmptyState } from '../platformAdmin'
import type { AttendanceEventSummary } from '../../types/attendance'

interface TeamAttendanceTabProps {
  teamId: string
  seasonId: string | null
  teamName: string
}

export function TeamAttendanceTab({ teamId, seasonId, teamName }: TeamAttendanceTabProps) {
  // All hooks must be called unconditionally at the top
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const handleViewAllAttendance = useCallback(() => {
    navigate(`/admin/attendance?teamId=${teamId}`)
  }, [navigate, teamId])

  const fetchAttendance = useCallback(async () => {
    if (!isReady || !teamId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch attendance events for this team (team-scoped query)
      const now = new Date()
      const startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 3) // Last 3 months
      const endDate = new Date(now)
      endDate.setMonth(endDate.getMonth() + 1) // Next month

      const { data, error: attendanceError } = await getAttendanceEvents(context, {
        startDate,
        endDate,
        teamId, // Team-scoped filter
      })

      if (attendanceError) {
        if (isMountedRef.current) {
          setError(attendanceError.message)
          setAttendanceEvents([])
        }
        return
      }

      if (isMountedRef.current) {
        setAttendanceEvents(data || [])
        setError(null)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load attendance')
        setAttendanceEvents([])
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [context, isReady, teamId])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchAttendance()
  }, [fetchAttendance])

  const handleViewOrganizationAttendance = useCallback(() => {
    navigate('/admin/attendance')
  }, [navigate])

  // Early returns after all hooks are called
  // If no season, show message
  if (!seasonId) {
    return (
      <div className="pa-card">
        <EmptyState
          icon="how_to_reg"
          title="No active season"
          description="Please select an active season to view attendance records."
          noCard
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--pa-space-4)' }}>
          <Button variant="secondary" onClick={() => navigate(`/admin/attendance?teamId=${teamId}`)}>
            View All Organization Attendance
          </Button>
        </div>
      </div>
    )
  }

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
          <Button variant="secondary" onClick={fetchAttendance}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (attendanceEvents.length === 0) {
    return (
      <div className="pa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--pa-space-4)' }}>
          <EmptyState
            icon="how_to_reg"
            title="No attendance records"
            description={`No attendance has been recorded for ${teamName} yet.`}
            noCard
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--pa-space-4)' }}>
          <Button variant="secondary" onClick={handleViewAllAttendance}>
            View All Organization Attendance
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Top row with title and org-level link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pa-space-4)' }}>
        <div>
          <h3 className="pa-h3" style={{ margin: 0 }}>
            Attendance
          </h3>
          <p className="pa-body-s dark:text-slate-400" style={{ color: 'var(--pa-n500)', margin: 'var(--pa-space-1) 0 0 0' }}>
            {attendanceEvents.length} event{attendanceEvents.length !== 1 ? 's' : ''} with attendance records
          </p>
        </div>
        <Button variant="secondary" size="small" onClick={handleViewOrganizationAttendance}>
          View organization attendance
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-3)' }}>
        {attendanceEvents.slice(0, 10).map((event) => {
          const eventDate = new Date(event.start_time)
          const totalExpected = event.total_expected || 0
          const presentRate = totalExpected > 0 
            ? ((event.present_count / totalExpected) * 100).toFixed(0)
            : '0'

          return (
            <div
              key={event.event_id}
              className="pa-card"
              style={{
                padding: 'var(--pa-space-4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 className="pa-h4" style={{ margin: '0 0 var(--pa-space-2) 0' }}>
                    {event.event_type}
                  </h4>
                  <p className="pa-body-s" style={{ color: 'var(--pa-n500)', margin: 0 }}>
                    {eventDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  {event.location_name && (
                    <p className="pa-body-s" style={{ color: 'var(--pa-n500)', margin: 'var(--pa-space-1) 0 0 0' }}>
                      📍 {event.location_name}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--pa-n900)' }}>
                    {presentRate}%
                  </div>
                  <p className="pa-body-s" style={{ color: 'var(--pa-n500)', margin: 0 }}>
                    {event.present_count} / {totalExpected} present
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
