import { useEffect, useMemo, useState } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getSports, getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams } from '../../data/services/teamsService'
import { getSeasons } from '../../data/services/seasonsService'
import type { Sport, Program, Level, Team, Season, GenderCategory, LevelType } from '../../data/types/organization'
import { PageHeader, Card, Button, Input, Select, Checkbox } from '../../components/platformAdmin'

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

export default function OrganizationStructureForms() {
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }))

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

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setLoadError(null)

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

  const filteredProgramsForSport = useMemo(
    () => programs.filter((program) => program.sport_id === childForm.sportId),
    [programs, childForm.sportId]
  )

  const filteredLevelsForProgram = useMemo(
    () => levels.filter((level) => level.program_id === childForm.programId),
    [levels, childForm.programId]
  )

  const filteredTeamsForLevel = useMemo(
    () => teams.filter((team) => team.level_id === childForm.levelId),
    [teams, childForm.levelId]
  )

  const programOptionsForChild = useMemo(
    () => [
      { value: '', label: childForm.sportId ? 'Select program' : 'Select sport first' },
      ...filteredProgramsForSport.map((program) => ({ value: program.id, label: program.name })),
    ],
    [filteredProgramsForSport, childForm.sportId]
  )

  const levelOptionsForChild = useMemo(
    () => [
      { value: '', label: childForm.programId ? 'Select level' : 'Select program first' },
      ...filteredLevelsForProgram.map((level) => ({ value: level.id, label: level.name })),
    ],
    [filteredLevelsForProgram, childForm.programId]
  )

  const teamOptionsForChild = useMemo(
    () => [
      { value: '', label: childForm.levelId ? 'Select team' : 'Select level first' },
      ...filteredTeamsForLevel.map((team) => ({ value: team.id, label: team.name })),
    ],
    [filteredTeamsForLevel, childForm.levelId]
  )

  const internalKey = slugify(sportForm.name)

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

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  return (
    <div className="pa-root">
      <PageHeader
        title="Organization Structure Forms"
        subtitle="Define sports, programs, levels, teams, and seasons in the same way you plan a season."
      />

      {loadError && (
        <Card className="pa-mb-6">
          <div className="pa-text-danger">{loadError}</div>
        </Card>
      )}

      <Card title="Create Sport" className="pa-mb-6">
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
            onChange={(e) => setSportForm((prev) => ({ ...prev, showSeasonPattern: e.target.checked }))}
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
          <Button disabled={!canCreateSport}>Create Sport</Button>
        </div>
      </Card>

      <Card title="Create Program" className="pa-mb-6">
        <div className="pa-flex pa-flex-col pa-gap-4">
          <Select
            label="Parent sport"
            required
            value={programForm.sportId}
            onChange={(e) => setProgramForm((prev) => ({ ...prev, sportId: e.target.value }))}
            onBlur={() => markTouched('program.sport')}
            options={sportOptions}
            error={programSportError}
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
          <Button disabled={!canCreateProgram}>Create Program</Button>
        </div>
      </Card>

      <Card title="Create Level" className="pa-mb-6">
        <div className="pa-flex pa-flex-col pa-gap-4">
          <Select
            label="Parent program"
            required
            value={levelForm.programId}
            onChange={(e) => setLevelForm((prev) => ({ ...prev, programId: e.target.value }))}
            onBlur={() => markTouched('level.program')}
            options={programOptions}
            error={levelProgramError}
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
          <Button disabled={!canCreateLevel}>Create Level</Button>
        </div>
      </Card>

      <Card title="Create Team" className="pa-mb-6">
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
          <Button disabled={!canCreateTeam}>Create Team</Button>
        </div>
      </Card>

      <Card title="Create Season" className="pa-mb-6">
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
          <Button disabled={!canCreateSeason}>Create Season</Button>
        </div>
      </Card>

      <Card title="Add Child (Player)" className="pa-mb-6">
        <div className="pa-flex pa-flex-col pa-gap-4">
          <h3 className="pa-h3">Child details</h3>
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

          <h3 className="pa-h3">Team assignment</h3>
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

          <h3 className="pa-h3">Guardians</h3>
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
          <Button disabled={!canAddChild}>Add Child</Button>
        </div>
      </Card>

      <Card title="Add Coach / Staff" className="pa-mb-6">
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
          <Button disabled={!canAddCoach}>Add Coach</Button>
        </div>
      </Card>

      <Card title="Bulk Operations" className="pa-mb-6">
        <div className="pa-flex pa-flex-col pa-gap-4">
          <div className="pa-body-m">Use bulk actions for large organizations. Every action includes a preview and full validation before saving.</div>
          <Button variant="secondary">Bulk create teams under a level</Button>
          <Button variant="secondary">Bulk assign seasons to teams</Button>
          <Button variant="secondary">Bulk import players (CSV)</Button>
          <Button variant="secondary">Bulk invite guardians</Button>
        </div>
      </Card>

      <Card title="Global Validation Rules" className="pa-mb-6">
        <ul className="pa-flex pa-flex-col pa-gap-2" style={{ paddingLeft: '16px' }}>
          <li>Program cannot exist without a sport.</li>
          <li>Level cannot exist without a program.</li>
          <li>Team cannot exist without a level and season.</li>
          <li>Child cannot be assigned without a team.</li>
          <li>Season cannot be deleted if linked to teams.</li>
          <li>Inactive entities cannot accept new children.</li>
        </ul>
      </Card>

      {!currentOrganization && (
        <Card>
          <div className="pa-text-muted">Finish organization setup to unlock these forms.</div>
        </Card>
      )}
    </div>
  )
}
