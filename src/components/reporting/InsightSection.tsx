/**
 * Insight Section Component
 *
 * Standard section layout for report tabs:
 * - KPI row (3-6 metrics)
 * - Primary chart
 * - Takeaway text
 * - Optional drilldown table
 */

import { ReactNode } from 'react'

interface KPIMetric {
  label: string
  value: string | number
  format?: 'number' | 'currency' | 'percentage'
  trend?: number
  trendLabel?: string
}

interface InsightSectionProps {
  title?: string
  kpis?: KPIMetric[]
  chart?: ReactNode
  takeaway?: string
  drilldownTable?: ReactNode
  emptyState?: ReactNode
  isEmpty?: boolean
}

export function InsightSection({
  title,
  kpis,
  chart,
  takeaway,
  drilldownTable,
  emptyState,
  isEmpty = false,
}: InsightSectionProps) {
  const formatValue = (value: string | number, format?: 'number' | 'currency' | 'percentage'): string => {
    if (typeof value === 'string') return value
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)
      case 'percentage':
        return `${Math.round(value)}%`
      default:
        return value.toLocaleString()
    }
  }

  if (isEmpty && emptyState) {
    return (
      <div style={{ marginBottom: '64px' }}>
        {title && (
          <h3
            style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--org-text-primary)',
              margin: '0 0 32px 0',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h3>
        )}
        {emptyState}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '64px' }}>
      {/* Section Title */}
      {title && (
        <h3
          style={{
            fontSize: '24px',
            fontWeight: '600',
            color: 'var(--org-text-primary)',
            margin: '0 0 32px 0',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h3>
      )}

      {/* KPI Row */}
      {kpis && kpis.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          {kpis.map((kpi, index) => (
            <div
              key={index}
              className="oa-kpi-card"
              style={{
                padding: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--org-text-secondary)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {kpi.label}
              </div>
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: 'var(--org-text-primary)',
                  marginBottom: kpi.trend !== undefined ? '8px' : '0',
                  lineHeight: '1.2',
                }}
              >
                {formatValue(kpi.value, kpi.format)}
              </div>
              {kpi.trend !== undefined && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: kpi.trend > 0 ? 'var(--org-status-success)' : kpi.trend < 0 ? 'var(--org-status-error)' : 'var(--org-text-secondary)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {kpi.trend > 0 ? 'trending_up' : kpi.trend < 0 ? 'trending_down' : 'trending_flat'}
                  </span>
                  <span>
                    {kpi.trend > 0 ? '+' : ''}
                    {kpi.trend.toFixed(1)}%
                  </span>
                  {kpi.trendLabel && (
                    <span style={{ marginLeft: '4px', opacity: 0.7 }}>{kpi.trendLabel}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chart && (
        <div
          className="reporting-section-card"
          style={{
            marginBottom: '32px',
            padding: '32px',
          }}
        >
          {chart}
        </div>
      )}

      {/* Takeaway */}
      {takeaway && (
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--org-surface-secondary)',
            borderLeft: '4px solid var(--org-color-primary)',
            borderRadius: '8px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: '500',
              color: 'var(--org-text-primary)',
              lineHeight: '1.6',
            }}
          >
            {takeaway}
          </div>
        </div>
      )}

      {/* Drilldown Table */}
      {drilldownTable && (
        <div
          className="reporting-section-card"
          style={{
            marginTop: '32px',
            overflow: 'hidden',
          }}
        >
          {drilldownTable}
        </div>
      )}
    </div>
  )
}
