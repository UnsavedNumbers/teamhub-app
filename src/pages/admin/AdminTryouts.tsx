import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getTryouts, type Tryout } from '../../data/services/tryoutsService'
import { AdminPageHeader, Badge, Button, Card, Input } from '../../components/admin'
import OrgDataTable from '../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../components/admin/OrgDataTable'
import { hasAnyRole } from '../../utils/roleHelpers'
import '../../styles/orgAdmin.css'

type StatusFilter = 'all' | 'draft' | 'open' | 'closed' | 'completed' | 'cancelled'

export default function AdminTryouts() {
  const [rows, setRows] = useState<Tryout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()
  const t = useT()
  const isOrgAdmin = hasAnyRole(currentOrganization, ['org_admin'])

  const fetchTryouts = useCallback(async () => {
    if (!isReady || !currentOrganization) return
    setLoading(true)
    setError(null)

    const response = await getTryouts(context, currentOrganization.id)
    if (response.error) {
      setError(response.error.message)
      setRows([])
      setLoading(false)
      return
    }

    setRows(response.data ?? [])
    setLoading(false)
  }, [context, currentOrganization, isReady])

  useEffect(() => {
    if (isReady && currentOrganization) {
      void fetchTryouts()
    }
  }, [currentOrganization, fetchTryouts, isReady])

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!normalizedSearch) return true
      return `${row.title} ${row.age_group} ${row.location ?? ''}`.toLowerCase().includes(normalizedSearch)
    })
  }, [rows, search, statusFilter])

  const columns: ColumnConfig<Tryout>[] = [
    {
      id: 'title',
      label: t('admin.tryouts.columns.title' as TranslationKey),
      render: (row: Tryout) => <span className="oa-body-m" style={{ fontWeight: 600 }}>{row.title}</span>,
    },
    {
      id: 'sport',
      label: t('admin.tryouts.columns.sport' as TranslationKey),
      render: (row: Tryout) => row.sport || t('common.unknown'),
    },
    {
      id: 'age_group',
      label: t('admin.tryouts.columns.ageGroup' as TranslationKey),
      render: (row: Tryout) => row.age_group,
    },
    {
      id: 'dates',
      label: t('admin.tryouts.columns.dateRange' as TranslationKey),
      render: (row: Tryout) => row.tryout_date ? new Date(row.tryout_date).toLocaleDateString() : t('common.tbd'),
    },
    {
      id: 'registrations',
      label: t('admin.tryouts.columns.registrations' as TranslationKey),
      render: (row: Tryout) => {
        const count = row.registration_count ?? 0
        const capacity = row.capacity ?? row.max_spots
        return capacity ? `${count} / ${capacity}` : String(count)
      },
    },
    {
      id: 'status',
      label: t('admin.tryouts.columns.status' as TranslationKey),
      render: (row: Tryout) => (
        <Badge variant={row.status === 'open' ? 'success' : row.status === 'cancelled' ? 'danger' : 'neutral'}>
          {t(`admin.tryouts.status.${row.status}` as TranslationKey)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      label: t('common.actions'),
      align: 'right',
      render: (row: Tryout) => (
        <div className="oa-flex oa-gap-2 oa-justify-end">
          <Button
            variant="ghost"
            size="compact"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation()
              navigate(`/admin/tryouts/${row.id}`)
            }}
          >
            {t('common.viewDetails')}
          </Button>
          <Button
            variant="ghost"
            size="compact"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation()
              navigate(`/admin/tryouts/${row.id}/registrations`)
            }}
          >
            {t('admin.tryouts.registrations.title' as TranslationKey)}
          </Button>
          <Button
            variant="ghost"
            size="compact"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation()
              navigate(`/admin/tryouts/${row.id}/evaluators`)
            }}
          >
            {t('admin.tryouts.evaluators.title' as TranslationKey)}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="oa-root">
      <AdminPageHeader
        title={t('admin.tryouts.title')}
        subtitle={t('admin.tryouts.subtitle')}
        actions={
          isOrgAdmin ? (
            <Button variant="primary" onClick={() => navigate('/admin/tryouts/new')}>
              <span className="material-symbols-outlined">add</span>
              {t('admin.tryouts.actions.create' as TranslationKey)}
            </Button>
          ) : undefined
        }
      />

      <Card className="oa-mb-4">
        <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-3 oa-gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={t('common.search')}
            placeholder={t('admin.tryouts.filters.searchPlaceholder' as TranslationKey)}
          />
          <div>
            <label className="oa-label">{t('admin.tryouts.filters.status' as TranslationKey)}</label>
            <select
              className="oa-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">{t('common.all')}</option>
              <option value="draft">{t('admin.tryouts.status.draft' as TranslationKey)}</option>
              <option value="open">{t('admin.tryouts.status.open' as TranslationKey)}</option>
              <option value="closed">{t('admin.tryouts.status.closed' as TranslationKey)}</option>
              <option value="completed">{t('admin.tryouts.status.completed' as TranslationKey)}</option>
              <option value="cancelled">{t('admin.tryouts.status.cancelled' as TranslationKey)}</option>
            </select>
          </div>
          <div className="oa-flex oa-items-end oa-justify-end">
            <Button variant="secondary" onClick={() => void fetchTryouts()}>
              {t('admin.tryouts.actions.refresh' as TranslationKey)}
            </Button>
          </div>
        </div>
      </Card>

      {error && <Card className="oa-text-danger oa-mb-4">{error}</Card>}

      <OrgDataTable
        columns={columns}
        rows={filteredRows}
        loading={loading}
        emptyMessage={t('admin.tryouts.empty' as TranslationKey)}
        onRowClick={(row) => navigate(`/admin/tryouts/${row.id}`)}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={filteredRows.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </div>
  )
}
