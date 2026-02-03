/**
 * Team Settings Tab
 * 
 * Displays team settings and configuration within the Team Detail page.
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getLink } from '../../utils/routes'
import { Button, EmptyState } from '../platformAdmin'

interface TeamSettingsTabProps {
  teamId: string
  teamName: string
}

export function TeamSettingsTab({ teamId: _teamId, teamName }: TeamSettingsTabProps) {
  const { context } = useUserContext()
  const navigate = useNavigate()
  const isOrgAdmin = context.roles.includes('org_admin')


  const handleViewOrganizationSettings = useCallback(() => {
    navigate(getLink('admin.organization.settings'))
  }, [navigate])

  if (!isOrgAdmin) {
    return (
      <div className="pa-card">
        <EmptyState
          icon="lock"
          title="Settings unavailable"
          description="Team settings are only available to organization administrators."
          noCard
        />
      </div>
    )
  }

  return (
    <div>
      {/* Top row with title and org-level link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pa-space-4)' }}>
        <div>
          <h3 className="pa-h3" style={{ margin: 0 }}>
            Settings
          </h3>
          <p className="pa-body-s dark:text-slate-400" style={{ color: 'var(--pa-n500)', margin: 'var(--pa-space-1) 0 0 0' }}>
            Team configuration and preferences
          </p>
        </div>
        <Button variant="secondary" size="small" onClick={handleViewOrganizationSettings}>
          View organization settings
        </Button>
      </div>

      <div className="pa-card">
        <div style={{ padding: 'var(--pa-space-5)' }}>
          <EmptyState
            icon="settings"
            title="Settings coming soon"
            description={`Team settings for ${teamName} will be available in a future update.`}
            noCard
          />
        </div>
      </div>
    </div>
  )
}
