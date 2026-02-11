import { ReactNode } from 'react'

export interface TableColumn<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  align?: 'left' | 'center' | 'right'
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  onRowClick?: (row: T) => void
}

/**
 * Table - Org Admin styled component
 * Uses oa-table class with org theme styling
 */
export function Table<T extends Record<string, any>>({ columns, data, onRowClick }: TableProps<T>) {
  return (
    <div className="oa-table-wrapper">
      <table className="oa-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`oa-text-${col.align || 'left'}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'oa-cursor-pointer' : ''}
            >
              {columns.map((col) => (
                <td key={col.key} className={`oa-text-${col.align || 'left'}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
