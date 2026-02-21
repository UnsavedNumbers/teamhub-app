/**
 * Report Page Layout Component
 *
 * Standard layout wrapper for all reporting pages with:
 * - Title and description
 * - Filter summary row (compact chips)
 * - Filter button (opens slide-over)
 * - Content area
 */

import { useState } from 'react'
import { FilterSlideOver } from './FilterSlideOver'
import { FilterSummary } from './FilterSummary'

interface ReportPageLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
  categorySpecificFilters?: React.ReactNode
}

export function ReportPageLayout({
  title,
  description,
  children,
  categorySpecificFilters,
}: ReportPageLayoutProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  return (
    <>
      <div style={{ marginBottom: '48px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: '600',
              color: 'var(--org-text-primary)',
              margin: '0 0 8px 0',
              letterSpacing: '-0.03em',
              lineHeight: '1.2',
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              style={{
                fontSize: '18px',
                color: 'var(--org-text-secondary)',
                margin: 0,
                lineHeight: '1.5',
                maxWidth: '800px',
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Filter Summary Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 0',
            borderBottom: '1px solid var(--org-border-default)',
          }}
        >
          <FilterSummary />
          <button
            onClick={() => setIsFilterOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'var(--org-surface-card)',
              border: '1px solid var(--org-border-default)',
              borderRadius: '8px',
              color: 'var(--org-text-primary)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--org-surface-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--org-surface-card)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              filter_list
            </span>
            Filters
          </button>
        </div>
      </div>

      {/* Content */}
      {children}

      {/* Filter Slide-Over */}
      <FilterSlideOver
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        categorySpecificFilters={categorySpecificFilters}
      />
    </>
  )
}
