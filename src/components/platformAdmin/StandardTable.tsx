/**
 * StandardTable
 * 
 * A reusable table component that matches the Teams/Levels/Seasons page styling.
 * Provides consistent table UI/UX across admin pages.
 * 
 * Uses Tailwind classes to match the existing codebase pattern.
 */

import type { ReactNode } from 'react'

export interface StandardTableProps {
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
}

/**
 * StandardTable Component
 * 
 * Matches the styling from Teams/Levels/Seasons pages:
 * - White background with slate border and rounded corners
 * - Slate-50 header background
 * - Hover effects on rows
 * - Group hover visibility for action buttons
 * 
 * Usage example:
 * ```tsx
 * <StandardTable
 *   headers={['Name', 'Status', 'Actions']}
 *   rows={[
 *     [
 *       <div className="font-bold text-slate-900">Item 1</div>,
 *       <Badge>Active</Badge>,
 *       <Link className="invisible group-hover:visible focus:visible">
 *         <button>Edit</button>
 *       </Link>
 *     ],
 *   ]}
 *   emptyState={
 *     <>
 *       <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">inbox</span>
 *       <p className="text-slate-500 font-medium">No items found</p>
 *     </>
 *   }
 * />
 * ```
 */
export default function StandardTable({
  headers,
  rows,
  emptyState,
  className = '',
  tableClassName = '',
  headerAlign = [],
}: StandardTableProps) {
  // If no rows and custom empty state, show it in container
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
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className={`w-full text-left border-collapse ${tableClassName}`}>
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
  )
}
