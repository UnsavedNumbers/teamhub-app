interface AdminSkeletonTableProps {
  rows?: number
  columns?: number
}

/**
 * Skeleton loading table for admin panel
 * Uses Material Dashboard Bootstrap styling
 */
export default function AdminSkeletonTable({ rows = 5, columns = 4 }: AdminSkeletonTableProps) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="table-responsive">
          <table className="table align-items-center mb-0">
            <thead>
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th
                    key={i}
                    className="text-uppercase text-secondary text-xxs font-weight-bolder opacity-7"
                  >
                    <div className="skeleton-line" style={{ height: '12px', width: '80%', backgroundColor: '#e9ecef', borderRadius: '4px' }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: columns }).map((_, j) => (
                    <td key={j}>
                      <div className="skeleton-line" style={{ height: '16px', width: j === 0 ? '60%' : '80%', backgroundColor: '#e9ecef', borderRadius: '4px' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
