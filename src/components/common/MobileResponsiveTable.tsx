/**
 * MobileResponsiveTable
 * 
 * A table component that automatically converts to stacked card layout on mobile.
 * On mobile (<768px): Each row becomes a card with stacked fields
 * On tablet (768-1023px): Can show 2 columns max
 * On desktop (>=1024px): Standard table layout
 */

import type { ReactNode } from 'react'

export interface MobileResponsiveTableProps {
  /** Table header cells - can be strings or React nodes */
  headers: (string | ReactNode)[]
  /** Table rows - each row is an array of cells */
  rows: ReactNode[][]
  /** Optional empty state content (shown when rows.length === 0) */
  emptyState?: ReactNode
  /** Optional className for the container */
  className?: string
  /** Optional className for the table element */
  tableClassName?: string
  /** Optional header alignment - 'left' | 'right' | 'center' (default: 'left') */
  headerAlign?: ('left' | 'right' | 'center')[]
  /** Key field index - shown first on mobile cards (default: 0) */
  keyFieldIndex?: number
}

/**
 * MobileResponsiveTable Component
 * 
 * Automatically adapts to screen size:
 * - Mobile: Stacked card layout (one record per block)
 * - Tablet: Can show 2 columns max
 * - Desktop: Standard table layout
 */
export default function MobileResponsiveTable({
  headers,
  rows,
  emptyState,
  className = '',
  tableClassName = '',
  headerAlign = [],
  keyFieldIndex = 0,
}: MobileResponsiveTableProps) {
  // If no rows and custom empty state, show it
  if (rows.length === 0 && emptyState) {
    return (
      <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${className}`}>
        <div className="p-12 text-center">
          {emptyState}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table View - hidden on mobile */}
      <div className={`hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${className}`}>
        <div className="overflow-safe-scroll">
          <table className={`min-w-full text-left border-collapse ${tableClassName}`}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {headers.map((header, index) => {
                  const align = headerAlign[index] || 'left'
                  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''
                  
                  return (
                    <th
                      key={index}
                      className={`py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider ${alignClass}`}
                    >
                      {header}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="p-12 text-center">
                    {emptyState || (
                      <>
                        <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 block">inbox</span>
                        <p className="text-slate-500 font-medium">No data available</p>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-slate-50/80 transition-colors group">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="py-4 px-6">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View - shown only on mobile */}
      <div className={`md:hidden space-y-4 ${className}`}>
        {rows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            {emptyState || (
              <>
                <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 block">inbox</span>
                <p className="text-slate-500 font-medium">No data available</p>
              </>
            )}
          </div>
        ) : (
          rows.map((row, rowIndex) => {
            // Key field (usually first) shown prominently
            const keyField = row[keyFieldIndex]
            // Other fields shown below
            const otherFields = row.filter((_, index) => index !== keyFieldIndex)

            return (
              <div
                key={rowIndex}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
              >
                {/* Key field - prominent */}
                <div className="mb-3 pb-3 border-b border-slate-100">
                  <div className="font-semibold text-slate-900 text-base">
                    {keyField}
                  </div>
                </div>

                {/* Other fields - stacked */}
                <div className="space-y-2">
                  {otherFields.map((cell, cellIndex) => {
                    // Skip keyFieldIndex in mapping
                    const actualIndex = cellIndex < keyFieldIndex ? cellIndex : cellIndex + 1
                    const header = headers[actualIndex]
                    const headerText = typeof header === 'string' ? header : `Field ${actualIndex + 1}`

                    return (
                      <div key={cellIndex} className="flex flex-col">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                          {headerText}
                        </div>
                        <div className="text-sm text-slate-900 overflow-safe-content">
                          {cell}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
