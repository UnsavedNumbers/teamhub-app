import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPageHeader, Button, Badge, ErrorState, Card } from '../../components/admin'
import PullToRefreshContainer from '../../components/common/mobile/PullToRefreshContainer'
import OrgDataTable from '../../components/admin/OrgDataTable'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import type { ColumnConfig } from '../../components/admin/OrgDataTable'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getFamilies } from '../../data/services/familyService'
import type { Family } from '../../types/family'
import { getLink } from '../../utils/routes'
import { showError } from '../../utils/toast'
import { cn } from '../../utils/cn'
import '../../styles/orgAdmin.css'

export default function AdminFamilies() {
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const t = useT()
  const [families, setFamilies] = useState<Family[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Pagination state
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  
  // Sorting state
  const [orderBy, setOrderBy] = useState<string>('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  
  // Navigation state (prevent double-clicks)
  const [isNavigating, setIsNavigating] = useState(false)

  const fetchFamilies = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Fetch all families (we'll paginate client-side for now)
      // In production, you might want server-side pagination
      const { data, error: fetchError } = await getFamilies(context, { limit: 10000 })
      
      if (fetchError) {
        setError(fetchError)
        showError(`Failed to load families: ${fetchError.message}`)
      } else {
        setFamilies(data || [])
        setError(null)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred')
      setError(error)
      showError(`Failed to load families: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [context, isReady])

  useEffect(() => {
    fetchFamilies()
  }, [fetchFamilies])

  // Sort families based on current sort settings
  // Must be defined before handlers that use it
  const sortedFamilies = useMemo(() => {
    if (!families.length) return []
    
    const sorted = [...families].sort((a, b) => {
      let aValue: any
      let bValue: any
      
      if (orderBy === 'name') {
        aValue = (a.name || 'Unnamed Family').toLowerCase()
        bValue = (b.name || 'Unnamed Family').toLowerCase()
      } else if (orderBy === 'created_at') {
        aValue = a.created_at ? new Date(a.created_at).getTime() : 0
        bValue = b.created_at ? new Date(b.created_at).getTime() : 0
      } else {
        // Default to created_at if unknown column
        aValue = a.created_at ? new Date(a.created_at).getTime() : 0
        bValue = b.created_at ? new Date(b.created_at).getTime() : 0
      }
      
      if (aValue < bValue) return order === 'asc' ? -1 : 1
      if (aValue > bValue) return order === 'asc' ? 1 : -1
      return 0
    })
    
    return sorted
  }, [families, orderBy, order])

  // Paginate sorted families
  const sortedAndPaginatedFamilies = useMemo(() => {
    const start = page * rowsPerPage
    const end = start + rowsPerPage
    return sortedFamilies.slice(start, end)
  }, [sortedFamilies, page, rowsPerPage])

  // Handle sorting
  const handleSort = useCallback((columnId: string) => {
    if (orderBy === columnId) {
      // Toggle order if clicking same column
      setOrder(order === 'asc' ? 'desc' : 'asc')
    } else {
      // New column, default to ascending
      setOrderBy(columnId)
      setOrder('asc')
    }
    // Reset to first page when sorting changes
    setPage(0)
  }, [orderBy, order])

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 0) return
    // Calculate max page from total count, not paginated array
    const maxPage = Math.max(0, Math.ceil(sortedFamilies.length / rowsPerPage) - 1)
    if (newPage > maxPage) return
    setPage(newPage)
  }, [sortedFamilies.length, rowsPerPage])

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage)
    setPage(0) // Reset to first page
  }, [])

  // Handle row click navigation
  const handleRowClick = useCallback((family: Family) => {
    if (isNavigating || !family?.id) return
    
    try {
      setIsNavigating(true)
      const link = getLink('admin.guardians.detail', { id: family.id })
      if (!link) {
        showError('Invalid family ID')
        return
      }
      navigate(link)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Navigation failed')
      showError(`Failed to navigate: ${error.message}`)
      setIsNavigating(false)
    }
  }, [navigate, isNavigating])

  // Handle Add Athlete button click
  const handleAddAthlete = useCallback(() => {
    if (isNavigating) return
    
    try {
      setIsNavigating(true)
      const link = getLink('admin.athletes.create')
      if (!link) {
        showError('Unable to navigate to create athlete page')
        setIsNavigating(false)
        return
      }
      navigate(link)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Navigation failed')
      showError(`Failed to navigate: ${error.message}`)
      setIsNavigating(false)
    }
  }, [navigate, isNavigating])

  const columns: ColumnConfig<Family>[] = [
    {
      id: 'name',
      label: 'Family Name',
      sortable: true,
      render: (row) => <span className="oa-text-primary" style={{ fontWeight: 600 }}>{row?.name || 'Unnamed Family'}</span>
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
    <div className="oa-root">
      <PullToRefreshContainer onRefresh={fetchFamilies}>
      <AdminPageHeader 
        title={t('admin.families.title')} 
        subtitle={t('admin.families.subtitle')}
        actions={
          <Button 
            onClick={handleAddAthlete}
            disabled={isNavigating || loading}
          >
            <span className="material-symbols-outlined">add</span>
            {t('admin.families.addChild')}
          </Button>
        }
      />

      {/* Info Banner */}
      <Card className={cn('oa-mb-6', 'oa-overflow-hidden')}>
        <div className={cn('oa-flex', 'oa-items-start', 'oa-gap-3', 'oa-p-4')} style={{ background: 'var(--oa-info-bg, #eff6ff)' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--oa-info-text, #1d4ed8)', fontSize: '20px', marginTop: '2px' }}>info</span>
          <div>
            <h3 className={cn('oa-text-sm', 'oa-font-semibold', 'oa-mb-1')} style={{ color: 'var(--oa-info-text, #1e3a8a)' }}>
              Families are Created Automatically
            </h3>
            <p className={cn('oa-text-sm')} style={{ color: 'var(--oa-info-text, #1e40af)' }}>
              Families are automatically formed when athletes share guardians. To create a new family,
              simply add athletes and link their guardians. Athletes with shared guardians will appear
              together as a family.
            </p>
          </div>
        </div>
      </Card>

      {error && !loading ? (
        <ErrorState 
          title="Error Loading Families"
          message={error.message}
          onRetry={fetchFamilies}
        />
      ) : (
        <OrgDataTable
          rows={sortedAndPaginatedFamilies}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage="No families yet. Add athletes with guardians to automatically create families."
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={sortedFamilies.length}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          orderBy={orderBy}
          order={order}
          onSort={handleSort}
        />
      )}
      </PullToRefreshContainer>
    </div>
  )
}
