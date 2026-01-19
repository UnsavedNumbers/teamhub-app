import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getAllUniformSubmissions, type UniformSubmission } from '../../data/services/uniformsService'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  PlatformDataTable, 
  Badge,
  EmptyState,
  type ColumnConfig 
} from '../../components/platformAdmin'

export default function UniformOrders() {
  const [submissions, setSubmissions] = useState<UniformSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

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
      id: 'kit_id', 
      label: 'Kit',
      render: (row) => `Kit ${row.kit_id.slice(0, 8)}`
    },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => {
        const variantMap: Record<string, 'warning' | 'info' | 'success' | 'neutral'> = {
          pending: 'warning',
          locked: 'info',
          ordered: 'info',
          delivered: 'success',
        }
        const variant = variantMap[row.status] || 'neutral'
        return (
          <Badge variant={variant}>
            {row.status.toUpperCase()}
          </Badge>
        )
      }
    },
    { 
      id: 'submitted_at', 
      label: 'Submitted',
      render: (row) => row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '—'
    },
    { 
      id: 'created_at', 
      label: 'Created',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
  ]

  return (
    <div className="pa-root">
      <AdminPageHeader 
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
