import type { ReactNode } from 'react'

export type AdminTableColumn<Row> = {
  key: string
  header: string
  render: (row: Row) => ReactNode
  className?: string
}

type AdminTableProps<Row> = {
  columns: Array<AdminTableColumn<Row>>
  rows: Row[]
  getRowKey: (row: Row, index: number) => string
  className?: string
}

export function AdminTable<Row>({ columns, rows, getRowKey, className }: AdminTableProps<Row>) {
  return (
    <div className={`table-responsive ${className ?? ''}`}>
      <table className="table align-items-center mb-0">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`text-uppercase text-secondary text-xxs font-weight-bolder opacity-7 ${c.className ?? ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={getRowKey(row, i)}>
              {columns.map((c) => (
                <td key={c.key} className={c.className}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

