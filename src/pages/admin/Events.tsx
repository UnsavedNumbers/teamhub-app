import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { 
  PageHeader, 
  Card, 
  Badge, 
  PlatformDataTable, 
  Button, 
  EmptyState,
  type ColumnConfig 
} from '../../components/platformAdmin'

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
      const { count } = await supabase.from('events').select('*', { count: 'exact', head: true }).gte('start_time', new Date().toISOString())
      setTotalCount(count || 0)
      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      const { data } = await supabase.from('events').select('id, title, type, start_time, end_time, location, team:teams(name)').order('start_time', { ascending: true }).gte('start_time', new Date().toISOString()).range(from, to)
      setEvents((data as any[]) || [])
    } finally { setLoading(false) }
  }, [page, rowsPerPage])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const getTypeVariant = (type: string): 'info' | 'success' | 'warning' | 'neutral' => {
    switch (type) {
      case 'practice': return 'info'
      case 'game': return 'success'
      case 'tournament': return 'warning'
      default: return 'neutral'
    }
  }

  const columns: ColumnConfig<Event>[] = [
    { id: 'date', label: 'Date', render: (row) => new Date(row.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) },
    { id: 'time', label: 'Time', render: (row) => new Date(row.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) },
    { id: 'title', label: 'Title' },
    { id: 'type', label: 'Type', render: (row) => <Badge variant={getTypeVariant(row.type)}>{row.type.toUpperCase()}</Badge> },
    { id: 'team_name', label: 'Team', render: (row) => row.team?.name },
    { id: 'location', label: 'Location', render: (row) => row.location || '—' }
  ]

  return (
    <div className="pa-root">
      <PageHeader 
        title="Events" 
        actions={<Button onClick={() => navigate('/admin/events/new')}><span className="material-symbols-outlined">add</span>New Event</Button>} 
      />
      {events.length === 0 && !loading ? (
        <Card><EmptyState icon="event" title="NO UPCOMING EVENTS" description="Create your first event to get started." action={<Button onClick={() => navigate('/admin/events/new')}>Create Event</Button>} /></Card>
      ) : (
        <PlatformDataTable columns={columns} rows={events} loading={loading} totalCount={totalCount} page={page} rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage} />
      )}
    </div>
  )
}
