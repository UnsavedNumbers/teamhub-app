import { useState, useMemo } from 'react'
import { cn } from '../../utils/cn'
import { useT } from '../../i18n/useI18n'

export interface ColumnConfig<T> {
  id: keyof T | string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  minWidth?: number
  render?: (row: any) => React.ReactNode
}

export interface OrgDataTableProps<T extends { id: string }> {
  columns: ColumnConfig<T>[]
  data?: T[]
  rows?: T[]
  loading?: boolean
  emptyMessage?: string
  page?: number
  rowsPerPage?: number
  totalCount?: number
  onPageChange?: (page: number) => void
  onRowsPerPageChange?: (rowsPerPage: number) => void
  onRowClick?: (row: T) => void
  getRowClassName?: (row: T) => string
  getRowStyle?: (row: T) => React.CSSProperties
  orderBy?: string
  order?: 'asc' | 'desc'
  onSort?: (column: string) => void
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  selectAllMode?: 'all' | 'none' | 'page'
  onSelectAllChange?: (mode: 'all' | 'none' | 'page') => void
}

/**
 * Org Admin Data Table - uses oa-* classes only (no pa-*).
 * For use in organization admin views. Resolves colors from org theme.
 */
export default function OrgDataTable<T extends { id: string }>({
  columns = [],
  data,
  rows,
  loading = false,
  emptyMessage,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange,
  onRowClick,
  getRowClassName,
  getRowStyle,
  orderBy,
  order = 'asc',
  onSort,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  selectAllMode = 'none',
  onSelectAllChange,
}: OrgDataTableProps<T>) {
  const t = useT()
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set())

  // Support both `data` and `rows` props for backwards compatibility
  const safeRows = rows ?? data ?? []
  const safeColumns = columns ?? []

  // Use controlled or local selection state
  const effectiveSelectedIds = onSelectionChange ? selectedIds : localSelectedIds
  const setEffectiveSelectedIds = onSelectionChange ?? setLocalSelectedIds

  // Calculate pagination values
  const startRow = page * rowsPerPage + 1
  const endRow = Math.min((page + 1) * rowsPerPage, totalCount)
  const pageCount = Math.ceil(totalCount / rowsPerPage)

  const handleSelectAll = () => {
    if (selectAllMode === 'all' || selectAllMode === 'page') {
      onSelectAllChange?.('none')
    } else {
      onSelectAllChange?.('page')
    }
  }

  const handleRowSelect = (rowId: string) => {
    const newSelection = new Set(effectiveSelectedIds)
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId)
    } else {
      newSelection.add(rowId)
    }
    setEffectiveSelectedIds(newSelection)
  }

  const resolvedEmptyMessage = useMemo(() => {
    if (emptyMessage) return emptyMessage
    if (loading) return 'Loading...'
    return 'No results found'
  }, [emptyMessage, loading])

  // Empty state
  if (loading && safeRows.length === 0) {
    return (
      <div className="oa-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="oa-table-empty">
          <div className="oa-empty-icon">
            <span className="material-symbols-outlined">hourglass_empty</span>
          </div>
          <h3 className="oa-empty-title">Loading...</h3>
          <p className="oa-empty-text">Please wait while we load your data</p>
        </div>
      </div>
    )
  }

  if (!loading && safeRows.length === 0) {
    return (
      <div className="oa-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="oa-table-empty">
          <div className="oa-empty-icon">
            <span className="material-symbols-outlined">inbox</span>
          </div>
          <h3 className="oa-empty-title">No items found</h3>
          <p className="oa-empty-text">{resolvedEmptyMessage}</p>
        </div>
      </div>
    )
  }

  // Get first column as key field (usually name/title)
  // Note: These variables are used by the column iteration logic

  return (
    <div className="oa-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Top Pagination */}
      <div
        className={cn('oa-flex', 'oa-flex-col', 'oa-items-stretch', 'oa-gap-3', 'oa-table-pagination')}
        style={{
          padding: 'var(--oa-space-3)',
        }}
      >
        {/* Rows per page */}
        <div
          className={cn('oa-flex', 'oa-items-center', 'oa-gap-2', 'oa-table-pagination-controls')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <span className="oa-body-s oa-table-pagination-label">
            {t('common.table.rowsPerPage')}
          </span>
          <select
            className="oa-input oa-select"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
            style={{ height: '44px', padding: '0 var(--oa-space-3)', minWidth: '4.5rem' }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Page info */}
        <span className="oa-body-s oa-text-center oa-table-pagination-info">
          {t('common.table.pageSummary', { start: startRow, end: endRow, total: totalCount })}
        </span>

        {/* Page controls */}
        <div className={cn('oa-flex', 'oa-gap-2', 'oa-justify-center')}>
          <button
            className="oa-btn oa-btn--ghost oa-btn--dense"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page === 0}
            aria-label={t('common.table.previousPage')}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            className="oa-btn oa-btn--ghost oa-btn--dense"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= pageCount - 1 || pageCount <= 1}
            aria-label={t('common.table.nextPage')}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="oa-table-container">
        <table className="oa-table">
          <thead className="oa-table-header">
            <tr className="oa-table-header-row">
              {selectable && (
                <th className="oa-table-header-cell" style={{ width: '48px' }}>
                  <input
                    type="checkbox"
                    checked={selectAllMode === 'all' || selectAllMode === 'page'}
                    onChange={handleSelectAll}
                    className="oa-checkbox"
                  />
                </th>
              )}
              {safeColumns.map((column) => (
                <th
                  key={String(column.id)}
                  className={cn('oa-table-header-cell', {
                    'oa-table-header-cell--sortable': !!column.sortable,
                  })}
                  style={{
                    minWidth: column.minWidth,
                    textAlign: column.align ?? 'left',
                  }}
                  onClick={() => column.sortable && onSort?.(String(column.id))}
                >
                  <div className="oa-table-header-content">
                    <span>{column.label}</span>
                    {column.sortable && orderBy === String(column.id) && (
                      <span className="material-symbols-outlined oa-table-sort-icon">
                        {order === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="oa-table-body">
            {safeRows.map((row) => {
              const isSelected = effectiveSelectedIds.has(row.id)
              const rowClass = getRowClassName?.(row)
              const rowStyle = getRowStyle?.(row)

              return (
                <tr
                  key={row.id}
                  className={cn(
                    'oa-table-row',
                    {
                      'oa-table-row--clickable': !!onRowClick,
                      'oa-table-row--selected': isSelected,
                    },
                    rowClass
                  )}
                  style={rowStyle}
                  onClick={() => !selectable && onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="oa-table-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelect(row.id)}
                        className="oa-checkbox"
                      />
                    </td>
                  )}
                  {safeColumns.map((column) => (
                    <td
                      key={String(column.id)}
                      className="oa-table-cell"
                      style={{ textAlign: column.align ?? 'left' }}
                    >
                      {column.render
                        ? column.render(row)
                        : String((row as any)[column.id] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
      <div
        className={cn('oa-flex', 'oa-flex-col', 'oa-items-stretch', 'oa-gap-3', 'oa-table-pagination')}
        style={{
          padding: 'var(--oa-space-3)',
          borderTop: '1px solid var(--org-border-default, var(--oa-n200))',
        }}
      >
        {/* Rows per page */}
        <div
          className={cn('oa-flex', 'oa-items-center', 'oa-gap-2', 'oa-table-pagination-controls')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <span className="oa-body-s oa-table-pagination-label">
            {t('common.table.rowsPerPage')}
          </span>
          <select
            className="oa-input oa-select"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange?.(Number(e.target.value))}
            style={{ height: '44px', padding: '0 var(--oa-space-3)', minWidth: '4.5rem' }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Page info */}
        <span className="oa-body-s oa-text-center oa-table-pagination-info">
          {t('common.table.pageSummary', { start: startRow, end: endRow, total: totalCount })}
        </span>

        {/* Page controls */}
        <div className={cn('oa-flex', 'oa-gap-2', 'oa-justify-center')}>
          <button
            className="oa-btn oa-btn--ghost oa-btn--dense"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page === 0}
            aria-label={t('common.table.previousPage')}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            className="oa-btn oa-btn--ghost oa-btn--dense"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= pageCount - 1 || pageCount <= 1}
            aria-label={t('common.table.nextPage')}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}
