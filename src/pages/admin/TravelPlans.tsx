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

interface TravelPlan {
  id: string
  title: string
  location: string
  start_date: string
  end_date: string
  status: 'draft' | 'published' | 'cancelled'
  team: { name: string }
}

export default function TravelPlans() {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  const navigate = useNavigate()

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const { count } = await supabase.from('travel_plans').select('*', { count: 'exact', head: true })
      setTotalCount(count || 0)
      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      const { data } = await supabase.from('travel_plans').select('id, title, location, start_date, end_date, status, team:teams(name)').order('start_date', { ascending: false }).range(from, to)
      setPlans((data as any[]) || [])
    } finally { setLoading(false) }
  }, [page, rowsPerPage])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const getStatusVariant = (status: TravelPlan['status']): 'success' | 'danger' | 'neutral' => {
    switch (status) {
      case 'published': return 'success'
      case 'cancelled': return 'danger'
      default: return 'neutral'
    }
  }

  const publishPlan = async (id: string) => {
    await supabase.from('travel_plans').update({ status: 'published', published_at: new Date().toISOString(), cancelled_at: null } as any).eq('id', id)
    fetchPlans()
  }

  const cancelPlan = async (id: string) => {
    await supabase.from('travel_plans').update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as any).eq('id', id)
    fetchPlans()
  }

  const columns: ColumnConfig<TravelPlan>[] = [
    { id: 'title', label: 'Title' },
    { id: 'status', label: 'Status', render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status.toUpperCase()}</Badge> },
    { id: 'location', label: 'Location' },
    { id: 'dates', label: 'Dates', render: (row) => `${new Date(row.start_date).toLocaleDateString()} - ${new Date(row.end_date).toLocaleDateString()}` },
    { id: 'team_name', label: 'Team', render: (row) => row.team?.name },
    { id: 'actions', label: 'Actions', align: 'right', render: (row) => (
      <div className="pa-flex pa-gap-2 pa-justify-end">
        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); navigate(`/admin/travel/${row.id}`) }}>Edit</Button>
        {row.status !== 'published' && <Button variant="secondary" onClick={(e) => { e.stopPropagation(); publishPlan(row.id) }}>Publish</Button>}
        {row.status !== 'cancelled' && <Button variant="secondary" onClick={(e) => { e.stopPropagation(); cancelPlan(row.id) }}>Cancel</Button>}
      </div>
    )}
  ]

  return (
    <div className="pa-root">
      <PageHeader 
        title="Travel Plans" 
        actions={<Button onClick={() => navigate('/admin/travel/new')}><span className="material-symbols-outlined">add</span>New Plan</Button>} 
      />
      {plans.length === 0 && !loading ? (
        <Card><EmptyState icon="flight_takeoff" title="NO TRAVEL PLANS" description="Create a travel plan to help your teams prepare for events." action={<Button onClick={() => navigate('/admin/travel/new')}>Create Plan</Button>} /></Card>
      ) : (
        <PlatformDataTable columns={columns} rows={plans} loading={loading} totalCount={totalCount} page={page} rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage} onRowClick={r => navigate(`/admin/travel/${r.id}`)} />
      )}
    </div>
  )
}
