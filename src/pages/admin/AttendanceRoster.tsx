import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useEventParams } from '../../hooks/useRouteParams'
import { 
  PageHeader, 
  Card, 
  Badge, 
  PlatformDataTable, 
  type ColumnConfig 
} from '../../components/platformAdmin'

interface Attendance {
  id: string
  status: 'going' | 'late' | 'not_going'
  child: { first_name: string; last_name: string }
  child_name: string // Added for data table
}

interface Event {
  id: string
  title: string
  start_time: string
  team: { name: string }
}

export default function AttendanceRoster() {
  const { eventId } = useEventParams()
  const [event, setEvent] = useState<Event | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)

  const { profile } = useAuth()
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: eventData } = await supabase
        .from('events')
        .select('id, title, start_time, team:teams(name)')
        .eq('id', eventId)
        .single()

      if (eventData) setEvent(eventData as Event)

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, status, child:children(first_name, last_name)')
        .eq('event_id', eventId)

      const rows = (attendanceData as any[]) || []
      setAttendance(rows.map(a => ({
        ...a,
        child_name: `${a.child.first_name} ${a.child.last_name}`
      })))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    if (eventId) fetchData()
  }, [eventId, fetchData])

  const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    switch (status) {
      case 'going': return 'success'
      case 'late': return 'warning'
      case 'not_going': return 'danger'
      default: return 'neutral'
    }
  }

  const columns: ColumnConfig<Attendance>[] = [
    { id: 'child_name', label: 'Player' },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => (
        <Badge variant={getStatusVariant(row.status)}>
          {row.status.replace('_', ' ').toUpperCase()}
        </Badge>
      )
    }
  ]

  if (loading) {
    return (
      <div className="pa-flex pa-flex-col pa-gap-4">
        <div className="pa-skeleton" style={{ height: '40px', width: '300px' }} />
        <div className="pa-skeleton" style={{ height: '100px' }} />
        <div className="pa-skeleton" style={{ height: '300px' }} />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="pa-root">
        <PageHeader title="Event Not Found" />
      </div>
    )
  }

  return (
    <div className="pa-root">
      <PageHeader title={`Attendance: ${event.title}`} />

      <Card className="pa-mb-5">
        <div className="pa-grid pa-grid-2">
          <div>
            <div className="pa-text-overline pa-mb-1">TEAM</div>
            <div className="pa-body-m" style={{ fontWeight: 600 }}>{event.team.name}</div>
          </div>
          <div>
            <div className="pa-text-overline pa-mb-1">DATE</div>
            <div className="pa-body-m" style={{ fontWeight: 600 }}>
              {new Date(event.start_time).toLocaleDateString()}
            </div>
          </div>
        </div>
      </Card>

      <PlatformDataTable
        columns={columns}
        rows={attendance}
        loading={loading}
        totalCount={attendance.length}
        page={0}
        rowsPerPage={200}
        onPageChange={() => {}}
        onRowsPerPageChange={() => {}}
        emptyMessage="No attendance records found for this event."
      />
    </div>
  )
}
