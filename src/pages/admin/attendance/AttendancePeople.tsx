
import { useState, useEffect } from 'react'
import { Card, Badge } from '../../../components/platformAdmin'
import OrgDataTable from '../../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../../components/admin/OrgDataTable'
import { useUserContext } from '../../../hooks/useUserContext'
import { getAttendancePeople } from '../../../data/services/attendanceService'
import type { AttendancePersonSummary } from '../../../types/attendance'

import { useDebugLifecycle } from '../../../lib/debug/integrations/useDebugLifecycle'

export default function AttendancePeople() {
  useDebugLifecycle('AttendancePeople')
  
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

  const columns: ColumnConfig<AttendancePersonSummary & { id: string }>[] = [
    { id: 'name', label: 'Name', render: (row: AttendancePersonSummary & { id: string }) => `${row.first_name} ${row.last_name}` },
    { 
        id: 'rate', 
        label: 'Attendance Rate', 
        render: (row: AttendancePersonSummary & { id: string }) => {
            const color = row.attendance_rate >= 85 ? 'text-green-600' : row.attendance_rate >= 70 ? 'text-amber-600' : 'text-red-600'
            const val = row.attendance_rate.toFixed(1)
            return <span className={`oa-font-bold ${color}`}>{val}%</span>
        }
    },
    { id: 'total', label: 'Total Events', render: (row: AttendancePersonSummary & { id: string }) => String(row.total_events) },
    { id: 'present', label: 'Present', render: (row: AttendancePersonSummary & { id: string }) => String(row.present_count) },
    { id: 'absent', label: 'Absent', render: (row: AttendancePersonSummary & { id: string }) => String(row.absent_count) },
    { 
        id: 'risk', 
        label: 'Status', 
        render: (row: AttendancePersonSummary & { id: string }) => {
            const variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'error' = row.risk_level === 'good' ? 'success' : row.risk_level === 'watch' ? 'warning' : 'error'
            return <Badge variant={variant}>{row.risk_level.toUpperCase().replace('_', ' ')}</Badge>
        }
    }
  ]

  // Map data to include id field
  const rowsWithId = data.map(item => ({ ...item, id: item.athlete_id ?? (item as { child_id?: string }).child_id }))

  return (
    <Card>
      <OrgDataTable
        columns={columns}
        rows={rowsWithId}
        loading={loading}
        emptyMessage="No people found."
        page={0}
        rowsPerPage={10}
        totalCount={rowsWithId.length}
        onPageChange={() => {}}
        onRowsPerPageChange={() => {}}
      />
    </Card>
  )
}


