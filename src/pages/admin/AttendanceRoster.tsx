
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getEventAttendance, updateAttendance } from '../../data/services/attendanceService'
import type { AttendanceRecord, AttendanceStatus } from '../../types/attendance'
import { 
  PageHeader, 
  Card, 
  Button, 
  PlatformDataTable, 
  Badge,
  type ColumnConfig 
} from '../../components/platformAdmin'

export default function AttendanceRoster() {
  const { id } = useParams<{ id: string }>() // Route is events/:id/attendance, so param is :id? Wait App.tsx said :id
  // App.tsx: <Route path="events/:id/attendance" element={<AttendanceRoster />} />
  
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchAttendance = useCallback(async () => {
    if (!isReady || !id) return
    
    // Check if we already have records; if we are re-fetching after update, we might want silent update
    // But for now simple load
    const { data, error } = await getEventAttendance(context, id)
    if (error) {
        console.error("Error fetching attendance", error)
    } else {
        setRecords(data)
    }
    setLoading(false)
  }, [context, isReady, id])

  useEffect(() => {
    if (isReady && id) fetchAttendance()
  }, [isReady, id, fetchAttendance])

  const handleUpdate = async (childId: string, status: AttendanceStatus) => {
    if (!id) return
    setUpdating(childId)
    await updateAttendance(context, id, childId, status)
    
    // Optimistic update locally
    setRecords(prev => prev.map(r => r.child_id === childId ? { ...r, status } : r))
    setUpdating(null)
  }

  const columns: ColumnConfig<AttendanceRecord>[] = [
    { 
        id: 'child_name', 
        label: 'Athlete', 
        render: (row) => row.child ? `${row.child.first_name} ${row.child.last_name}` : 'Unknown Athlete' 
    },
    { 
        id: 'status', 
        label: 'Status', 
        render: (row) => {
            const variant = row.status === 'present' ? 'success' : row.status === 'absent' ? 'error' : row.status === 'late' ? 'warning' : 'neutral'
            return <Badge variant={variant}>{row.status.toUpperCase()}</Badge> 
        }
    },
    {
        id: 'recorded',
        label: 'Recorded By',
        render: (row) => row.recorder?.display_name || '-'
    },
    { 
      id: 'actions', 
      label: 'Mark', 
      render: (row) => (
        <div className="pa-flex pa-gap-2">
          <Button 
            size="small" 
            variant={row.status === 'present' ? 'primary' : 'secondary'}
            onClick={() => handleUpdate(row.child_id, 'present')}
            disabled={updating === row.child_id}
          >
            Present
          </Button>
          <Button 
            size="small" 
            variant={row.status === 'absent' ? 'primary' : 'secondary'}
            onClick={() => handleUpdate(row.child_id, 'absent')}
            disabled={updating === row.child_id}
          >
            Absent
          </Button>
          <Button 
            size="small" 
            variant={row.status === 'late' ? 'primary' : 'secondary'}
            onClick={() => handleUpdate(row.child_id, 'late')}
            disabled={updating === row.child_id}
          >
            Late
          </Button>
          <Button 
            size="small" 
            variant={row.status === 'excused' ? 'primary' : 'secondary'}
            onClick={() => handleUpdate(row.child_id, 'excused')}
            disabled={updating === row.child_id}
          >
            Excused
          </Button>
        </div>
      ) 
    }
  ]

  return (
    <div className="pa-root">
      <div className="pa-flex pa-items-center pa-gap-4 pa-mb-6">
        <Button variant="secondary" onClick={() => navigate('/admin/attendance')}>
           Back to Attendance
        </Button>
        <div className="pa-flex-1">
            <h1 className="pa-text-2xl pa-font-bold">Event Attendance</h1>
        </div>
      </div>

      <Card>
        <PlatformDataTable
          columns={columns}
          rows={records}
          loading={loading}
          emptyMessage="No athletes found for this event."
        />
      </Card>
    </div>
  )
}
