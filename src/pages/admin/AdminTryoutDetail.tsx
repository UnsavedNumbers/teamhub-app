import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getTryoutById, getAdminTryoutRegistrations } from '../../data/services/tryoutsService'
import type { Tryout, TryoutRegistration } from '../../data/services/tryoutsService'
import { 
  AdminPageHeader,
  Card, 
  Badge,
} from '../../components/platformAdmin'
import OrgDataTable from '../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../components/admin/OrgDataTable'

export default function AdminTryoutDetail() {
  const { tryoutId } = useParams<{ tryoutId: string }>()
  const [tryout, setTryout] = useState<Tryout | null>(null)
  const [registrations, setRegistrations] = useState<TryoutRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    if (!isReady || !tryoutId) return
    setLoading(true)
    const [tRes, rRes] = await Promise.all([
      getTryoutById(context, tryoutId),
      getAdminTryoutRegistrations(context, tryoutId)
    ])
    if (!tRes.data) {
      navigate('/admin/tryouts')
      return
    }
    setTryout(tRes.data)
    setRegistrations(rRes.data)
    setLoading(false)
  }, [context, isReady, tryoutId, navigate])

  useEffect(() => {
    if (isReady && tryoutId) fetchData()
  }, [isReady, tryoutId, fetchData])

  const columns: ColumnConfig<TryoutRegistration>[] = [
    { id: 'child', label: 'Athlete', render: (row) => row.child ? `${row.child.first_name} ${row.child.last_name}` : 'Unknown' },
    { id: 'status', label: 'Status', render: (row) => <Badge variant="neutral">{row.status.toUpperCase()}</Badge> },
    { id: 'notes', label: 'Notes', render: (row) => row.notes || '—' }
  ]

  if (loading) return <div className="pa-skeleton" style={{height:'300px'}} />

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title={tryout?.title || 'Tryout Details'} 
        breadcrumbs={[
          { label: 'Tryouts', path: '/admin/tryouts' },
          { label: tryout?.title || '' }
        ]}
      />
      
      <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-3 pa-gap-4 pa-mb-6">
        <Card>
          <div className="pa-stat-label">Date</div>
          <div className="pa-stat-value">{new Date(tryout?.tryout_date || '').toLocaleDateString()}</div>
        </Card>
        <Card>
          <div className="pa-stat-label">Registrations</div>
          <div className="pa-stat-value">{registrations.length}</div>
        </Card>
        <Card>
          <div className="pa-stat-label">Status</div>
          <div className="pa-stat-value">{tryout?.status.toUpperCase()}</div>
        </Card>
      </div>

      <Card>
        <h3 className="pa-h3 pa-mb-4">Registrations</h3>
        <OrgDataTable
          columns={columns}
          rows={registrations}
          loading={loading}
          emptyMessage="No registrations yet."
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={registrations.length}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </Card>
    </div>
  )
}
