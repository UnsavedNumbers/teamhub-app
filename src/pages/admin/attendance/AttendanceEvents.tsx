
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge } from '../../../components/platformAdmin'
import OrgDataTable from '../../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../../components/admin/OrgDataTable'
import { OrgAdminButton } from '../../../components/admin/OrgAdminButton'
import { useUserContext } from '../../../hooks/useUserContext'
import { getAttendanceEvents } from '../../../data/services/attendanceService'
import type { AttendanceEventSummary } from '../../../types/attendance'

import { useDebugLifecycle } from '../../../lib/debug/integrations/useDebugLifecycle'

export default function AttendanceEvents() {
  useDebugLifecycle('AttendanceEvents')
  
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

  const columns: ColumnConfig<AttendanceEventSummary & { id: string }>[] = [
    { id: 'start_time', label: 'Date', render: (row: AttendanceEventSummary & { id: string }) => new Date(row.start_time).toLocaleDateString() },
    { id: 'team_name', label: 'Team' },
    { id: 'event_type', label: 'Type', render: (row: AttendanceEventSummary & { id: string }) => <Badge variant="neutral">{row.event_type}</Badge> },
    { 
       id: 'status', 
       label: 'Status', 
       render: (row: AttendanceEventSummary & { id: string }) => {
         const variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'error' = row.status === 'complete' ? 'success' : row.status === 'missing' ? 'danger' : 'warning'
         return <Badge variant={variant}>{row.status.toUpperCase()}</Badge>
       }
    },
    { 
        id: 'counts', 
        label: 'Present/Total', 
        render: (row: AttendanceEventSummary & { id: string }) => `${row.present_count} / ${row.total_expected}`
    },
    {
        id: 'actions',
        label: 'Actions',
        render: (row: AttendanceEventSummary & { id: string }) => (
            <OrgAdminButton size="compact" variant="primary" onClick={() => navigate(`/admin/events/${row.event_id}/attendance`)}>
                View
            </OrgAdminButton>
        )
    }
  ]

  // Map data to include id field
  const rowsWithId = data.map(item => ({ ...item, id: item.event_id }))

  return (
    <Card>
      <OrgDataTable
        columns={columns}
        rows={rowsWithId}
        loading={loading}
        emptyMessage="No events found in this range."
        page={0}
        rowsPerPage={10}
        totalCount={rowsWithId.length}
        onPageChange={() => {}}
        onRowsPerPageChange={() => {}}
      />
    </Card>
  )
}
