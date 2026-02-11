import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getTryouts } from '../../data/services/tryoutsService'
import type { Tryout } from '../../data/services/tryoutsService'
import { 
  AdminPageHeader, 
  Button, 
  Badge,
} from '../../components/admin'
import OrgDataTable from '../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../components/admin/OrgDataTable'
import '../../styles/orgAdmin.css'

export default function AdminTryouts() {
  const [tryouts, setTryouts] = useState<Tryout[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()
  const t = useT()

  const fetchTryouts = useCallback(async () => {
    if (!isReady || !currentOrganization) return
    setLoading(true)
    const { data } = await getTryouts(context, currentOrganization.id)
    setTryouts(data)
    setLoading(false)
  }, [context, isReady, currentOrganization])

  useEffect(() => {
    if (isReady && currentOrganization) fetchTryouts()
  }, [isReady, currentOrganization, fetchTryouts])

  const columns: ColumnConfig<Tryout>[] = [
    { id: 'title', label: 'Title', render: (row) => <span className="oa-body-m" style={{fontWeight:600}}>{row.title}</span> },
    { id: 'tryout_date', label: 'Date', render: (row) => row.tryout_date ? new Date(row.tryout_date).toLocaleDateString() : 'TBD' },
    { id: 'age_group', label: 'Age Group' },
    { id: 'status', label: 'Status', render: (row) => <Badge variant={row.status === 'open' ? 'success' : 'neutral'}>{row.status.toUpperCase()}</Badge> },
    { 
      id: 'actions', 
      label: 'Actions', 
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="compact" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); navigate(`/admin/tryouts/${row.id}`) }}>
          <span className="material-symbols-outlined">visibility</span>
        </Button>
      )
    }
  ]

  return (
    <div className="oa-root">
      <AdminPageHeader 
        title={t('admin.tryouts.title')}
        subtitle={t('admin.tryouts.subtitle')}
        actions={
          <Button variant="primary" onClick={() => navigate('/admin/tryouts/new')}>
            <span className="material-symbols-outlined">add</span>
            Create Tryout
          </Button>
        }
      />
      <OrgDataTable
        columns={columns}
        rows={tryouts}
        loading={loading}
        onRowClick={(row) => navigate(`/admin/tryouts/${row.id}`)}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={tryouts.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </div>
  )
}

