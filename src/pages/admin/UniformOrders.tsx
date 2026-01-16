import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUserContext } from '../../hooks/useUserContext'
import { getAllUniformSubmissions } from '../../data/services/uniformsService'
import { 
  PageHeader, 
  Card, 
  Button, 
  PlatformDataTable, 
  Badge,
  EmptyState,
  type ColumnConfig 
} from '../../components/platformAdmin'

interface UniformSubmission {
  id: string
  child_id: string
  team_id: string
  season_id: string
  size: string
  number: string | null
  status: 'pending' | 'ordered' | 'received' | 'cancelled'
  created_at: string
}

export default function UniformOrders() {
  const [submissions, setSubmissions] = useState<UniformSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const { profile } = useAuth()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchSubmissions = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    const { data, error } = await getAllUniformSubmissions(context)
    
    if (!error) {
      setSubmissions(data)
    }
    setLoading(false)
  }, [context, isReady])

  useEffect(() => {
    if (isReady) fetchSubmissions()
  }, [isReady, fetchSubmissions])

  const columns: ColumnConfig<UniformSubmission>[] = [
    { 
      id: 'child_id', 
      label: 'Player',
      render: (row) => `Child ${row.child_id.slice(0, 8)}`
    },
    { 
      id: 'team_id', 
      label: 'Team',
      render: (row) => `Team ${row.team_id.slice(0, 8)}`
    },
    { 
      id: 'size', 
      label: 'Size'
    },
    { 
      id: 'number', 
      label: 'Number',
      render: (row) => row.number || '—'
    },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => {
        const variantMap = {
          pending: 'warning' as const,
          ordered: 'info' as const,
          received: 'success' as const,
          cancelled: 'neutral' as const,
        }
        return (
          <Badge variant={variantMap[row.status]}>
            {row.status.toUpperCase()}
          </Badge>
        )
      }
    },
    { 
      id: 'created_at', 
      label: 'Submitted',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
  ]

  return (
    <div className="pa-root">
      <PageHeader 
        title="Uniform Orders" 
        actions={
          <Button onClick={() => navigate('/admin/uniforms/new')}>
            <span className="material-symbols-outlined">add</span>
            Create Kit
          </Button>
        }
      />

      {submissions.length === 0 && !loading ? (
        <Card>
          <EmptyState 
            icon="checkroom" 
            title="NO UNIFORM ORDERS" 
            description="Uniform orders will appear here when families submit their sizes." 
          />
        </Card>
      ) : (
        <PlatformDataTable
          columns={columns}
          rows={submissions}
          loading={loading}
          totalCount={submissions.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          emptyMessage="No uniform orders found."
        />
      )}
    </div>
  )
}
