
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, PlatformDataTable, Button, Badge } from '../../../components/platformAdmin'
import { useUserContext } from '../../../hooks/useUserContext'
import { getAttendanceEvents } from '../../../data/services/attendanceService'
import type { AttendanceEventSummary } from '../../../types/attendance'

export default function AttendanceEvents() {
  const [data, setData] = useState<AttendanceEventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isReady) return
    
    // Default range: last 30 days to next 7 days
    const end = new Date()
    end.setDate(end.getDate() + 7)
    const start = new Date()
    start.setDate(start.getDate() - 30)

    getAttendanceEvents(context, { startDate: start, endDate: end })
        .then(res => {
            setData(res.data)
            setLoading(false)
        })
  }, [isReady, context])

  const columns = [
    { id: 'start_time', label: 'Date', render: (row: AttendanceEventSummary) => new Date(row.start_time).toLocaleDateString() },
    { id: 'team_name', label: 'Team' },
    { id: 'event_type', label: 'Type', render: (row: AttendanceEventSummary) => <Badge variant="neutral">{row.event_type}</Badge> },
    { 
       id: 'status', 
       label: 'Status', 
       render: (row: AttendanceEventSummary) => {
         const variant = row.status === 'complete' ? 'success' : row.status === 'missing' ? 'error' : 'warning'
         return <Badge variant={variant}>{row.status.toUpperCase()}</Badge>
       }
    },
    { 
        id: 'counts', 
        label: 'Present/Total', 
        render: (row: AttendanceEventSummary) => `${row.present_count} / ${row.total_expected}`
    },
    {
        id: 'actions',
        label: 'Actions',
        render: (row: AttendanceEventSummary) => (
            <Button size="small" variant="secondary" onClick={() => navigate(`/admin/events/${row.event_id}/attendance`)}>
                View
            </Button>
        )
    }
  ]

  return (
    <Card>
      <PlatformDataTable
        columns={columns}
        rows={data}
        loading={loading}
        emptyMessage="No events found in this range."
      />
    </Card>
  )
}
