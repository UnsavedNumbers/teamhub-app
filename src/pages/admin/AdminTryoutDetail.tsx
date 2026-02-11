import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getTryoutById, getAdminTryoutRegistrations } from '../../data/services/tryoutsService'
import type { Tryout, TryoutRegistration } from '../../data/services/tryoutsService'
import { 
  AdminPageHeader,
  Card, 
  Badge,
} from '../../components/admin'
import OrgDataTable from '../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../components/admin/OrgDataTable'
import '../../styles/orgAdmin.css'

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

  if (loading) {
    return (
      <div className="oa-root">
        <div style={{ padding: '24px' }}>
          <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '120px' }} />
            ))}
          </div>
          <div className="oa-skeleton" style={{ height: '400px', borderRadius: '8px' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <AdminPageHeader 
        title={tryout?.title || 'Tryout Details'} 
        breadcrumbs={[
          { label: 'Tryouts', path: '/admin/tryouts' },
          { label: tryout?.title || '' }
        ]}
      />
      
      <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-2 lg:oa-grid-cols-3 oa-gap-4 oa-mb-6">
        <Card>
          <div className="oa-stat-label">Date</div>
          <div className="oa-stat-value">{new Date(tryout?.tryout_date || '').toLocaleDateString()}</div>
        </Card>
        <Card>
          <div className="oa-stat-label">Registrations</div>
          <div className="oa-stat-value">{registrations.length}</div>
        </Card>
        <Card>
          <div className="oa-stat-label">Status</div>
          <div className="oa-stat-value">{tryout?.status.toUpperCase()}</div>
        </Card>
      </div>

      <Card>
        <h3 className="oa-h3 oa-mb-4">Registrations</h3>
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
