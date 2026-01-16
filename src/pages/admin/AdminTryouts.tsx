import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { 
  PageHeader, 
  Card, 
  Badge, 
  PlatformDataTable, 
  EmptyState, 
  type ColumnConfig 
} from '../../components/platformAdmin'

interface Tryout {
  id: string
  title: string
  type?: string | null
  age_group: string
  tryout_date: string
  location: string
  org_id: string
}

export default function AdminTryouts() {
  const [tryouts, setTryouts] = useState<Tryout[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const fetchTryouts = useCallback(async () => {
    setLoading(true)
    try {
      if (!currentOrganization) return

      const { count } = await supabase
        .from('tryouts')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', currentOrganization.id)

      setTotalCount(count || 0)

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1

      const { data } = await supabase
        .from('tryouts')
        .select('*')
        .eq('org_id', currentOrganization.id)
        .order('tryout_date', { ascending: false })
        .range(from, to)

      setTryouts((data as Tryout[]) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, currentOrganization])

  useEffect(() => {
    if (currentOrganization) fetchTryouts()
  }, [fetchTryouts, currentOrganization])

  const columns: ColumnConfig<Tryout>[] = [
    { id: 'title', label: 'Title' },
    { 
      id: 'type', 
      label: 'Sport',
      render: (row) => <Badge variant="neutral">{String(row.type ?? 'tryout').toUpperCase()}</Badge>
    },
    { id: 'age_group', label: 'Age Group' },
    { 
      id: 'date', 
      label: 'Date',
      render: (row) => new Date(row.tryout_date).toLocaleDateString()
    },
    { id: 'location', label: 'Location' }
  ]

  return (
    <div className="pa-root">
      <PageHeader title="Tryouts" />

      {tryouts.length === 0 && !loading ? (
        <Card>
          <EmptyState
            icon="emoji_events"
            title="NO TRYOUTS FOUND"
            description="Tryouts will appear here when created by the platform admin."
          />
        </Card>
      ) : (
        <PlatformDataTable
          columns={columns}
          rows={tryouts}
          loading={loading}
          totalCount={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onRowClick={(row) => navigate(`/admin/tryouts/${row.id}`)}
        />
      )}
    </div>
  )
}
