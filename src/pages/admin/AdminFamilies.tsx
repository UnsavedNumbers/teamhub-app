import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPageHeader, PlatformDataTable, Button, Badge } from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import type { ColumnConfig } from '../../components/platformAdmin/PlatformDataTable'
import { useUserContext } from '../../hooks/useUserContext'
import { getFamilies } from '../../data/services/familyService'
import type { Family } from '../../types/family'
import { Info } from 'lucide-react'

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
      id: 'name',
      label: 'Family Name',
      sortable: true,
      render: (row) => <span className="pa-text-primary" style={{ fontWeight: 600 }}>{row?.name || 'Unnamed Family'}</span>
    },
    {
      id: 'created_at',
      label: 'Joined',
      sortable: true,
      render: (row) => row?.created_at ? new Date(row.created_at).toLocaleDateString() : '-'
    },
    {
        id: 'id',
        label: 'Status',
        render: () => (
             <Badge variant="success">Active</Badge>
        )
    }
  ]

  if (!isReady) return <AdminLoadingSpinner />

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="FAMILIES" 
        actions={
          <Button onClick={() => navigate('/admin/athletes/new')}>
            <span className="material-symbols-outlined">add</span>
            Add Athlete
          </Button>
        }
      />

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-blue-900 mb-1">
            Families are Created Automatically
          </h3>
          <p className="text-sm text-blue-800">
            Families are automatically formed when athletes share guardians. To create a new family,
            simply add athletes and link their guardians. Athletes with shared guardians will appear
            together as a family.
          </p>
        </div>
      </div>

      {error ? (
          <div className="pa-p-4 pa-bg-danger-subtle pa-text-danger">
              Error loading families: {error.message}
          </div>
      ) : (
          <PlatformDataTable
            rows={families}
            columns={columns}
            loading={loading}
            onRowClick={(f) => navigate(`/admin/families/${f.id}`)}
            emptyMessage="No families yet. Add athletes with guardians to automatically create families."
            page={0}
            rowsPerPage={100}
            totalCount={families.length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
          />
      )}
    </div>
  )
}