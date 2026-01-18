import { useEffect, useState } from 'react'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getSports, getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams } from '../../data/services/teamsService'
import { getSeasons } from '../../data/services/seasonsService'
import { getChildren } from '../../data/services/familyService'
import type { Sport, Program, Level, Team, Season, Child } from '../../data/types/organization'

export default function OrganizationStructureNew() {
  const { currentOrganization } = useOrganization()
  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentOrganization?.id) return

    const loadData = async () => {
      setLoading(true)
      try {
        const [sportsData, programsData, levelsData, teamsData, seasonsData, childrenData] =
          await Promise.all([
            getSports(currentOrganization.id),
            getPrograms(currentOrganization.id),
            getLevels(currentOrganization.id),
            getTeams(currentOrganization.id),
            getSeasons(currentOrganization.id),
            getChildren(currentOrganization.id),
          ])

        setSports(Array.isArray(sportsData) ? sportsData : [])
        setPrograms(Array.isArray(programsData) ? programsData : [])
        setLevels(Array.isArray(levelsData) ? levelsData : [])
        setTeams(Array.isArray(teamsData) ? teamsData : [])
        setSeasons(Array.isArray(seasonsData) ? seasonsData : [])
        setChildren(Array.isArray(childrenData) ? childrenData : [])
      } catch (error) {
        console.error('Error loading organization data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [currentOrganization?.id])

  const stats = {
    sports: Array.isArray(sports) ? sports.length : 0,
    programs: Array.isArray(programs) ? programs.length : 0,
    levels: Array.isArray(levels) ? levels.length : 0,
    teams: Array.isArray(teams) ? teams.length : 0,
    seasons: Array.isArray(seasons) ? seasons.length : 0,
    players: Array.isArray(children) ? children.length : 0,
    coaches: 0, // TODO: Implement coaches count
  }

  const activeSeasons = Array.isArray(seasons) ? seasons.filter((s) => s.status === 'active') : []
  const currentSeason = activeSeasons.length > 0 ? activeSeasons[0] : null

  if (loading) {
    return (
      <div className="pa-flex pa-items-center pa-justify-center pa-h-full">
        <div className="pa-spinner"></div>
      </div>
    )
  }

  return (
    <div className="pa-max-w-[1440px] pa-mx-auto pa-px-8 pa-py-12">
      {/* Header */}
      <header className="pa-mb-12">
        <nav className="pa-flex pa-items-center pa-gap-2 pa-text-xs pa-font-semibold pa-uppercase pa-tracking-widest pa-text-slate-400 pa-mb-4">
          <span>Organizations</span>
          <span className="material-symbols-outlined pa-text-sm">chevron_right</span>
          <span style={{ color: 'var(--pa-primary)' }}>{currentOrganization?.name || 'Organization'}</span>
        </nav>
        <h1 className="pa-font-display pa-font-black pa-text-7xl pa-uppercase pa-tracking-tighter pa-leading-none pa-mb-2">
          Organization <span style={{ color: 'var(--pa-primary)' }}>Overview</span>
        </h1>
        <p className="pa-text-lg pa-text-slate-500 pa-font-medium">
          {currentOrganization?.name} — <span className="pa-italic">Structural setup and team management</span>
        </p>
      </header>

      {/* Stats Grid */}
      <section className="pa-bg-white dark:pa-bg-slate-900 pa-shadow-2xl pa-rounded-none pa-mb-8 pa-border-l-8 pa-overflow-hidden" style={{ borderLeftColor: 'var(--pa-primary)' }}>
        <div className="pa-grid pa-grid-cols-2 md:pa-grid-cols-4 lg:pa-grid-cols-7 pa-divide-x pa-divide-slate-100 dark:pa-divide-slate-800">
          <StatBox label="Sports" value={stats.sports} />
          <StatBox label="Programs" value={stats.programs} />
          <StatBox label="Levels" value={stats.levels} />
          <StatBox label="Teams" value={stats.teams} />
          <StatBox label="Seasons" value={stats.seasons} />
          <StatBox label="Players" value={stats.players} isEmpty={stats.players === 0} />
          <StatBox label="Coaches" value={stats.coaches} isEmpty={stats.coaches === 0} />
        </div>
      </section>

      {/* Current Season Banner */}
      {currentSeason && (
        <section className="pa-mb-8">
          <div className="pa-bg-white dark:pa-bg-slate-900 pa-flex pa-items-center pa-justify-between pa-p-6 pa-border-l-8" style={{ borderLeftColor: 'var(--pa-primary)' }}>
            <div>
              <span className="pa-inline-flex pa-items-center pa-px-2 pa-py-0.5 pa-rounded pa-text-[10px] pa-font-bold pa-text-white pa-uppercase pa-tracking-tighter pa-mb-1" style={{ backgroundColor: 'var(--pa-primary)' }}>
                Current Phase
              </span>
              <div className="pa-flex pa-items-baseline pa-gap-3">
                <h2 className="pa-text-2xl pa-font-display pa-font-black pa-uppercase pa-tracking-tight">
                  {currentSeason.name}
                </h2>
                <span className="pa-text-sm pa-font-medium pa-text-slate-400 pa-tracking-wide pa-uppercase">
                  Active Season
                </span>
              </div>
            </div>
            <button className="pa-px-6 pa-py-2 pa-border-2 pa-border-slate-900 dark:pa-border-white pa-font-black pa-text-xs pa-uppercase pa-tracking-widest hover:pa-bg-slate-900 hover:pa-text-white dark:hover:pa-bg-white dark:hover:pa-text-slate-900 pa-transition-colors">
              View Full Schedule
            </button>
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <div className="pa-grid pa-grid-cols-12 pa-gap-8">
        {/* Quick Actions */}
        <div className="pa-col-span-12 lg:pa-col-span-8">
          <div className="pa-bg-white dark:pa-bg-slate-900 pa-p-8 pa-h-full pa-border pa-border-slate-200 dark:pa-border-slate-800">
            <h3 className="pa-font-display pa-font-black pa-uppercase pa-tracking-widest pa-text-sm pa-mb-8 pa-flex pa-items-center">
              <span className="pa-w-8 pa-h-[2px] pa-mr-3" style={{ backgroundColor: 'var(--pa-primary)' }}></span>
              Quick Actions
            </h3>
            <div className="pa-grid pa-grid-cols-1 md:pa-grid-cols-3 pa-gap-4">
              <QuickActionButton icon="sports_basketball" label="Add Sport" />
              <QuickActionButton icon="category" label="Add Program" />
              <QuickActionButton icon="stairs" label="Add Level" />
              <QuickActionButton icon="groups" label="Add Team" />
              <QuickActionButton icon="calendar_today" label="Add Season" />
              <QuickActionButton icon="person_add" label="Add Player" />
            </div>
          </div>
        </div>

        {/* Core Principles */}
        <div className="pa-col-span-12 lg:pa-col-span-4">
          <div className="pa-bg-slate-900 dark:pa-bg-white pa-text-white dark:pa-text-slate-900 pa-p-8 pa-h-full">
            <h3 className="pa-font-display pa-font-black pa-uppercase pa-tracking-widest pa-text-sm pa-mb-8 pa-flex pa-items-center">
              <span className="pa-w-8 pa-h-[2px] pa-mr-3" style={{ backgroundColor: 'var(--pa-primary)' }}></span>
              Core Principles
            </h3>
            <ul className="pa-space-y-6">
              <Principle
                label="Sequence"
                description="Create in order: Sport → Program → Level → Team"
              />
              <Principle
                label="Inheritance"
                description="Programs automatically inherit parent sport attributes"
              />
              <Principle
                label="Dependencies"
                description="Teams require both active Level and Season assignments"
              />
              <Principle
                label="Scope"
                description="Seasons are organization-wide global entities"
              />
            </ul>
          </div>
        </div>

        {/* Structural Hierarchy */}
        <div className="pa-col-span-12">
          <div className="pa-bg-white dark:pa-bg-slate-900 pa-p-8 pa-border pa-border-slate-200 dark:pa-border-slate-800">
            <h3 className="pa-font-display pa-font-black pa-uppercase pa-tracking-widest pa-text-sm pa-mb-12 pa-flex pa-items-center">
              <span className="pa-w-8 pa-h-[2px] pa-mr-3" style={{ backgroundColor: 'var(--pa-primary)' }}></span>
              Structural Hierarchy
            </h3>
            <div className="pa-relative pa-flex pa-flex-col md:pa-flex-row pa-items-stretch pa-justify-between pa-gap-4">
              <HierarchyStep level="Root Entity" label="Organization" variant="dark" />
              <HierarchyStep level="Level 01" label="Sport" variant="primary" />
              <HierarchyStep level="Level 02" label="Program" variant="dark" />
              <HierarchyStep level="Level 03" label="Level" variant="primary" />
              <HierarchyStep level="Level 04" label="Team" variant="dark" />
              <HierarchyStep level="Final Node" label="Players" variant="primary" last />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, isEmpty }: { label: string; value: number; isEmpty?: boolean }) {
  return (
    <div className="pa-p-8 group hover:pa-bg-slate-50 dark:hover:pa-bg-slate-800/50 pa-transition-all">
      <span className="pa-block pa-text-[10px] pa-font-black pa-uppercase pa-tracking-[0.2em] pa-text-slate-400 pa-mb-1">
        {label}
      </span>
      <span className={`pa-block pa-font-display pa-font-black pa-text-5xl pa-leading-none ${isEmpty ? 'pa-text-slate-300 dark:pa-text-slate-700' : ''}`}>
        {String(value).padStart(2, '0')}
      </span>
    </div>
  )
}

function QuickActionButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="group pa-flex pa-items-center pa-justify-between pa-p-4 pa-border pa-border-slate-100 dark:pa-border-slate-800 hover:pa-border-primary dark:hover:pa-border-primary pa-transition-all">
      <div className="pa-flex pa-items-center">
        <span className="material-symbols-outlined pa-text-slate-400 group-hover:pa-text-primary pa-mr-3">
          {icon}
        </span>
        <span className="pa-font-bold pa-text-xs pa-uppercase pa-tracking-widest">{label}</span>
      </div>
      <span className="material-symbols-outlined pa-text-sm pa-opacity-0 group-hover:pa-opacity-100 pa-transition-opacity">
        add
      </span>
    </button>
  )
}

function Principle({ label, description }: { label: string; description: string }) {
  return (
    <li className="pa-flex pa-items-start">
      <span className="material-symbols-outlined pa-mr-3 pa-text-lg pa-font-bold" style={{ color: 'var(--pa-primary)' }}>
        check_circle
      </span>
      <div>
        <span className="pa-block pa-font-black pa-text-[10px] pa-uppercase pa-tracking-widest pa-opacity-60">
          {label}
        </span>
        <p className="pa-text-sm pa-font-medium">{description}</p>
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
  const borderColor = variant === 'primary' ? 'var(--pa-primary)' : 'var(--pa-n900)'
  const bgClass = variant === 'primary' ? 'pa-bg-slate-100 dark:pa-bg-slate-800' : 'pa-bg-slate-50 dark:pa-bg-slate-800/50'

  return (
    <div className={`pa-relative pa-flex-1 pa-p-6 ${bgClass} pa-border-t-4`} style={{ borderTopColor: borderColor }}>
      <span className="pa-block pa-text-[9px] pa-font-black pa-uppercase pa-tracking-widest pa-text-slate-400 pa-mb-2">
        {level}
      </span>
      <span className="pa-font-display pa-font-black pa-text-xl pa-uppercase pa-tracking-tighter">
        {label}
      </span>
      {!last && (
        <span className="pa-absolute -pa-right-4 pa-top-1/2 -pa-translate-y-1/2 pa-hidden md:pa-block pa-text-slate-300">
          <span className="material-symbols-outlined">trending_flat</span>
        </span>
      )}
    </div>
  )
}
