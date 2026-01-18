/**
 * Breadcrumb component for hierarchical navigation
 */

import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  path?: string
  onClick?: () => void
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <div className="pa-flex pa-items-center pa-gap-2 pa-mb-4 pa-text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        if (isLast) {
          return (
            <span key={index} className="pa-text-muted">
              {item.label}
            </span>
          )
        }

        if (item.onClick) {
          return (
            <div key={index} className="pa-flex pa-items-center pa-gap-2">
              <button
                onClick={item.onClick}
                className="pa-link pa-link-primary"
                style={{ fontSize: 'inherit', padding: 0, border: 'none', cursor: 'pointer' }}
              >
                {item.label}
              </button>
              <span className="pa-text-muted">/</span>
            </div>
          )
        }

        if (item.path) {
          return (
            <div key={index} className="pa-flex pa-items-center pa-gap-2">
              <Link to={item.path} className="pa-link pa-link-primary">
                {item.label}
              </Link>
              <span className="pa-text-muted">/</span>
            </div>
          )
        }

        return (
          <div key={index} className="pa-flex pa-items-center pa-gap-2">
            <span>{item.label}</span>
            <span className="pa-text-muted">/</span>
          </div>
        )
      })}
    </div>
  )
}
