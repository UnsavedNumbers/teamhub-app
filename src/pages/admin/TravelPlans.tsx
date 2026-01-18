import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { 
  getAllTravelPlansAdmin, 
  publishTravelPlan, 
  cancelTravelPlan,
  type FakeTravelPlan 
} from '../../data/services/travelService'
import { 
  PageHeader, 
  Card, 
  Badge, 
  PlatformDataTable, 
  Button, 
  EmptyState,
  type ColumnConfig 
} from '../../components/platformAdmin'

type TravelPlan = FakeTravelPlan & { team?: { name: string } }

export default function TravelPlans() {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  const navigate = useNavigate()
  const { context, isReady } = useUserContext()

  const fetchPlans = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    try {
      const { data, error } = await getAllTravelPlansAdmin(context)
      
      if (error) {
        console.error('Error fetching travel plans:', error)
        setPlans([])
        setTotalCount(0)
        return
      }

      // Transform data to include team name (from fake data, team info is embedded)
      const plansWithTeam = data.map(plan => ({
        ...plan,
        team: { name: getTeamName(plan.team_id) }
      }))

      setTotalCount(plansWithTeam.length)
      
      // Client-side pagination
      const from = page * rowsPerPage
      const to = from + rowsPerPage
      setPlans(plansWithTeam.slice(from, to))
    } finally { 
      setLoading(false) 
    }
  }, [context, isReady, page, rowsPerPage])

  useEffect(() => { 
    fetchPlans() 
  }, [fetchPlans])

  // Helper to get team name from team_id (will be replaced with proper join in real data)
  const getTeamName = (teamId: string): string => {
    const teamNames: Record<string, string> = {
      'team-u10-soccer-001': 'U10 Lightning',
      'team-u12-soccer-002': 'U12 Thunder',
      'team-u10-basketball-003': 'U10 Hawks',
      'team-u12-basketball-004': 'U12 Eagles',
      'team-u14-soccer-elite-005': 'U14 Elite Storm',
      'team-u16-soccer-elite-006': 'U16 Elite Hurricanes',
    }
    return teamNames[teamId] ?? 'Unknown Team'
  }

  const getStatusVariant = (status: TravelPlan['status']): 'success' | 'danger' | 'neutral' => {
    switch (status) {
      case 'published': return 'success'
      case 'cancelled': return 'danger'
      default: return 'neutral'
    }
  }

  const handlePublish = async (id: string) => {
    const { error } = await publishTravelPlan(context, id)
    if (error) {
      console.error('Error publishing plan:', error)
      return
    }
    fetchPlans()
  }

  const handleCancel = async (id: string) => {
    const { error } = await cancelTravelPlan(context, id)
    if (error) {
      console.error('Error cancelling plan:', error)
      return
    }
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
        <Button variant="secondary" onClick={(e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); navigate(`/admin/travel/${row.id}`) }}>Edit</Button>
        {row.status !== 'published' && <Button variant="secondary" onClick={(e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); handlePublish(row.id) }}>Publish</Button>}
        {row.status !== 'cancelled' && <Button variant="secondary" onClick={(e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); handleCancel(row.id) }}>Cancel</Button>}
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
        <Card><EmptyState icon="flight_takeoff" title="NO TRAVEL PLANS" description="Create a travel plan to help your teams prepare for events." action={{ label: 'Create Plan', onClick: () => navigate('/admin/travel/new') }} /></Card>
      ) : (
        <PlatformDataTable columns={columns} rows={plans} loading={loading} totalCount={totalCount} page={page} rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage} onRowClick={r => navigate(`/admin/travel/${r.id}`)} />
      )}
    </div>
  )
}
