import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganizationSports } from '../../hooks/useOrganizationSports'
import { useT } from '../../i18n/useI18n'
import { getAllUniformSubmissions, type UniformSubmission } from '../../data/services/uniformsService'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import { 
  AdminPageHeader, 
  Card, 
  PlatformDataTable, 
  Badge,
  EmptyState,
  type ColumnConfig 
} from '../../components/platformAdmin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { getLink } from '../../utils/routes'

export default function UniformOrders() {
  const [submissions, setSubmissions] = useState<UniformSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  const { context, isReady } = useUserContext()
  const { sports, loading: sportsLoading, error: sportsError, refetch: refetchSports } = useOrganizationSports()
  const navigate = useNavigate()
  const t = useT()

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
      render: (row) => {
        const athleteId = row.athlete_id ?? (row as { child_id?: string }).child_id
        return athleteId ? `Child ${athleteId.slice(0, 8)}` : 'Child'
      }
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

  // Guard: Check if context is ready
  if (!isReady || !context?.orgId) {
    return <AdminLoadingSpinner />
  }

  // Show loading state while sports are loading
  if (sportsLoading) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Uniforms" actions={null} />
        <AdminLoadingSpinner />
      </div>
    )
  }

  // Show error state if sports failed to load
  if (sportsError) {
    return (
      <div className="pa-root">
        <AdminPageHeader title="Uniforms" actions={null} />
        <Card>
          <div className="pa-p-8 pa-text-center">
            <p className="pa-text-danger pa-mb-4">{t('admin.uniforms.prerequisite.loadError', { message: sportsError.message })}</p>
            <Button onClick={refetchSports} variant="primary">
              {t('admin.uniforms.prerequisite.retry')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Show empty state if no sports exist
  if ((sports?.length ?? 0) === 0) {
    const returnUrl = encodeURIComponent('/admin/uniforms')
    return (
      <div className="pa-root">
        <AdminPageHeader title="Uniforms" actions={null} />
        <Card>
          <EmptyState
            icon="checkroom"
            title={t('admin.uniforms.prerequisite.noSportsTitle')}
            description={t('admin.uniforms.prerequisite.noSportsDescription')}
            noCard
          >
            <Link to={`${getLink('admin.organization.forms')}?type=sport&returnUrl=${returnUrl}`}>
              <Button variant="primary">{t('admin.uniforms.prerequisite.addSport')}</Button>
            </Link>
          </EmptyState>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title={t('admin.uniforms.title')}
        subtitle={t('admin.uniforms.subtitle')} 
        actions={
          (sports?.length ?? 0) > 0 ? (
            <OrgAdminButton onClick={() => navigate('/admin/uniforms/new')} variant="primary" icon="add" className="w-full sm:w-auto">
              Create Uniform
            </OrgAdminButton>
          ) : null
        }
      />

      {submissions.length === 0 && !loading ? (
        <Card>
          <EmptyState 
            icon="checkroom" 
            title="NO UNIFORM ORDERS"
            noCard 
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
