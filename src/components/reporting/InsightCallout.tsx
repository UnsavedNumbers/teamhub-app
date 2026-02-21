/**
 * Insight Callout Component
 *
 * Compact card for displaying insights (trends, anomalies, recommendations).
 * Used in the insights engine pattern.
 */

interface InsightCalloutProps {
  title: string
  description: string
  type?: 'trend' | 'anomaly' | 'concentration' | 'friction' | 'timeliness' | 'recommendation'
  icon?: string
}

export function InsightCallout({
  title,
  description,
  type = 'trend',
  icon,
}: InsightCalloutProps) {
  const typeConfig = {
    trend: { color: 'var(--org-status-info)', defaultIcon: 'trending_up' },
    anomaly: { color: 'var(--org-status-warning)', defaultIcon: 'warning' },
    concentration: { color: 'var(--org-status-info)', defaultIcon: 'pie_chart' },
    friction: { color: 'var(--org-status-error)', defaultIcon: 'block' },
    timeliness: { color: 'var(--org-status-warning)', defaultIcon: 'schedule' },
    recommendation: { color: 'var(--org-status-success)', defaultIcon: 'lightbulb' },
  }

  const config = typeConfig[type]
  const displayIcon = icon || config.defaultIcon

  return (
    <div
      style={{
        padding: '16px 20px',
        background: 'var(--org-surface-card)',
        border: '1px solid var(--org-border-default)',
        borderLeft: `4px solid ${config.color}`,
        borderRadius: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '20px',
            color: config.color,
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          {displayIcon}
        </span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--org-text-primary)',
              marginBottom: '4px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--org-text-secondary)',
              lineHeight: '1.5',
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </div>
  )
}
