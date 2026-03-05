/**
 * Funnel Chart Component
 *
 * Recharts wrapper for funnel visualizations (conversion flows).
 * Uses BarChart with custom styling to create funnel effect.
 */

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useOrgColorPalette } from '../../../hooks/useOrgThemeColors'

interface FunnelDataPoint {
  name: string
  value: number
}

interface FunnelChartProps {
  data: FunnelDataPoint[]
  title?: string
  height?: number
  orientation?: 'vertical' | 'horizontal'
  onClick?: (params: any) => void
  className?: string
}

export function FunnelChart({
  data,
  title,
  height = 300,
  orientation = 'vertical',
  onClick,
  className = '',
}: FunnelChartProps) {
  // Sort data descending and calculate percentages
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value)
    const maxValue = Math.max(...sorted.map((d) => d.value))
    return sorted.map((d) => ({
      ...d,
      percent: maxValue > 0 ? (d.value / maxValue) * 100 : 0,
      total: maxValue,
    }))
  }, [data])

  const colors = useOrgColorPalette(chartData.length)

  const handleClick = (data: any, _index: number) => {
    if (onClick) {
      onClick({ name: data.name, value: data.value, percent: data.percent })
    }
  }

  // Custom shape for funnel bars
  const FunnelBar = (props: any) => {
    const { x, y, width, height: barHeight, payload } = props
    const index = chartData.findIndex((d) => d.name === payload.name)
    const color = colors[index % colors.length]
    
    // Calculate funnel width based on percentage
    const funnelWidth = (payload.percent / 100) * width
    
    // Center the funnel bar
    const funnelX = x + (width - funnelWidth) / 2
    
    return (
      <g>
        <rect
          x={funnelX}
          y={y}
          width={funnelWidth}
          height={barHeight}
          fill={color}
          stroke="var(--org-border-default)"
          strokeWidth={1}
          rx={4}
        />
        {funnelWidth > 80 && barHeight > 30 && (
          <text
            x={x + width / 2}
            y={y + barHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--org-text-primary)"
            fontSize={12}
            fontWeight="500"
          >
            {payload.name}: {payload.value}
          </text>
        )}
      </g>
    )
  }

  return (
    <div className={`oa-chart-funnel overflow-safe-page ${className}`} style={{ height: `${height}px`, width: '100%', minWidth: 0, overflow: 'hidden' }}>
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
        <BarChart
          data={chartData}
          layout={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          {orientation === 'vertical' ? (
            <>
              <XAxis
                dataKey="name"
                stroke="var(--org-text-secondary)"
                tick={{ fill: 'var(--org-text-secondary)', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="var(--org-text-secondary)"
                tick={{ fill: 'var(--org-text-secondary)', fontSize: 12 }}
                domain={[0, 'dataMax']}
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
                dataKey="name"
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
            formatter={(value: number | undefined, _name: string | undefined, props: any) => {
              if (value === undefined) return ['0', props.payload.name]
              const percent = ((value / props.payload.total) * 100).toFixed(1)
              return [`${value} (${percent}%)`, props.payload.name]
            }}
          />
          <Bar dataKey="value" shape={FunnelBar} onClick={handleClick}>
            {chartData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
