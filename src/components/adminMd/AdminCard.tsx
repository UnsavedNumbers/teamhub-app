import type { PropsWithChildren } from 'react'

type AdminCardProps = PropsWithChildren<{
  title?: string
  subtitle?: string
  className?: string
}>

export function AdminCard({ title, subtitle, className, children }: AdminCardProps) {
  return (
    <div className={`card ${className ?? ''}`}>
      {(title || subtitle) && (
        <div className="card-header pb-0">
          {title && <h6 className="mb-0">{title}</h6>}
          {subtitle && <p className="text-sm mb-0">{subtitle}</p>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  )
}

