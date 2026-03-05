/**
 * Virtualized Table Component
 *
 * TanStack Table with virtualization for large datasets.
 * Supports column chooser, multi-sort, filtering, row selection, and pagination.
 */

import React, { useMemo, useState, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useT } from '../../i18n/useI18n'

interface VirtualizedTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  height?: number
  enableColumnChooser?: boolean
  enableMultiSort?: boolean
  enableFiltering?: boolean
  enableRowSelection?: boolean
  enablePagination?: boolean
  onRowClick?: (row: T) => void
  onRowSelect?: (selectedRows: T[]) => void
  className?: string
}

export function VirtualizedTable<T extends Record<string, any>>({
  data,
  columns,
  height = 400,
  enableColumnChooser = true,
  enableMultiSort = true,
  enableFiltering = true,
  enableRowSelection = false,
  enablePagination = true,
  onRowClick,
  onRowSelect,
  className = '',
}: VirtualizedTableProps<T>) {
  const t = useT()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    enableMultiSort: enableMultiSort,
  })

  const { rows } = table.getRowModel()

  const parentRef = React.useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  })

  const selectedRows = useMemo(() => {
    return rows
      .filter((row) => row.getIsSelected())
      .map((row) => row.original)
  }, [rows, rowSelection])

  React.useEffect(() => {
    if (onRowSelect) {
      onRowSelect(selectedRows)
    }
  }, [selectedRows, onRowSelect])

  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      setColumnVisibility((prev) => ({
        ...prev,
        [columnId]: !prev[columnId],
      }))
    },
    []
  )

  return (
    <div className={`oa-virtualized-table ${className}`}>
      {/* Toolbar */}
      <div
        style={{
          padding: '12px',
          borderBottom: '1px solid var(--org-border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {enableColumnChooser && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {table.getAllColumns().map((column) => {
              if (column.id === 'select') return null
              return (
                <label
                  key={column.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={() => toggleColumnVisibility(column.id)}
                  />
                  <span>{column.id}</span>
                </label>
              )
            })}
          </div>
        )}
        {enablePagination && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--org-border-color)',
                borderRadius: '4px',
                background: 'transparent',
                cursor: table.getCanPreviousPage() ? 'pointer' : 'not-allowed',
                opacity: table.getCanPreviousPage() ? 1 : 0.5,
              }}
            >
              {'<<'}
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--org-border-color)',
                borderRadius: '4px',
                background: 'transparent',
                cursor: table.getCanPreviousPage() ? 'pointer' : 'not-allowed',
                opacity: table.getCanPreviousPage() ? 1 : 0.5,
              }}
            >
              {'<'}
            </button>
            <span style={{ fontSize: '14px' }}>
              {t('common.table.page')} {table.getState().pagination.pageIndex + 1} {t('common.table.of')}{' '}
              {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--org-border-color)',
                borderRadius: '4px',
                background: 'transparent',
                cursor: table.getCanNextPage() ? 'pointer' : 'not-allowed',
                opacity: table.getCanNextPage() ? 1 : 0.5,
              }}
            >
              {'>'}
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--org-border-color)',
                borderRadius: '4px',
                background: 'transparent',
                cursor: table.getCanNextPage() ? 'pointer' : 'not-allowed',
                opacity: table.getCanNextPage() ? 1 : 0.5,
              }}
            >
              {'>>'}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div
        ref={parentRef}
        style={{
          height: `${height}px`,
          overflow: 'auto',
          border: '1px solid var(--org-border-color)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            position: 'relative',
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'var(--org-bg-primary)',
              borderBottom: '2px solid var(--org-border-color)',
            }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{
                      padding: '12px',
                      textAlign: 'left',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: 'var(--org-text-primary)',
                      backgroundColor: 'var(--org-bg-secondary)',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                      userSelect: 'none',
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span style={{ fontSize: '12px' }}>
                          {{
                            asc: ' ↑',
                            desc: ' ↓',
                          }[header.column.getIsSorted() as string] ?? ' ↕'}
                        </span>
                      )}
                      {enableFiltering && header.column.getCanFilter() && (
                        <input
                          type="text"
                          value={(header.column.getFilterValue() as string) ?? ''}
                          onChange={(e) => header.column.setFilterValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={t('common.search')}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid var(--org-border-color)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            width: '100px',
                          }}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              return (
                <tr
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--org-border-color)',
                    cursor: onRowClick ? 'pointer' : 'default',
                    backgroundColor: row.getIsSelected()
                      ? 'var(--org-bg-secondary)'
                      : 'transparent',
                  }}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{
                        padding: '12px',
                        fontSize: '14px',
                        color: 'var(--org-text-primary)',
                        flex: 1,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--org-border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          color: 'var(--org-text-secondary)',
        }}
      >
        <div>
          {t('common.table.showing')} {rows.length} {t('common.table.of')} {data.length}{' '}
          {t('common.table.rows')}
        </div>
        {enableRowSelection && selectedRows.length > 0 && (
          <div>
            {selectedRows.length} {t('common.table.selected')}
          </div>
        )}
      </div>
    </div>
  )
}
