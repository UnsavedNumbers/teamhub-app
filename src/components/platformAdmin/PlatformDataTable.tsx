import { CSSProperties, ReactNode } from 'react'
import { Checkbox } from './Checkbox'
import { cn } from '../../utils/cn'
import { useI18n } from '../../i18n/useI18n'

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
  getRowClassName?: (row: T) => string
  getRowStyle?: (row: T) => CSSProperties | undefined
  orderBy?: string
  order?: 'asc' | 'desc'
  onSort?: (column: string) => void
  // Selection props
  selectable?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (updater: ((prev: Set<string>) => Set<string>) | Set<string>) => void
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
}: PlatformDataTableProps<T>) {
  const { t } = useI18n()
  // Defensive guard against null (if default didn't catch it due to explicit null pass)
  const safeRows = (data || rows) || []
  const safeColumns = columns || []
  const resolvedEmptyMessage = emptyMessage ?? t('common.table.emptyMessage')

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
      const next = new Set<string>(prev)
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
        const next = new Set<string>(prev)
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
          <h3 className="pa-empty-title">{t('common.table.emptyTitle')}</h3>
          <p className="pa-empty-text">{resolvedEmptyMessage}</p>
        </div>
      </div>
    )
  }

  // Get first column as key field (usually name/title)
  const keyColumn = safeColumns[0]
  const otherColumns = safeColumns.slice(1)

  return (
    <div className="pa-card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Top Pagination */}
      <div
        className={cn('pa-flex', 'pa-flex-col', 'pa-items-stretch', 'pa-gap-3', 'pa-bg-n50', 'pa-table-pagination')}
        style={{
          padding: 'var(--pa-space-3)',
          borderBottom: '1px solid var(--pa-n100)',
        }}
      >
        {/* Rows per page */}
        <div
          className={cn('pa-flex', 'pa-items-center', 'pa-gap-2', 'pa-table-pagination-controls')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <span className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
            {t('common.table.rowsPerPage')}
          </span>
          <select
            className="pa-input pa-select"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            style={{ height: '44px', padding: '0 var(--pa-space-3)', minWidth: '4.5rem' }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Page info */}
        <span className="pa-body-s pa-text-center" style={{ color: 'var(--pa-n700)' }}>
          {t('common.table.pageSummary', { start: startRow, end: endRow, total: totalCount })}
        </span>

        {/* Page controls */}
        <div className={cn('pa-flex', 'pa-gap-2', 'pa-justify-center')}>
          <button
            className="pa-btn pa-btn--ghost pa-btn--dense"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            aria-label={t('common.table.previousPage')}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            className="pa-btn pa-btn--ghost pa-btn--dense"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            aria-label={t('common.table.nextPage')}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Desktop Table View - hidden on mobile */}
      <div className="pa-table-desktop" style={{ overflowX: 'auto' }}>
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
                    aria-label={t('common.table.selectAll')}
                    style={{ margin: 0 }}
                  />
                </th>
              )}
              {safeColumns.map((column) => (
                <th
                  key={String(column.id)}
                  className={cn(
                    column.sortable && onSort ? 'pa-sortable' : '',
                    orderBy === column.id ? 'pa-sorted' : ''
                  )}
                  style={{
                    textAlign: column.align || 'left',
                    minWidth: column.minWidth ?? (column.align === 'right' ? 200 : undefined),
                    cursor: column.sortable && onSort ? 'pointer' : 'default',
                  }}
                  onClick={() => column.sortable && onSort && handleSort(String(column.id))}
                >
                  <div 
                    className={cn('pa-flex', 'pa-items-center', 'pa-gap-2')}
                    style={{
                      justifyContent: column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : 'flex-start',
                    }}
                  >
                    <span>{column.label}</span>
                    {column.sortable && onSort && (
                      <span
                        className={cn('material-symbols-outlined', 'pa-sort-icon')}
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
                className={cn(onRowClick ? 'pa-clickable' : '', getRowClassName?.(row) ?? '')}
                onClick={() => onRowClick?.(row)}
                style={(() => {
                  const baseStyle = getRowStyle?.(row)
                  const selectedStyle = selectable && selectedIds.has(row.id)
                    ? { backgroundColor: 'var(--pa-primary-bg)' }
                    : null

                  return {
                    ...baseStyle,
                    cursor: onRowClick ? 'pointer' : 'default',
                    ...(selectedStyle || {}),
                  }
                })()}
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
                      // Skip if click came from checkbox so we don't double-toggle (onChange already fires)
                      const target = e.target as HTMLElement
                      if (target.closest?.('input[type=checkbox]') || target.closest?.('.pa-checkbox')) return
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
                    {column.align === 'right' ? (
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
                        {column.render
                          ? column.render(row)
                          : String(row[column.id as keyof T] ?? t('common.table.emptyValue'))}
                      </div>
                    ) : column.render ? (
                      column.render(row)
                    ) : (
                      String(row[column.id as keyof T] ?? t('common.table.emptyValue'))
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - shown only on mobile */}
      <div className="pa-table-mobile">
        <div className="space-y-3" style={{ padding: 'var(--pa-space-4)' }}>
          {safeRows.map((row) => (
            <div
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'pa-card',
                onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '',
                getRowClassName?.(row) ?? ''
              )}
              style={(() => {
                const baseStyle = getRowStyle?.(row)
                const selectedStyle = selectable && selectedIds.has(row.id)
                  ? { backgroundColor: 'var(--pa-primary-bg)' }
                  : null

                return {
                  ...baseStyle,
                  padding: 'var(--pa-space-4)',
                  ...(selectedStyle || {}),
                }
              })()}
            >
              {/* Key field (first column) - prominent */}
              {keyColumn && (
                <div style={{ marginBottom: 'var(--pa-space-3)', paddingBottom: 'var(--pa-space-3)', borderBottom: '1px solid var(--pa-n100)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--pa-n500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--pa-space-1)' }}>
                    {keyColumn.label}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--pa-n900)' }}>
                    {keyColumn.render
                      ? keyColumn.render(row)
                      : String(row[keyColumn.id as keyof T] ?? t('common.table.emptyValue'))}
                  </div>
                </div>
              )}

              {/* Other fields - stacked */}
              <div className="space-y-2">
                {otherColumns.map((column) => (
                  <div key={String(column.id)}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pa-n500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--pa-space-1)' }}>
                      {column.label}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--pa-n700)' }}>
                      {column.render
                        ? column.render(row)
                        : String(row[column.id as keyof T] ?? t('common.table.emptyValue'))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selection checkbox on mobile - wrapper only stops row click; checkbox onChange handles toggle */}
              {selectable && (
                <div
                  style={{ marginTop: 'var(--pa-space-3)', paddingTop: 'var(--pa-space-3)', borderTop: '1px solid var(--pa-n100)' }}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds.has(row.id)}
                    onChange={() => handleRowToggle(row.id)}
                    label={t('common.table.select')}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div
        className={cn('pa-flex', 'pa-flex-col', 'pa-items-stretch', 'pa-gap-3', 'pa-bg-n50', 'pa-table-pagination')}
        style={{
          padding: 'var(--pa-space-3)',
          borderTop: '1px solid var(--pa-n100)',
        }}
      >
        {/* Rows per page */}
        <div
          className={cn('pa-flex', 'pa-items-center', 'pa-gap-2', 'pa-table-pagination-controls')}
          style={{ whiteSpace: 'nowrap' }}
        >
          <span className="pa-body-s" style={{ color: 'var(--pa-n700)' }}>
            {t('common.table.rowsPerPage')}
          </span>
          <select
            className="pa-input pa-select"
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            style={{ height: '44px', padding: '0 var(--pa-space-3)', minWidth: '4.5rem' }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Page info */}
        <span className="pa-body-s pa-text-center" style={{ color: 'var(--pa-n700)' }}>
          {t('common.table.pageSummary', { start: startRow, end: endRow, total: totalCount })}
        </span>

        {/* Page controls */}
        <div className={cn('pa-flex', 'pa-gap-2', 'pa-justify-center')}>
          <button
            className="pa-btn pa-btn--ghost pa-btn--dense"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            aria-label={t('common.table.previousPage')}
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            className="pa-btn pa-btn--ghost pa-btn--dense"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
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
