
import { useState, useEffect } from 'react'
import { Card, PlatformDataTable, Badge } from '../../../components/platformAdmin'
import { useUserContext } from '../../../hooks/useUserContext'
import { getAttendancePeople } from '../../../data/services/attendanceService'
import type { AttendancePersonSummary } from '../../../types/attendance'

export default function AttendancePeople() {
  const [data, setData] = useState<AttendancePersonSummary[]>([])
  const [loading, setLoading] = useState(true)
  const { context, isReady } = useUserContext()

  useEffect(() => {
    if (!isReady) return
    getAttendancePeople(context, {})
        .then(res => {
            setData(res.data)
            setLoading(false)
        })
  }, [isReady, context])

  const columns = [
    { id: 'name', label: 'Name', render: (row: AttendancePersonSummary) => `${row.first_name} ${row.last_name}` },
    { 
        id: 'rate', 
        label: 'Attendance Rate', 
        render: (row: AttendancePersonSummary) => {
            const color = row.attendance_rate >= 85 ? 'text-green-600' : row.attendance_rate >= 70 ? 'text-amber-600' : 'text-red-600'
            const val = row.attendance_rate.toFixed(1)
            return <span className={`pa-font-bold ${color}`}>{val}%</span>
        }
    },
    { id: 'total', label: 'Total Events', accessor: 'total_events' },
    { id: 'present', label: 'Present', accessor: 'present_count' },
    { id: 'absent', label: 'Absent', accessor: 'absent_count' },
    { 
        id: 'risk', 
        label: 'Status', 
        render: (row: AttendancePersonSummary) => {
            const variant = row.risk_level === 'good' ? 'success' : row.risk_level === 'watch' ? 'warning' : 'error'
            return <Badge variant={variant}>{row.risk_level.toUpperCase().replace('_', ' ')}</Badge>
        }
    }
  ]

  return (
    <Card>
      <PlatformDataTable
        columns={columns}
        rows={data}
        loading={loading}
        emptyMessage="No people found."
      />
    </Card>
  )
}
