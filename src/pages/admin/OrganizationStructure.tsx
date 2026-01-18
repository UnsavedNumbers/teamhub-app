import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useUserContext } from '../../hooks/useUserContext'
import { getSports, getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams } from '../../data/services/teamsService'
import { getSeasons } from '../../data/services/seasonsService'
import { getChildren } from '../../data/services/familyService'
import { USE_FAKE_DATA } from '../../data/config'
import {
  getSeasonsForTeam,
  getActiveSeasonsForTeam,
  getTeamMembersForSeason,
  fakeCoachAssignments,
  fakeTeamSeasons,
} from '../../data/fake/fakeTeams'
import type {
  Sport,
  Program,
  Level,
  Team,
  Season,
  GenderCategory,
  LevelType,
  Child,
} from '../../data/types/organization'
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  StatCard,
  EmptyState,
} from '../../components/platformAdmin'

interface RadioOption {
  value: string
  label: string
  helper?: string
}

function RadioGroup({
  name,
  label,
  helper,
  value,
  required,
  error,
  options,
  onChange,
}: {
  name: string
  label: string
  helper?: string
  value: string
  required?: boolean
  error?: string
  options: RadioOption[]
  onChange: (value: string) => void
}) {
  return (
    <div className="pa-form-group">
      <label className={`pa-label ${required ? 'pa-label--required' : ''}`}>{label}</label>
      {helper && <div className="pa-helper">{helper}</div>}
      <div className="pa-flex pa-flex-col pa-gap-2" style={{ marginTop: '8px' }}>
        {options.map((option) => (
          <label key={option.value} className="pa-flex pa-items-start pa-gap-2" style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              style={{ marginTop: '2px' }}
            />
            <div>
              <div className="pa-body-m" style={{ fontWeight: 600 }}>{option.label}</div>
              {option.helper && (
                <div className="pa-helper" style={{ marginTop: '2px' }}>{option.helper}</div>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && <div className="pa-helper pa-helper--error">{error}</div>}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  helper,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  helper?: string
}) {
  return (
    <div className="pa-form-group">
      <label className="pa-label">{label}</label>
      {helper && <div className="pa-helper">{helper}</div>}
      <div className="pa-flex pa-items-center pa-gap-3" style={{ marginTop: '8px' }}>
        <label className="pa-toggle">
          <input
            type="checkbox"
            className="pa-toggle-input"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <div className="pa-toggle-track" />
          <div className="pa-toggle-thumb" />
        </label>
        <span className="pa-body-m">{checked ? 'Enabled' : 'Disabled'}</span>
      </div>
    </div>
  )
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

function getSeasonTerm(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes('fall')) return 'Fall'
  if (lower.includes('spring')) return 'Spring'
  if (lower.includes('winter')) return 'Winter'
  if (lower.includes('summer')) return 'Summer'
  return '—'
}

function getSeasonStatus(season: Season) {
  if (season.is_active) return 'Active'
  const now = new Date()
  const end = season.end_date ? new Date(season.end_date) : null
  if (end && end.getTime() < now.getTime()) return 'Archived'
  return 'Upcoming'
}

export default function OrganizationStructure() {
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [children, setChildren] = useState<Child[]>([])

  const [activeSection, setActiveSection] = useState('overview')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [showSportForm, setShowSportForm] = useState(false)
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [showLevelForm, setShowLevelForm] = useState(false)
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [showSeasonForm, setShowSeasonForm] = useState(false)
  const [showChildForm, setShowChildForm] = useState(false)
  const [showCoachForm, setShowCoachForm] = useState(false)

  const [programLockedSportId, setProgramLockedSportId] = useState<string | null>(null)
  const [levelLockedProgramId, setLevelLockedProgramId] = useState<string | null>(null)

  const [sportForm, setSportForm] = useState({
    name: '',
    showSeasonPattern: false,
    defaultSeasonPattern: '',
    enabled: true,
  })

  const [programForm, setProgramForm] = useState({
    sportId: '',
    gender: '' as GenderCategory | '',
    name: '',
    nameTouched: false,
    showOptional: false,
    governingBody: '',
    status: 'active',
  })

  const [levelForm, setLevelForm] = useState({
    sportId: '',
    programId: '',
    name: '',
    type: 'age_based' as LevelType,
    ageMin: '',
    ageMax: '',
    gradeMin: '',
    gradeMax: '',
    skillDescription: '',
    showOptional: false,
    displayOrder: '',
    status: 'active',
  })

  const [teamForm, setTeamForm] = useState({
    levelId: '',
    seasonId: '',
    name: '',
    designation: '',
    coachMode: 'invite',
    coachEmail: '',
    coachId: '',
    status: 'active',
    showOptional: false,
    homeLocation: '',
    notes: '',
  })

  const [seasonForm, setSeasonForm] = useState({
    name: '',
    nameTouched: false,
    year: '',
    term: '',
    startDate: '',
    endDate: '',
    showDates: false,
    status: 'upcoming',
  })

  const [childForm, setChildForm] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    genderRequired: false,
    gender: '',
    seasonId: '',
    sportId: '',
    programId: '',
    levelId: '',
    teamId: '',
    guardianMode: 'invite',
    guardianEmail: '',
    guardianId: '',
    guardianRelationship: 'parent',
  })

  const [coachForm, setCoachForm] = useState({
    name: '',
    email: '',
    role: 'head',
    seasonId: '',
    teamIds: [] as string[],
    assignToLevel: false,
    levelId: '',
  })

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }))

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setLoadError(null)

      try {
        const [sportsResult, programsResult, levelsResult, teamsResult, seasonsResult, childrenResult] = await Promise.all([
          getSports(context),
          getPrograms(context),
          getLevels(context),
          getTeams(context),
          getSeasons(context),
          getChildren(context),
        ])

        setSports(sportsResult.data as Sport[])
        setPrograms(programsResult.data as Program[])
        setLevels(levelsResult.data as Level[])
        setTeams(teamsResult.data as Team[])
        setSeasons(seasonsResult.data as Season[])
        setChildren(childrenResult.data as Child[])
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load organization data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady])

  const sportOptions = useMemo(
    () => [
      { value: '', label: 'Select sport' },
      ...sports.map((sport) => ({ value: sport.id, label: sport.name })),
    ],
    [sports]
  )

  const programOptions = useMemo(
    () => [
      { value: '', label: 'Select program' },
      ...programs.map((program) => ({ value: program.id, label: program.name })),
    ],
    [programs]
  )

  const levelOptions = useMemo(
    () => [
      { value: '', label: 'Select level' },
      ...levels.map((level) => ({ value: level.id, label: level.name })),
    ],
    [levels]
  )

  const seasonOptions = useMemo(
    () => [
      { value: '', label: 'Select season' },
      ...seasons.map((season) => ({ value: season.id, label: season.name })),
    ],
    [seasons]
  )

  const sportById = useMemo(() => new Map(sports.map((s) => [s.id, s])), [sports])
  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs])
  const levelById = useMemo(() => new Map(levels.map((l) => [l.id, l])), [levels])

  const internalKey = slugify(sportForm.name)

  useEffect(() => {
    if (programForm.nameTouched) return

    const sportName = sportById.get(programForm.sportId)?.name ?? ''
    const genderLabel = programForm.gender
      ? programForm.gender === 'coed'
        ? 'Co-ed'
        : programForm.gender === 'boys'
          ? 'Boys'
          : 'Girls'
      : ''

    const suggested = [genderLabel, sportName].filter(Boolean).join(' ')
    setProgramForm((prev) => ({ ...prev, name: suggested }))
  }, [programForm.sportId, programForm.gender, programForm.nameTouched, sportById])

  useEffect(() => {
    if (seasonForm.nameTouched) return

    if (!seasonForm.term || !seasonForm.year) {
      setSeasonForm((prev) => ({ ...prev, name: '' }))
      return
    }

    const termLabel = seasonForm.term.charAt(0).toUpperCase() + seasonForm.term.slice(1)
    setSeasonForm((prev) => ({ ...prev, name: `${termLabel} ${seasonForm.year}` }))
  }, [seasonForm.term, seasonForm.year, seasonForm.nameTouched])

  useEffect(() => {
    setChildForm((prev) => ({ ...prev, programId: '', levelId: '', teamId: '' }))
  }, [childForm.sportId])

  useEffect(() => {
    setChildForm((prev) => ({ ...prev, levelId: '', teamId: '' }))
  }, [childForm.programId])

  useEffect(() => {
    setChildForm((prev) => ({ ...prev, teamId: '' }))
  }, [childForm.levelId])

  const filteredProgramsForChild = useMemo(
    () => programs.filter((program) => program.sport_id === childForm.sportId),
    [programs, childForm.sportId]
  )

  const filteredLevelsForChild = useMemo(
    () => levels.filter((level) => level.program_id === childForm.programId),
    [levels, childForm.programId]
  )

  const filteredTeamsForChild = useMemo(
    () => teams.filter((team) => team.level_id === childForm.levelId),
    [teams, childForm.levelId]
  )

  const programOptionsForChild = useMemo(
    () => [
      { value: '', label: childForm.sportId ? 'Select program' : 'Select sport first' },
      ...filteredProgramsForChild.map((program) => ({ value: program.id, label: program.name })),
    ],
    [filteredProgramsForChild, childForm.sportId]
  )

  const levelOptionsForChild = useMemo(
    () => [
      { value: '', label: childForm.programId ? 'Select level' : 'Select program first' },
      ...filteredLevelsForChild.map((level) => ({ value: level.id, label: level.name })),
    ],
    [filteredLevelsForChild, childForm.programId]
  )

  const teamOptionsForChild = useMemo(
    () => [
      { value: '', label: childForm.levelId ? 'Select team' : 'Select level first' },
      ...filteredTeamsForChild.map((team) => ({ value: team.id, label: team.name })),
    ],
    [filteredTeamsForChild, childForm.levelId]
  )

  const filteredProgramsForLevelForm = useMemo(() => {
    if (!levelForm.sportId) return programs
    return programs.filter((program) => program.sport_id === levelForm.sportId)
  }, [programs, levelForm.sportId])

  const programOptionsForLevelForm = useMemo(
    () => [
      { value: '', label: levelForm.sportId ? 'Select program' : 'Select sport first' },
      ...filteredProgramsForLevelForm.map((program) => ({ value: program.id, label: program.name })),
    ],
    [filteredProgramsForLevelForm, levelForm.sportId]
  )

  const filteredProgramsForSport = useMemo(
    () => programs.filter((program) => program.sport_id === programForm.sportId),
    [programs, programForm.sportId]
  )

  const levelTeamsCount = useMemo(() => {
    const counts = new Map<string, number>()
    teams.forEach((team) => {
      counts.set(team.level_id, (counts.get(team.level_id) ?? 0) + 1)
    })
    return counts
  }, [teams])

  const activeSeason = seasons.find((season) => season.is_active)

  const coachCount = useMemo(() => {
    if (!USE_FAKE_DATA) return 0
    const teamIds = new Set(teams.map((team) => team.id))
    const coachIds = fakeCoachAssignments
      .filter((assignment) => teamIds.has(assignment.team_id))
      .map((assignment) => assignment.user_id)
    return new Set(coachIds).size
  }, [teams])

  const playersCount = children.length

  const [teamFilters, setTeamFilters] = useState({
    seasonId: '',
    sportId: '',
    programId: '',
    levelId: '',
    status: '',
  })

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (teamFilters.levelId && team.level_id !== teamFilters.levelId) return false
      if (teamFilters.programId && team.program_id !== teamFilters.programId) return false
      if (teamFilters.sportId && team.sport_id !== teamFilters.sportId) return false
      if (teamFilters.status) {
        const statusMatch = teamFilters.status === 'active' ? team.is_active : !team.is_active
        if (!statusMatch) return false
      }
      return true
    })
  }, [teams, teamFilters.levelId, teamFilters.programId, teamFilters.sportId, teamFilters.status])

  const teamRows = useMemo(() => {
    return filteredTeams.map((team) => {
      const level = levelById.get(team.level_id)
      const program = team.program_id
        ? programById.get(team.program_id)
        : level
          ? programById.get(level.program_id)
          : undefined
      const seasonList = USE_FAKE_DATA ? getSeasonsForTeam(team.id) : []
      const seasonNames = seasonList.map((season) => season.name).join(', ') || '—'

      let coachesCount = 0
      if (USE_FAKE_DATA) {
        const assignments = fakeCoachAssignments.filter((assignment) => assignment.team_id === team.id)
        coachesCount = new Set(assignments.map((assignment) => assignment.user_id)).size
      }

      let players = 0
      if (USE_FAKE_DATA) {
        const selectedSeasonId = teamFilters.seasonId
        const activeSeasonId = getActiveSeasonsForTeam(team.id)[0]?.id
        const seasonIdForCount = selectedSeasonId || activeSeasonId
        if (seasonIdForCount) {
          players = getTeamMembersForSeason(team.id, seasonIdForCount).length
        }
      }

      return {
        team,
        levelName: level?.name ?? '—',
        programName: program?.name ?? '—',
        seasonNames,
        coachesCount,
        players,
      }
    })
  }, [filteredTeams, levelById, programById, teamFilters.seasonId])

  const seasonTeamCount = useMemo(() => {
    if (!USE_FAKE_DATA) return new Map<string, number>()
    const counts = new Map<string, number>()
    fakeTeamSeasons.forEach((teamSeason) => {
      counts.set(teamSeason.season_id, (counts.get(teamSeason.season_id) ?? 0) + 1)
    })
    return counts
  }, [teams])

  const sportNameError = touched['sport.name'] && !sportForm.name.trim()
    ? 'Sport name is required.'
    : undefined

  const programSportError = touched['program.sport'] && !programForm.sportId
    ? 'Select a parent sport.'
    : undefined

  const programGenderError = touched['program.gender'] && !programForm.gender
    ? 'Select a gender category.'
    : undefined

  const programNameError = touched['program.name'] && !programForm.name.trim()
    ? 'Program name is required.'
    : undefined

  const levelSportError = touched['level.sport'] && !levelForm.sportId
    ? 'Select a sport to filter programs.'
    : undefined

  const levelProgramError = touched['level.program'] && !levelForm.programId
    ? 'Select a parent program.'
    : undefined

  const levelNameError = touched['level.name'] && !levelForm.name.trim()
    ? 'Level name is required.'
    : undefined

  const levelTypeError = touched['level.type'] && !levelForm.type
    ? 'Select a level type.'
    : undefined

  const levelAgeMinError = touched['level.ageMin'] && !levelForm.ageMin
    ? 'Minimum age is required.'
    : undefined

  const levelAgeMaxError = touched['level.ageMax'] && !levelForm.ageMax
    ? 'Maximum age is required.'
    : undefined

  const levelGradeMinError = touched['level.gradeMin'] && !levelForm.gradeMin
    ? 'Minimum grade is required.'
    : undefined

  const levelGradeMaxError = touched['level.gradeMax'] && !levelForm.gradeMax
    ? 'Maximum grade is required.'
    : undefined

  const levelSkillError = touched['level.skillDescription'] && !levelForm.skillDescription.trim()
    ? 'Short description is required.'
    : undefined

  const teamLevelError = touched['team.level'] && !teamForm.levelId
    ? 'Select a parent level.'
    : undefined

  const teamSeasonError = touched['team.season'] && !teamForm.seasonId
    ? 'Select a season.'
    : undefined

  const teamNameError = touched['team.name'] && !teamForm.name.trim()
    ? 'Team name is required.'
    : undefined

  const seasonNameError = touched['season.name'] && !seasonForm.name.trim()
    ? 'Season name is required.'
    : undefined

  const seasonYearError = touched['season.year'] && !seasonForm.year
    ? 'Year is required.'
    : undefined

  const seasonTermError = touched['season.term'] && !seasonForm.term
    ? 'Term is required.'
    : undefined

  const childFirstNameError = touched['child.firstName'] && !childForm.firstName.trim()
    ? 'First name is required.'
    : undefined

  const childLastNameError = touched['child.lastName'] && !childForm.lastName.trim()
    ? 'Last name is required.'
    : undefined

  const childDobError = touched['child.dob'] && !childForm.dob
    ? 'Date of birth is required.'
    : undefined

  const childGenderError = childForm.genderRequired && touched['child.gender'] && !childForm.gender
    ? 'Select a gender.'
    : undefined

  const childSeasonError = touched['child.season'] && !childForm.seasonId
    ? 'Select a season.'
    : undefined

  const childSportError = touched['child.sport'] && !childForm.sportId
    ? 'Select a sport.'
    : undefined

  const childProgramError = touched['child.program'] && !childForm.programId
    ? 'Select a program.'
    : undefined

  const childLevelError = touched['child.level'] && !childForm.levelId
    ? 'Select a level.'
    : undefined

  const childTeamError = touched['child.team'] && !childForm.teamId
    ? 'Select a team.'
    : undefined

  const guardianEmailError = childForm.guardianMode === 'invite' && touched['child.guardianEmail'] && !childForm.guardianEmail.trim()
    ? 'Guardian email is required.'
    : undefined

  const guardianIdError = childForm.guardianMode === 'link' && touched['child.guardianId'] && !childForm.guardianId
    ? 'Select an existing guardian.'
    : undefined

  const coachNameError = touched['coach.name'] && !coachForm.name.trim()
    ? 'Coach name is required.'
    : undefined

  const coachEmailError = touched['coach.email'] && !coachForm.email.trim()
    ? 'Coach email is required.'
    : undefined

  const coachRoleError = touched['coach.role'] && !coachForm.role
    ? 'Select a role.'
    : undefined

  const coachSeasonError = touched['coach.season'] && !coachForm.seasonId
    ? 'Select a season.'
    : undefined

  const coachTeamsError = touched['coach.teams'] && coachForm.teamIds.length === 0
    ? 'Assign at least one team.'
    : undefined

  const coachLevelError = coachForm.assignToLevel && touched['coach.level'] && !coachForm.levelId
    ? 'Select a level.'
    : undefined

  const canCreateSport = !!sportForm.name.trim()
  const canCreateProgram = !!programForm.sportId && !!programForm.gender && !!programForm.name.trim()
  const canCreateLevel = !!levelForm.programId && !!levelForm.name.trim() && !!levelForm.type && (
    (levelForm.type === 'age_based' && !!levelForm.ageMin && !!levelForm.ageMax) ||
    (levelForm.type === 'grade_based' && !!levelForm.gradeMin && !!levelForm.gradeMax) ||
    (levelForm.type === 'skill_based' && !!levelForm.skillDescription.trim())
  )
  const canCreateTeam = !!teamForm.levelId && !!teamForm.seasonId && !!teamForm.name.trim()
  const canCreateSeason = !!seasonForm.name.trim() && !!seasonForm.year && !!seasonForm.term
  const canAddChild = !!childForm.firstName.trim() && !!childForm.lastName.trim() && !!childForm.dob && !!childForm.seasonId && !!childForm.sportId && !!childForm.programId && !!childForm.levelId && !!childForm.teamId && (!childForm.genderRequired || !!childForm.gender) && (
    (childForm.guardianMode === 'invite' && !!childForm.guardianEmail.trim()) ||
    (childForm.guardianMode === 'link' && !!childForm.guardianId)
  )
  const canAddCoach = !!coachForm.name.trim() && !!coachForm.email.trim() && !!coachForm.role && !!coachForm.seasonId && coachForm.teamIds.length > 0 && (!coachForm.assignToLevel || !!coachForm.levelId)

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  return (
    <div className="pa-root">
      <PageHeader
        title="Organization Structure"
        subtitle="Build your season setup in the same order you run your program."
        breadcrumbs={[
          { label: 'Organization', onClick: () => navigate('/admin/organization') },
          { label: 'Structure' },
        ]}
      />

      {loadError && (
        <Card className="pa-mb-6">
          <div className="pa-text-danger">{loadError}</div>
        </Card>
      )}

      {successMessage && (
        <Card className="pa-mb-6">
          <div className="pa-text-success">{successMessage}</div>
        </Card>
      )}

      <div className="pa-flex pa-gap-6" style={{ alignItems: 'flex-start' }}>
        <Card style={{ width: '220px', position: 'sticky', top: '24px' }}>
          <div className="pa-flex pa-flex-col pa-gap-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'sports', label: 'Sports & Programs' },
              { id: 'levels', label: 'Levels' },
              { id: 'teams', label: 'Teams' },
              { id: 'seasons', label: 'Seasons' },
              { id: 'people', label: 'People' },
              { id: 'settings', label: 'Settings' },
            ].map((section) => (
              <Button
                key={section.id}
                variant={activeSection === section.id ? 'secondary' : 'ghost'}
                size="compact"
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </Button>
            ))}
          </div>
        </Card>

        <div style={{ flex: 1 }}>
          {activeSection === 'overview' && (
            <div className="pa-flex pa-flex-col pa-gap-6">
              <Card>
                <div className="pa-flex pa-flex-col pa-gap-3">
                  <div>
                    <div className="pa-text-muted">Organization</div>
                    <div className="pa-h3">{currentOrganization?.name ?? 'Organization'}</div>
                  </div>
                  <div className="pa-flex pa-flex-col pa-gap-1">
                    <div className="pa-text-muted">Active season</div>
                    <div className="pa-body-m">{activeSeason ? activeSeason.name : 'No active season'}</div>
                  </div>
                </div>
              </Card>

              <div className="pa-grid pa-grid-3">
                <StatCard label="Sports" value={sports.length} icon="sports" onClick={() => setActiveSection('sports')} />
                <StatCard label="Programs" value={programs.length} icon="groups" onClick={() => setActiveSection('sports')} />
                <StatCard label="Levels" value={levels.length} icon="layers" onClick={() => setActiveSection('levels')} />
                <StatCard label="Teams" value={teams.length} icon="flag" onClick={() => setActiveSection('teams')} />
                <StatCard label="Players" value={playersCount} icon="child_care" onClick={() => setActiveSection('people')} />
                <StatCard label="Coaches" value={coachCount} icon="school" onClick={() => setActiveSection('people')} />
              </div>

              <Card title="Quick actions">
                <div className="pa-flex pa-flex-col pa-gap-3">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setActiveSection('sports')
                      setShowSportForm(true)
                    }}
                  >
                    Add Sport
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActiveSection('sports')
                      setShowProgramForm(true)
                      setProgramLockedSportId(null)
                    }}
                  >
                    Add Program
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActiveSection('teams')
                      setShowTeamForm(true)
                    }}
                  >
                    Add Team
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setActiveSection('seasons')
                      setShowSeasonForm(true)
                    }}
                  >
                    Add Season
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'sports' && (
            <div className="pa-flex pa-flex-col pa-gap-6">
              <Card title="Sports & Programs" actions={
                <Button
                  variant="primary"
                  onClick={() => setShowSportForm(true)}
                >
                  Add Sport
                </Button>
              }>
                <div className="pa-text-muted">Define sports first, then add programs under each sport.</div>
              </Card>

              {showSportForm && (
                <Card title="Create Sport">
                  <div className="pa-flex pa-flex-col pa-gap-4">
                    <Input
                      label="Sport name"
                      placeholder="e.g. Soccer"
                      value={sportForm.name}
                      onChange={(e) => setSportForm((prev) => ({ ...prev, name: e.target.value }))}
                      onBlur={() => markTouched('sport.name')}
                      required
                      error={sportNameError}
                    />
                    <Input
                      label="Internal key"
                      value={internalKey}
                      helper="Generated automatically from the sport name."
                      readOnly
                    />
                    <Checkbox
                      checked={sportForm.showSeasonPattern}
                      onChange={(e) => setSportForm((prev) => ({ ...prev, showSeasonPattern: e.target.checked, defaultSeasonPattern: '' }))}
                      label="Add a default season pattern"
                    />
                    {sportForm.showSeasonPattern && (
                      <RadioGroup
                        name="sport-season-pattern"
                        label="Default season pattern"
                        value={sportForm.defaultSeasonPattern}
                        onChange={(value) => setSportForm((prev) => ({ ...prev, defaultSeasonPattern: value }))}
                        options={[
                          { value: 'fall', label: 'Fall' },
                          { value: 'spring', label: 'Spring' },
                          { value: 'winter', label: 'Winter' },
                          { value: 'summer', label: 'Summer' },
                        ]}
                      />
                    )}
                    <Toggle
                      label="Enable sport"
                      checked={sportForm.enabled}
                      onChange={(checked) => setSportForm((prev) => ({ ...prev, enabled: checked }))}
                      helper="Disable to prevent new programs from being created under this sport."
                    />
                    <div className="pa-flex pa-gap-2 pa-justify-end">
                      <Button variant="ghost" onClick={() => setShowSportForm(false)}>Cancel</Button>
                      <Button
                        disabled={!canCreateSport}
                        onClick={() => {
                          setShowSportForm(false)
                          showSuccess('Sport created. Next, add programs under this sport.')
                        }}
                      >
                        Create Sport
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {showProgramForm && (
                <Card title="Create Program">
                  <div className="pa-flex pa-flex-col pa-gap-4">
                    <Select
                      label="Parent sport"
                      required
                      value={programForm.sportId}
                      onChange={(e) => {
                        setProgramLockedSportId(null)
                        setProgramForm((prev) => ({ ...prev, sportId: e.target.value }))
                      }}
                      onBlur={() => markTouched('program.sport')}
                      options={sportOptions}
                      error={programSportError}
                      disabled={!!programLockedSportId}
                    />
                    <RadioGroup
                      name="program-gender"
                      label="Gender category"
                      required
                      value={programForm.gender}
                      onChange={(value) => setProgramForm((prev) => ({ ...prev, gender: value as GenderCategory }))}
                      options={[
                        { value: 'boys', label: 'Boys' },
                        { value: 'girls', label: 'Girls' },
                        { value: 'coed', label: 'Co-ed' },
                      ]}
                      error={programGenderError}
                    />
                    <Input
                      label="Program name"
                      placeholder="e.g. Girls Soccer"
                      value={programForm.name}
                      onChange={(e) => setProgramForm((prev) => ({ ...prev, name: e.target.value, nameTouched: true }))}
                      onBlur={() => markTouched('program.name')}
                      helper="Suggested from gender and sport. You can edit it any time."
                      required
                      error={programNameError}
                    />
                    <Checkbox
                      checked={programForm.showOptional}
                      onChange={(e) => setProgramForm((prev) => ({ ...prev, showOptional: e.target.checked }))}
                      label="Add optional details"
                    />
                    {programForm.showOptional && (
                      <Input
                        label="Governing body"
                        placeholder="e.g. State Athletic Association"
                        value={programForm.governingBody}
                        onChange={(e) => setProgramForm((prev) => ({ ...prev, governingBody: e.target.value }))}
                      />
                    )}
                    <RadioGroup
                      name="program-status"
                      label="Program status"
                      value={programForm.status}
                      onChange={(value) => setProgramForm((prev) => ({ ...prev, status: value }))}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ]}
                    />
                    <div className="pa-flex pa-gap-2 pa-justify-end">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowProgramForm(false)
                          setProgramLockedSportId(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={!canCreateProgram}
                        onClick={() => {
                          setShowProgramForm(false)
                          setProgramLockedSportId(null)
                          showSuccess('Program created. Next, add levels for eligibility.')
                        }}
                      >
                        Create Program
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {sports.length === 0 ? (
                <EmptyState
                  icon="sports"
                  title="Start by adding a sport"
                  description="Sports define the top level of your program structure."
                  action={{
                    label: 'Add Sport',
                    onClick: () => setShowSportForm(true),
                  }}
                />
              ) : (
                sports.map((sport) => (
                  <Card key={sport.id}>
                    <div className="pa-flex pa-justify-between pa-items-center pa-mb-3">
                      <div>
                        <div className="pa-h3">{sport.name}</div>
                        <div className="pa-text-muted">{sport.deleted_at ? 'Inactive' : 'Active'}</div>
                      </div>
                      <div className="pa-flex pa-gap-2">
                        <Button
                          variant="secondary"
                          size="compact"
                          onClick={() => {
                            setShowProgramForm(true)
                            setProgramLockedSportId(sport.id)
                            setProgramForm((prev) => ({ ...prev, sportId: sport.id }))
                            setActiveSection('sports')
                          }}
                        >
                          Add Program
                        </Button>
                        <Button variant="ghost" size="compact">Edit Sport</Button>
                        <Button variant="ghost" size="compact">Disable Sport</Button>
                      </div>
                    </div>
                    {filteredProgramsForSport.length === 0 && programForm.sportId !== sport.id ? (
                      <EmptyState
                        icon="groups"
                        title="Add Boys, Girls, or Co-ed programs"
                        description="Programs define gender and competition context."
                        action={{
                          label: 'Add Program',
                          onClick: () => {
                            setShowProgramForm(true)
                            setProgramLockedSportId(sport.id)
                            setProgramForm((prev) => ({ ...prev, sportId: sport.id }))
                          },
                        }}
                      />
                    ) : (
                      <div className="pa-flex pa-flex-col pa-gap-3">
                        {programs.filter((program) => program.sport_id === sport.id).map((program) => (
                          <div key={program.id} className="pa-flex pa-justify-between pa-items-center" style={{ padding: '12px', border: '1px solid var(--pa-n200)', borderRadius: '12px' }}>
                            <div>
                              <div className="pa-body-m" style={{ fontWeight: 600 }}>{program.name}</div>
                              <div className="pa-text-muted">{program.deleted_at ? 'Inactive' : 'Active'}</div>
                            </div>
                            <div className="pa-flex pa-gap-2">
                              <Button
                                variant="secondary"
                                size="compact"
                                onClick={() => {
                                  setActiveSection('levels')
                                  setShowLevelForm(true)
                                  setLevelLockedProgramId(program.id)
                                  setLevelForm((prev) => ({
                                    ...prev,
                                    programId: program.id,
                                    sportId: program.sport_id,
                                  }))
                                }}
                              >
                                Add Level
                              </Button>
                              <Button variant="ghost" size="compact">Edit Program</Button>
                              <Button variant="ghost" size="compact">Disable Program</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {activeSection === 'levels' && (
            <div className="pa-flex pa-flex-col pa-gap-6">
              <Card title="Levels" actions={
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowLevelForm(true)
                    setLevelLockedProgramId(null)
                  }}
                >
                  Add Level
                </Button>
              }>
                <div className="pa-text-muted">Levels define eligibility. Assign teams inside a level.</div>
              </Card>

              {showLevelForm && (
                <Card title="Create Level">
                  <div className="pa-flex pa-flex-col pa-gap-4">
                    <Select
                      label="Sport"
                      required
                      value={levelForm.sportId}
                      onChange={(e) => {
                        setLevelForm((prev) => ({ ...prev, sportId: e.target.value, programId: '' }))
                        setLevelLockedProgramId(null)
                      }}
                      onBlur={() => markTouched('level.sport')}
                      options={sportOptions}
                      error={levelSportError}
                    />
                    <Select
                      label="Parent program"
                      required
                      value={levelForm.programId}
                      onChange={(e) => setLevelForm((prev) => ({ ...prev, programId: e.target.value }))}
                      onBlur={() => markTouched('level.program')}
                      options={programOptionsForLevelForm}
                      error={levelProgramError}
                      disabled={!!levelLockedProgramId}
                    />
                    <Input
                      label="Level name"
                      placeholder="e.g. U12 or Varsity"
                      value={levelForm.name}
                      onChange={(e) => setLevelForm((prev) => ({ ...prev, name: e.target.value }))}
                      onBlur={() => markTouched('level.name')}
                      required
                      error={levelNameError}
                    />
                    <RadioGroup
                      name="level-type"
                      label="Level type"
                      required
                      value={levelForm.type}
                      onChange={(value) => setLevelForm((prev) => ({ ...prev, type: value as LevelType }))}
                      options={[
                        { value: 'age_based', label: 'Age-based' },
                        { value: 'grade_based', label: 'Grade-based' },
                        { value: 'skill_based', label: 'Skill-based' },
                      ]}
                      error={levelTypeError}
                    />

                    {levelForm.type === 'age_based' && (
                      <>
                        <Input
                          label="Minimum age"
                          type="number"
                          value={levelForm.ageMin}
                          onChange={(e) => setLevelForm((prev) => ({ ...prev, ageMin: e.target.value }))}
                          onBlur={() => markTouched('level.ageMin')}
                          required
                          error={levelAgeMinError}
                        />
                        <Input
                          label="Maximum age"
                          type="number"
                          value={levelForm.ageMax}
                          onChange={(e) => setLevelForm((prev) => ({ ...prev, ageMax: e.target.value }))}
                          onBlur={() => markTouched('level.ageMax')}
                          required
                          error={levelAgeMaxError}
                        />
                      </>
                    )}

                    {levelForm.type === 'grade_based' && (
                      <>
                        <Input
                          label="Minimum grade"
                          type="number"
                          value={levelForm.gradeMin}
                          onChange={(e) => setLevelForm((prev) => ({ ...prev, gradeMin: e.target.value }))}
                          onBlur={() => markTouched('level.gradeMin')}
                          required
                          error={levelGradeMinError}
                        />
                        <Input
                          label="Maximum grade"
                          type="number"
                          value={levelForm.gradeMax}
                          onChange={(e) => setLevelForm((prev) => ({ ...prev, gradeMax: e.target.value }))}
                          onBlur={() => markTouched('level.gradeMax')}
                          required
                          error={levelGradeMaxError}
                        />
                      </>
                    )}

                    {levelForm.type === 'skill_based' && (
                      <Input
                        label="Eligibility description"
                        placeholder="Short description of skill requirements"
                        value={levelForm.skillDescription}
                        onChange={(e) => setLevelForm((prev) => ({ ...prev, skillDescription: e.target.value }))}
                        onBlur={() => markTouched('level.skillDescription')}
                        required
                        error={levelSkillError}
                      />
                    )}

                    <Checkbox
                      checked={levelForm.showOptional}
                      onChange={(e) => setLevelForm((prev) => ({ ...prev, showOptional: e.target.checked }))}
                      label="Add optional details"
                    />
                    {levelForm.showOptional && (
                      <Input
                        label="Display order"
                        type="number"
                        placeholder="Optional ordering within the program"
                        value={levelForm.displayOrder}
                        onChange={(e) => setLevelForm((prev) => ({ ...prev, displayOrder: e.target.value }))}
                      />
                    )}
                    <RadioGroup
                      name="level-status"
                      label="Level status"
                      value={levelForm.status}
                      onChange={(value) => setLevelForm((prev) => ({ ...prev, status: value }))}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ]}
                    />
                    <div className="pa-flex pa-gap-2 pa-justify-end">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowLevelForm(false)
                          setLevelLockedProgramId(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={!canCreateLevel}
                        onClick={() => {
                          setShowLevelForm(false)
                          setLevelLockedProgramId(null)
                          showSuccess('Level created. You can now add teams to this level.')
                        }}
                      >
                        Create Level
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {levels.length === 0 ? (
                <EmptyState
                  icon="layers"
                  title="Define age or skill levels"
                  description="Levels set eligibility for teams within a program."
                  action={{
                    label: 'Add Level',
                    onClick: () => setShowLevelForm(true),
                  }}
                />
              ) : (
                <Card>
                  <div className="pa-flex pa-flex-col pa-gap-3">
                    {levels.map((level) => {
                      const program = programById.get(level.program_id)
                      return (
                        <div key={level.id} className="pa-flex pa-justify-between pa-items-center" style={{ padding: '12px', border: '1px solid var(--pa-n200)', borderRadius: '12px' }}>
                          <div>
                            <div className="pa-body-m" style={{ fontWeight: 600 }}>{level.name}</div>
                            <div className="pa-text-muted">{program?.name ?? 'Program'} • {level.level_type.replace('_', ' ')}</div>
                          </div>
                          <div className="pa-flex pa-items-center pa-gap-3">
                            <div className="pa-text-muted">Teams: {levelTeamsCount.get(level.id) ?? 0}</div>
                            <Button variant="ghost" size="compact">Edit Level</Button>
                            <Button variant="ghost" size="compact">Archive Level</Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeSection === 'teams' && (
            <div className="pa-flex pa-flex-col pa-gap-6">
              <Card title="Teams" actions={
                <Button
                  variant="primary"
                  onClick={() => setShowTeamForm(true)}
                >
                  Add Team
                </Button>
              }>
                <div className="pa-text-muted">Teams are rostered units. Levels and seasons are required.</div>
              </Card>

              {showTeamForm && (
                <Card title="Create Team">
                  <div className="pa-flex pa-flex-col pa-gap-4">
                    <Select
                      label="Parent level"
                      required
                      value={teamForm.levelId}
                      onChange={(e) => setTeamForm((prev) => ({ ...prev, levelId: e.target.value }))}
                      onBlur={() => markTouched('team.level')}
                      options={levelOptions}
                      error={teamLevelError}
                    />
                    <Select
                      label="Season"
                      required
                      value={teamForm.seasonId}
                      onChange={(e) => setTeamForm((prev) => ({ ...prev, seasonId: e.target.value }))}
                      onBlur={() => markTouched('team.season')}
                      options={seasonOptions}
                      error={teamSeasonError}
                    />
                    <Input
                      label="Team name"
                      placeholder="e.g. U10 Blue"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
                      onBlur={() => markTouched('team.name')}
                      required
                      error={teamNameError}
                    />
                    <Input
                      label="Team designation"
                      placeholder="e.g. A, B, Blue, White"
                      value={teamForm.designation}
                      onChange={(e) => setTeamForm((prev) => ({ ...prev, designation: e.target.value }))}
                    />
                    <RadioGroup
                      name="coach-mode"
                      label="Coaches"
                      helper="Invite a new coach by email or pick an existing user."
                      value={teamForm.coachMode}
                      onChange={(value) => setTeamForm((prev) => ({ ...prev, coachMode: value }))}
                      options={[
                        { value: 'invite', label: 'Invite new coach' },
                        { value: 'existing', label: 'Add existing user' },
                      ]}
                    />
                    {teamForm.coachMode === 'invite' ? (
                      <Input
                        label="Coach email"
                        type="email"
                        placeholder="coach@example.com"
                        value={teamForm.coachEmail}
                        onChange={(e) => setTeamForm((prev) => ({ ...prev, coachEmail: e.target.value }))}
                      />
                    ) : (
                      <Select
                        label="Existing coach"
                        value={teamForm.coachId}
                        onChange={(e) => setTeamForm((prev) => ({ ...prev, coachId: e.target.value }))}
                        options={[{ value: '', label: 'Select a coach' }]}
                        helper="Connect a coach who already has an account."
                      />
                    )}
                    <RadioGroup
                      name="team-status"
                      label="Team status"
                      value={teamForm.status}
                      onChange={(value) => setTeamForm((prev) => ({ ...prev, status: value }))}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ]}
                    />
                    <Checkbox
                      checked={teamForm.showOptional}
                      onChange={(e) => setTeamForm((prev) => ({ ...prev, showOptional: e.target.checked }))}
                      label="Add optional details"
                    />
                    {teamForm.showOptional && (
                      <>
                        <Input
                          label="Home location"
                          placeholder="Primary field or gym"
                          value={teamForm.homeLocation}
                          onChange={(e) => setTeamForm((prev) => ({ ...prev, homeLocation: e.target.value }))}
                        />
                        <Input
                          label="Notes (admin-only)"
                          placeholder="Internal notes"
                          value={teamForm.notes}
                          onChange={(e) => setTeamForm((prev) => ({ ...prev, notes: e.target.value }))}
                        />
                      </>
                    )}
                    <div className="pa-flex pa-gap-2 pa-justify-end">
                      <Button variant="ghost" onClick={() => setShowTeamForm(false)}>Cancel</Button>
                      <Button
                        disabled={!canCreateTeam}
                        onClick={() => {
                          setShowTeamForm(false)
                          showSuccess('Team created. Assign roster and seasons next.')
                        }}
                      >
                        Create Team
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <Card title="Filters">
                <div className="pa-flex pa-flex-col pa-gap-4">
                  <Select
                    label="Season"
                    value={teamFilters.seasonId}
                    onChange={(e) => setTeamFilters((prev) => ({ ...prev, seasonId: e.target.value }))}
                    options={seasonOptions}
                  />
                  <Select
                    label="Sport"
                    value={teamFilters.sportId}
                    onChange={(e) => setTeamFilters((prev) => ({ ...prev, sportId: e.target.value, programId: '', levelId: '' }))}
                    options={sportOptions}
                  />
                  <Select
                    label="Program"
                    value={teamFilters.programId}
                    onChange={(e) => setTeamFilters((prev) => ({ ...prev, programId: e.target.value, levelId: '' }))}
                    options={programOptions}
                  />
                  <Select
                    label="Level"
                    value={teamFilters.levelId}
                    onChange={(e) => setTeamFilters((prev) => ({ ...prev, levelId: e.target.value }))}
                    options={levelOptions}
                  />
                  <RadioGroup
                    name="team-status-filter"
                    label="Status"
                    value={teamFilters.status}
                    onChange={(value) => setTeamFilters((prev) => ({ ...prev, status: value }))}
                    options={[
                      { value: '', label: 'All statuses' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>
              </Card>

              {teams.length === 0 ? (
                <EmptyState
                  icon="flag"
                  title="Create teams for the current season"
                  description="Teams are rostered groups within a level."
                  action={{
                    label: 'Add Team',
                    onClick: () => setShowTeamForm(true),
                  }}
                />
              ) : (
                <Card>
                  <div className="pa-flex pa-flex-col pa-gap-3">
                    {teamRows.map((row) => (
                      <div key={row.team.id} className="pa-flex pa-justify-between pa-items-center" style={{ padding: '12px', border: '1px solid var(--pa-n200)', borderRadius: '12px' }}>
                        <div>
                          <div className="pa-body-m" style={{ fontWeight: 600 }}>{row.team.name}</div>
                          <div className="pa-text-muted">{row.programName} • {row.levelName}</div>
                          <div className="pa-text-muted">Seasons: {row.seasonNames}</div>
                        </div>
                        <div className="pa-flex pa-items-center pa-gap-3">
                          <div className="pa-text-muted">Coaches: {row.coachesCount || '—'}</div>
                          <div className="pa-text-muted">Players: {row.players || '—'}</div>
                          <div className="pa-text-muted">{row.team.is_active ? 'Active' : 'Inactive'}</div>
                          <Button variant="ghost" size="compact">Edit Team</Button>
                          <Button variant="ghost" size="compact">Manage roster</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeSection === 'seasons' && (
            <div className="pa-flex pa-flex-col pa-gap-6">
              <Card title="Seasons" actions={
                <Button
                  variant="primary"
                  onClick={() => setShowSeasonForm(true)}
                >
                  Add Season
                </Button>
              }>
                <div className="pa-text-muted">Seasons are shared across sports and teams.</div>
              </Card>

              {showSeasonForm && (
                <Card title="Create Season">
                  <div className="pa-flex pa-flex-col pa-gap-4">
                    <Input
                      label="Season name"
                      placeholder="e.g. Spring 2026"
                      value={seasonForm.name}
                      onChange={(e) => setSeasonForm((prev) => ({ ...prev, name: e.target.value, nameTouched: true }))}
                      onBlur={() => markTouched('season.name')}
                      required
                      error={seasonNameError}
                    />
                    <Input
                      label="Year"
                      type="number"
                      value={seasonForm.year}
                      onChange={(e) => setSeasonForm((prev) => ({ ...prev, year: e.target.value }))}
                      onBlur={() => markTouched('season.year')}
                      required
                      error={seasonYearError}
                    />
                    <RadioGroup
                      name="season-term"
                      label="Term"
                      required
                      value={seasonForm.term}
                      onChange={(value) => setSeasonForm((prev) => ({ ...prev, term: value }))}
                      options={[
                        { value: 'fall', label: 'Fall' },
                        { value: 'spring', label: 'Spring' },
                        { value: 'winter', label: 'Winter' },
                        { value: 'summer', label: 'Summer' },
                      ]}
                      error={seasonTermError}
                    />
                    <Checkbox
                      checked={seasonForm.showDates}
                      onChange={(e) => setSeasonForm((prev) => ({ ...prev, showDates: e.target.checked }))}
                      label="Add season dates"
                    />
                    {seasonForm.showDates && (
                      <>
                        <Input
                          label="Start date"
                          type="date"
                          value={seasonForm.startDate}
                          onChange={(e) => setSeasonForm((prev) => ({ ...prev, startDate: e.target.value }))}
                        />
                        <Input
                          label="End date"
                          type="date"
                          value={seasonForm.endDate}
                          onChange={(e) => setSeasonForm((prev) => ({ ...prev, endDate: e.target.value }))}
                        />
                      </>
                    )}
                    <RadioGroup
                      name="season-status"
                      label="Status"
                      value={seasonForm.status}
                      onChange={(value) => setSeasonForm((prev) => ({ ...prev, status: value }))}
                      options={[
                        { value: 'upcoming', label: 'Upcoming' },
                        { value: 'active', label: 'Active' },
                        { value: 'locked', label: 'Locked' },
                        { value: 'archived', label: 'Archived' },
                      ]}
                    />
                    <div className="pa-flex pa-gap-2 pa-justify-end">
                      <Button variant="ghost" onClick={() => setShowSeasonForm(false)}>Cancel</Button>
                      <Button
                        disabled={!canCreateSeason}
                        onClick={() => {
                          setShowSeasonForm(false)
                          showSuccess('Season created. You can now assign teams to it.')
                        }}
                      >
                        Create Season
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {seasons.length === 0 ? (
                <EmptyState
                  icon="calendar_today"
                  title="Create a season"
                  description="Seasons group teams and events across your organization."
                  action={{
                    label: 'Add Season',
                    onClick: () => setShowSeasonForm(true),
                  }}
                />
              ) : (
                <Card>
                  <div className="pa-flex pa-flex-col pa-gap-3">
                    {seasons.map((season) => (
                      <div key={season.id} className="pa-flex pa-justify-between pa-items-center" style={{ padding: '12px', border: '1px solid var(--pa-n200)', borderRadius: '12px' }}>
                        <div>
                          <div className="pa-body-m" style={{ fontWeight: 600 }}>{season.name}</div>
                          <div className="pa-text-muted">
                            {getSeasonTerm(season.name)} • {season.start_date || 'TBD'} - {season.end_date || 'TBD'}
                          </div>
                        </div>
                        <div className="pa-flex pa-items-center pa-gap-3">
                          <div className="pa-text-muted">{getSeasonStatus(season)}</div>
                          <div className="pa-text-muted">Teams linked: {seasonTeamCount.get(season.id) ?? 0}</div>
                          <Button variant="ghost" size="compact">Edit Season</Button>
                          <Button variant="ghost" size="compact">Lock Season</Button>
                          <Button variant="ghost" size="compact">Archive Season</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeSection === 'people' && (
            <div className="pa-flex pa-flex-col pa-gap-6">
              <Card title="People">
                <div className="pa-text-muted">Players and coaches are always connected to teams and seasons.</div>
              </Card>

              <Tabs value={showChildForm ? 'add-player' : showCoachForm ? 'add-coach' : 'players'} onValueChange={() => undefined}>
                <TabsList>
                  <TabsTrigger value="players" onClick={() => {
                    setShowChildForm(false)
                    setShowCoachForm(false)
                  }}>Players</TabsTrigger>
                  <TabsTrigger value="guardians" onClick={() => {
                    setShowChildForm(false)
                    setShowCoachForm(false)
                  }}>Guardians</TabsTrigger>
                  <TabsTrigger value="coaches" onClick={() => {
                    setShowChildForm(false)
                    setShowCoachForm(false)
                  }}>Coaches / Staff</TabsTrigger>
                </TabsList>

                <TabsContent value="players">
                  <Card title="Players" actions={
                    <Button variant="primary" onClick={() => setShowChildForm(true)}>Add Child</Button>
                  }>
                    <div className="pa-text-muted">Add children and assign them to teams for the season.</div>
                  </Card>

                  {showChildForm && (
                    <Card title="Add Child">
                      <div className="pa-flex pa-flex-col pa-gap-4">
                        <Input
                          label="Child first name"
                          value={childForm.firstName}
                          onChange={(e) => setChildForm((prev) => ({ ...prev, firstName: e.target.value }))}
                          onBlur={() => markTouched('child.firstName')}
                          required
                          error={childFirstNameError}
                        />
                        <Input
                          label="Child last name"
                          value={childForm.lastName}
                          onChange={(e) => setChildForm((prev) => ({ ...prev, lastName: e.target.value }))}
                          onBlur={() => markTouched('child.lastName')}
                          required
                          error={childLastNameError}
                        />
                        <Input
                          label="Date of birth"
                          type="date"
                          value={childForm.dob}
                          onChange={(e) => setChildForm((prev) => ({ ...prev, dob: e.target.value }))}
                          onBlur={() => markTouched('child.dob')}
                          required
                          error={childDobError}
                        />
                        <Checkbox
                          checked={childForm.genderRequired}
                          onChange={(e) => setChildForm((prev) => ({ ...prev, genderRequired: e.target.checked, gender: '' }))}
                          label="Gender is required by this organization"
                        />
                        {childForm.genderRequired && (
                          <RadioGroup
                            name="child-gender"
                            label="Gender"
                            required
                            value={childForm.gender}
                            onChange={(value) => setChildForm((prev) => ({ ...prev, gender: value }))}
                            options={[
                              { value: 'boys', label: 'Boy' },
                              { value: 'girls', label: 'Girl' },
                              { value: 'coed', label: 'Non-binary / Co-ed' },
                            ]}
                            error={childGenderError}
                          />
                        )}

                        <Select
                          label="Season"
                          required
                          value={childForm.seasonId}
                          onChange={(e) => setChildForm((prev) => ({ ...prev, seasonId: e.target.value }))}
                          onBlur={() => markTouched('child.season')}
                          options={seasonOptions}
                          error={childSeasonError}
                        />
                        <Select
                          label="Sport"
                          required
                          value={childForm.sportId}
                          onChange={(e) => setChildForm((prev) => ({ ...prev, sportId: e.target.value }))}
                          onBlur={() => markTouched('child.sport')}
                          options={sportOptions}
                          error={childSportError}
                        />
                        <Select
                          label="Program"
                          required
                          value={childForm.programId}
                          onChange={(e) => setChildForm((prev) => ({ ...prev, programId: e.target.value }))}
                          onBlur={() => markTouched('child.program')}
                          options={programOptionsForChild}
                          error={childProgramError}
                        />
                        <Select
                          label="Level"
                          required
                          value={childForm.levelId}
                          onChange={(e) => setChildForm((prev) => ({ ...prev, levelId: e.target.value }))}
                          onBlur={() => markTouched('child.level')}
                          options={levelOptionsForChild}
                          error={childLevelError}
                        />
                        <Select
                          label="Team"
                          required
                          value={childForm.teamId}
                          onChange={(e) => setChildForm((prev) => ({ ...prev, teamId: e.target.value }))}
                          onBlur={() => markTouched('child.team')}
                          options={teamOptionsForChild}
                          error={childTeamError}
                        />

                        <RadioGroup
                          name="guardian-mode"
                          label="Guardian link"
                          value={childForm.guardianMode}
                          onChange={(value) => setChildForm((prev) => ({ ...prev, guardianMode: value, guardianEmail: '', guardianId: '' }))}
                          options={[
                            { value: 'invite', label: 'Add guardian by email' },
                            { value: 'link', label: 'Link existing guardian' },
                          ]}
                        />
                        {childForm.guardianMode === 'invite' ? (
                          <Input
                            label="Guardian email"
                            type="email"
                            placeholder="parent@example.com"
                            value={childForm.guardianEmail}
                            onChange={(e) => setChildForm((prev) => ({ ...prev, guardianEmail: e.target.value }))}
                            onBlur={() => markTouched('child.guardianEmail')}
                            required
                            error={guardianEmailError}
                          />
                        ) : (
                          <Select
                            label="Existing guardian"
                            value={childForm.guardianId}
                            onChange={(e) => setChildForm((prev) => ({ ...prev, guardianId: e.target.value }))}
                            onBlur={() => markTouched('child.guardianId')}
                            options={[{ value: '', label: 'Select a guardian' }]}
                            required
                            error={guardianIdError}
                          />
                        )}
                        <RadioGroup
                          name="guardian-relationship"
                          label="Relationship type"
                          value={childForm.guardianRelationship}
                          onChange={(value) => setChildForm((prev) => ({ ...prev, guardianRelationship: value }))}
                          options={[
                            { value: 'parent', label: 'Parent or legal guardian' },
                            { value: 'family', label: 'Family member' },
                            { value: 'other', label: 'Other caregiver' },
                          ]}
                        />
                        <div className="pa-flex pa-gap-2 pa-justify-end">
                          <Button variant="ghost" onClick={() => setShowChildForm(false)}>Cancel</Button>
                          <Button
                            disabled={!canAddChild}
                            onClick={() => {
                              setShowChildForm(false)
                              showSuccess('Child added. Next, confirm roster placement.')
                            }}
                          >
                            Add Child
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  {children.length === 0 && !showChildForm && (
                    <EmptyState
                      icon="child_care"
                      title="Add your first player"
                      description="Players are always assigned to a team and season."
                      action={{
                        label: 'Add Child',
                        onClick: () => setShowChildForm(true),
                      }}
                    />
                  )}
                </TabsContent>

                <TabsContent value="guardians">
                  <Card title="Guardians">
                    <div className="pa-text-muted">
                      Guardians are linked automatically when you add a child. No separate family setup is required.
                    </div>
                  </Card>
                </TabsContent>

                <TabsContent value="coaches">
                  <Card title="Coaches & Staff" actions={
                    <Button variant="primary" onClick={() => setShowCoachForm(true)}>Add Coach</Button>
                  }>
                    <div className="pa-text-muted">Assign coaches to teams and seasons.</div>
                  </Card>

                  {showCoachForm && (
                    <Card title="Add Coach / Staff">
                      <div className="pa-flex pa-flex-col pa-gap-4">
                        <Input
                          label="Name"
                          value={coachForm.name}
                          onChange={(e) => setCoachForm((prev) => ({ ...prev, name: e.target.value }))}
                          onBlur={() => markTouched('coach.name')}
                          required
                          error={coachNameError}
                        />
                        <Input
                          label="Email"
                          type="email"
                          value={coachForm.email}
                          onChange={(e) => setCoachForm((prev) => ({ ...prev, email: e.target.value }))}
                          onBlur={() => markTouched('coach.email')}
                          required
                          error={coachEmailError}
                        />
                        <RadioGroup
                          name="coach-role"
                          label="Role"
                          required
                          value={coachForm.role}
                          onChange={(value) => setCoachForm((prev) => ({ ...prev, role: value }))}
                          options={[
                            { value: 'head', label: 'Head Coach' },
                            { value: 'assistant', label: 'Assistant Coach' },
                            { value: 'staff', label: 'Staff' },
                          ]}
                          error={coachRoleError}
                        />
                        <Select
                          label="Season scope"
                          required
                          value={coachForm.seasonId}
                          onChange={(e) => setCoachForm((prev) => ({ ...prev, seasonId: e.target.value }))}
                          onBlur={() => markTouched('coach.season')}
                          options={seasonOptions}
                          error={coachSeasonError}
                        />
                        <div className="pa-form-group">
                          <label className="pa-label pa-label--required">Assign to team(s)</label>
                          <div className="pa-helper">Coaches can be assigned to multiple teams within the season.</div>
                          <div className="pa-flex pa-flex-col pa-gap-2" style={{ marginTop: '8px' }}>
                            {teams.length === 0 && (
                              <div className="pa-helper">No teams available yet.</div>
                            )}
                            {teams.map((team) => (
                              <label key={team.id} className="pa-flex pa-items-center pa-gap-2" style={{ cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={coachForm.teamIds.includes(team.id)}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...coachForm.teamIds, team.id]
                                      : coachForm.teamIds.filter((id) => id !== team.id)
                                    setCoachForm((prev) => ({ ...prev, teamIds: next }))
                                  }}
                                  onBlur={() => markTouched('coach.teams')}
                                />
                                <span className="pa-body-m">{team.name}</span>
                              </label>
                            ))}
                          </div>
                          {coachTeamsError && <div className="pa-helper pa-helper--error">{coachTeamsError}</div>}
                        </div>
                        <Checkbox
                          checked={coachForm.assignToLevel}
                          onChange={(e) => setCoachForm((prev) => ({ ...prev, assignToLevel: e.target.checked, levelId: '' }))}
                          label="Assign to a level (optional)"
                        />
                        {coachForm.assignToLevel && (
                          <Select
                            label="Level assignment"
                            value={coachForm.levelId}
                            onChange={(e) => setCoachForm((prev) => ({ ...prev, levelId: e.target.value }))}
                            onBlur={() => markTouched('coach.level')}
                            options={levelOptions}
                            error={coachLevelError}
                          />
                        )}
                        <div className="pa-flex pa-gap-2 pa-justify-end">
                          <Button variant="ghost" onClick={() => setShowCoachForm(false)}>Cancel</Button>
                          <Button
                            disabled={!canAddCoach}
                            onClick={() => {
                              setShowCoachForm(false)
                              showSuccess('Coach assigned. Permissions update automatically.')
                            }}
                          >
                            Add Coach
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="pa-flex pa-flex-col pa-gap-6">
              <Card title="Organization Settings">
                <div className="pa-text-muted">Settings apply to the whole organization. They never override structure.</div>
                <div className="pa-flex pa-flex-col pa-gap-2" style={{ marginTop: '12px' }}>
                  <div>Default season</div>
                  <div>Allowed sports</div>
                  <div>Attendance rules</div>
                  <div>Registration rules</div>
                  <div>Visibility controls</div>
                </div>
                <div className="pa-mt-4">
                  <Button variant="secondary" onClick={() => navigate('/admin/organization')}>Manage settings</Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
