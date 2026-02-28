import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import {
  getAdminTryoutRegistrations,
  getTryoutById,
  updateTryoutRegistrationStatus,
  type TryoutRegistration,
} from '../../data/services/tryoutsService'
import { AdminPageHeader, Badge, Button, Card, Input } from '../../components/admin'
import OrgDataTable from '../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../components/admin/OrgDataTable'
import { showError, showSuccess } from '../../utils/toast'
import '../../styles/orgAdmin.css'

const STATUS_OPTIONS: Array<TryoutRegistration['status'] | 'all'> = [
  'all',
  'registered',
  'waitlisted',
  'offered',
  'accepted',
  'declined',
  'withdrawn',
]

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase()
}

export default function AdminTryoutRegistrations() {
  const { tryoutId } = useParams<{ tryoutId: string }>()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const [tryoutTitle, setTryoutTitle] = useState<string>('')
  const [rows, setRows] = useState<TryoutRegistration[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<TryoutRegistration['status'] | 'all'>('all')
  const [search, setSearch] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [page, setPage] = useState<number>(0)
  const [rowsPerPage, setRowsPerPage] = useState<number>(10)

  const fetchData = useCallback(async () => {
    if (!isReady || !tryoutId) return
    setLoading(true)
    setError(null)

    const [tryoutResponse, registrationsResponse] = await Promise.all([
      getTryoutById(context, tryoutId),
      getAdminTryoutRegistrations(context, tryoutId),
    ])

    if (tryoutResponse.error) {
      setError(tryoutResponse.error.message)
      setLoading(false)
      return
    }

    if (!tryoutResponse.data) {
      setError(t('common.error.notFound'))
      setLoading(false)
      return
    }

    setTryoutTitle(tryoutResponse.data.title)

    if (registrationsResponse.error) {
      setError(registrationsResponse.error.message)
      setRows([])
      setLoading(false)
      return
    }

    setRows(registrationsResponse.data ?? [])
    setLoading(false)
  }, [context, isReady, t, tryoutId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const filteredRows = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search)
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!normalizedSearch) return true

      const athleteName = `${row.child?.first_name ?? ''} ${row.child?.last_name ?? ''}`.toLowerCase()
      const notes = (row.notes ?? '').toLowerCase()
      return athleteName.includes(normalizedSearch) || notes.includes(normalizedSearch)
    })
  }, [rows, search, statusFilter])

  const columns: ColumnConfig<TryoutRegistration>[] = [
    {
      id: 'athlete',
      label: t('admin.tryouts.registrations.columns.athlete' as TranslationKey),
      render: (row: TryoutRegistration) => row.child ? `${row.child.first_name} ${row.child.last_name}` : t('common.unknown'),
    },
    {
      id: 'status',
      label: t('admin.tryouts.registrations.columns.status' as TranslationKey),
      render: (row: TryoutRegistration) => (
        <Badge variant={row.status === 'accepted' ? 'success' : row.status === 'declined' ? 'danger' : 'neutral'}>
          {t(`admin.tryouts.registrations.statuses.${row.status}` as TranslationKey)}
        </Badge>
      ),
    },
    {
      id: 'notes',
      label: t('admin.tryouts.registrations.columns.notes' as TranslationKey),
      render: (row: TryoutRegistration) => row.notes || t('common.table.emptyValue'),
    },
    {
      id: 'actions',
      label: t('common.actions'),
      align: 'right',
      render: (row: TryoutRegistration) => (
        <div className="oa-flex oa-gap-2 oa-justify-end">
          <Button
            size="compact"
            variant="ghost"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation()
              void applySingleStatus(row.id, 'offered')
            }}
          >
            {t('admin.tryouts.registrations.actions.offer' as TranslationKey)}
          </Button>
          <Button
            size="compact"
            variant="ghost"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation()
              void applySingleStatus(row.id, 'waitlisted')
            }}
          >
            {t('admin.tryouts.registrations.actions.waitlist' as TranslationKey)}
          </Button>
        </div>
      ),
    },
  ]

  const applySingleStatus = useCallback(
    async (registrationId: string, nextStatus: TryoutRegistration['status']) => {
      const response = await updateTryoutRegistrationStatus(context, registrationId, nextStatus)
      if (response.error) {
        showError(response.error.message)
        return
      }
      showSuccess(t('admin.tryouts.registrations.messages.updated' as TranslationKey))
      await fetchData()
    },
    [context, fetchData, t],
  )

  const applyBulkStatus = useCallback(
    async (nextStatus: TryoutRegistration['status']) => {
      if (selectedIds.size === 0 || actionLoading) return
      setActionLoading(true)

      const updates = await Promise.all(
        Array.from(selectedIds).map((id) => updateTryoutRegistrationStatus(context, id, nextStatus)),
      )

      const firstError = updates.find((response) => response.error)?.error
      setActionLoading(false)

      if (firstError) {
        showError(firstError.message)
        return
      }

      setSelectedIds(new Set())
      showSuccess(t('admin.tryouts.registrations.messages.bulkUpdated' as TranslationKey))
      await fetchData()
    },
    [actionLoading, context, fetchData, selectedIds, t],
  )

  if (!tryoutId) {
    return (
      <div className="oa-root">
        <Card>{t('common.error.notFound')}</Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
      <AdminPageHeader
        title={t('admin.tryouts.registrations.title' as TranslationKey)}
        subtitle={tryoutTitle || t('admin.tryouts.registrations.subtitle' as TranslationKey)}
        breadcrumbs={[
          { label: t('admin.tryouts.title'), path: '/admin/tryouts' },
          { label: tryoutTitle || t('admin.tryouts.registrations.title' as TranslationKey), path: `/admin/tryouts/${tryoutId}` },
          { label: t('admin.tryouts.registrations.title' as TranslationKey) },
        ]}
        actions={
          <Button variant="ghost" onClick={() => navigate(`/admin/tryouts/${tryoutId}`)}>
            {t('common.back')}
          </Button>
        }
      />

      <Card className="oa-mb-4">
        <div className="oa-grid oa-grid-cols-1 sm:oa-grid-cols-3 oa-gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.tryouts.registrations.searchPlaceholder' as TranslationKey)}
            label={t('common.search')}
          />
          <div>
            <label className="oa-label">{t('admin.tryouts.registrations.filterLabel' as TranslationKey)}</label>
            <select
              className="oa-input"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as TryoutRegistration['status'] | 'all')}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? t('common.all') : t(`admin.tryouts.registrations.statuses.${option}` as TranslationKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="oa-flex oa-items-end oa-gap-2">
            <Button
              variant="secondary"
              disabled={selectedIds.size === 0 || actionLoading}
              onClick={() => void applyBulkStatus('offered')}
            >
              {t('admin.tryouts.registrations.actions.offerSelected' as TranslationKey)}
            </Button>
            <Button
              variant="secondary"
              disabled={selectedIds.size === 0 || actionLoading}
              onClick={() => void applyBulkStatus('waitlisted')}
            >
              {t('admin.tryouts.registrations.actions.waitlistSelected' as TranslationKey)}
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="oa-mb-4 oa-text-danger">{error}</Card>
      )}

      <OrgDataTable
        columns={columns}
        rows={filteredRows}
        loading={loading}
        emptyMessage={t('admin.tryouts.registrations.empty' as TranslationKey)}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={filteredRows.length}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </div>
  )
}
