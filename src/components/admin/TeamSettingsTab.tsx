/**
 * Team Settings Tab
 * 
 * Displays team settings and configuration within the Team Detail page.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getTeamDetails } from '../../data/services/teamsService'
import { getLink } from '../../utils/routes'
import { Button, EmptyState, Card, Input } from '../platformAdmin'
import { showSuccess, showError } from '../../utils/toast'
import { useT } from '../../i18n/useI18n'

interface TeamSettingsTabProps {
  teamId: string
  teamName: string
}

export function TeamSettingsTab({ teamId, teamName }: TeamSettingsTabProps) {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()
  const isOrgAdmin = context.roles.includes('org_admin')
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  useEffect(() => {
    if (isReady && teamId) {
      fetchTeamCode()
    }
  }, [isReady, teamId])

  const fetchTeamCode = async () => {
    if (!context || !teamId) return
    
    const { data, error } = await getTeamDetails(context, teamId)
    
    if (!error && data) {
      setInviteCode((data as any).invite_code || null)
    }
  }

  const getJoinUrl = () => {
    if (!inviteCode) return ''
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/portal/join?code=${inviteCode}`
  }

  const copyJoinLink = () => {
    const url = getJoinUrl()
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        showSuccess(t('admin.teamSettings.joinLinkCopied'))
      }).catch(() => {
        showError(t('admin.teamSettings.failedToCopy'))
      })
    }
  }

  const copyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode).then(() => {
        showSuccess(t('admin.teamSettings.codeCopied'))
      }).catch(() => {
        showError(t('admin.teamSettings.failedToCopy'))
      })
    }
  }


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

      {/* Team Invite Code Section */}
      {inviteCode && (
        <Card className="mb-6">
          <div style={{ padding: 'var(--pa-space-5)' }}>
            <h4 className="pa-h4 mb-4">{t('admin.teamSettings.inviteCodeTitle')}</h4>
            <p className="pa-body-s text-slate-500 dark:text-slate-400 mb-4">
              {t('admin.teamSettings.inviteCodeDescription')}
            </p>
            
            <div className="space-y-4">
              {/* Invite Code */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('admin.teamSettings.teamCode')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={inviteCode}
                    readOnly
                    className="font-mono text-lg tracking-widest text-center"
                    style={{ letterSpacing: '0.2em' }}
                  />
                  <Button
                    variant="secondary"
                    icon="content_copy"
                    onClick={copyCode}
                  >
                    {t('admin.teamSettings.copy')}
                  </Button>
                </div>
              </div>

              {/* Join Link */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('admin.teamSettings.joinLink')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={getJoinUrl()}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    variant="primary"
                    icon="content_copy"
                    onClick={copyJoinLink}
                  >
                    {t('admin.teamSettings.copyLink')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

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
