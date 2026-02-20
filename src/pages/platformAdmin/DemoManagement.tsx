import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnConfig } from '@/components/platformAdmin'
import {
  Button,
  ConfirmDialog,
  FilterBar,
  PageHeader,
  PlatformDataTable,
} from '@/components/platformAdmin'
import DemoOrgForm from '@/components/platformAdmin/DemoOrgForm'
import InitiateDemoDialog from '@/components/platformAdmin/InitiateDemoDialog'
import {
  createDemoOrg,
  listDemoOrgs,
  listPOCs,
  updateDemoOrg,
} from '@/data/services/demoOrgService'
import { listDemoCodesForOrg, revokeAllDemoCodesForOrg } from '@/data/services/demoCodeService'
import type { CreateDemoOrgInput, DemoOrgFilters, DemoOrgPOC, DemoOrganization } from '@/types/demoManagement'
import { getLink } from '@/utils/routes'
import { useI18n } from '@/i18n/useI18n'

interface DemoOrgRow extends DemoOrganization {
  pocs: DemoOrgPOC[]
  primaryPoc: DemoOrgPOC | null
  codeCount: number
}

export default function DemoManagement() {
  const { t } = useI18n()
  const navigate = useNavigate()

  const [filters, setFilters] = useState<DemoOrgFilters>({ search: '', status: 'all' })
  const [rows, setRows] = useState<DemoOrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [formOpen, setFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<DemoOrganization | null>(null)
  const [initiateOrg, setInitiateOrg] = useState<DemoOrganization | null>(null)
  const [revokeOrg, setRevokeOrg] = useState<DemoOrganization | null>(null)

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const orgs = await listDemoOrgs(filters)

      const enriched = await Promise.all(
        orgs.map(async (org) => {
          const [pocs, codes] = await Promise.all([listPOCs(org.id), listDemoCodesForOrg(org.id)])
          const primaryPoc = pocs.find((entry) => entry.is_primary) ?? pocs[0] ?? null
          return {
            ...org,
            pocs,
            primaryPoc,
            codeCount: codes.length,
          } satisfies DemoOrgRow
        }),
      )

      setRows(enriched)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.loadFailed'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [filters, t])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage
    return rows.slice(start, start + rowsPerPage)
  }, [rows, page, rowsPerPage])

  const handleFormSubmit = async (input: CreateDemoOrgInput): Promise<void> => {
    setFormLoading(true)
    setError(null)

    try {
      if (selectedOrg) {
        await updateDemoOrg(selectedOrg.id, input)
      } else {
        await createDemoOrg(input)
      }
      setFormOpen(false)
      setSelectedOrg(null)
      await loadRows()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.updateFailed'))
    } finally {
      setFormLoading(false)
    }
  }

  const handleRevokeAllCodes = async (): Promise<void> => {
    if (!revokeOrg) return

    try {
      await revokeAllDemoCodesForOrg(revokeOrg.id)
      setRevokeOrg(null)
      await loadRows()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('common.error.updateFailed'))
    }
  }

  const columns: ColumnConfig<DemoOrgRow>[] = [
    {
      id: 'name',
      label: t('platformAdmin.demoManagement.table.name'),
      render: (row) => row.name,
    },
    {
      id: 'location',
      label: t('platformAdmin.demoManagement.table.location'),
      render: (row) => `${row.city ?? '-'}, ${row.state ?? '-'}`,
    },
    {
      id: 'sports',
      label: t('platformAdmin.demoManagement.table.sports'),
      render: (row) => row.sports_sponsored.join(', '),
    },
    {
      id: 'primaryPoc',
      label: t('platformAdmin.demoManagement.table.primaryPoc'),
      render: (row) => {
        if (!row.primaryPoc) return t('platformAdmin.demoManagement.table.none')
        const name = `${row.primaryPoc.first_name} ${row.primaryPoc.last_name}`.trim() || '—'
        const email = row.primaryPoc.email || ''
        const phone = row.primaryPoc.phone || ''
        const parts = [name, email, phone].filter(Boolean)
        return parts.join(' • ') || '—'
      },
    },
    {
      id: 'codeCount',
      label: t('platformAdmin.demoManagement.table.codes'),
      align: 'right',
      render: (row) => String(row.codeCount),
    },
    {
      id: 'status',
      label: t('platformAdmin.demoManagement.table.status'),
      render: (row) => row.status,
    },
    {
      id: 'updated_at',
      label: t('platformAdmin.demoManagement.table.updated'),
      render: (row) => new Date(row.updated_at).toLocaleDateString(),
    },
    {
      id: 'actions',
      label: t('common.actions'),
      render: (row) => (
        <div className="pa-flex pa-gap-2" onClick={(event) => event.stopPropagation()}>
          <Button variant="ghost" size="dense" onClick={() => { setSelectedOrg(row); setFormOpen(true) }}>
            {t('common.edit')}
          </Button>
          <Button variant="ghost" size="dense" onClick={() => setInitiateOrg(row)}>
            {t('platformAdmin.demoManagement.actions.initiate')}
          </Button>
          <Button variant="ghost" size="dense" onClick={() => setRevokeOrg(row)}>
            {t('platformAdmin.demoManagement.actions.revokeAll')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('platformAdmin.demoManagement.title')}
        subtitle={t('platformAdmin.demoManagement.subtitle')}
      />

      <div className="pa-mb-4">
        <Button onClick={() => { setSelectedOrg(null); setFormOpen(true) }} icon="add">
          {t('platformAdmin.demoManagement.actions.create')}
        </Button>
      </div>

      <FilterBar
        searchValue={filters.search ?? ''}
        onSearchChange={(value) => {
          setFilters((previous) => ({ ...previous, search: value }))
          setPage(0)
        }}
        searchPlaceholder={t('platformAdmin.demoManagement.filters.searchPlaceholder')}
        statusOptions={[
          { value: 'active', label: t('platformAdmin.demoManagement.status.active') },
          { value: 'inactive', label: t('platformAdmin.demoManagement.status.inactive') },
        ]}
        statusValue={filters.status === 'all' ? '' : filters.status}
        onStatusChange={(value) => {
          setFilters((previous) => ({ ...previous, status: value ? (value as 'active' | 'inactive') : 'all' }))
          setPage(0)
        }}
        statusLabel={t('platformAdmin.demoManagement.filters.status')}
        onClearAll={() => {
          setFilters({ search: '', status: 'all' })
          setPage(0)
        }}
      />

      {error && <div className="pa-text-danger pa-mb-3">{error}</div>}

      <PlatformDataTable
        columns={columns}
        rows={pagedRows}
        loading={loading}
        emptyMessage={t('platformAdmin.demoManagement.empty')}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={rows.length}
        onPageChange={setPage}
        onRowsPerPageChange={(size) => {
          setRowsPerPage(size)
          setPage(0)
        }}
        onRowClick={(row) => navigate(getLink('platformAdmin.demoManagement.detail', { id: row.id }))}
      />

      <DemoOrgForm
        open={formOpen}
        initialValue={selectedOrg}
        loading={formLoading}
        error={error}
        onClose={() => {
          setFormOpen(false)
          setSelectedOrg(null)
        }}
        onSubmit={handleFormSubmit}
      />

      <InitiateDemoDialog
        open={Boolean(initiateOrg)}
        orgId={initiateOrg?.id ?? ''}
        pocs={initiateOrg ? rows.find((row) => row.id === initiateOrg.id)?.pocs ?? [] : []}
        onClose={() => setInitiateOrg(null)}
        onCreated={() => {
          void loadRows()
        }}
      />

      <ConfirmDialog
        open={Boolean(revokeOrg)}
        title={t('platformAdmin.demoManagement.revokeAll.title')}
        description={t('platformAdmin.demoManagement.revokeAll.description')}
        confirmLabel={t('platformAdmin.demoManagement.revokeAll.confirm')}
        onConfirm={() => {
          void handleRevokeAllCodes()
        }}
        onCancel={() => setRevokeOrg(null)}
        variant="danger"
      />
    </div>
  )
}
