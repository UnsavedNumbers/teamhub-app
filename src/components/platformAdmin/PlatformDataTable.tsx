import { ReactNode } from 'react'
import { Checkbox } from './Checkbox'

/**
 * Column configuration for PlatformDataTable
 */
export interface ColumnConfig<T> {
  id: keyof T | string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  minWidth?: number
  render?: (row: any) => ReactNode
}

interface PlatformDataTableProps<T extends { id: string }> {
  columns: ColumnConfig<T>[]
  data?: T[]
  rows?: T[]
  loading?: boolean
  emptyMessage?: string
  page: number
  rowsPerPage: number
  totalCount: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (rowsPerPage: number) => void
  onRowClick?: (row: T) => void
  orderBy?: string
  order?: 'asc' | 'desc'
  onSort?: (column: string) => void
  // Selection props
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  selectAllMode?: 'none' | 'page' | 'all'
  onSelectAllChange?: (mode: 'none' | 'page' | 'all') => void
}

/**
 * Reusable data table with server-side pagination for platform admin pages
 */
export default function PlatformDataTable<T extends { id: string }>({
  columns = [],
  data,
  rows,
  loading = false,
  emptyMessage = 'No data available',
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
  orderBy,
  order = 'asc',
  onSort,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  selectAllMode = 'none',
  onSelectAllChange,
}: PlatformDataTableProps<T>) {
  // Defensive guard against null (if default didn't catch it due to explicit null pass)
  const safeRows = (data || rows) || []
  const safeColumns = columns || []

  const totalPages = Math.ceil(totalCount / rowsPerPage)
  const startRow = totalCount === 0 ? 0 : page * rowsPerPage + 1
  const endRow = Math.min((page + 1) * rowsPerPage, totalCount)

  const handleSort = (columnId: string) => {
    if (onSort) {
      onSort(columnId)
    }
  }

  // Selection handlers
  const handleRowToggle = (rowId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }
    if (!onSelectionChange) return

    onSelectionChange((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })

    // Clear select-all mode when individual selection changes
    if (onSelectAllChange) {
      onSelectAllChange('none')
    }
  }

  const handleSelectAll = (event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }
    if (!onSelectionChange || !onSelectAllChange) return

    if (selectAllMode === 'all') {
      // Clear all
      onSelectionChange(new Set())
      onSelectAllChange('none')
    } else if (selectAllMode === 'page') {
      // Clear page selection
      onSelectionChange(new Set())
      onSelectAllChange('none')
    } else {
      // Select all on current page
      const pageIds = new Set(safeRows.map(r => r.id))
      onSelectionChange((prev) => {
        const next = new Set(prev)
        pageIds.forEach(id => next.add(id))
        return next
      })
      onSelectAllChange('page')
    }
  }

  // Determine header checkbox state
  const headerCheckboxState =
    selectAllMode === 'all'
      ? 'checked'
      : selectAllMode === 'page'
      ? 'checked'
      : selectedIds.size === 0
      ? 'unchecked'
      : selectedIds.size === safeRows.length && safeRows.every(r => selectedIds.has(r.id))
      ? 'checked'
      : 'indeterminate'

  if (loading) {
    return (
      <div className="pa-card">
        <div style={{ padding: 'var(--pa-space-8)', textAlign: 'center' }}>
          <div className="pa-skeleton" style={{ width: '100%', height: '300px' }} />
        </div>
      </div>
    )
  }

  if (safeRows.length === 0) {
    return (
      <div className="pa-card">
        <div className="pa-empty">
          <div className="pa-empty-icon">
            <span className="material-symbols-outlined">inbox</span>
          </div>
          <h3 className="pa-empty-title">NO DATA</h3>
          <p className="pa-empty-text">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pa-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="pa-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {/* Selection column */}
              {selectable && (
                <th
                  style={{
                    width: '48px',
                    textAlign: 'center',
                    padding: 'var(--pa-space-2)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectAll(e)
                  }}
                >
                  <Checkbox
                    checked={headerCheckboxState === 'checked'}
                    indeterminate={headerCheckboxState === 'indeterminate'}
                    onChange={() => handleSelectAll()}
                    label=""
                    style={{ margin: 0 }}
                  />
                </th>
              )}
              {safeColumns.map((column) => (
                <th
                  key={String(column.id)}
                  className={`${column.sortable && onSort ? 'pa-sortable' : ''} ${
                    orderBy === column.id ? 'pa-sorted' : ''
                  }`}
                  style={{
                    textAlign: column.align || 'left',
                    minWidth: column.minWidth,
                    cursor: column.sortable && onSort ? 'pointer' : 'default',
                  }}
                  onClick={() => column.sortable && onSort && handleSort(String(column.id))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
                    <span>{column.label}</span>
                    {column.sortable && onSort && (
                      <span
                        className="material-symbols-outlined pa-sort-icon"
                        style={{ fontSize: '16px' }}
                      >
                        {orderBy === column.id
                          ? order === 'asc'
                            ? 'arrow_upward'
                            : 'arrow_downward'
                          : 'unfold_more'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row) => (
              <tr
                key={row.id}
                className={onRowClick ? 'pa-clickable' : ''}
                onClick={() => onRowClick?.(row)}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  backgroundColor: selectable && selectedIds.has(row.id) ? 'var(--pa-primary-bg, rgba(59, 130, 246, 0.1))' : undefined,
                }}
              >
                {/* Selection checkbox */}
                {selectable && (
                  <td
                    style={{
                      width: '48px',
                      textAlign: 'center',
                      padding: 'var(--pa-space-2)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRowToggle(row.id, e)
                    }}
                  >
                    <Checkbox
                      checked={selectedIds.has(row.id)}
                      onChange={() => handleRowToggle(row.id)}
                      label=""
                      style={{ margin: 0 }}
                    />
                  </td>
                )}
                {safeColumns.map((column) => (
                  <td
                    key={String(column.id)}
                    style={{ textAlign: column.align || 'left' }}
                  >
                    {column.render
                      ? column.render(row)
                      : String(row[column.id as keyof T] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--pa-space-4)',
          borderTop: '1px solid var(--pa-n100)',
          background: 'var(--pa-n25)',
        }}
      >
        {/* Rows per page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)' }}>
          <span className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
            Rows per page:
          </span>
          <select
            className="pa-input pa-select"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            style={{ width: 'auto', height: '36px', padding: '0 var(--pa-space-3)' }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Page info */}
        <span className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
          {startRow}–{endRow} of {totalCount}
        </span>

        {/* Page controls */}
        <div style={{ display: 'flex', gap: 'var(--pa-space-2)' }}>
          <button
            className="pa-btn pa-btn--ghost pa-btn--dense"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            className="pa-btn pa-btn--ghost pa-btn--dense"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            aria-label="Next page"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}
