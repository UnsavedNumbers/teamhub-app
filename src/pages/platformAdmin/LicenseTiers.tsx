import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, PlatformDataTable, FilterBar, Button, Badge, type ColumnConfig } from '../../components/platformAdmin'
import type { LicenseTierWithCounts } from '../../types/licenseTiers.types'

export default function LicenseTiers() {
  const [tiers, setTiers] = useState<LicenseTierWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  const navigate = useNavigate()

  const fetchTiers = useCallback(async () => {
    setLoading(true)

    try {
      let query = supabase
        .from('admin_license_tiers_list')
        .select('*', { count: 'exact' })

      if (search) {
        query = query.or(`tier_name.ilike.%${search}%,tier_key.ilike.%${search}%,stripe_price_id.ilike.%${search}%`)
      }

      query = query.order('tier_key', { ascending: true })

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching tiers:', error)
        setTiers([])
        setTotalCount(0)
      } else {
        setTiers(data as LicenseTierWithCounts[])
        setTotalCount(count || 0)
      }
    } catch (err) {
      console.error('Error:', err)
      setTiers([])
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, search])

  useEffect(() => {
    fetchTiers()
  }, [fetchTiers])

  const formatCurrency = (cents: number | null, currency: string | null) => {
    if (!cents || !currency) return '—'
    const amount = cents / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount)
  }

  const columns: ColumnConfig<LicenseTierWithCounts>[] = [
    {
      id: 'tier_name',
      label: 'Tier Name',
      sortable: true,
      render: (row) => (
        <div>
          <a
            href={`/platform-admin/licenses/tiers/${row.id}`}
            onClick={(e) => {
              e.preventDefault()
              navigate(`/platform-admin/licenses/tiers/${row.id}`)
            }}
            className="pa-body-m"
            style={{
              fontWeight: 600,
              color: 'var(--pa-theme-action-primary, var(--pa-n900))',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none'
            }}
          >
            {row.tier_name}
          </a>
          <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
            {row.tier_key}
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'stripe_price_id',
      label: 'Stripe Price ID',
      render: (row) => (
        <div>
          {row.stripe_price_id ? (
            <a
              href={`https://dashboard.stripe.com/prices/${row.stripe_price_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pa-body-m"
              style={{
                fontFamily: 'var(--pa-font-mono)',
                fontSize: '12px',
                color: 'var(--pa-theme-action-primary, var(--pa-n900))',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              {row.stripe_price_id}
            </a>
          ) : (
            <div className="pa-body-m" style={{ fontFamily: 'var(--pa-font-mono)', fontSize: '12px' }}>
              —
            </div>
          )}
          {row.stripe_verified_at && (
            <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                check_circle
              </span>
              {' '}Verified
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'stripe_currency',
      label: 'Currency',
      render: (row) => (
        <div>
          {row.stripe_currency ? row.stripe_currency.toUpperCase() : '—'}
          {row.stripe_amount_cents && row.stripe_currency && (
            <div className="pa-body-s" style={{ color: 'var(--pa-n500)', marginTop: '4px' }}>
              {formatCurrency(row.stripe_amount_cents, row.stripe_currency)}
              {row.stripe_interval && ` / ${row.stripe_interval}`}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'included_features_count',
      label: 'Features',
      align: 'center',
      render: (row) => (
        <div className="pa-body-m">{row.included_features_count}</div>
      ),
    },
    {
      id: 'orgs_using_count',
      label: 'Organizations',
      align: 'center',
      render: (row) => (
        <div className="pa-body-m">{row.orgs_using_count}</div>
      ),
    },
    {
      id: 'updated_at',
      label: 'Last Updated',
      render: (row) => (
        <div className="pa-body-s" style={{ color: 'var(--pa-n500)' }}>
          {new Date(row.updated_at).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            size="dense"
            onClick={() => navigate(`/platform-admin/licenses/tiers/${row.id}`)}
          >
            View/Edit
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="License Tiers"
        subtitle="Manage Basic and Power license tiers"
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/platform-admin/licenses/tiers/new')}
          >
            Create Tier
          </Button>
        }
      />

      <div style={{ marginBottom: 'var(--pa-space-4)' }}>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tiers..."
          onClearAll={() => setSearch('')}
        />
      </div>

      <PlatformDataTable
        columns={columns}
        rows={tiers}
        loading={loading}
        emptyMessage="No license tiers found. Try adjusting your search or create a new tier."
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </div>
  )
}
