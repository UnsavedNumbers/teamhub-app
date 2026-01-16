import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getEventAttendance, updateAttendance } from '../../data/services/attendanceService'
import type { AttendanceRecord } from '../../data/services/attendanceService'
import { 
  PageHeader, 
  Card, 
  Button, 
  PlatformDataTable, 
  Badge,
  type ColumnConfig 
} from '../../components/platformAdmin'

export default function AttendanceRoster() {
  const { eventId } = useParams<{ eventId: string }>()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchAttendance = useCallback(async () => {
    if (!isReady || !eventId) return
    setLoading(true)
    const { data } = await getEventAttendance(context, eventId)
    setRecords(data)
    setLoading(false)
  }, [context, isReady, eventId])

  useEffect(() => {
    if (isReady && eventId) fetchAttendance()
  }, [isReady, eventId, fetchAttendance])

  const handleUpdate = async (childId: string, status: string) => {
    if (!eventId) return
    await updateAttendance(context, eventId, childId, status)
    fetchAttendance()
  }

  const columns: ColumnConfig<AttendanceRecord>[] = [
    { id: 'child_id', label: 'Athlete', render: (row) => `Athlete ${row.child_id}` },
    { id: 'status', label: 'Status', render: (row) => <Badge variant="neutral">{row.status.toUpperCase()}</Badge> },
    { 
      id: 'actions', 
      label: 'Mark', 
      render: (row) => (
        <div className="pa-flex pa-gap-2">
          <Button size="small" variant="secondary" onClick={() => handleUpdate(row.child_id, 'present')}>Present</Button>
          <Button size="small" variant="secondary" onClick={() => handleUpdate(row.child_id, 'absent')}>Absent</Button>
        </div>
      ) 
    }
  ]

  return (
    <div className="pa-root">
      <PageHeader title="Attendance" />
      <Card>
        <PlatformDataTable
          columns={columns}
          rows={records}
          loading={loading}
          emptyMessage="No attendance records found."
        />
      </Card>
    </div>
  )
}
