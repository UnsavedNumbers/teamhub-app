import { Card } from '../platformAdmin'

interface AdminSkeletonTableProps {
  rows?: number
  columns?: number
}

export default function AdminSkeletonTable({ rows = 5, columns = 4 }: AdminSkeletonTableProps) {
  return (
    <Card>
      <div className="pa-flex pa-flex-col pa-gap-4">
        <div className="pa-flex pa-gap-4 pa-mb-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="pa-skeleton pa-flex-1" style={{ height: '16px' }} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="pa-flex pa-gap-4 pa-py-3" style={{ borderBottom: '1px solid var(--pa-n100)' }}>
            {Array.from({ length: columns }).map((_, j) => (
              <div key={j} className="pa-skeleton pa-flex-1" style={{ height: '20px' }} />
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}
