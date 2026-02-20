/**
 * Treemap Chart Component
 *
 * Recharts wrapper for treemap visualizations (hierarchical breakdowns).
 */

import { useMemo } from 'react'
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'
import { useOrgColorPalette } from '../../../hooks/useOrgThemeColors'

interface TreemapDataNode {
  name: string
  value: number
  children?: TreemapDataNode[]
}

interface TreemapChartProps {
  data: TreemapDataNode[]
  title?: string
  height?: number
  onClick?: (params: any) => void
  className?: string
}

export function TreemapChart({
  data,
  title,
  height = 300,
  onClick,
  className = '',
}: TreemapChartProps) {
  // Flatten nested data if needed (Recharts Treemap expects flat array)
  const chartData = useMemo(() => {
    const flatten = (nodes: TreemapDataNode[]): TreemapDataNode[] => {
      const result: TreemapDataNode[] = []
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          result.push(...flatten(node.children))
        } else {
          result.push({ name: node.name, value: node.value })
        }
      })
      return result.length > 0 ? result : nodes
    }
    return flatten(data)
  }, [data])

  const colors = useOrgColorPalette(chartData.length)

  const handleClick = (data: any) => {
    if (onClick && data) {
      onClick({ name: data.name || data.payload?.name, value: data.value || data.payload?.value })
    }
  }

  const CustomContent = (props: any) => {
    const { x, y, width, height: cellHeight, payload } = props
    if (!payload) return null
    
    const index = chartData.findIndex((d) => d.name === payload.name)
    const color = colors[index % colors.length]

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={cellHeight}
          fill={color}
          stroke="var(--org-border-default)"
          strokeWidth={2}
          rx={4}
          onClick={() => handleClick(payload)}
          style={{ cursor: 'pointer' }}
        />
        {width > 60 && cellHeight > 30 && (
          <text
            x={x + width / 2}
            y={y + cellHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--org-text-primary)"
            fontSize={12}
            fontWeight="600"
          >
            {payload.name}
          </text>
        )}
        {width > 60 && cellHeight > 50 && (
          <text
            x={x + width / 2}
            y={y + cellHeight / 2 + 16}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--org-text-secondary)"
            fontSize={10}
          >
            {payload.value}
          </text>
        )}
      </g>
    )
  }

  return (
    <div className={`oa-chart-treemap ${className}`} style={{ height: `${height}px`, width: '100%' }}>
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
        <Treemap
          data={chartData as any}
          dataKey="value"
          aspectRatio={4 / 3}
          stroke="var(--org-border-default)"
          onClick={handleClick}
          content={<CustomContent />}
        >
          {chartData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--org-surface-card)',
              border: '1px solid var(--org-border-default)',
              borderRadius: '6px',
              color: 'var(--org-text-primary)',
            }}
            formatter={(value: number | undefined, name: string | undefined) => [`${value ?? 0}`, name ?? '']}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}
