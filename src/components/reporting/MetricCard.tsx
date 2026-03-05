/**
 * Metric Card Component
 *
 * Beautiful, scalable metric card matching mockup aesthetic.
 * Supports icons, colors, trends, and mini charts.
 */

import { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: number | string
  label?: string
  icon?: string
  iconColor?: string
  trend?: number
  trendLabel?: string
  miniChart?: ReactNode
  format?: 'number' | 'currency' | 'percentage'
  onClick?: () => void
  className?: string
}

export function MetricCard({
  title,
  value,
  label,
  icon,
  iconColor,
  trend,
  trendLabel,
  miniChart,
  format = 'number',
  onClick,
  className = '',
}: MetricCardProps) {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val
    switch (format) {
      case 'currency':
        const dollarValue = val > 10000 ? val / 100 : val
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(dollarValue)
      case 'percentage':
        return `${Math.round(val)}%`
      default:
        return val.toLocaleString()
    }
  }

  const trendPositive = trend !== undefined && trend > 0
  const trendNegative = trend !== undefined && trend < 0

  return (
    <div
      className={`reporting-metric-card ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="reporting-metric-card-header">
        <h3 className="reporting-metric-card-title">{title}</h3>
        {icon && (
          <div
            className="reporting-metric-card-icon"
            style={{
              background: iconColor
                ? `${iconColor}15`
                : 'var(--org-surface-secondary, #f3f4f6)',
              color: iconColor || 'var(--org-color-primary, #3b82f6)',
            }}
          >
            <span className="material-symbols-outlined">{icon}</span>
          </div>
        )}
      </div>
      <div className="reporting-metric-card-value">{formatValue(value)}</div>
      {label && <p className="reporting-metric-card-label">{label}</p>}
      {miniChart && <div style={{ marginTop: '16px' }}>{miniChart}</div>}
      {trend !== undefined && (
        <div className={`reporting-metric-card-trend ${trendPositive ? 'positive' : trendNegative ? 'negative' : ''}`}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {trendPositive ? 'trending_up' : trendNegative ? 'trending_down' : 'trending_flat'}
          </span>
          <span>
            {trend > 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
          {trendLabel && <span style={{ marginLeft: '4px', opacity: 0.7 }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}
