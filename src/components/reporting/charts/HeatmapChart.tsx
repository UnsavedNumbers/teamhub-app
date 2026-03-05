/**
 * Heatmap Chart Component
 *
 * Custom Recharts-based heatmap visualization using cell-based rendering.
 */

import { useMemo } from 'react'
import { useOrgThemeColors } from '../../../hooks/useOrgThemeColors'
import type { HeatmapData } from '../../../types/reporting'

interface HeatmapChartProps {
  data: HeatmapData
  title?: string
  height?: number
  onClick?: (params: any) => void
  className?: string
}

export function HeatmapChart({
  data,
  title,
  height = 300,
  onClick,
  className = '',
}: HeatmapChartProps) {
  const themeColors = useOrgThemeColors()

  // Create a 2D grid of values
  const gridData = useMemo(() => {
    const grid: Array<Array<{ x: number; y: number; value: number; xLabel: string; yLabel: string }>> = []
    
    data.yLabels.forEach((yLabel, yIndex) => {
      const row: Array<{ x: number; y: number; value: number; xLabel: string; yLabel: string }> = []
      data.xLabels.forEach((xLabel, xIndex) => {
        const point = data.data.find((d) => d.x === xLabel && d.y === yLabel)
        row.push({
          x: xIndex,
          y: yIndex,
          value: point ? point.value : 0,
          xLabel,
          yLabel,
        })
      })
      grid.push(row)
    })
    
    return grid
  }, [data])

  const minValue = useMemo(() => Math.min(...data.data.map((d) => d.value)), [data])
  const maxValue = useMemo(() => Math.max(...data.data.map((d) => d.value)), [data])
  const range = maxValue - minValue

  // Color interpolation function
  const getColor = (value: number): string => {
    if (range === 0) return themeColors.primary
    
    const normalized = (value - minValue) / range
    // Interpolate between primary (low) and secondary (high) colors
    // Using a simple linear interpolation approach
    const r1 = parseInt(themeColors.primary.slice(1, 3), 16)
    const g1 = parseInt(themeColors.primary.slice(3, 5), 16)
    const b1 = parseInt(themeColors.primary.slice(5, 7), 16)
    
    const r2 = parseInt(themeColors.secondary.slice(1, 3), 16)
    const g2 = parseInt(themeColors.secondary.slice(3, 5), 16)
    const b2 = parseInt(themeColors.secondary.slice(5, 7), 16)
    
    const r = Math.round(r1 + (r2 - r1) * normalized)
    const g = Math.round(g1 + (g2 - g1) * normalized)
    const b = Math.round(b1 + (b2 - b1) * normalized)
    
    return `rgb(${r}, ${g}, ${b})`
  }


  const handleClick = (cell: { x: number; y: number; value: number; xLabel: string; yLabel: string }) => {
    if (onClick) {
      onClick({ x: cell.xLabel, y: cell.yLabel, value: cell.value })
    }
  }

  return (
    <div className={`oa-chart-heatmap overflow-safe-page ${className}`} style={{ height: `${height}px`, width: '100%', minWidth: 0, overflow: 'hidden' }}>
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
      <div className="overflow-safe-scroll">
        <div
          style={{
          display: 'grid',
          gridTemplateColumns: `auto repeat(${data.xLabels.length}, 1fr)`,
          gridTemplateRows: `auto repeat(${data.yLabels.length}, 1fr)`,
          gap: '2px',
          height: title ? height - 80 : height - 40,
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* Empty corner */}
        <div />
        
        {/* X-axis labels */}
        {data.xLabels.map((label, index) => (
          <div
            key={`x-${index}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: 'var(--org-text-secondary)',
              fontWeight: '500',
              transform: 'rotate(-45deg)',
              transformOrigin: 'center',
            }}
          >
            {label}
          </div>
        ))}
        
        {/* Y-axis labels and cells */}
        {gridData.map((row, yIndex) => (
          <div key={`row-${yIndex}`} style={{ display: 'contents' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '8px',
                fontSize: '11px',
                color: 'var(--org-text-secondary)',
                fontWeight: '500',
              }}
            >
              {data.yLabels[yIndex]}
            </div>
            {row.map((cell, xIndex) => (
              <div
                key={`cell-${xIndex}-${yIndex}`}
                onClick={() => handleClick(cell)}
                style={{
                  backgroundColor: getColor(cell.value),
                  border: '1px solid var(--org-border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: cell.value > (minValue + range / 2) ? '#fff' : 'var(--org-text-primary)',
                  fontWeight: '600',
                  cursor: onClick ? 'pointer' : 'default',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
                title={`${cell.yLabel} / ${cell.xLabel}: ${cell.value}`}
              >
                {cell.value > 0 && cell.value}
              </div>
            ))}
          </div>
        ))}
        </div>
      </div>
      
      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '12px',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--org-text-secondary)' }}>Low</span>
        <div
          style={{
            display: 'flex',
            width: '200px',
            height: '20px',
            background: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})`,
            borderRadius: '4px',
            border: '1px solid var(--org-border-default)',
          }}
        />
        <span style={{ fontSize: '11px', color: 'var(--org-text-secondary)' }}>High</span>
      </div>
    </div>
  )
}
