import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material'
import type { ChipProps } from '@mui/material/Chip'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useEventParams } from '../../hooks/useRouteParams'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

interface Attendance {
  id: string
  status: 'going' | 'late' | 'not_going'
  child: { first_name: string; last_name: string }
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

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'coach' && !profile.organizations.some(org => org.role === 'org_admin' || org.role === 'coach'))) {
      navigate('/portal/unauthorized')
      return
    }
    if (eventId) fetchData()
  }, [eventId, profile, navigate])

  async function fetchData() {
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

      setAttendance((attendanceData as unknown as Attendance[]) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string): ChipProps['color'] => {
    switch (status) {
      case 'going':
        return 'success'
      case 'late':
        return 'warning'
      case 'not_going':
        return 'error'
      default:
        return 'default'
    }
  }

  if (loading) {
    return <AdminSkeletonTable rows={6} columns={3} />
  }

  if (!event) {
    return (
      <Box>
        <Typography variant="h5">Event not found</Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        Attendance: {event.title}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body1">
            <strong>Team:</strong> {event.team.name}
          </Typography>
          <Typography variant="body1">
            <strong>Date:</strong> {new Date(event.start_time).toLocaleDateString()}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">No attendance records</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.child.first_name} {record.child.last_name}
                    </TableCell>
                    <TableCell>
                      <Chip label={record.status} color={getStatusColor(record.status)} size="small" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  )
}
