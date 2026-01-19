import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPageHeader, PlatformDataTable, Button } from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import type { ColumnConfig } from '../../components/platformAdmin/PlatformDataTable'
import { useUserContext } from '../../hooks/useUserContext'
import { getChildren } from '../../data/services/familyService'
import { useT } from '../../i18n/useI18n'
import type { Child } from '../../types/family'

export default function AdminChildren() {
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const t = useT()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!isReady) return

    async function fetch() {
      const { data, error } = await getChildren(context)
      if (error) setError(error)
      else setChildren(data)
      setLoading(false)
    }
    fetch()
  }, [context, isReady])

  const columns: ColumnConfig<Child>[] = [
    {
      id: 'first_name',
      label: 'Name',
      sortable: true,
      render: (c) => <span className="pa-text-primary" style={{ fontWeight: 600 }}>{c?.first_name} {c?.last_name}</span>
    },
    {
       id: 'date_of_birth',
       label: 'DOB',
       sortable: true,
       render: (c) => c?.date_of_birth ? new Date(c.date_of_birth).toLocaleDateString() : '-'
    },
    {
      id: 'family_id',
      label: 'Family',
      render: (c) => (
          <span 
            className="pa-link"
            onClick={(e) => {
                e.stopPropagation()
                navigate(`/admin/families/${c.family_id}`)
            }}
          >
              View Family
          </span>
      )
    }
  ]

  if (!isReady) return <AdminLoadingSpinner />

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title={t('admin.children.title')}
        actions={
          <Button onClick={() => navigate('/admin/athletes/import')} icon="upload_file">
            Import Athletes
          </Button>
        }
      />

      {error ? (
          <div className="pa-p-4 pa-bg-danger-subtle pa-text-danger">
              {t('admin.children.errorLoading')}: {error.message}
          </div>
      ) : (
          <PlatformDataTable
            data={children}
            columns={columns}
            loading={loading}
            // Navigate to family detail since we don't have a child detail page
            onRowClick={(c) => navigate(`/admin/families/${c.family_id}`)}
            emptyMessage={t('admin.children.emptyMessage')}
            page={0}
            rowsPerPage={children.length}
            totalCount={children.length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
          />
      )}
    </div>
  )
}
