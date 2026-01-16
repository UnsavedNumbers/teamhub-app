import type { ReactNode } from 'react'

type AdminStatCardProps = {
  title: string
  value: string
  icon?: ReactNode
  footer?: ReactNode
}

export function AdminStatCard({ title, value, icon, footer }: AdminStatCardProps) {
  return (
    <div className="card">
      <div className="card-body p-3">
        <div className="row">
          <div className="col-8">
            <div className="numbers">
              <p className="text-sm mb-0 text-uppercase font-weight-bold">{title}</p>
              <h5 className="font-weight-bolder">{value}</h5>
              {footer && <div className="text-sm">{footer}</div>}
            </div>
          </div>
          {icon && (
            <div className="col-4 text-end">
              <div className="icon icon-shape bg-gradient-primary shadow text-center border-radius-md">
                {icon}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

