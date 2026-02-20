/**
 * Bar Chart Component
 *
 * Recharts wrapper for bar charts (vertical, horizontal, stacked).
 */

import { useMemo } from 'react'
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { BarChartData } from '../../../types/reporting'
import { useOrgColorPalette } from '../../../hooks/useOrgThemeColors'

interface BarChartProps {
  data: BarChartData
  title?: string
  height?: number
  orientation?: 'vertical' | 'horizontal'
  stacked?: boolean
  showLegend?: boolean
  onClick?: (params: any) => void
  className?: string
}

export function BarChart({
  data,
  title,
  height = 300,
  orientation = 'vertical',
  stacked = false,
  showLegend = true,
  onClick,
  className = '',
}: BarChartProps) {
  // Group data by category for Recharts format
  const chartData = useMemo(() => {
    const categories = Array.from(new Set(data.data.map((d) => d.category)))
    const seriesNames = Array.from(new Set(data.data.map((d) => d.series || 'default')))

    return categories.map((category) => {
      const point: Record<string, string | number> = { category }
      seriesNames.forEach((seriesName) => {
        const dataPoint = data.data.find(
          (d) => d.category === category && (d.series || 'default') === seriesName
        )
        point[seriesName] = dataPoint ? dataPoint.value : 0
      })
      return point
    })
  }, [data])

  const seriesNames = useMemo(() => {
    return Array.from(new Set(data.data.map((d) => d.series || 'default')))
  }, [data])

  const colors = useOrgColorPalette(seriesNames.length)

  const handleClick = (data: any, index: number) => {
    if (onClick) {
      onClick({ name: data.category, value: data, index })
    }
  }

  return (
    <div className={`oa-chart-bar ${className}`} style={{ height: `${height}px`, width: '100%' }}>
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
        <RechartsBarChart
          data={chartData}
          layout={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--org-border-default)" opacity={0.1} />
          {orientation === 'vertical' ? (
            <>
              <XAxis
                dataKey="category"
                stroke="var(--org-text-secondary)"
                tick={{ fill: 'var(--org-text-secondary)', fontSize: 12 }}
                angle={chartData.length > 6 ? -45 : 0}
                textAnchor={chartData.length > 6 ? 'end' : 'middle'}
                height={chartData.length > 6 ? 80 : 30}
              />
              <YAxis
                stroke="var(--org-text-secondary)"
                tick={{ fill: 'var(--org-text-secondary)', fontSize: 12 }}
              />
            </>
          ) : (
            <>
              <XAxis
                type="number"
                stroke="var(--org-text-secondary)"
                tick={{ fill: 'var(--org-text-secondary)', fontSize: 12 }}
              />
              <YAxis
                dataKey="category"
                type="category"
                stroke="var(--org-text-secondary)"
                tick={{ fill: 'var(--org-text-secondary)', fontSize: 12 }}
                width={100}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--org-surface-card)',
              border: '1px solid var(--org-border-default)',
              borderRadius: '6px',
              color: 'var(--org-text-primary)',
            }}
            labelStyle={{ color: 'var(--org-text-primary)', fontWeight: '600' }}
            itemStyle={{ color: 'var(--org-text-secondary)' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="rect"
              formatter={(value) => <span style={{ color: 'var(--org-text-secondary)' }}>{value}</span>}
            />
          )}
          {seriesNames.map((seriesName, index) => (
            <Bar
              key={seriesName}
              dataKey={seriesName}
              stackId={stacked ? 'stack' : undefined}
              fill={colors[index]}
              radius={[4, 4, 0, 0]}
              onClick={handleClick}
            >
              {chartData.map((_entry, idx) => (
                <Cell key={`cell-${idx}`} fill={colors[index]} />
              ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
