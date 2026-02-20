/**
 * Pie Chart Component
 *
 * Recharts wrapper for pie/donut charts.
 */

import { useMemo } from 'react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { BarChartData } from '../../../types/reporting'
import { useOrgColorPalette } from '../../../hooks/useOrgThemeColors'

interface PieChartProps {
  data: BarChartData
  title?: string
  height?: number
  type?: 'pie' | 'donut'
  showLegend?: boolean
  onClick?: (params: any) => void
  className?: string
}

export function PieChart({
  data,
  title,
  height = 300,
  type = 'pie',
  showLegend = true,
  onClick,
  className = '',
}: PieChartProps) {
  // Group by category and sum values
  const pieData = useMemo(() => {
    const categoryMap = new Map<string, number>()
    data.data.forEach((d) => {
      const current = categoryMap.get(d.category) || 0
      categoryMap.set(d.category, current + d.value)
    })

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }))
  }, [data])

  const colors = useOrgColorPalette(pieData.length)

  const handleClick = (data: any, _index: number) => {
    if (onClick) {
      onClick({ name: data.name, value: data.value, percent: (data.value / pieData.reduce((sum, d) => sum + d.value, 0)) * 100 })
    }
  }

  const renderLabel = (entry: any) => {
    const total = pieData.reduce((sum, d) => sum + d.value, 0)
    const percent = ((entry.value / total) * 100).toFixed(1)
    return `${entry.name}\n${percent}%`
  }

  return (
    <div className={`oa-chart-pie ${className}`} style={{ height: `${height}px`, padding: '16px', width: '100%' }}>
      {title && (
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--org-text-primary)',
            textAlign: 'center',
          }}
        >
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={title ? height - 40 : height}>
        <RechartsPieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy={showLegend ? '45%' : '50%'}
            label={renderLabel}
            labelLine={true}
            outerRadius={type === 'donut' ? '70%' : '80%'}
            innerRadius={type === 'donut' ? '40%' : '0%'}
            fill="#8884d8"
            dataKey="value"
            onClick={handleClick}
          >
            {pieData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--org-surface-card)',
              border: '1px solid var(--org-border-default)',
              borderRadius: '6px',
              color: 'var(--org-text-primary)',
            }}
            formatter={(value: number | undefined, name: string | undefined, _props: any) => {
              if (value === undefined) return ['0', name ?? '']
              const total = pieData.reduce((sum, d) => sum + d.value, 0)
              const percent = ((value / total) * 100).toFixed(1)
              return [`${value} (${percent}%)`, name]
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span style={{ color: 'var(--org-text-secondary)' }}>{value}</span>}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
