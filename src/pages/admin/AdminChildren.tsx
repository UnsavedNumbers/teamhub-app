import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminPageHeader, PlatformDataTable, Button } from '../../components/platformAdmin'
import AdminLoadingSpinner from '../../components/admin/AdminLoadingSpinner'
import type { ColumnConfig } from '../../components/platformAdmin/PlatformDataTable'
import { useUserContext } from '../../hooks/useUserContext'
import { getAthletes } from '../../data/services/familyService'
import { useT } from '../../i18n/useI18n'
import type { Child } from '../../types/family'
import { getLink } from '../../utils/routes'

type SortColumn = 'first_name' | 'date_of_birth' | ''
type SortOrder = 'asc' | 'desc'

export default function AdminChildren() {
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const t = useT()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Fetch athletes data
  const fetchAthletes = useCallback(async () => {
    if (!isReady) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await getAthletes(context)
      if (fetchError) {
        setError(fetchError)
        setChildren([])
      } else {
        setChildren(data || [])
        setError(null)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load athletes')
      setError(error)
      setChildren([])
    } finally {
      setLoading(false)
    }
  }, [context, isReady])

  useEffect(() => {
    fetchAthletes()
  }, [fetchAthletes])

  // Handle retry after error
  const handleRetry = useCallback(() => {
    fetchAthletes()
  }, [fetchAthletes])

  // Handle sorting
  const handleSort = useCallback((columnId: string) => {
    const column = columnId as SortColumn
    if (sortColumn === column) {
      // Toggle order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column with ascending order
      setSortColumn(column)
      setSortOrder('asc')
    }
    // Reset to first page when sorting changes
    setPage(0)
  }, [sortColumn, sortOrder])

  // Sort and paginate data
  const sortedAndPaginatedData = useMemo(() => {
    let sorted = [...children]

    // Apply sorting
    if (sortColumn) {
      sorted.sort((a, b) => {
        let aValue: any = a[sortColumn as keyof Child]
        let bValue: any = b[sortColumn as keyof Child]

        // Handle date_of_birth sorting
        if (sortColumn === 'date_of_birth') {
          aValue = aValue ? new Date(aValue).getTime() : 0
          bValue = bValue ? new Date(bValue).getTime() : 0
        } else if (sortColumn === 'first_name') {
          // Sort by first name, then last name
          const aFullName = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
          const bFullName = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
          if (aFullName < bFullName) return sortOrder === 'asc' ? -1 : 1
          if (aFullName > bFullName) return sortOrder === 'asc' ? 1 : -1
          return 0
        } else {
          // String comparison for other fields
          aValue = String(aValue || '').toLowerCase()
          bValue = String(bValue || '').toLowerCase()
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    const startIndex = page * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    return sorted.slice(startIndex, endIndex)
  }, [children, sortColumn, sortOrder, page, rowsPerPage])

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    const totalPages = Math.max(1, Math.ceil(children.length / rowsPerPage))
    const safePage = Math.max(0, Math.min(newPage, totalPages - 1))
    setPage(safePage)
  }, [children.length, rowsPerPage])

  // Handle rows per page change
  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage)
    setPage(0) // Reset to first page
  }, [])

  // Handle row click - navigate to athlete detail if available, otherwise to family
  const handleRowClick = useCallback((child: Child) => {
    if (!child?.id) {
      console.warn('[AdminChildren] Cannot navigate: athlete missing ID', child)
      return
    }
    
    try {
      // Navigate to athlete detail page (preferred)
      navigate(getLink('admin.athletes.detail', { id: child.id }))
    } catch (err) {
      console.error('[AdminChildren] Navigation error:', err)
      // Fallback to family if athlete detail fails
      if (child.family_id) {
        navigate(getLink('admin.guardians.detail', { id: child.family_id }))
      }
    }
  }, [navigate])

  // Handle "View Family" link click
  const handleViewFamily = useCallback((e: React.MouseEvent, familyId: string | null | undefined) => {
    e.stopPropagation()
    if (!familyId) {
      console.warn('[AdminChildren] Cannot view family: missing family_id')
      return
    }
    try {
      navigate(getLink('admin.guardians.detail', { id: familyId }))
    } catch (err) {
      console.error('[AdminChildren] Navigation error to family:', err)
    }
  }, [navigate])

  // Handle "Import Athletes" button click
  const handleImportClick = useCallback(() => {
    if (loading) return
    try {
      navigate(getLink('admin.athletes.import'))
    } catch (err) {
      console.error('[AdminChildren] Navigation error to import:', err)
    }
  }, [navigate, loading])

  // Handle "Add Athlete" button click
  const handleAddAthleteClick = useCallback(() => {
    if (loading) return
    try {
      navigate(getLink('admin.athletes.create'))
    } catch (err) {
      console.error('[AdminChildren] Navigation error to create:', err)
    }
  }, [navigate, loading])

  const columns: ColumnConfig<Child>[] = useMemo(() => [
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
        c?.family_id ? (
          <span 
            className="pa-link"
            onClick={(e) => handleViewFamily(e, c.family_id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleViewFamily(e as any, c.family_id)
              }
            }}
            aria-label={`View family for ${c.first_name} ${c.last_name}`}
          >
            View Family
          </span>
        ) : (
          <span className="pa-text-muted">—</span>
        )
      )
    }
  ], [handleViewFamily])

  if (!isReady) return <AdminLoadingSpinner />

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title={t('admin.children.title')}
        actions={
          <div className="pa-flex pa-gap-2">
            <Button 
              onClick={handleImportClick} 
              icon="upload_file" 
              variant="secondary"
              disabled={loading}
            >
              Import Athletes
            </Button>
            <Button 
              onClick={handleAddAthleteClick} 
              icon="add"
              disabled={loading}
            >
              Add Athlete
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="pa-card">
          <div className="pa-p-4 pa-bg-danger-subtle pa-rounded">
            <div className="pa-flex pa-items-center pa-gap-3 pa-mb-3">
              <span className="material-symbols-outlined pa-text-danger" style={{ fontSize: '24px' }}>
                error
              </span>
              <div className="pa-flex-1">
                <h3 className="pa-text-danger pa-font-semibold pa-mb-1">
                  {t('admin.children.errorLoading')}
                </h3>
                <p className="pa-text-danger pa-text-sm">
                  {error.message || 'An error occurred while loading athletes'}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleRetry} 
              variant="primary"
              icon="refresh"
            >
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <PlatformDataTable
          data={sortedAndPaginatedData}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          emptyMessage={t('admin.children.emptyMessage')}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={children.length}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          orderBy={sortColumn}
          order={sortOrder}
          onSort={handleSort}
        />
      )}
    </div>
  )
}
