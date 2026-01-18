/**
 * Teams Management
 *
 * Table view with filtering by season, sport, program, level, and status.
 */

import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getTeams } from '../../data/services/teamsService'
import { getSports, getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getSeasons } from '../../data/services/seasonsService'
import type { Team, Sport, Program, Level, Season } from '../../data/types/organization'
import { PageHeader, Card, Button, Select } from '../../components/platformAdmin'
import { Breadcrumbs } from '../../components/admin/Breadcrumbs'

export default function TeamsManagement() {
  const { context, isReady } = useUserContext()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [teams, setTeams] = useState<Team[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])

  const [filterSeasonId, setFilterSeasonId] = useState<string>('')
  const [filterSportId, setFilterSportId] = useState<string>('')
  const [filterProgramId, setFilterProgramId] = useState<string>('')
  const [filterLevelId, setFilterLevelId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [teamsResult, sportsResult, programsResult, levelsResult, seasonsResult] = await Promise.all([
          getTeams(context),
          getSports(context),
          getPrograms(context),
          getLevels(context),
          getSeasons(context),
        ])

        setTeams(teamsResult.data as Team[])
        setSports(sportsResult.data as Sport[])
        setPrograms(programsResult.data as Program[])
        setLevels(levelsResult.data as Level[])
        setSeasons(seasonsResult.data as Season[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  const sportById = useMemo(() => new Map(sports.map((s) => [s.id, s])), [sports])
  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs])
  const levelById = useMemo(() => new Map(levels.map((l) => [l.id, l])), [levels])

  // Filter available programs based on selected sport
  const availablePrograms = filterSportId ? programs.filter((p) => p.sport_id === filterSportId) : programs

  // Filter available levels based on selected program
  const availableLevels = filterProgramId ? levels.filter((l) => l.program_id === filterProgramId) : levels

  const filteredTeams = teams.filter((team) => {
    if (filterSeasonId && !team.id.includes(filterSeasonId)) return false // TODO: Check actual season association
    if (filterSportId && team.sport_id !== filterSportId) return false
    if (filterProgramId && team.program_id !== filterProgramId) return false
    if (filterLevelId && team.level_id !== filterLevelId) return false
    if (filterStatus === 'active' && !team.is_active) return false
    if (filterStatus === 'inactive' && team.is_active) return false
    return true
  })

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  return (
    <div className="pa-root">
      <PageHeader title="Teams" subtitle="Manage rostered competition units" />

      <Breadcrumbs
        items={[
          { label: 'Organization Structure', path: '/admin/organization/structure' },
          { label: 'Teams' },
        ]}
      />

      {error && (
        <Card className="pa-mb-4">
          <div className="pa-text-danger">{error}</div>
        </Card>
      )}

      {teams.length === 0 ? (
        <Card>
          <div className="pa-flex pa-flex-col pa-items-center pa-justify-center pa-text-center pa-p-6">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-n300)', marginBottom: '16px' }}>
              groups
            </span>
            <h3 className="pa-h3">No teams yet</h3>
            <p className="pa-body-m pa-text-muted pa-mb-4">
              Create levels and seasons first, then add teams to structure your competition.
            </p>
            <Link to="/admin/organization/structure/teams/new">
              <Button>Add a Team</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <Card className="pa-mb-4" noPadding>
            <div className="pa-p-4 pa-grid pa-grid-6 pa-gap-3 pa-border-b" style={{ borderColor: 'var(--pa-n200)' }}>
              <Select
                label="Season"
                value={filterSeasonId}
                onChange={(e) => setFilterSeasonId(e.target.value)}
                options={[
                  { value: '', label: 'All seasons' },
                  ...seasons.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <Select
                label="Sport"
                value={filterSportId}
                onChange={(e) => {
                  setFilterSportId(e.target.value)
                  setFilterProgramId('')
                  setFilterLevelId('')
                }}
                options={[
                  { value: '', label: 'All sports' },
                  ...sports.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <Select
                label="Program"
                value={filterProgramId}
                onChange={(e) => {
                  setFilterProgramId(e.target.value)
                  setFilterLevelId('')
                }}
                options={[
                  { value: '', label: 'All programs' },
                  ...availablePrograms.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <Select
                label="Level"
                value={filterLevelId}
                onChange={(e) => setFilterLevelId(e.target.value)}
                options={[
                  { value: '', label: 'All levels' },
                  ...availableLevels.map((l) => ({ value: l.id, label: l.name })),
                ]}
              />
              <Select
                label="Status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <Link to="/admin/organization/structure/teams/new" style={{ width: '100%' }}>
                  <Button>Add Team</Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card noPadding>
            <table className="pa-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th className="pa-p-4">Team Name</th>
                  <th className="pa-p-4">Level</th>
                  <th className="pa-p-4">Program</th>
                  <th className="pa-p-4">Sport</th>
                  <th className="pa-p-4">Seasons</th>
                  <th className="pa-p-4">Players</th>
                  <th className="pa-p-4">Status</th>
                  <th className="pa-p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team) => {
                  const sport = sportById.get(team.sport_id)
                  const program = programById.get(team.program_id || '')
                  const level = levelById.get(team.level_id)

                  return (
                    <tr key={team.id} style={{ borderTop: '1px solid var(--pa-n200)' }}>
                      <td className="pa-p-4 pa-font-medium">{team.name}</td>
                      <td className="pa-p-4 pa-text-muted">{level?.name || '—'}</td>
                      <td className="pa-p-4 pa-text-muted">{program?.name || '—'}</td>
                      <td className="pa-p-4 pa-text-muted">{sport?.name || '—'}</td>
                      <td className="pa-p-4 pa-text-muted">—</td>
                      <td className="pa-p-4 pa-text-muted">{team.max_roster_size || '—'}</td>
                      <td className="pa-p-4">
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: team.is_active ? 'var(--pa-success-bg)' : 'var(--pa-n200)',
                            color: team.is_active ? 'var(--pa-success)' : 'var(--pa-n600)',
                          }}
                        >
                          {team.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="pa-p-4">
                        <Link to={`/admin/teams/${team.id}`}>
                          <Button variant="secondary">
                            Manage
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredTeams.length === 0 && (
              <div className="pa-p-4 pa-text-center pa-text-muted">No teams match your filters.</div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
