import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getSports, getPrograms, createSport, createProgram, updateSport, updateProgram } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { createLevel, updateLevel } from '../../data/services/levelsService'
import { getTeams, createTeam, updateTeam } from '../../data/services/teamsService'
import { getSeasons, createSeason, updateSeason } from '../../data/services/seasonsService'
import type { Sport, Program, Level, Team, Season, GenderCategory, LevelType } from '../../data/types/organization'
import { PageHeader, Card, Button, Input, Select, Checkbox } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'

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


export default function OrganizationStructureForms() {
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState({
    sport: false,
    program: false,
    level: false,
    team: false,
    season: false,
  })

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const editType = searchParams.get('edit')
  const editId = searchParams.get('id')

  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])

  useEffect(() => {
    if (!editType || !editId) return

    if (editType === 'sport') {
      const sport = sports.find((s) => s.id === editId)
      if (sport) {
        setSportForm((prev) => ({
          ...prev,
          name: sport.name,
        }))
      }
    }

    if (editType === 'program') {
      const program = programs.find((p) => p.id === editId)
      if (program) {
        setProgramForm((prev) => ({
          ...prev,
          sportId: program.sport_id,
          gender: program.gender_category,
          name: program.name,
          nameTouched: true,
        }))
      }
    }

    if (editType === 'level') {
      const level = levels.find((l) => l.id === editId)
      if (level) {
        setLevelForm((prev) => ({
          ...prev,
          programId: level.program_id,
          name: level.name,
          type: level.level_type,
          ageMin: level.age_min ? String(level.age_min) : '',
          ageMax: level.age_max ? String(level.age_max) : '',
          gradeMin: level.grade_min ? String(level.grade_min) : '',
          gradeMax: level.grade_max ? String(level.grade_max) : '',
          skillDescription: level.description || '',
        }))
      }
    }

    if (editType === 'team') {
      const team = teams.find((t) => t.id === editId)
      if (team) {
        setTeamForm((prev) => ({
          ...prev,
          levelId: team.level_id ?? '',
          name: team.name,
          seasonId: '',
          isActive: team.is_active ?? true,
        }))
      }
    }

    if (editType === 'season') {
      const season = seasons.find((s) => s.id === editId)
      if (season) {
        setSeasonForm((prev) => ({
          ...prev,
          name: season.name,
          startDate: season.start_date,
          endDate: season.end_date,
          isActive: season.is_active ?? false,
        }))
      }
    }
  }, [editType, editId, sports, programs, levels, teams, seasons])

  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const markTouched = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }))

  const [sportForm, setSportForm] = useState({
    name: '',
  })

  const [programForm, setProgramForm] = useState({
    sportId: '',
    gender: '' as GenderCategory | '',
    name: '',
    nameTouched: false,
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
  })

  const [teamForm, setTeamForm] = useState({
    levelId: '',
    seasonId: '',
    name: '',
    isActive: true,
  })

  const [seasonForm, setSeasonForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false,
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

  const activeFormType = editType ?? searchParams.get('type') ?? ''

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

  const seasonStartError = touched['season.startDate'] && !seasonForm.startDate
    ? 'Start date is required.'
    : undefined

  const seasonEndError = touched['season.endDate'] && !seasonForm.endDate
    ? 'End date is required.'
    : undefined

  const seasonRangeError = touched['season.endDate'] && seasonForm.startDate && seasonForm.endDate && seasonForm.endDate < seasonForm.startDate
    ? 'End date must be on or after the start date.'
    : undefined

  const canCreateSport = !!sportForm.name.trim()
  const canCreateProgram = !!programForm.sportId && !!programForm.gender && !!programForm.name.trim()
  const canCreateLevel = !!levelForm.programId && !!levelForm.name.trim() && !!levelForm.type && (
    (levelForm.type === 'age_based' && !!levelForm.ageMin && !!levelForm.ageMax) ||
    (levelForm.type === 'grade_based' && !!levelForm.gradeMin && !!levelForm.gradeMax) ||
    (levelForm.type === 'skill_based' && !!levelForm.skillDescription.trim())
  )
  const isEditingTeam = editType === 'team'
  const canCreateTeam = !!teamForm.levelId && !!teamForm.name.trim() && (isEditingTeam || !!teamForm.seasonId)
  const isSeasonRangeValid = !!seasonForm.startDate && !!seasonForm.endDate && seasonForm.endDate >= seasonForm.startDate
  const canCreateSeason = !!seasonForm.name.trim() && isSeasonRangeValid

  const formLabels: Record<string, string> = {
    sport: 'Sport',
    program: 'Program',
    level: 'Level',
    team: 'Team',
    season: 'Season',
  }

  const activeFormLabel = activeFormType ? formLabels[activeFormType] ?? 'Item' : 'Organization Structure'
  const pageTitle = activeFormType ? `${editType ? 'Edit' : 'Add'} ${activeFormLabel}` : 'Organization Structure'
  const pageSubtitle = activeFormType
    ? 'Complete the required details to continue.'
    : 'Choose what you want to add or edit.'

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  return (
    <div className="pa-root">
      <OfflineBanner />
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        breadcrumbs={[
          { label: 'Organizations', path: '/admin/organization/structure' },
          { label: activeFormLabel },
        ]}
      />

      {successMessage && (
        <Card className="pa-mb-6">
          <div className="pa-text-success">{successMessage}</div>
        </Card>
      )}

      {actionError && (
        <Card className="pa-mb-6">
          <div className="pa-text-danger">{actionError}</div>
        </Card>
      )}

      {loadError && (
        <Card className="pa-mb-6">
          <div className="pa-text-danger">{loadError}</div>
        </Card>
      )}

      {!activeFormType && (
        <Card title="What would you like to add?" className="pa-mb-6">
          <div className="pa-flex pa-flex-col pa-gap-3">
            <Link to="/admin/organization/structure/forms?type=sport">
              <Button>Add Sport</Button>
            </Link>
            <Link to="/admin/organization/structure/forms?type=program">
              <Button variant="secondary">Add Program</Button>
            </Link>
            <Link to="/admin/organization/structure/forms?type=level">
              <Button variant="secondary">Add Level</Button>
            </Link>
            <Link to="/admin/organization/structure/forms?type=team">
              <Button variant="secondary">Add Team</Button>
            </Link>
            <Link to="/admin/organization/structure/forms?type=season">
              <Button variant="secondary">Add Season</Button>
            </Link>
          </div>
        </Card>
      )}

      {activeFormType === 'sport' && (
      <Card title={editType === 'sport' ? 'Edit Sport' : 'Add Sport'} className="pa-mb-6">
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
          <Button
            disabled={!canCreateSport || submitting.sport}
            loading={submitting.sport}
            onClick={async () => {
              if (!canCreateSport || !currentOrganization?.id) return
              setSubmitting((prev) => ({ ...prev, sport: true }))
              setActionError(null)
              setSuccessMessage(null)

              if (editType === 'sport' && editId) {
                const result = await updateSport(context, editId, { name: sportForm.name.trim() })
                if (result.error) {
                  setActionError(result.error.message)
                } else if (result.data) {
                  setSports((prev) => prev.map((s) => (s.id === editId ? (result.data as Sport) : s)))
                  setSuccessMessage('Sport updated successfully.')
                }
              } else {
                const result = await createSport(context, {
                  org_id: currentOrganization.id,
                  name: sportForm.name.trim(),
                  icon: undefined,
                  color: '#137fec',
                })
                if (result.error) {
                  setActionError(result.error.message)
                } else if (result.data) {
                  setSports((prev) => [result.data as Sport, ...prev])
                  setSportForm((prev) => ({ ...prev, name: '' }))
                  setSuccessMessage('Sport created successfully.')
                }
              }

              setSubmitting((prev) => ({ ...prev, sport: false }))
            }}
          >
            {editType === 'sport' ? 'Update Sport' : 'Create Sport'}
          </Button>
        </div>
      </Card>
      )}

      {activeFormType === 'program' && (
      <Card title={editType === 'program' ? 'Edit Program' : 'Add Program'} className="pa-mb-6">
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
          <Button
            disabled={!canCreateProgram || submitting.program}
            loading={submitting.program}
            onClick={async () => {
              if (!canCreateProgram || !currentOrganization?.id) return
              setSubmitting((prev) => ({ ...prev, program: true }))
              setActionError(null)
              setSuccessMessage(null)

              if (editType === 'program' && editId) {
                const result = await updateProgram(context, editId, {
                  name: programForm.name.trim(),
                  gender_category: programForm.gender as GenderCategory,
                  description: undefined,
                })
                if (result.error) {
                  setActionError(result.error.message)
                } else if (result.data) {
                  setPrograms((prev) => prev.map((p) => (p.id === editId ? (result.data as Program) : p)))
                  setSuccessMessage('Program updated successfully.')
                }
              } else {
                const result = await createProgram(context, {
                  org_id: currentOrganization.id,
                  sport_id: programForm.sportId,
                  name: programForm.name.trim(),
                  gender_category: programForm.gender as GenderCategory,
                  description: undefined,
                })
                if (result.error) {
                  setActionError(result.error.message)
                } else if (result.data) {
                  setPrograms((prev) => [result.data as Program, ...prev])
                  setProgramForm((prev) => ({
                    ...prev,
                    name: '',
                    sportId: '',
                    gender: 'coed',
                    nameTouched: false,
                  }))
                  setSuccessMessage('Program created successfully.')
                }
              }

              setSubmitting((prev) => ({ ...prev, program: false }))
            }}
          >
            {editType === 'program' ? 'Update Program' : 'Create Program'}
          </Button>
        </div>
      </Card>
      )}

      {activeFormType === 'level' && (
      <Card title={editType === 'level' ? 'Edit Level' : 'Add Level'} className="pa-mb-6">
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
          <Button
            disabled={!canCreateLevel || submitting.level}
            loading={submitting.level}
            onClick={async () => {
              if (!canCreateLevel || !currentOrganization?.id) return
              setSubmitting((prev) => ({ ...prev, level: true }))
              setActionError(null)
              setSuccessMessage(null)

              if (editType === 'level' && editId) {
                const result = await updateLevel(context, editId, {
                  name: levelForm.name.trim(),
                  level_type: levelForm.type as LevelType,
                  description: levelForm.skillDescription?.trim() || undefined,
                  age_min: levelForm.ageMin ? Number(levelForm.ageMin) : undefined,
                  age_max: levelForm.ageMax ? Number(levelForm.ageMax) : undefined,
                  grade_min: levelForm.gradeMin ? Number(levelForm.gradeMin) : undefined,
                  grade_max: levelForm.gradeMax ? Number(levelForm.gradeMax) : undefined,
                  skill_min: levelForm.type === 'skill_based' ? 1 : undefined,
                  skill_max: levelForm.type === 'skill_based' ? 5 : undefined,
                })
                if (result.error) {
                  setActionError(result.error.message)
                } else if (result.data) {
                  setLevels((prev) => prev.map((l) => (l.id === editId ? (result.data as Level) : l)))
                  setSuccessMessage('Level updated successfully.')
                }
              } else {
                const result = await createLevel(context, {
                  org_id: currentOrganization.id,
                  program_id: levelForm.programId,
                  name: levelForm.name.trim(),
                  level_type: levelForm.type as LevelType,
                  description: levelForm.skillDescription?.trim() || undefined,
                  age_min: levelForm.ageMin ? Number(levelForm.ageMin) : undefined,
                  age_max: levelForm.ageMax ? Number(levelForm.ageMax) : undefined,
                  grade_min: levelForm.gradeMin ? Number(levelForm.gradeMin) : undefined,
                  grade_max: levelForm.gradeMax ? Number(levelForm.gradeMax) : undefined,
                  skill_min: levelForm.type === 'skill_based' ? 1 : undefined,
                  skill_max: levelForm.type === 'skill_based' ? 5 : undefined,
                })
                if (result.error) {
                  setActionError(result.error.message)
                } else if (result.data) {
                  setLevels((prev) => [result.data as Level, ...prev])
                  setLevelForm((prev) => ({
                    ...prev,
                    programId: '',
                    name: '',
                    type: 'age_based',
                    ageMin: '',
                    ageMax: '',
                    gradeMin: '',
                    gradeMax: '',
                    skillDescription: '',
                  }))
                  setSuccessMessage('Level created successfully.')
                }
              }

              setSubmitting((prev) => ({ ...prev, level: false }))
            }}
          >
            {editType === 'level' ? 'Update Level' : 'Create Level'}
          </Button>
        </div>
      </Card>
      )}

      {activeFormType === 'team' && (
      <Card title={editType === 'team' ? 'Edit Team' : 'Add Team'} className="pa-mb-6">
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
          {!isEditingTeam && (
            <Select
              label="Season"
              required
              value={teamForm.seasonId}
              onChange={(e) => setTeamForm((prev) => ({ ...prev, seasonId: e.target.value }))}
              onBlur={() => markTouched('team.season')}
              options={seasonOptions}
              error={teamSeasonError}
            />
          )}
          <Input
            label="Team name"
            placeholder="e.g. U10 Blue"
            value={teamForm.name}
            onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
            onBlur={() => markTouched('team.name')}
            required
            error={teamNameError}
          />
          <Checkbox
            checked={teamForm.isActive}
            onChange={(e) => setTeamForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            label="Team is active"
          />
          <Button
            disabled={!canCreateTeam || submitting.team}
            loading={submitting.team}
            onClick={async () => {
              if (!canCreateTeam || !currentOrganization?.id) return
              setSubmitting((prev) => ({ ...prev, team: true }))
              setActionError(null)
              setSuccessMessage(null)
              const selectedLevel = levels.find((l) => l.id === teamForm.levelId)
              const selectedProgram = programs.find((p) => p.id === selectedLevel?.program_id)

              if (editType === 'team' && editId) {
                const result = await updateTeam(context, editId, {
                  name: teamForm.name.trim(),
                  level_id: teamForm.levelId,
                  program_id: selectedLevel?.program_id ?? null,
                  sport_id: selectedProgram?.sport_id ?? null,
                  is_active: teamForm.isActive,
                })
                if (result.error) {
                  setActionError(result.error.message)
                } else if (result.data) {
                  setTeams((prev) => prev.map((t) => (t.id === editId ? (result.data as Team) : t)))
                  setSuccessMessage('Team updated successfully.')
                }
              } else {
                const result = await createTeam(context, {
                  org_id: currentOrganization.id,
                  name: teamForm.name.trim(),
                  level_id: teamForm.levelId,
                  program_id: selectedLevel?.program_id ?? null,
                  sport_id: selectedProgram?.sport_id ?? null,
                  is_active: teamForm.isActive,
                  season_id: teamForm.seasonId,
                })
                if (result.error) {
                  setActionError(result.error.message)
                } else if (result.data) {
                  setTeams((prev) => [result.data as Team, ...prev])
                  setTeamForm((prev) => ({
                    ...prev,
                    levelId: '',
                    seasonId: '',
                    name: '',
                    isActive: true,
                  }))
                  setSuccessMessage('Team created successfully.')
                }
              }

              setSubmitting((prev) => ({ ...prev, team: false }))
            }}
          >
            {editType === 'team' ? 'Update Team' : 'Create Team'}
          </Button>
        </div>
      </Card>
      )}

      {activeFormType === 'season' && (
      <Card title={editType === 'season' ? 'Edit Season' : 'Add Season'} className="pa-mb-6">
        <div className="pa-flex pa-flex-col pa-gap-4">
          <Input
            label="Season name"
            placeholder="e.g. Spring 2026"
            value={seasonForm.name}
            onChange={(e) => setSeasonForm((prev) => ({ ...prev, name: e.target.value }))}
            onBlur={() => markTouched('season.name')}
            required
            error={seasonNameError}
          />
          <Input
            label="Start date"
            type="date"
            value={seasonForm.startDate}
            onChange={(e) => setSeasonForm((prev) => ({ ...prev, startDate: e.target.value }))}
            onBlur={() => markTouched('season.startDate')}
            required
            error={seasonStartError}
          />
          <Input
            label="End date"
            type="date"
            value={seasonForm.endDate}
            onChange={(e) => setSeasonForm((prev) => ({ ...prev, endDate: e.target.value }))}
            onBlur={() => markTouched('season.endDate')}
            required
            error={seasonEndError || seasonRangeError}
          />
          <Checkbox
            checked={seasonForm.isActive}
            onChange={(e) => setSeasonForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            label="Set as active season"
          />
          <Button
            disabled={!canCreateSeason || submitting.season}
            loading={submitting.season}
            onClick={async () => {
              if (!canCreateSeason || !currentOrganization?.id) return
              setSubmitting((prev) => ({ ...prev, season: true }))
              setActionError(null)
              setSuccessMessage(null)

              const start = seasonForm.startDate
              const end = seasonForm.endDate

              if (editType === 'season' && editId) {
                const result = await updateSeason(context, editId, {
                  name: seasonForm.name.trim(),
                  start_date: start,
                  end_date: end,
                  is_active: seasonForm.isActive,
                })
                if (result.error) {
                  setActionError(result.error.message)
                } else if (result.data) {
                  setSeasons((prev) => prev.map((s) => (s.id === editId ? (result.data as Season) : s)))
                  setSuccessMessage('Season updated successfully.')
                }
              } else {
                const result = await createSeason(context, {
                  org_id: currentOrganization.id,
                  name: seasonForm.name.trim(),
                  start_date: start,
                  end_date: end,
                  is_active: seasonForm.isActive,
                })
                if (result.error) {
                  setActionError(result.error.message)
                } else if (result.data) {
                  setSeasons((prev) => [result.data as Season, ...prev])
                  setSeasonForm((prev) => ({
                    ...prev,
                    name: '',
                    startDate: '',
                    endDate: '',
                    isActive: false,
                  }))
                  setSuccessMessage('Season created successfully.')
                }
              }

              setSubmitting((prev) => ({ ...prev, season: false }))
            }}
          >
            {editType === 'season' ? 'Update Season' : 'Create Season'}
          </Button>
        </div>
      </Card>
      )}


      {!currentOrganization && (
        <Card>
          <div className="pa-text-muted">Finish organization setup to unlock these forms.</div>
        </Card>
      )}
    </div>
  )
}
