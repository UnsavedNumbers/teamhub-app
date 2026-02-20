/**
 * Single Number Component
 *
 * Displays a single metric value with optional trend indicator.
 */

import { useMemo } from 'react'

interface SingleNumberProps {
  value: number | string
  label?: string
  format?: 'number' | 'currency' | 'percentage'
  trend?: number // Percentage change
  previousValue?: number
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export function SingleNumber({
  value,
  label,
  format = 'number',
  trend,
  previousValue,
  size = 'medium',
  className = '',
}: SingleNumberProps) {
  const formattedValue = useMemo(() => {
    if (typeof value === 'string') return value

    switch (format) {
      case 'currency':
        // Handle both cents (large numbers) and dollars (smaller numbers)
        const dollarValue = value > 10000 ? value / 100 : value
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(dollarValue)
      case 'percentage':
        return `${Math.round(value)}%`
      default:
        return new Intl.NumberFormat('en-US').format(value)
    }
  }, [value, format])

  const trendColor = useMemo(() => {
    if (trend === undefined) return 'var(--org-text-secondary)'
    if (trend > 0) return 'var(--org-success-color, #10b981)'
    if (trend < 0) return 'var(--org-error-color, #ef4444)'
    return 'var(--org-text-secondary)'
  }, [trend])

  const sizeClasses = {
    small: { value: 'text-2xl', label: 'text-sm' },
    medium: { value: 'text-4xl', label: 'text-base' },
    large: { value: 'text-6xl', label: 'text-lg' },
  }

  return (
    <div
      className={`oa-single-number ${className}`}
      style={{
        padding: '24px',
        borderRadius: '8px',
        background: 'var(--org-bg-secondary, #f9fafb)',
        border: '1px solid var(--org-border-color, #e5e7eb)',
        textAlign: 'center',
      }}
    >
      {label && (
        <div
          className={sizeClasses[size].label}
          style={{
            color: 'var(--org-text-secondary)',
            marginBottom: '8px',
            fontWeight: '500',
          }}
        >
          {label}
        </div>
      )}
      <div
        className={sizeClasses[size].value}
        style={{
          color: 'var(--org-text-primary)',
          fontWeight: '700',
          lineHeight: '1.2',
          marginBottom: trend !== undefined ? '8px' : '0',
        }}
      >
        {formattedValue}
      </div>
      {trend !== undefined && (
        <div
          style={{
            fontSize: '14px',
            color: trendColor,
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <span>{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>
          <span>{Math.abs(trend)}%</span>
          {previousValue !== undefined && (
            <span style={{ color: 'var(--org-text-secondary)', fontSize: '12px', marginLeft: '4px' }}>
              vs previous
            </span>
          )}
        </div>
      )}
    </div>
  )
}
