/**
 * KPI Card Component
 *
 * Displays a KPI with optional sparkline trend and tooltip.
 */

import type { MetricValue } from '../../types/reporting'

interface KPICardProps {
  title: string
  value: MetricValue
  tooltip?: string
  onClick?: () => void
  className?: string
}

export function KPICard({ title, value, tooltip, onClick, className = '' }: KPICardProps) {
  const hasTrend = value.trend !== undefined && value.trend !== null
  const trendPositive = hasTrend && value.trend! > 0
  const trendNegative = hasTrend && value.trend! < 0

  const formatValue = (val: number | string, format?: string): string => {
    if (typeof val === 'string') return val
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val)
    }
    return val.toLocaleString()
  }

  return (
    <div
      className={`oa-kpi-card ${className}`}
      style={{
        padding: '20px',
        border: '1px solid var(--org-border-color, #e5e7eb)',
        borderRadius: '8px',
        backgroundColor: 'var(--org-bg-primary, #ffffff)',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
      }}
      onClick={onClick}
      title={tooltip}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: 'var(--org-text-secondary, #6b7280)' }}>
          {title}
        </h3>
        {tooltip && (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '16px', color: 'var(--org-text-secondary, #6b7280)', cursor: 'help' }}
            title={tooltip}
          >
            info
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--org-text-primary, #111827)', lineHeight: '1.2' }}>
          {formatValue(value.value)}
        </span>
        {value.label && (
          <span style={{ fontSize: '14px', color: 'var(--org-text-secondary, #6b7280)', fontWeight: '500' }}>
            {value.label}
          </span>
        )}
      </div>
      {hasTrend && (
        <div style={{ marginTop: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '16px',
              color: trendPositive ? '#4caf50' : trendNegative ? '#f44336' : 'var(--org-text-secondary)',
            }}
          >
            {trendPositive ? 'trending_up' : trendNegative ? 'trending_down' : 'trending_flat'}
          </span>
          <span
            style={{
              color: trendPositive ? '#4caf50' : trendNegative ? '#f44336' : 'var(--org-text-secondary)',
            }}
          >
            {value.trend! > 0 ? '+' : ''}
            {value.trend!.toFixed(1)}%
          </span>
          {value.previousValue !== undefined && (
            <span style={{ color: 'var(--org-text-secondary)', marginLeft: '4px' }}>
              vs previous
            </span>
          )}
        </div>
      )}
    </div>
  )
}
