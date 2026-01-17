import { ReactNode } from 'react'

/**
 * Column configuration for PlatformDataTable
 */
export interface ColumnConfig<T> {
  id: keyof T | string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  minWidth?: number
  render?: (row: T) => ReactNode
}

interface PlatformDataTableProps<T extends { id: string }> {
  columns: ColumnConfig<T>[]
  rows: T[]
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
}

/**
 * Reusable data table with server-side pagination for platform admin pages
 */
export default function PlatformDataTable<T extends { id: string }>({
  columns = [],
  rows = [],
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
}: PlatformDataTableProps<T>) {
  // Defensive guard against null (if default didn't catch it due to explicit null pass)
  const safeRows = rows || []
  const safeColumns = columns || []

  const totalPages = Math.ceil(totalCount / rowsPerPage)
  const startRow = totalCount === 0 ? 0 : page * rowsPerPage + 1
  const endRow = Math.min((page + 1) * rowsPerPage, totalCount)

  const handleSort = (columnId: string) => {
    if (onSort) {
      onSort(columnId)
    }
  }

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
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
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
