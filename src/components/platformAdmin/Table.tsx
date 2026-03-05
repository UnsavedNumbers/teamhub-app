import type { ReactNode } from 'react'

export interface TableColumn<T> {
  /** Column ID (maps to data key) */
  id: keyof T | string
  /** Column header label */
  label: string
  /** Enable sorting for this column */
  sortable?: boolean
  /** Text alignment */
  align?: 'left' | 'center' | 'right'
  /** Cell type for styling */
  cellType?: 'primary' | 'secondary' | 'meta' | 'numeric'
  /** Custom render function */
  render?: (row: T) => ReactNode
}

interface TableProps<T extends { id: string | number }> {
  /** Column configuration */
  columns: TableColumn<T>[]
  /** Table data */
  data: T[]
  /** Current sort column */
  sortBy?: string
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Sort handler */
  onSort?: (columnId: string) => void
  /** Row click handler */
  onRowClick?: (row: T) => void
  /** Selected row IDs */
  selectedRows?: Set<T['id']>
  /** Selection handler */
  onSelectionChange?: (selectedIds: Set<T['id']>) => void
  /** Enable row selection */
  selectable?: boolean
  /** Enable zebra striping */
  zebra?: boolean
  /** Compact mode */
  compact?: boolean
  /** Loading state */
  loading?: boolean
  /** Empty state */
  emptyState?: ReactNode
  /** Pagination */
  pagination?: {
    currentPage: number
    totalPages: number
    rowsPerPage: number
    totalRows: number
    onPageChange: (page: number) => void
    onRowsPerPageChange: (rowsPerPage: number) => void
  }
}

/**
 * Table - Nike + Google Design System
 * 
 * Features:
 * - Sortable headers with hidden-until-hover icons
 * - Row hover states
 * - Selected rows with Volt accent bar
 * - Inline actions on hover
 * - Pagination footer
 * - Empty states
 * - Keyboard accessible
 */
export function Table<T extends { id: string | number }>({
  columns,
  data,
  sortBy,
  sortDirection = 'asc',
  onSort,
  onRowClick,
  selectedRows,
  onSelectionChange,
  selectable = false,
  zebra = false,
  compact = false,
  loading = false,
  emptyState,
  pagination,
}: TableProps<T>) {
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    if (checked) {
      onSelectionChange(new Set(data.map((row) => row.id)))
    } else {
      onSelectionChange(new Set<T['id']>())
    }
  }

  const handleSelectRow = (id: T['id'], checked: boolean) => {
    if (!onSelectionChange || !selectedRows) return
    const newSelection = new Set<T['id']>(selectedRows)
    if (checked) {
      newSelection.add(id)
    } else {
      newSelection.delete(id)
    }
    onSelectionChange(newSelection)
  }

  const allSelected = selectedRows && data.length > 0 && data.every((row) => selectedRows.has(row.id))

  if (loading) {
    return (
      <div className="pa-table-card">
        <div className="pa-table-wrapper">
          <table className="pa-table">
            <thead>
              <tr>
                {selectable && <th className="pa-checkbox-col" />}
                {columns.map((col) => (
                  <th key={String(col.id)}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td className="pa-checkbox-col" />}
                  {columns.map((col) => (
                    <td key={String(col.id)}>
                      <div className="pa-skeleton" style={{ width: '80%', height: '16px' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="pa-table-card">
        <div className="pa-table-empty">
          {emptyState || (
            <>
              <div className="pa-table-empty-icon">
                <span className="material-symbols-outlined">inbox</span>
              </div>
              <h3 className="pa-table-empty-title">NO DATA</h3>
              <p className="pa-table-empty-text">
                No records found. Try adjusting your filters.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pa-table-card">
      <div className="pa-table-wrapper overflow-safe-scroll">
        <table className={`pa-table min-w-full ${compact ? 'pa-table--compact' : ''} ${zebra ? 'pa-table--zebra' : ''}`}>
          <thead>
            <tr>
              {selectable && (
                <th className="pa-checkbox-col">
                  <input
                    type="checkbox"
                    className="pa-table-checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.id)}
                  className={col.sortable ? 'pa-sortable' : undefined}
                  onClick={col.sortable && onSort ? () => onSort(String(col.id)) : undefined}
                  style={{ textAlign: col.align }}
                >
                  {col.label}
                  {col.sortable && (
                    <span className={`pa-sort-icon ${sortBy === col.id ? 'pa-sorted' : ''}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {sortBy === col.id && sortDirection === 'desc' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isSelected = selectedRows?.has(row.id)
              const isClickable = !!onRowClick

              return (
                <tr
                  key={row.id}
                  className={`${isClickable ? 'pa-clickable' : ''} ${isSelected ? 'pa-selected' : ''}`}
                  onClick={isClickable ? () => onRowClick(row) : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onRowClick(row)
                          }
                        }
                      : undefined
                  }
                >
                  {selectable && (
                    <td className="pa-checkbox-col">
                      <input
                        type="checkbox"
                        className="pa-table-checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleSelectRow(row.id, e.target.checked)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select row ${row.id}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => {
                    const value = col.render
                      ? col.render(row)
                      : (row as Record<string, unknown>)[String(col.id)]

                    const cellClass = col.cellType ? `pa-cell-${col.cellType}` : undefined

                    return (
                      <td
                        key={String(col.id)}
                        className={cellClass}
                        style={{ textAlign: col.align }}
                      >
                        {value === null || value === undefined ? '—' : value as ReactNode}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="pa-table-footer">
          <div className="pa-table-footer-info">
            Showing {(pagination.currentPage - 1) * pagination.rowsPerPage + 1}–
            {Math.min(pagination.currentPage * pagination.rowsPerPage, pagination.totalRows)} of{' '}
            {pagination.totalRows}
          </div>

          <div className="pa-table-pagination">
            <span className="pa-table-pagination-label">Rows per page:</span>
            <select
              className="pa-table-pagination-select"
              value={pagination.rowsPerPage}
              onChange={(e) => pagination.onRowsPerPageChange(Number(e.target.value))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <div className="pa-table-pagination-controls">
              <button
                className="pa-table-pagination-btn"
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                aria-label="Previous page"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                className="pa-table-pagination-btn"
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                aria-label="Next page"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Table
