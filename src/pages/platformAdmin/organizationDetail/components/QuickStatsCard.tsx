/**
 * QuickStatsCard Component
 * 
 * Displays quick statistics about the organization.
 */

import { Card } from '../../../../components/platformAdmin'
import { safeNumber } from '../../../../utils/safeAccessors'
import type { AdminOrganization } from '../../../../types/platformAdmin.types'

interface QuickStatsCardProps {
  organization: AdminOrganization
}

export function QuickStatsCard({ organization }: QuickStatsCardProps) {
  return (
    <Card title="Quick Stats">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--pa-space-4)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pa-h2" style={{ margin: 0, color: 'var(--pa-primary)' }}>
            {safeNumber(organization.team_count, 0)}
          </div>
          <div className="pa-caption pa-text-muted">Teams</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="pa-h2" style={{ margin: 0, color: 'var(--pa-primary)' }}>
            {safeNumber(organization.sport_count, 0)}
          </div>
          <div className="pa-caption pa-text-muted">Sports</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="pa-h2" style={{ margin: 0, color: 'var(--pa-primary)' }}>
            {safeNumber(organization.user_count, 0)}
          </div>
          <div className="pa-caption pa-text-muted">Users</div>
        </div>
      </div>
    </Card>
  )
}
