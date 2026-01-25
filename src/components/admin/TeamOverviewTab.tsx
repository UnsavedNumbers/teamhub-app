/**
 * Team Overview Tab
 * 
 * Displays a quick snapshot of the team with summary cards.
 */

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getLink } from '../../utils/routes/helpers'
import { Button } from '../platformAdmin'

interface TeamOverviewTabProps {
  teamId: string
  teamName: string
  sportName?: string
  programName?: string
  levelName?: string
  seasonName?: string | null
  totalAthletes: number
  activeAthletes: number
}

export function TeamOverviewTab({
  teamId: _teamId,
  teamName,
  sportName,
  programName: _programName,
  levelName: _levelName,
  seasonName,
  totalAthletes,
  activeAthletes,
}: TeamOverviewTabProps) {
  const { context: _context } = useUserContext()
  const navigate = useNavigate()

  const handleViewOrganizationTeams = useCallback(() => {
    navigate(getLink('admin.teams.list'))
  }, [navigate])

  return (
    <div>
      {/* Top row with title and org-level link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pa-space-6)' }}>
        <div>
          <h3 className="pa-h3" style={{ margin: 0 }}>
            Overview
          </h3>
          <p className="pa-body-s" style={{ color: 'var(--pa-n500)', margin: 'var(--pa-space-1) 0 0 0' }} className="dark:text-slate-400">
            {teamName}
          </p>
        </div>
        <Button variant="secondary" size="small" onClick={handleViewOrganizationTeams}>
          View organization teams
        </Button>
      </div>

      {/* Summary card grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--pa-space-4)',
        }}
      >
        {/* Sport Card */}
        {sportName && (
          <div className="pa-card" style={{ padding: 'var(--pa-space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--pa-n400)' }}>
                sports_soccer
              </span>
              <span className="pa-label dark:text-slate-400" style={{ color: 'var(--pa-n500)', margin: 0 }}>
                Sport
              </span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--pa-n900)' }} className="dark:text-white">
              {sportName}
            </div>
          </div>
        )}

        {/* Season Card */}
        {seasonName && (
          <div className="pa-card" style={{ padding: 'var(--pa-space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--pa-n400)' }}>
                calendar_today
              </span>
              <span className="pa-label dark:text-slate-400" style={{ color: 'var(--pa-n500)', margin: 0 }}>
                Season
              </span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--pa-n900)' }} className="dark:text-white">
              {seasonName}
            </div>
          </div>
        )}

        {/* Total Athletes Card */}
        <div className="pa-card" style={{ padding: 'var(--pa-space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--pa-n400)' }}>
              people
            </span>
            <span className="pa-label dark:text-slate-400" style={{ color: 'var(--pa-n500)', margin: 0 }}>
              Total Athletes
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--pa-n900)' }} className="dark:text-white">
            {totalAthletes}
          </div>
        </div>

        {/* Active Athletes Card */}
        <div className="pa-card" style={{ padding: 'var(--pa-space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--pa-n400)' }}>
              check_circle
            </span>
            <span className="pa-label dark:text-slate-400" style={{ color: 'var(--pa-n500)', margin: 0 }}>
              Active Athletes
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--pa-n900)' }} className="dark:text-white">
            {activeAthletes}
          </div>
        </div>
      </div>
    </div>
  )
}
