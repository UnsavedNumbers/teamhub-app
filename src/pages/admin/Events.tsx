import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
} from '@mui/material'
import type { ChipProps } from '@mui/material/Chip'
import { Add as AddIcon, Event as EventIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

interface Event {
  id: string
  title: string
  type: string
  start_time: string
  end_time: string
  location: string | null
  team: { name: string }
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  const { profile } = useAuth()
  const navigate = useNavigate()

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      // Get total count
      const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', new Date().toISOString())

      setTotalCount(count || 0)

      // Get paginated data
      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1

      const { data } = await supabase
        .from('events')
        .select('id, title, type, start_time, end_time, location, team:teams(name)')
        .order('start_time', { ascending: true })
        .gte('start_time', new Date().toISOString())
        .range(from, to)

      setEvents((data as unknown as Event[]) || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage])

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    fetchEvents()
  }, [profile, navigate, page, rowsPerPage, fetchEvents])

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getTypeColor = (type: string): ChipProps['color'] => {
    switch (type) {
      case 'practice':
        return 'info'
      case 'game':
        return 'success'
      case 'tournament':
        return 'warning'
      case 'meeting':
        return 'secondary'
      default:
        return 'default'
    }
  }

  if (loading && events.length === 0) {
    return <AdminSkeletonTable rows={10} columns={5} />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Events
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/admin/events/new')}>
          New Event
        </Button>
      </Box>

      {events.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Box sx={{ mb: 2 }}>
              <EventIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
            </Box>
            <Typography variant="h6" gutterBottom>
              No upcoming events
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              Create your first event to get started.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/admin/events/new')}>
              Create Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} hover>
                    <TableCell>{formatDate(event.start_time)}</TableCell>
                    <TableCell>{formatTime(event.start_time)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {event.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={event.type} color={getTypeColor(event.type)} size="small" />
                    </TableCell>
                    <TableCell>{event.team.name}</TableCell>
                    <TableCell>{event.location || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10))
              setPage(0)
            }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </Card>
      )}
    </Box>
  )
}
