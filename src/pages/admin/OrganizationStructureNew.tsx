import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useUserContext } from '../../hooks/useUserContext'
import { PageHeader } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getSports, getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams } from '../../data/services/teamsService'
import { getSeasons } from '../../data/services/seasonsService'
import { getChildren } from '../../data/services/familyService'
import type { Sport, Program, Level, Team, Season, Child } from '../../data/types/organization'

export default function OrganizationStructureNew() {
  const { currentOrganization } = useOrganization()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!isReady) return

    setLoading(true)
    setError(null)

    try {
      const [sportsResult, programsResult, levelsResult, teamsResult, seasonsResult, childrenResult] =
        await Promise.all([
          getSports(context),
          getPrograms(context),
          getLevels(context),
          getTeams(context),
          getSeasons(context),
          getChildren(context),
        ])

      if (sportsResult.error || programsResult.error || levelsResult.error || teamsResult.error || seasonsResult.error || childrenResult.error) {
        throw (
          sportsResult.error ||
          programsResult.error ||
          levelsResult.error ||
          teamsResult.error ||
          seasonsResult.error ||
          childrenResult.error ||
          new Error('Failed to load organization data')
        )
      }

      setSports(Array.isArray(sportsResult.data) ? sportsResult.data : [])
      setPrograms(Array.isArray(programsResult.data) ? programsResult.data : [])
      setLevels(Array.isArray(levelsResult.data) ? levelsResult.data : [])
      setTeams(Array.isArray(teamsResult.data) ? teamsResult.data : [])
      setSeasons(Array.isArray(seasonsResult.data) ? seasonsResult.data : [])
      setChildren(Array.isArray(childrenResult.data) ? childrenResult.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }, [context, isReady])

  useEffect(() => {
    if (!isReady) return
    loadData()
  }, [isReady, loadData])

  const stats = {
    sports: Array.isArray(sports) ? sports.length : 0,
    programs: Array.isArray(programs) ? programs.length : 0,
    levels: Array.isArray(levels) ? levels.length : 0,
    teams: Array.isArray(teams) ? teams.length : 0,
    seasons: Array.isArray(seasons) ? seasons.length : 0,
    players: Array.isArray(children) ? children.length : 0,
    coaches: 0,
  }

  const activeSeasons = Array.isArray(seasons) ? seasons.filter((s) => s.is_active) : []
  const currentSeason = activeSeasons.length > 0 ? activeSeasons[0] : null

  if (!isReady || loading) {
    return (
      <div className="pa-flex pa-items-center pa-justify-center pa-h-full">
        <div className="pa-spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="org-structure-page">
        <PageHeader
          title={
            <>
              Organization <span className="pa-title-accent">Overview</span>
            </>
          }
          subtitle={`${currentOrganization?.name || 'Organization'} — Structural setup and team management`}
          breadcrumbs={[
            { label: 'Organizations', path: '/admin/organization' },
            { label: currentOrganization?.name || 'Organization' },
          ]}
        />
        <div className="pa-card">
          <div className="pa-text-danger pa-mb-3">{error}</div>
          <button className="pa-btn pa-btn--primary" onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="org-structure-page">
      <OfflineBanner />
      <PageHeader
        title={
          <>
            Organization <span className="pa-title-accent">Overview</span>
          </>
        }
        subtitle={`${currentOrganization?.name || 'Organization'} — Structural setup and team management`}
        breadcrumbs={[
          { label: 'Organizations', path: '/admin/organization' },
          { label: currentOrganization?.name || 'Organization' },
        ]}
      />

      <section className="org-stats-section">
        <div className="org-stats-grid">
          <StatBox label="Sports" value={stats.sports} />
          <StatBox label="Programs" value={stats.programs} />
          <StatBox label="Levels" value={stats.levels} />
          <StatBox label="Teams" value={stats.teams} />
          <StatBox label="Seasons" value={stats.seasons} />
          <StatBox label="Players" value={stats.players} isEmpty={stats.players === 0} />
          <StatBox label="Coaches" value={stats.coaches} isEmpty={stats.coaches === 0} />
        </div>
      </section>

      {currentSeason && (
        <section className="org-season-banner">
          <div>
            <span className="org-season-badge">Current Phase</span>
            <div className="org-season-title">
              <h2 className="org-season-name">{currentSeason.name}</h2>
              <span className="org-season-status">Active Season</span>
            </div>
          </div>
          <button className="org-season-btn" onClick={() => navigate('/admin/events')}>
            View Full Schedule
          </button>
        </section>
      )}

      <div className="org-content-grid">
        <div className="org-quick-actions">
          <h3 className="org-section-header">Quick Actions</h3>
          <div className="org-actions-grid">
            <QuickActionButton
              icon="sports_basketball"
              label="Add Sport"
              onClick={() => navigate('/admin/organization/structure/sports-programs')}
            />
            <QuickActionButton
              icon="category"
              label="Add Program"
              onClick={() => navigate('/admin/organization/structure/sports-programs')}
            />
            <QuickActionButton
              icon="stairs"
              label="Add Level"
              onClick={() => navigate('/admin/organization/structure/levels')}
            />
            <QuickActionButton
              icon="groups"
              label="Add Team"
              onClick={() => navigate('/admin/organization/structure/teams')}
            />
            <QuickActionButton
              icon="calendar_today"
              label="Add Season"
              onClick={() => navigate('/admin/organization/structure/seasons')}
            />
            <QuickActionButton
              icon="person_add"
              label="Add Player"
              onClick={() => navigate('/admin/children')}
            />
          </div>
        </div>

        <div className="org-principles">
          <h3 className="org-section-header">Core Principles</h3>
          <ul className="org-principle-list">
            <Principle label="Sequence" description="Create in order: Sport → Program → Level → Team" />
            <Principle label="Inheritance" description="Programs automatically inherit parent sport attributes" />
            <Principle label="Dependencies" description="Teams require both active Level and Season assignments" />
            <Principle label="Scope" description="Seasons are organization-wide global entities" />
          </ul>
        </div>
      </div>

      <div className="org-hierarchy-section">
        <h3 className="org-section-header">Structural Hierarchy</h3>
        <div className="org-hierarchy-flow">
          <HierarchyStep level="Root Entity" label="Organization" variant="dark" />
          <HierarchyStep level="Level 01" label="Sport" variant="primary" />
          <HierarchyStep level="Level 02" label="Program" variant="dark" />
          <HierarchyStep level="Level 03" label="Level" variant="primary" />
          <HierarchyStep level="Level 04" label="Team" variant="dark" />
          <HierarchyStep level="Final Node" label="Players" variant="primary" last />
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, isEmpty }: { label: string; value: number; isEmpty?: boolean }) {
  return (
    <div className="org-stat-box">
      <span className="org-stat-label">{label}</span>
      <span className={`org-stat-value ${isEmpty ? 'empty' : ''}`}>{String(value).padStart(2, '0')}</span>
    </div>
  )
}

function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button className="org-action-btn" onClick={onClick}>
      <div className="org-action-content">
        <span className="material-symbols-outlined org-action-icon">{icon}</span>
        <span className="org-action-label">{label}</span>
      </div>
      <span className="material-symbols-outlined org-action-plus">add</span>
    </button>
  )
}

function Principle({ label, description }: { label: string; description: string }) {
  return (
    <li className="org-principle-item">
      <span className="material-symbols-outlined org-principle-icon">check_circle</span>
      <div>
        <span className="org-principle-label">{label}</span>
        <p className="org-principle-desc">{description}</p>
      </div>
    </li>
  )
}

function HierarchyStep({
  level,
  label,
  variant,
  last,
}: {
  level: string
  label: string
  variant: 'primary' | 'dark'
  last?: boolean
}) {
  return (
    <div className={`org-hierarchy-step variant-${variant}`}>
      <span className="org-hierarchy-level">{level}</span>
      <span className="org-hierarchy-label">{label}</span>
      {!last && (
        <span className="org-hierarchy-arrow">
          <span className="material-symbols-outlined">trending_flat</span>
        </span>
      )}
    </div>
  )
}
