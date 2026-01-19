/**
 * Teams Management
 *
 * Table view with filtering by season, sport, program, level, and status.
 */

import { useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getTeams } from '../../data/services/teamsService'
import { getSports, getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getSeasons } from '../../data/services/seasonsService'
import type { Team, Sport, Program, Level, Season } from '../../data/types/organization'
import { AdminPageHeader } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'

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

  // --- UI Components ---

  const FilterLabel = ({ children }: { children: ReactNode }) => (
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
      {children}
    </label>
  )

  const SelectInput = ({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
      <select
        className="w-full h-12 md:h-11 pl-3 pr-10 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all hover:border-slate-300"
        {...props}
      />
      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
        <span className="material-symbols-outlined text-lg">expand_more</span>
      </div>
    </div>
  )

  const PrimaryButton = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <button className={`inline-flex items-center justify-center h-11 px-6 font-semibold text-sm text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 ${className}`}>
      {children}
    </button>
  )

  const StatusBadge = ({ active }: { active: boolean }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
      active 
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
        : 'bg-slate-100 text-slate-600 border border-slate-200'
    }`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  )

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-12"></div>
        <div className="h-40 bg-slate-100 rounded-xl mb-8"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
             <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <OfflineBanner />
      <AdminPageHeader
        title="Teams"
        subtitle="Manage your rostered competition units and their assignments."
        breadcrumbs={[
          { label: 'Organizations', path: '/admin/organization/structure' },
          { label: 'Teams' },
        ]}
      />

      {error && (
        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
          
          {/* Row 1 */}
          <div>
            <FilterLabel>Season</FilterLabel>
            <SelectInput 
              value={filterSeasonId}
              onChange={(e) => setFilterSeasonId(e.target.value)}
            >
              <option value="">All seasons</option>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectInput>
          </div>

          <div>
            <FilterLabel>Sport</FilterLabel>
            <SelectInput
              value={filterSportId}
              onChange={(e) => {
                setFilterSportId(e.target.value)
                setFilterProgramId('')
                setFilterLevelId('')
              }}
            >
              <option value="">All sports</option>
              {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectInput>
          </div>

          <div className="flex items-end justify-end md:col-span-2 lg:col-span-1">
             {/* Desktop: Button aligns to the right. Mobile: Button will be full width below filters using CSS if we wanted, but grid flow handles it reasonably. 
                 To follow rule "Primary action ... aligned to the right of the filter bar", we place it in the grid flow but aligned. 
                 For now, let's keep it structurally here but maybe visually separate if needed. 
                 Actually, simpler to have filters in one block and button floating or right-aligned. 
                 Let's stick to placing it in the grid for responsive alignment. 
             */}
             <Link to="/admin/organization/structure/forms?type=team" className="w-full lg:w-auto">
                <PrimaryButton className="w-full lg:w-auto">Add Team</PrimaryButton>
             </Link>
          </div>

          {/* Row 2 - Hidden if no sport selected? No, showing all filters as per typical dashboard */}
          <div>
            <FilterLabel>Program</FilterLabel>
            <SelectInput
              value={filterProgramId}
              onChange={(e) => {
                setFilterProgramId(e.target.value)
                setFilterLevelId('')
              }}
              disabled={!filterSportId && availablePrograms.length === programs.length} // Optional UI hint
            >
              <option value="">All programs</option>
              {availablePrograms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectInput>
          </div>

          <div>
            <FilterLabel>Level</FilterLabel>
            <SelectInput
              value={filterLevelId}
              onChange={(e) => setFilterLevelId(e.target.value)}
            >
              <option value="">All levels</option>
              {availableLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </SelectInput>
          </div>

           <div>
            <FilterLabel>Status</FilterLabel>
            <SelectInput
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectInput>
          </div>

        </div>
      </div>

      {/* Teams List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {filteredTeams.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">groups</span>
            <p className="text-slate-500 font-medium">No teams match your filters.</p>
            {teams.length === 0 && (
               <p className="text-sm text-slate-400 mt-2">Start by adding your first team to the organization.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Team Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Level</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeams.map((team) => {
                  const sport = sportById.get(team.sport_id)
                  const program = programById.get(team.program_id || '')
                  const level = levelById.get(team.level_id)

                  return (
                    <tr key={team.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{team.name}</div>
                      </td>
                      <td className="py-4 px-6">
                         <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700">{program?.name || '—'}</span>
                            <span className="text-xs text-slate-400">{sport?.name || '—'}</span>
                         </div>
                      </td>
                       <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-600">
                          {level?.name || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500 font-medium">
                        {team.max_roster_size ? `${team.max_roster_size} max` : '—'}
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge active={team.is_active} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link to={`/admin/teams/${team.id}`} className="invisible group-hover:visible focus:visible">
                          <button className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                            Manage
                          </button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
