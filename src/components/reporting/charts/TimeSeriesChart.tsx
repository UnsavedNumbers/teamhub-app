/**
 * Time Series Chart Component
 *
 * Recharts wrapper for time series data (line/area charts).
 */

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TimeSeriesData } from '../../../types/reporting'
import { useOrgColorPalette } from '../../../hooks/useOrgThemeColors'

interface TimeSeriesChartProps {
  data: TimeSeriesData
  title?: string
  height?: number
  type?: 'line' | 'area'
  showLegend?: boolean
  onClick?: (params: any) => void
  className?: string
}

export function TimeSeriesChart({
  data,
  title,
  height = 300,
  type = 'line',
  showLegend = true,
  onClick,
  className = '',
}: TimeSeriesChartProps) {
  // Transform data for Recharts format
  const chartData = useMemo(() => {
    // Get all unique dates across all series
    const allDates = new Set<string>()
    data.series.forEach((s) => {
      s.data.forEach((point) => allDates.add(point.date))
    })
    const sortedDates = Array.from(allDates).sort()

    // Create data points for each date
    return sortedDates.map((date) => {
      const point: Record<string, string | number> = { date }
      data.series.forEach((s) => {
        const dataPoint = s.data.find((p) => p.date === date)
        point[s.name] = dataPoint ? dataPoint.value : 0
      })
      return point
    })
  }, [data])

  const colors = useOrgColorPalette(data.series.length)

  const ChartComponent = type === 'area' ? AreaChart : LineChart
  const DataComponent = type === 'area' ? Area : Line

  return (
    <div className={`oa-chart-time-series overflow-safe-page ${className}`} style={{ height: `${height}px`, width: '100%', minWidth: 0, overflow: 'hidden' }}>
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
      <ResponsiveContainer width="100%" minWidth={0} height={title ? height - 40 : height}>
        <ChartComponent
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--org-border-default)" opacity={0.1} />
          <XAxis
            dataKey="date"
            stroke="var(--org-text-secondary)"
            tick={{ fill: 'var(--org-text-secondary)', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="var(--org-text-secondary)"
            tick={{ fill: 'var(--org-text-secondary)', fontSize: 12 }}
          />
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
              formatter={(value) => <span style={{ color: 'var(--org-text-secondary)' }}>{value}</span>}
            />
          )}
          {data.series.map((series, index) => (
            <DataComponent
              key={series.name}
              type="monotone"
              dataKey={series.name}
              stroke={colors[index]}
              fill={type === 'area' ? colors[index] : undefined}
              fillOpacity={type === 'area' ? 0.2 : undefined}
              strokeWidth={3}
              dot={{ r: 4, fill: colors[index] }}
              activeDot={{ r: 6 }}
              onClick={onClick}
            />
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  )
}
