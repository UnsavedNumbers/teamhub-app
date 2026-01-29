import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../../components/platformAdmin'
import { OrgAdminButton } from '../../../components/admin/OrgAdminButton'
import { useUserContext } from '../../../hooks/useUserContext'
import { getAttendanceEvents, getAttendancePeople } from '../../../data/services/attendanceService'
import {
  generateOrganizationSummaryCSV,
  generateMissingAttendanceCSV,
  generateAtRiskPlayersCSV,
  generateAtRiskPlayersPDF,
} from '../../../utils/attendanceReports'
import { showError } from '../../../utils/toast'

export default function AttendanceReports() {
  const { context, isReady } = useUserContext()
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<Array<any>>([])
  const [people, setPeople] = useState<Array<any>>([])
  const requestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!isReady) return

    const currentRequestId = ++requestIdRef.current
    setLoading(true)

    try {
      // Get events from last 90 days for comprehensive report
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 90)

      const [eventsResult, peopleResult] = await Promise.all([
        getAttendanceEvents(context, { startDate, endDate }),
        getAttendancePeople(context, {}),
      ])

      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return
      }

      if (eventsResult.error) {
        showError('Failed to load events data')
        return
      }

      if (peopleResult.error) {
        showError('Failed to load people data')
        return
      }

      setEvents(eventsResult.data || [])
      setPeople(peopleResult.data || [])
    } catch (err) {
      console.error('[AttendanceReports] Error loading data:', err)
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        showError('Failed to load report data')
      }
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [context, isReady])

  useEffect(() => {
    if (isReady) {
      loadData()
    }
  }, [isReady, loadData])

  const handleOrganizationSummary = () => {
    if (events.length === 0) {
      showError('No event data available. Please wait for data to load.')
      return
    }
    generateOrganizationSummaryCSV(events)
  }

  const handleMissingAttendance = () => {
    if (events.length === 0) {
      showError('No event data available. Please wait for data to load.')
      return
    }
    generateMissingAttendanceCSV(events)
  }

  const handleAtRiskCSV = () => {
    if (people.length === 0) {
      showError('No people data available. Please wait for data to load.')
      return
    }
    generateAtRiskPlayersCSV(people)
  }

  const handleAtRiskPDF = async () => {
    if (people.length === 0) {
      showError('No people data available. Please wait for data to load.')
      return
    }
    await generateAtRiskPlayersPDF(people)
  }

  return (
    <div className="pa-grid pa-grid-cols-1 md:pa-grid-cols-2 pa-gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="pa-mb-4 pa-text-sm pa-text-neutral-500">
            Generate a full breakdown of attendance by team and season (last 90 days).
          </p>
          <OrgAdminButton
            variant="primary"
            onClick={handleOrganizationSummary}
            disabled={loading || events.length === 0}
          >
            {loading ? 'Loading...' : 'Download CSV'}
          </OrgAdminButton>
          {events.length > 0 && (
            <p className="pa-mt-2 pa-text-xs pa-text-neutral-400">
              {events.length} events available
            </p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Missing Attendance Report</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="pa-mb-4 pa-text-sm pa-text-neutral-500">
            List of all events where attendance has not been submitted.
          </p>
          <OrgAdminButton
            variant="primary"
            onClick={handleMissingAttendance}
            disabled={loading || events.length === 0}
          >
            {loading ? 'Loading...' : 'Download CSV'}
          </OrgAdminButton>
          {events.length > 0 && (
            <p className="pa-mt-2 pa-text-xs pa-text-neutral-400">
              {events.filter(e => e.status === 'missing').length} events missing attendance
            </p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>At-Risk Players</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="pa-mb-4 pa-text-sm pa-text-neutral-500">
            List of players with attendance below the "Watch" threshold (70%).
          </p>
          <div className="pa-flex pa-gap-2">
            <OrgAdminButton
              variant="primary"
              onClick={handleAtRiskCSV}
              disabled={loading || people.length === 0}
            >
              {loading ? 'Loading...' : 'Download CSV'}
            </OrgAdminButton>
            <Button 
              variant="secondary" 
              onClick={handleAtRiskPDF}
              disabled={loading || people.length === 0}
            >
              {loading ? 'Loading...' : 'Download PDF'}
            </Button>
          </div>
          {people.length > 0 && (
            <p className="pa-mt-2 pa-text-xs pa-text-neutral-400">
              {people.filter(p => p.risk_level === 'at_risk' || p.risk_level === 'watch').length} at-risk players
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
