/**
 * Breadcrumb Navigation Component
 *
 * Shows drilldown path and allows jumping back up levels.
 */

import { useReporting } from '../../contexts/ReportingContext'

export function BreadcrumbNav() {
  const { drilldownPath, removeDrilldown, clearDrilldown, scope } = useReporting()

  if (drilldownPath.length === 0) {
    return null
  }

  return (
    <div
      className="oa-breadcrumb-nav"
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--org-border-color)',
        backgroundColor: 'var(--org-bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
      }}
    >
      <button
        onClick={clearDrilldown}
        style={{
          padding: '4px 8px',
          border: 'none',
          background: 'transparent',
          color: 'var(--org-text-secondary)',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        {scope.orgId ? 'Organization' : 'All'}
      </button>
      {drilldownPath.map((item, index) => (
        <div key={`${item.level}-${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--org-text-secondary)' }}>/</span>
          <button
            onClick={() => removeDrilldown(item.level)}
            style={{
              padding: '4px 8px',
              border: 'none',
              background: 'transparent',
              color: 'var(--org-text-primary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: index === drilldownPath.length - 1 ? 'bold' : 'normal',
            }}
          >
            {item.name}
          </button>
        </div>
      ))}
    </div>
  )
}
