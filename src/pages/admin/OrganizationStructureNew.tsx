import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useUserContext } from '../../hooks/useUserContext'
import { AdminPageHeader, Button } from '../../components/admin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import { getSports, getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams } from '../../data/services/teamsService'
import { getSeasons } from '../../data/services/seasonsService'
import { getAthletes } from '../../data/services/familyService'
import { getOrganizationUsers } from '../../data/services/usersService'
import type { Sport, Program, Level, Team, Season } from '../../data/types/organization'
import type { Child } from '../../types/family'
import '../../styles/orgAdmin.css'

export default function OrganizationStructureNew() {
  const { currentOrganization } = useOrganization()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [exampleType, setExampleType] = useState<'school' | 'club' | 'aau' | 'recreation'>('school')
  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [coachCount, setCoachCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!isReady) return

    setLoading(true)
    setError(null)

    try {
      const [sportsResult, programsResult, levelsResult, teamsResult, seasonsResult, childrenResult, usersResult] =
        await Promise.all([
          getSports(context),
          getPrograms(context),
          getLevels(context),
          getTeams(context),
          getSeasons(context),
          getAthletes(context),
          getOrganizationUsers(context),
        ])

      // Check for critical errors (sports, programs, levels, teams, seasons, children)
      // Users error is non-critical - we can still show the page
      if (
        sportsResult.error ||
        programsResult.error ||
        levelsResult.error ||
        teamsResult.error ||
        seasonsResult.error ||
        childrenResult.error
      ) {
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

      // Log users error but don't throw
      if (usersResult.error) {
        console.warn('[OrganizationStructureNew] Failed to load users, setting coach count to 0:', usersResult.error)
      }

      setSports(Array.isArray(sportsResult.data) ? sportsResult.data : [])
      setPrograms(Array.isArray(programsResult.data) ? programsResult.data : [])
      setLevels(Array.isArray(levelsResult.data) ? levelsResult.data : [])
      setTeams(Array.isArray(teamsResult.data) ? teamsResult.data : [])
      setSeasons(Array.isArray(seasonsResult.data) ? seasonsResult.data : [])
      setChildren(Array.isArray(childrenResult.data) ? childrenResult.data : [])
      const coachTotal = Array.isArray(usersResult.data)
        ? usersResult.data.filter((u) => u.roles.includes('coach')).length
        : 0
      setCoachCount(coachTotal)
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
    coaches: coachCount,
  }

  const activeSeasons = Array.isArray(seasons) ? seasons.filter((s) => s.is_active) : []
  const currentSeason = activeSeasons.length > 0 ? activeSeasons[0] : null

  // Compute prerequisite flags using useMemo for consistency
  const canCreateProgram = useMemo(
    () => !loading && Array.isArray(sports) && sports.length > 0,
    [loading, sports.length]
  )

  const canCreateLevel = useMemo(
    () => !loading && Array.isArray(programs) && programs.length > 0,
    [loading, programs.length]
  )

  const canCreateTeam = useMemo(
    () => !loading && Array.isArray(levels) && levels.length > 0,
    [loading, levels.length]
  )

  if (!isReady || loading) {
    return (
      <div className="oa-flex oa-items-center oa-justify-center oa-h-full">
        <div className="oa-spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="org-structure-page">
        <AdminPageHeader
          title={
            <>
              Organization <span className="oa-title-accent">Overview</span>
            </>
          }
          subtitle={`${currentOrganization?.name || 'Organization'} — Structural setup and team management`}
          breadcrumbs={[
            { label: 'Organizations', path: '/admin/organization' },
            { label: currentOrganization?.name || 'Organization' },
          ]}
        />
        <div className="oa-card">
          <div className="oa-text-danger oa-mb-3">{error}</div>
          <Button onClick={loadData}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="org-structure-page">
      <OfflineBanner />
      <AdminPageHeader
        title={
          <>
            Organization <span className="oa-title-accent">Overview</span>
          </>
        }
        subtitle={`${currentOrganization?.name || 'Organization'} — Structural setup and team management`}
        breadcrumbs={[
          { label: 'Organizations', path: getLink('admin.organization.structure') },
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
              onClick={() => navigate(`${getLink('admin.organization.forms')}?type=sport`)}
            />
            <QuickActionButton
              icon="category"
              label="Add Program"
              onClick={() => navigate(`${getLink('admin.organization.forms')}?type=program`)}
              disabled={!canCreateProgram}
              tooltip={!canCreateProgram ? 'Add a Sport first' : undefined}
            />
            <QuickActionButton
              icon="stairs"
              label="Add Level"
              onClick={() => navigate(`${getLink('admin.organization.forms')}?type=level`)}
              disabled={!canCreateLevel}
              tooltip={!canCreateLevel ? 'Add a Program first' : undefined}
            />
            <QuickActionButton
              icon="groups"
              label="Add Team"
              onClick={() => navigate(`${getLink('admin.organization.forms')}?type=team`)}
              disabled={!canCreateTeam}
              tooltip={!canCreateTeam ? 'Add a Level first' : undefined}
            />
            <QuickActionButton
              icon="calendar_today"
              label="Add Season"
              onClick={() => navigate(`${getLink('admin.organization.forms')}?type=season`)}
            />
            <QuickActionButton
              icon="person_add"
              label="Add Player"
              onClick={() => navigate(getLink('admin.athletes.list'))}
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
        <div className="org-hierarchy-header">
          <h3 className="org-section-header">How Your Organization Is Structured</h3>
          <div className="org-example-select">
            <label className="org-example-label" htmlFor="org-example-type">Example Type</label>
            <select
              id="org-example-type"
              className="org-example-input"
              value={exampleType}
              onChange={(event) => setExampleType(event.target.value as 'school' | 'club' | 'aau' | 'recreation')}
            >
              <option value="school">School</option>
              <option value="club">Club</option>
              <option value="aau">AAU / Travel</option>
              <option value="recreation">Recreation League</option>
            </select>
          </div>
        </div>
        <div className="org-hierarchy-flow">
          <HierarchyStep
            level="Organization"
            label="Organization"
            descriptor="Your organization name"
            example={
              exampleType === 'school'
                ? 'Davis High School'
                : exampleType === 'club'
                  ? 'North Bay United'
                  : exampleType === 'aau'
                    ? 'Elite Hoops Academy'
                    : 'City Youth Sports'
            }
            variant="dark"
          />
          <HierarchyStep
            level="Sport"
            label="Sport"
            descriptor="The sport you offer"
            example={
              exampleType === 'school'
                ? 'Soccer'
                : exampleType === 'club'
                  ? 'Soccer'
                  : exampleType === 'aau'
                    ? 'Basketball'
                    : 'Basketball'
            }
            variant="primary"
          />
          <HierarchyStep
            level="Program"
            label="Program"
            descriptor="Gender or division grouping"
            example={
              exampleType === 'school'
                ? 'Boys Soccer'
                : exampleType === 'club'
                  ? 'Competitive Boys Program'
                  : exampleType === 'aau'
                    ? 'Boys AAU Program'
                    : 'Girls Winter League'
            }
            variant="dark"
          />
          <HierarchyStep
            level="Level"
            label="Level"
            descriptor="Age or skill band"
            example={
              exampleType === 'school'
                ? 'Varsity Boys'
                : exampleType === 'club'
                  ? 'Boys U14'
                  : exampleType === 'aau'
                    ? 'Boys 17U'
                    : 'Grades 3–4 Girls'
            }
            variant="primary"
          />
          <HierarchyStep
            level="Team"
            label="Team"
            descriptor="The team people join"
            example={
              exampleType === 'school'
                ? 'Varsity Boys Soccer'
                : exampleType === 'club'
                  ? 'Boys U14 Red'
                  : exampleType === 'aau'
                    ? 'Elite 17U Boys Black'
                    : 'Girls Blue Team'
            }
            variant="dark"
          />
          <HierarchyStep
            level="Players"
            label="Players"
            descriptor="Who participates"
            example={
              exampleType === 'school'
                ? 'Rostered Boys Student-Athletes'
                : exampleType === 'club'
                  ? 'Registered Boys Athletes'
                  : exampleType === 'aau'
                    ? 'Tournament Boys Roster'
                    : 'Registered Girls Participants'
            }
            variant="primary"
            last
          />
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
  disabled = false,
  tooltip,
}: {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
  tooltip?: string
}) {
  return (
    <button
      className="org-action-btn"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
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
  descriptor,
  example,
  variant,
  last,
}: {
  level: string
  label: string
  descriptor: string
  example: string
  variant: 'primary' | 'dark'
  last?: boolean
}) {
  return (
    <div className={`org-hierarchy-step variant-${variant}`}>
      <div className="org-hierarchy-card">
        <span className="org-hierarchy-level">{level}</span>
        <span className="org-hierarchy-label">{label}</span>
        <span className="org-hierarchy-description">{descriptor}</span>
        <span className="org-hierarchy-example">{example}</span>
      </div>
      {!last && (
        <span className="org-hierarchy-arrow">
          <span className="material-symbols-outlined">trending_flat</span>
        </span>
      )}
    </div>
  )
}
