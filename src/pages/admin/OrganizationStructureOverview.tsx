/**
 * Organization Structure Overview
 *
 * High-level snapshot of the organization structure with summary counts
 * and quick action buttons that deep-link to the correct forms.
 */

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getSports } from '../../data/services/sportsService'
import { getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams } from '../../data/services/teamsService'
import { getSeasons } from '../../data/services/seasonsService'
import type { Sport, Program, Level, Team, Season } from '../../data/types/organization'
import { PageHeader, Card, Button } from '../../components/platformAdmin'
import { Breadcrumbs } from '../../components/admin/Breadcrumbs'

export default function OrganizationStructureOverview() {
  useParams<{ orgId?: string }>()
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])

  const [playerCount, setPlayerCount] = useState(0)
  const [coachCount, setCoachCount] = useState(0)

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [sportsResult, programsResult, levelsResult, teamsResult, seasonsResult] = await Promise.all([
          getSports(context),
          getPrograms(context),
          getLevels(context),
          getTeams(context),
          getSeasons(context),
        ])

        setSports(sportsResult.data as Sport[])
        setPrograms(programsResult.data as Program[])
        setLevels(levelsResult.data as Level[])
        setTeams(teamsResult.data as Team[])
        setSeasons(seasonsResult.data as Season[])

        // TODO: Fetch player and coach counts from service
        setPlayerCount(0)
        setCoachCount(0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organization data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  const activeSeason = seasons.find((s) => s.is_active)

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  if (error) {
    return (
      <div className="pa-root">
        <PageHeader title="Overview" />
        <Card>
          <div className="pa-text-danger">{error}</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <PageHeader
        title="Organization Overview"
        subtitle={`${currentOrganization?.name || 'Organization'} — Structural setup and team management`}
      />

      <Breadcrumbs
        items={[
          { label: 'Organizations', path: '/admin/organization' },
          { label: currentOrganization?.name || 'Organization' },
        ]}
      />

      <div className="pa-grid pa-grid-4 pa-gap-4 pa-mb-6">
        <Card title="Sports">
          <div className="pa-h2">{sports.length}</div>
        </Card>
        <Card title="Programs">
          <div className="pa-h2">{programs.length}</div>
        </Card>
        <Card title="Levels">
          <div className="pa-h2">{levels.length}</div>
        </Card>
        <Card title="Teams">
          <div className="pa-h2">{teams.length}</div>
        </Card>
      </div>

      <div className="pa-grid pa-grid-3 pa-gap-4 pa-mb-6">
        <Card title="Seasons">
          <div className="pa-h2">{seasons.length}</div>
        </Card>
        <Card title="Players">
          <div className="pa-h2">{playerCount}</div>
        </Card>
        <Card title="Coaches">
          <div className="pa-h2">{coachCount}</div>
        </Card>
      </div>

      {activeSeason && (
        <Card className="pa-mb-6" title="Active Season">
          <div className="pa-flex pa-items-center pa-justify-between">
            <div>
              <div className="pa-body-m pa-text-muted">Current</div>
              <div className="pa-h3">{activeSeason.name}</div>
            </div>
            <Link to={`/admin/organization/structure/seasons/${activeSeason.id}`}>
              <Button variant="secondary">View Details</Button>
            </Link>
          </div>
        </Card>
      )}

      <Card title="Quick Actions" className="pa-mb-6">
        <div className="pa-flex pa-flex-col pa-gap-3">
          <Link to="/admin/organization/structure/sports/new">
            <Button>Add Sport</Button>
          </Link>
          {sports.length > 0 && (
            <Link to="/admin/organization/structure/programs/new">
              <Button variant="secondary">
                Add Program
              </Button>
            </Link>
          )}
          {programs.length > 0 && (
            <Link to="/admin/organization/structure/levels/new">
              <Button variant="secondary">
                Add Level
              </Button>
            </Link>
          )}
          {levels.length > 0 && seasons.length > 0 && (
            <Link to="/admin/organization/structure/teams/new">
              <Button variant="secondary">
                Add Team
              </Button>
            </Link>
          )}
          <Link to="/admin/organization/structure/seasons/new">
            <Button variant="secondary">
              Add Season
            </Button>
          </Link>
          {teams.length > 0 && (
            <Link to="/admin/organization/structure/people/players/new">
              <Button variant="secondary">
                Add Player
              </Button>
            </Link>
          )}
        </div>
      </Card>

      {sports.length === 0 && (
        <Card>
          <div className="pa-flex pa-flex-col pa-items-center pa-justify-center pa-text-center pa-p-6">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n300)', marginBottom: '16px' }}>
              sports
            </span>
            <h3 className="pa-h3">Get started</h3>
            <p className="pa-body-m pa-text-muted pa-mb-4">
              Start by adding a sport. Then create programs, levels, and teams to structure your organization.
            </p>
            <Link to="/admin/organization/structure/sports/new">
              <Button>Add Your First Sport</Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="pa-grid pa-grid-2 pa-gap-6 pa-mt-6">
        <Card title="Structural Hierarchy" noPadding>
          <div className="pa-p-4 pa-text-sm" style={{ fontFamily: 'monospace', color: 'var(--pa-n600)' }}>
            Organization<br />
            &nbsp;&nbsp;└─ Sport<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ Program (gender)<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ Level (age/grade/skill)<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ Team + Season<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ Players
          </div>
        </Card>

        <Card title="Key Principles" noPadding>
          <ul className="pa-p-4 pa-flex pa-flex-col pa-gap-2 pa-text-sm" style={{ listStyle: 'none' }}>
            <li>✓ Create entities in order (Sport → Program → Level → Team)</li>
            <li>✓ Programs inherit sport attributes</li>
            <li>✓ Teams require both level and season</li>
            <li>✓ Seasons are organization-wide</li>
            <li>✓ Players are added to specific teams</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
