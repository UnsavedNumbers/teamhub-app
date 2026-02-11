import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/platformAdmin'
import { useUserContext } from '../../../hooks/useUserContext'
import { getAttendanceEvents, getAttendancePeople } from '../../../data/services/attendanceService'
import { formatDate } from '../../../utils/dateFormatters'

interface OverviewStats {
  attendanceRate: number | null
  missingReports: number
  atRiskAthletes: number
  recentActivity: Array<{
    id: string
    message: string
    timestamp: string
  }>
}

export default function AttendanceOverview() {
  const { context, isReady } = useUserContext()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<OverviewStats>({
    attendanceRate: null,
    missingReports: 0,
    atRiskAthletes: 0,
    recentActivity: [],
  })
  const requestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchStats = useCallback(async () => {
    if (!isReady) {
      setLoading(false)
      return
    }

    const currentRequestId = ++requestIdRef.current
    setLoading(true)

    try {
      // Get events from last 30 days
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      const [eventsResult, peopleResult] = await Promise.all([
        getAttendanceEvents(context, { startDate, endDate }),
        getAttendancePeople(context, {}),
      ])

      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return
      }

      if (eventsResult.error || peopleResult.error) {
        // Set defaults on error
        setStats({
          attendanceRate: null,
          missingReports: 0,
          atRiskAthletes: 0,
          recentActivity: [],
        })
        setLoading(false)
        return
      }

      const events = eventsResult.data || []
      const people = peopleResult.data || []

      // Calculate overall attendance rate
      let totalEvents = 0
      let totalPresent = 0
      events.forEach(event => {
        totalEvents += event.total_expected
        totalPresent += event.present_count + event.late_count // Count late as present
      })
      const attendanceRate = totalEvents > 0 ? Math.round((totalPresent / totalEvents) * 100) : null

      // Count missing reports (events with status 'missing')
      const missingReports = events.filter(e => e.status === 'missing').length

      // Count at-risk athletes (below 70% attendance)
      const atRiskAthletes = people.filter(p => p.risk_level === 'at_risk').length

      // Generate recent activity from events (last 5 events with attendance)
      const recentActivity = events
        .filter(e => e.status !== 'missing' && e.total_expected > 0)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        .slice(0, 5)
        .map(e => ({
          id: e.event_id,
          message: `${e.team_name}: ${e.present_count}/${e.total_expected} present`,
          timestamp: e.start_time,
        }))

      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setStats({
          attendanceRate,
          missingReports,
          atRiskAthletes,
          recentActivity,
        })
      }
    } catch (err) {
      console.error('[AttendanceOverview] Error fetching stats:', err)
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setStats({
          attendanceRate: null,
          missingReports: 0,
          atRiskAthletes: 0,
          recentActivity: [],
        })
      }
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [context, isReady])

  useEffect(() => {
    if (isReady) {
      fetchStats()
    }
  }, [isReady, fetchStats])

  return (
    <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-2 lg:oa-grid-cols-3 oa-gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Attendance Rate</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="oa-text-2xl sm:oa-text-3xl oa-font-bold">...</div>
          ) : stats.attendanceRate !== null ? (
            <div className="oa-text-2xl sm:oa-text-3xl oa-font-bold">{stats.attendanceRate}%</div>
          ) : (
            <div className="oa-text-2xl sm:oa-text-3xl oa-font-bold">—</div>
          )}
          <div className="oa-text-sm oa-text-neutral-500">Overall average (last 30 days)</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Missing Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="oa-text-2xl sm:oa-text-3xl oa-font-bold">...</div>
          ) : (
            <div className="oa-text-2xl sm:oa-text-3xl oa-font-bold">{stats.missingReports}</div>
          )}
          <div className="oa-text-sm oa-text-neutral-500">Events with no attendance</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">At Risk Athletes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="oa-text-2xl sm:oa-text-3xl oa-font-bold">...</div>
          ) : (
            <div className="oa-text-2xl sm:oa-text-3xl oa-font-bold">{stats.atRiskAthletes}</div>
          )}
          <div className="oa-text-sm oa-text-neutral-500">Below 70% attendance</div>
        </CardContent>
      </Card>

      <div className="oa-col-span-1 sm:oa-col-span-2 lg:oa-col-span-3">
        <Card>
          <CardHeader><CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="oa-text-neutral-500">Loading...</p>
            ) : stats.recentActivity.length === 0 ? (
              <p className="oa-text-neutral-500">No recent activity data available.</p>
            ) : (
              <div className="oa-space-y-3">
                {stats.recentActivity.map(activity => (
                  <div key={activity.id} className="oa-flex oa-items-center oa-justify-between oa-py-2 oa-border-b oa-border-slate-100 last:oa-border-0">
                    <div>
                      <div className="oa-text-sm oa-font-medium">{activity.message}</div>
                      <div className="oa-text-xs oa-text-neutral-500">{formatDate(activity.timestamp, 'datetime')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
