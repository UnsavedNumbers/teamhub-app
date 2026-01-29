import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { 
  getAllTravelPlansAdmin, 
  publishTravelPlan, 
  cancelTravelPlan,
  type FakeTravelPlan 
} from '../../data/services/travelService'
import { showSuccess, showError } from '../../utils/toast'
import { 
  AdminPageHeader, 
  Card, 
  Badge, 
  PlatformDataTable, 
  Button, 
  EmptyState,
  ConfirmDialog,
  type ColumnConfig 
} from '../../components/platformAdmin'
import { FeatureGatedButton } from '../../components/FeatureGatedButton'

type TravelPlan = FakeTravelPlan & { team?: { name: string } }

export default function TravelPlans() {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [publishLoading, setPublishLoading] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState<string | null>(null)
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; plan: TravelPlan | null }>({ open: false, plan: null })
  const [actionError, setActionError] = useState<string | null>(null)

  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const t = useT()

  const fetchPlans = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    try {
      const { data, error } = await getAllTravelPlansAdmin(context)
      
      if (error) {
        console.error('Error fetching travel plans:', error)
        setError(error.message || 'Failed to load travel plans')
        setPlans([])
        setTotalCount(0)
        return
      }

      setError(null)

      // Transform data to include team name
      // Service returns FakeTravelPlan which doesn't include team info directly
      // In real data mode, the service query includes team join, but it's mapped to FakeTravelPlan
      // For now, use the helper function (will be improved when service returns team info)
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

  const isPastPlan = (plan: Pick<TravelPlan, 'end_date'>): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(plan.end_date)
    end.setHours(0, 0, 0, 0)
    return end < today
  }

  const handlePublish = async (id: string) => {
    setPublishLoading(id)
    setActionError(null)
    
    try {
      const { data, error } = await publishTravelPlan(context, id)
      
      if (error) {
        setActionError(error.message || 'Failed to publish travel plan')
        showError(error.message || 'Failed to publish travel plan')
        return
      }

      if (data) {
        showSuccess('Travel plan published successfully!')
        await fetchPlans()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish travel plan'
      setActionError(errorMessage)
      showError(errorMessage)
    } finally {
      setPublishLoading(null)
    }
  }

  const handleCancelClick = (plan: TravelPlan) => {
    setCancelDialog({ open: true, plan })
    setActionError(null)
  }

  const handleCancelConfirm = async (_reason: string) => {
    if (!cancelDialog.plan) return

    const planId = cancelDialog.plan.id
    setCancelLoading(planId)
    setActionError(null)

    try {
      const { data, error } = await cancelTravelPlan(context, planId)
      
      if (error) {
        setActionError(error.message || 'Failed to cancel travel plan')
        showError(error.message || 'Failed to cancel travel plan')
        return
      }

      if (data) {
        showSuccess('Travel plan cancelled successfully!')
        setCancelDialog({ open: false, plan: null })
        await fetchPlans()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel travel plan'
      setActionError(errorMessage)
      showError(errorMessage)
    } finally {
      setCancelLoading(null)
    }
  }

  const columns: ColumnConfig<TravelPlan>[] = [
    { id: 'title', label: 'Title' },
    { id: 'status', label: 'Status', render: (row) => <Badge variant={getStatusVariant(row.status)}>{row.status.toUpperCase()}</Badge> },
    { id: 'location', label: 'Location' },
    { id: 'dates', label: 'Dates', render: (row) => `${new Date(row.start_date).toLocaleDateString()} - ${new Date(row.end_date).toLocaleDateString()}` },
    { id: 'team_name', label: 'Team', render: (row) => row.team?.name },
    { id: 'actions', label: 'Actions', align: 'right', render: (row) => (
      <div className="pa-flex pa-gap-2 pa-justify-end">
        <Button 
          variant="blue" 
          onClick={(e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); navigate(`/admin/travel/${row.id}`) }}
          disabled={publishLoading === row.id || cancelLoading === row.id}
        >
          Edit
        </Button>
        {row.status !== 'published' && row.status !== 'cancelled' && (
          <Button 
            variant="primary" 
            onClick={(e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); handlePublish(row.id) }}
            loading={publishLoading === row.id}
            disabled={publishLoading === row.id || cancelLoading === row.id}
          >
            Publish
          </Button>
        )}
        {row.status !== 'cancelled' && (
          <Button 
            variant="danger" 
            onClick={(e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); handleCancelClick(row) }}
            loading={cancelLoading === row.id}
            disabled={publishLoading === row.id || cancelLoading === row.id}
          >
            Cancel
          </Button>
        )}
      </div>
    )}
  ]

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title={t('admin.travel.title')} 
        subtitle={t('admin.travel.subtitle')} 
        actions={<FeatureGatedButton actionKey="create_travel_plan" onClick={() => navigate('/admin/travel/new')}><span className="material-symbols-outlined">add</span>New Plan</FeatureGatedButton>} 
      />
      {error && !loading && (
        <Card>
          <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>
            {error}
            <Button variant="primary" onClick={() => fetchPlans()} style={{ marginTop: '8px' }}>Retry</Button>
          </div>
        </Card>
      )}
      {plans.length === 0 && !loading && !error ? (
        <Card><EmptyState icon="flight_takeoff" title="NO TRAVEL PLANS" description="Create a travel plan to help your teams prepare for events." action={{ label: 'Create Plan', onClick: () => navigate('/admin/travel/new') }} noCard /></Card>
      ) : (
        <PlatformDataTable
          columns={columns}
          rows={plans}
          loading={loading}
          totalCount={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onRowClick={r => navigate(`/admin/travel/${r.id}`)}
          getRowStyle={(row) =>
            isPastPlan(row)
              ? {
                  opacity: 0.55,
                  filter: 'grayscale(0.2)',
                }
              : undefined
          }
        />
      )}

      <ConfirmDialog
        open={cancelDialog.open}
        title="Cancel Travel Plan"
        description={cancelDialog.plan ? `Are you sure you want to cancel "${cancelDialog.plan.title}"? This will mark the plan as cancelled and notify participants.` : ''}
        confirmLabel="Cancel Plan"
        variant="warning"
        loading={cancelLoading !== null}
        error={actionError}
        onConfirm={handleCancelConfirm}
        cancelLabel={t('common.dontCancel')}
        onCancel={() => {
          setCancelDialog({ open: false, plan: null })
          setActionError(null)
        }}
      />
    </div>
  )
}
