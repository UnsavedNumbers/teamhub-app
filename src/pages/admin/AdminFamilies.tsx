import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, PlatformDataTable, Button, Badge } from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import type { ColumnConfig } from '../../components/platformAdmin/PlatformDataTable'
import { useUserContext } from '../../hooks/useUserContext'
import { getFamilies } from '../../data/services/familyService'
import type { Family } from '../../types/family'

export default function AdminFamilies() {
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!isReady) return

    async function fetch() {
      // setLoading(true) // Optional if we want to show spinner again on org switch
      const { data, error } = await getFamilies(context, { limit: 1000 })
      if (error) setError(error)
      else setFamilies(data)
      setLoading(false)
    }
    fetch()
  }, [context, isReady])

  const columns: ColumnConfig<Family>[] = [
    {
      key: 'name',
      header: 'Family Name',
      sortable: true,
      render: (row) => <span className="pa-text-primary" style={{ fontWeight: 600 }}>{row?.name || 'Unnamed Family'}</span>
    },
    {
      key: 'created_at',
      header: 'Joined',
      sortable: true,
      render: (row) => row?.created_at ? new Date(row.created_at).toLocaleDateString() : '-'
    },
    {
        key: 'id',
        header: 'Status',
        render: () => (
             <Badge variant="success">Active</Badge>
        )
    }
  ]

  if (!isReady) return <AdminLoadingSpinner />

  return (
    <div className="pa-root">
      <PageHeader 
        title="FAMILIES" 
        actions={
          <Button onClick={() => navigate('/admin/families/new')}>
            <span className="material-symbols-outlined">add</span>
            New Family
          </Button>
        }
      />

      {error ? (
          <div className="pa-p-4 pa-bg-danger-subtle pa-text-danger">
              Error loading families: {error.message}
          </div>
      ) : (
          <PlatformDataTable
            data={families}
            columns={columns}
            loading={loading}
            onRowClick={(f) => navigate(`/admin/families/${f.id}`)}
            emptyStateTitle="No families found"
            emptyStateMessage="Get started by creating your first family."
          />
      )}
    </div>
  )
}
