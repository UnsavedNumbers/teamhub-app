import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { getSports, getSystemSports, getPrograms, createSport, createProgram, updateProgram } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { createLevel, updateLevel } from '../../data/services/levelsService'
import { getTeams, createTeam, updateTeam } from '../../data/services/teamsService'
import { getSeasons, createSeason, updateSeason } from '../../data/services/seasonsService'
import type { Sport, Program, Level, Team, Season, GenderCategory, LevelType } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Input, Select, Checkbox } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'

interface RadioOption {
  value: string
  label: string
  helper?: string
}

type FormType = 'sport' | 'program' | 'level' | 'team' | 'season'

function isFormType(value: string | null): value is FormType {
  return value === 'sport' || value === 'program' || value === 'level' || value === 'team' || value === 'season'
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
  const t = useT()
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

  const [sports, setSports] = useState<Sport[]>([])
  const [systemSports, setSystemSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])

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

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const editTypeParam = searchParams.get('edit')
  const editType = isFormType(editTypeParam) ? editTypeParam : null
  const editId = searchParams.get('id')?.trim() || null
  const typeParam = searchParams.get('type')
  const requestedFormType = isFormType(typeParam) ? typeParam : null
  const activeFormType = editType ?? requestedFormType
  const [editInitialized, setEditInitialized] = useState(false)
  
  // Context from query params for pre-populating forms
  const contextSportId = searchParams.get('sport_id')?.trim() || null
  const contextProgramId = searchParams.get('program_id')?.trim() || null
  const contextLevelId = searchParams.get('level_id')?.trim() || null

  useEffect(() => {
    if (!isReady) return

    let isActive = true

    const load = async () => {
      setLoading(true)
      setLoadError(null)

      try {
        const [sportsResult, systemSportsResult, programsResult, levelsResult, teamsResult, seasonsResult] = await Promise.all([
          getSports(context),
          getSystemSports(),
          getPrograms(context),
          getLevels(context),
          getTeams(context),
          getSeasons(context),
        ])

        if (!isActive) return

        if (sportsResult.error) throw sportsResult.error
        if (systemSportsResult.error) throw systemSportsResult.error
        if (programsResult.error) throw programsResult.error
        if (levelsResult.error) throw levelsResult.error
        if (teamsResult.error) throw teamsResult.error
        if (seasonsResult.error) throw seasonsResult.error

        setSports(sportsResult.data as Sport[])
        setSystemSports(systemSportsResult.data as Sport[])
        setPrograms(programsResult.data as Program[])
        setLevels(levelsResult.data as Level[])
        setTeams(teamsResult.data as Team[])
        setSeasons(seasonsResult.data as Season[])
      } catch (_err) {
        if (!isActive) return
        setLoadError(t('admin.structureForms.errors.loadFailed'))
      } finally {
        if (isActive) setLoading(false)
      }
    }

    load()

    return () => {
      isActive = false
    }
  }, [context, isReady, t])

  const sportOptions = useMemo(
    () => [
      { value: '', label: t('admin.structureForms.fields.programSport.select') },
      ...sports.map((sport) => ({ value: sport.id, label: sport.name })),
    ],
    [sports, t]
  )

  const programOptions = useMemo(
    () => [
      { value: '', label: t('admin.structureForms.fields.levelProgram.select') },
      ...programs.map((program) => ({ value: program.id, label: program.name })),
    ],
    [programs, t]
  )

  const levelOptions = useMemo(
    () => [
      { value: '', label: t('admin.structureForms.fields.teamLevel.select') },
      ...levels.map((level) => ({ value: level.id, label: level.name })),
    ],
    [levels, t]
  )

  const seasonOptions = useMemo(
    () => [
      { value: '', label: t('admin.structureForms.fields.teamSeason.select') },
      ...seasons.map((season) => ({ value: season.id, label: season.name })),
    ],
    [seasons, t]
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
    setEditInitialized(false)
  }, [editType, editId])

  useEffect(() => {
    if (editTypeParam && !editType) {
      setActionError(t('admin.structureForms.errors.invalidParams'))
      return
    }

    if (!editType && typeParam && !requestedFormType) {
      setActionError(t('admin.structureForms.errors.invalidParams'))
      return
    }

    if (editType && !editId) {
      setActionError(t('admin.structureForms.errors.invalidParams'))
      return
    }

    setActionError(null)
  }, [editType, editId, editTypeParam, typeParam, requestedFormType, t])

  useEffect(() => {
    if (!editType || !editId || loading || editInitialized) return

    setActionError(null)
    setSuccessMessage(null)

    const setNotFound = () => {
      setActionError(t('admin.structureForms.errors.notFound', { item: t(`admin.structureForms.items.${editType}`) }))
    }

    if (editType === 'sport') {
      const sport = sports.find((s) => s.id === editId)
      if (!sport) {
        setNotFound()
      } else {
        setSportForm((prev) => ({
          ...prev,
          name: sport.name,
        }))
      }
    }

    if (editType === 'program') {
      const program = programs.find((p) => p.id === editId)
      if (!program) {
        setNotFound()
      } else {
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
      if (!level) {
        setNotFound()
      } else {
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
      if (!team) {
        setNotFound()
      } else {
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
      if (!season) {
        setNotFound()
      } else {
        setSeasonForm((prev) => ({
          ...prev,
          name: season.name,
          startDate: season.start_date,
          endDate: season.end_date,
          isActive: season.is_active ?? false,
        }))
      }
    }

    setEditInitialized(true)
  }, [editType, editId, loading, editInitialized, sports, programs, levels, teams, seasons, t])

  // Pre-populate forms from context query params when creating (not editing)
  useEffect(() => {
    // Only pre-populate when creating, not editing, and after data is loaded
    if (editType || loading || !activeFormType) return

    // Pre-populate program form with sport_id
    if (activeFormType === 'program' && contextSportId && !programForm.sportId) {
      // Verify sport exists
      const sportExists = sports.some(s => s.id === contextSportId)
      if (sportExists) {
        setProgramForm((prev) => ({ ...prev, sportId: contextSportId }))
      }
    }

    // Pre-populate level form with program_id
    if (activeFormType === 'level' && contextProgramId && !levelForm.programId) {
      // Verify program exists
      const programExists = programs.some(p => p.id === contextProgramId)
      if (programExists) {
        setLevelForm((prev) => ({ ...prev, programId: contextProgramId }))
      }
    }

    // Pre-populate team form with level_id
    if (activeFormType === 'team' && contextLevelId && !teamForm.levelId) {
      // Verify level exists
      const levelExists = levels.some(l => l.id === contextLevelId)
      if (levelExists) {
        setTeamForm((prev) => ({ ...prev, levelId: contextLevelId }))
      }
    }
  }, [activeFormType, editType, loading, contextSportId, contextProgramId, contextLevelId, sports, programs, levels, programForm.sportId, levelForm.programId, teamForm.levelId])

  // Get available system sports (exclude ones already linked to this org)
  const availableSystemSports = useMemo(() => {
    const existingSportIds = new Set(sports.map(s => s.id))
    return systemSports.filter(sport => !existingSportIds.has(sport.id))
  }, [sports, systemSports])

  const sportNameError = touched['sport.name'] && !sportForm.name.trim()
    ? t('admin.structureForms.validation.sportNameRequired')
    : undefined

  const canCreateSport = !!sportForm.name.trim() && availableSystemSports.length > 0

  const programSportError = touched['program.sport'] && !programForm.sportId
    ? t('admin.structureForms.validation.programSportRequired')
    : undefined

  const programGenderError = touched['program.gender'] && !programForm.gender
    ? t('admin.structureForms.validation.programGenderRequired')
    : undefined

  const programNameError = touched['program.name'] && !programForm.name.trim()
    ? t('admin.structureForms.validation.programNameRequired')
    : undefined

  const levelProgramError = touched['level.program'] && !levelForm.programId
    ? t('admin.structureForms.validation.levelProgramRequired')
    : undefined

  const levelNameError = touched['level.name'] && !levelForm.name.trim()
    ? t('admin.structureForms.validation.levelNameRequired')
    : undefined

  const levelTypeError = touched['level.type'] && !levelForm.type
    ? t('admin.structureForms.validation.levelTypeRequired')
    : undefined

  const levelAgeMinError = touched['level.ageMin'] && !levelForm.ageMin
    ? t('admin.structureForms.validation.levelAgeMinRequired')
    : undefined

  const levelAgeMaxError = touched['level.ageMax'] && !levelForm.ageMax
    ? t('admin.structureForms.validation.levelAgeMaxRequired')
    : undefined

  const levelGradeMinError = touched['level.gradeMin'] && !levelForm.gradeMin
    ? t('admin.structureForms.validation.levelGradeMinRequired')
    : undefined

  const levelGradeMaxError = touched['level.gradeMax'] && !levelForm.gradeMax
    ? t('admin.structureForms.validation.levelGradeMaxRequired')
    : undefined

  const levelSkillError = touched['level.skillDescription'] && !levelForm.skillDescription.trim()
    ? t('admin.structureForms.validation.levelSkillRequired')
    : undefined

  const teamLevelError = touched['team.level'] && !teamForm.levelId
    ? t('admin.structureForms.validation.teamLevelRequired')
    : undefined

  const teamSeasonError = touched['team.season'] && !teamForm.seasonId
    ? t('admin.structureForms.validation.teamSeasonRequired')
    : undefined

  const teamNameError = touched['team.name'] && !teamForm.name.trim()
    ? t('admin.structureForms.validation.teamNameRequired')
    : undefined

  const seasonNameError = touched['season.name'] && !seasonForm.name.trim()
    ? t('admin.structureForms.validation.seasonNameRequired')
    : undefined

  const seasonStartError = touched['season.startDate'] && !seasonForm.startDate
    ? t('admin.structureForms.validation.seasonStartRequired')
    : undefined

  const seasonEndError = touched['season.endDate'] && !seasonForm.endDate
    ? t('admin.structureForms.validation.seasonEndRequired')
    : undefined

  const seasonRangeError = touched['season.endDate'] && seasonForm.startDate && seasonForm.endDate && seasonForm.endDate < seasonForm.startDate
    ? t('admin.structureForms.validation.seasonRangeInvalid')
    : undefined

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

  const formLabels: Record<FormType, string> = {
    sport: t('admin.structureForms.items.sport'),
    program: t('admin.structureForms.items.program'),
    level: t('admin.structureForms.items.level'),
    team: t('admin.structureForms.items.team'),
    season: t('admin.structureForms.items.season'),
  }

  const activeFormLabel = activeFormType ? formLabels[activeFormType] : t('admin.structureForms.breadcrumbs.structure')
  const pageTitle = activeFormType
    ? t(editType ? 'admin.structureForms.pageTitle.edit' : 'admin.structureForms.pageTitle.add', { item: activeFormLabel })
    : t('admin.structureForms.pageTitle.default')
  const pageSubtitle = activeFormType
    ? t('admin.structureForms.pageSubtitle.add')
    : t('admin.structureForms.pageSubtitle.select')

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
  }

  return (
    <div className="pa-root">
      <OfflineBanner />
      <AdminPageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        breadcrumbs={[
          { label: t('admin.structureForms.breadcrumbs.organizations'), path: '/admin/organization/structure' },
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
        <div className="pa-form-container">
          <Card title={t('admin.structureForms.selector.title')} className="pa-mb-6">
            <div className="pa-flex pa-flex-col pa-gap-3">
              <Link to="/admin/organization/structure/forms?type=sport">
                <Button>{t('admin.structureForms.actions.addItem', { item: formLabels.sport })}</Button>
              </Link>
              <Link to="/admin/organization/structure/forms?type=program">
                <Button variant="secondary">{t('admin.structureForms.actions.addItem', { item: formLabels.program })}</Button>
              </Link>
              <Link to="/admin/organization/structure/forms?type=level">
                <Button variant="secondary">{t('admin.structureForms.actions.addItem', { item: formLabels.level })}</Button>
              </Link>
              <Link to="/admin/organization/structure/forms?type=team">
                <Button variant="secondary">{t('admin.structureForms.actions.addItem', { item: formLabels.team })}</Button>
              </Link>
              <Link to="/admin/organization/structure/forms?type=season">
                <Button variant="secondary">{t('admin.structureForms.actions.addItem', { item: formLabels.season })}</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}

      {activeFormType === 'sport' && (
      <div className="pa-form-container">
        <Card
          title={t(editType === 'sport' ? 'admin.structureForms.pageTitle.edit' : 'admin.structureForms.pageTitle.add', { item: formLabels.sport })}
          className="pa-mb-6"
        >
          <div className="pa-flex pa-flex-col pa-gap-4">
            {editType === 'sport' && editId ? (
              // Edit mode
              <div>
                <div className="pa-label pa-mb-2">{t('admin.structureForms.fields.sportName.label')}</div>
                <div className="pa-text-base">{sportForm.name}</div>
                <div className="pa-text-sm pa-text-muted pa-mt-1">
                  System sports cannot be modified. They are predefined for consistency across all organizations.
                </div>
              </div>
            ) : (
              // Create mode
              <>
                {availableSystemSports.length === 0 ? (
                  <div className="pa-text-muted">
                    All available sports have been added to your organization.
                  </div>
                ) : (
                  <div className="pa-grid pa-grid-2">
                    <Select
                      label={t('admin.structureForms.fields.sportName.label')}
                      value={sportForm.name}
                      onChange={(e) => setSportForm((prev) => ({ ...prev, name: e.target.value }))}
                      onBlur={() => markTouched('sport.name')}
                      options={[
                        { value: '', label: 'Select a sport...' },
                        ...availableSystemSports.map(sport => ({ value: sport.name, label: sport.name }))
                      ]}
                      required
                      error={sportNameError ? 'Please select a sport' : undefined}
                    />
                  </div>
                )}
              </>
            )}
            {editType !== 'sport' && (
              <Button
                disabled={!canCreateSport || submitting.sport}
                loading={submitting.sport}
                onClick={async () => {
                  if (!canCreateSport || !currentOrganization?.id) return
                  setSubmitting((prev) => ({ ...prev, sport: true }))
                  setActionError(null)
                  setSuccessMessage(null)

                  const result = await createSport({
                    org_id: currentOrganization.id,
                    name: sportForm.name.trim(),
                    color: '#137fec',
                  })
                  if (result.error) {
                    setActionError(result.error.message || t('admin.structureForms.errors.saveFailed', { item: formLabels.sport }))
                  } else if (result.data) {
                    setSports((prev) => [result.data as Sport, ...prev])
                    setSportForm((prev) => ({ ...prev, name: '' }))
                    setSuccessMessage(t('admin.structureForms.messages.created', { item: formLabels.sport }))
                  }

                  setSubmitting((prev) => ({ ...prev, sport: false }))
                }}
              >
                {t('admin.structureForms.actions.createItem', { item: formLabels.sport })}
              </Button>
            )}
          </div>
        </Card>
      </div>
      )}

      {activeFormType === 'program' && (
      <div className="pa-form-container">
        <Card
          title={t(editType === 'program' ? 'admin.structureForms.pageTitle.edit' : 'admin.structureForms.pageTitle.add', { item: formLabels.program })}
          className="pa-mb-6"
        >
          <div className="pa-flex pa-flex-col pa-gap-4">
            <div className="pa-grid pa-grid-2 pa-gap-4">
              <Select
                label={t('admin.structureForms.fields.programSport.label')}
                required
                value={programForm.sportId}
                onChange={(e) => setProgramForm((prev) => ({ ...prev, sportId: e.target.value }))}
                onBlur={() => markTouched('program.sport')}
                options={sportOptions}
                error={programSportError}
                disabled={editType === 'program'} // Cannot change sport once created usually
              />
              <Input
                label={t('admin.structureForms.fields.programName.label')}
                placeholder={t('admin.structureForms.fields.programName.placeholder')}
                value={programForm.name}
                onChange={(e) => setProgramForm((prev) => ({ ...prev, name: e.target.value, nameTouched: true }))}
                onBlur={() => markTouched('program.name')}
                helper={t('admin.structureForms.fields.programName.helper')}
                required
                error={programNameError}
              />
            </div>
            
            <RadioGroup
              name="program-gender"
              label={t('admin.structureForms.fields.programGender.label')}
              required
              value={programForm.gender}
              onChange={(value) => setProgramForm((prev) => ({ ...prev, gender: value as GenderCategory }))}
              options={[
                { value: 'boys', label: t('admin.structureForms.options.gender.boys') },
                { value: 'girls', label: t('admin.structureForms.options.gender.girls') },
                { value: 'coed', label: t('admin.structureForms.options.gender.coed') },
              ]}
              error={programGenderError}
            />
            
            <div className="pa-flex pa-justify-end">
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
                      setActionError(t('admin.structureForms.errors.saveFailed', { item: formLabels.program }))
                    } else if (result.data) {
                      setPrograms((prev) => prev.map((p) => (p.id === editId ? (result.data as Program) : p)))
                      setSuccessMessage(t('admin.structureForms.messages.updated', { item: formLabels.program }))
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
                      setActionError(t('admin.structureForms.errors.saveFailed', { item: formLabels.program }))
                    } else if (result.data) {
                      setPrograms((prev) => [result.data as Program, ...prev])
                      setProgramForm((prev) => ({
                        ...prev,
                        name: '',
                        sportId: '',
                        gender: 'coed',
                        nameTouched: false,
                      }))
                      setSuccessMessage(t('admin.structureForms.messages.created', { item: formLabels.program }))
                    }
                  }

                  setSubmitting((prev) => ({ ...prev, program: false }))
                }}
              >
                {t(editType === 'program' ? 'admin.structureForms.actions.updateItem' : 'admin.structureForms.actions.createItem', { item: formLabels.program })}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      )}

      {activeFormType === 'level' && (
      <div className="pa-form-container">
        <Card
          title={t(editType === 'level' ? 'admin.structureForms.pageTitle.edit' : 'admin.structureForms.pageTitle.add', { item: formLabels.level })}
          className="pa-mb-6"
        >
          <div className="pa-flex pa-flex-col pa-gap-4">
            <div className="pa-grid pa-grid-2 pa-gap-4">
              <Select
                label={t('admin.structureForms.fields.levelProgram.label')}
                required
                value={levelForm.programId}
                onChange={(e) => setLevelForm((prev) => ({ ...prev, programId: e.target.value }))}
                onBlur={() => markTouched('level.program')}
                options={programOptions}
                error={levelProgramError}
              />
              <Input
                label={t('admin.structureForms.fields.levelName.label')}
                placeholder={t('admin.structureForms.fields.levelName.placeholder')}
                value={levelForm.name}
                onChange={(e) => setLevelForm((prev) => ({ ...prev, name: e.target.value }))}
                onBlur={() => markTouched('level.name')}
                required
                error={levelNameError}
              />
            </div>
            
            <RadioGroup
              name="level-type"
              label={t('admin.structureForms.fields.levelType.label')}
              required
              value={levelForm.type}
              onChange={(value) => setLevelForm((prev) => ({ ...prev, type: value as LevelType }))}
              options={[
                { value: 'age_based', label: t('admin.structureForms.options.levelType.ageBased') },
                { value: 'grade_based', label: t('admin.structureForms.options.levelType.gradeBased') },
                { value: 'skill_based', label: t('admin.structureForms.options.levelType.skillBased') },
              ]}
              error={levelTypeError}
            />

            {levelForm.type === 'age_based' && (
              <div className="pa-grid pa-grid-2 pa-gap-4">
                <Input
                  label={t('admin.structureForms.fields.levelAgeMin.label')}
                  type="number"
                  value={levelForm.ageMin}
                  onChange={(e) => setLevelForm((prev) => ({ ...prev, ageMin: e.target.value }))}
                  onBlur={() => markTouched('level.ageMin')}
                  required
                  error={levelAgeMinError}
                />
                <Input
                  label={t('admin.structureForms.fields.levelAgeMax.label')}
                  type="number"
                  value={levelForm.ageMax}
                  onChange={(e) => setLevelForm((prev) => ({ ...prev, ageMax: e.target.value }))}
                  onBlur={() => markTouched('level.ageMax')}
                  required
                  error={levelAgeMaxError}
                />
              </div>
            )}

            {levelForm.type === 'grade_based' && (
              <div className="pa-grid pa-grid-2 pa-gap-4">
                <Input
                  label={t('admin.structureForms.fields.levelGradeMin.label')}
                  type="number"
                  value={levelForm.gradeMin}
                  onChange={(e) => setLevelForm((prev) => ({ ...prev, gradeMin: e.target.value }))}
                  onBlur={() => markTouched('level.gradeMin')}
                  required
                  error={levelGradeMinError}
                />
                <Input
                  label={t('admin.structureForms.fields.levelGradeMax.label')}
                  type="number"
                  value={levelForm.gradeMax}
                  onChange={(e) => setLevelForm((prev) => ({ ...prev, gradeMax: e.target.value }))}
                  onBlur={() => markTouched('level.gradeMax')}
                  required
                  error={levelGradeMaxError}
                />
              </div>
            )}

            {levelForm.type === 'skill_based' && (
              <Input
                label={t('admin.structureForms.fields.levelSkillDescription.label')}
                placeholder={t('admin.structureForms.fields.levelSkillDescription.placeholder')}
                value={levelForm.skillDescription}
                onChange={(e) => setLevelForm((prev) => ({ ...prev, skillDescription: e.target.value }))}
                onBlur={() => markTouched('level.skillDescription')}
                required
                error={levelSkillError}
              />
            )}
            
            <div className="pa-flex pa-justify-end">
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
                      setActionError(t('admin.structureForms.errors.saveFailed', { item: formLabels.level }))
                    } else if (result.data) {
                      setLevels((prev) => prev.map((l) => (l.id === editId ? (result.data as Level) : l)))
                      setSuccessMessage(t('admin.structureForms.messages.updated', { item: formLabels.level }))
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
                      setActionError(t('admin.structureForms.errors.saveFailed', { item: formLabels.level }))
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
                      setSuccessMessage(t('admin.structureForms.messages.created', { item: formLabels.level }))
                    }
                  }

                  setSubmitting((prev) => ({ ...prev, level: false }))
                }}
              >
                {t(editType === 'level' ? 'admin.structureForms.actions.updateItem' : 'admin.structureForms.actions.createItem', { item: formLabels.level })}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      )}

      {activeFormType === 'team' && (
      <div className="pa-form-container">
        <Card
          title={t(editType === 'team' ? 'admin.structureForms.pageTitle.edit' : 'admin.structureForms.pageTitle.add', { item: formLabels.team })}
          className="pa-mb-6"
        >
          <div className="pa-flex pa-flex-col pa-gap-4">
            <div className="pa-grid pa-grid-2 pa-gap-4">
              <Select
                label={t('admin.structureForms.fields.teamLevel.label')}
                required
                value={teamForm.levelId}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, levelId: e.target.value }))}
                onBlur={() => markTouched('team.level')}
                options={levelOptions}
                error={teamLevelError}
              />
              {!isEditingTeam && (
                <Select
                  label={t('admin.structureForms.fields.teamSeason.label')}
                  required
                  value={teamForm.seasonId}
                  onChange={(e) => setTeamForm((prev) => ({ ...prev, seasonId: e.target.value }))}
                  onBlur={() => markTouched('team.season')}
                  options={seasonOptions}
                  error={teamSeasonError}
                />
              )}
            </div>
            
            <Input
              label={t('admin.structureForms.fields.teamName.label')}
              placeholder={t('admin.structureForms.fields.teamName.placeholder')}
              value={teamForm.name}
              onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
              onBlur={() => markTouched('team.name')}
              required
              error={teamNameError}
            />
            <Checkbox
              checked={teamForm.isActive}
              onChange={(e) => setTeamForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              label={t('admin.structureForms.fields.teamActive.label')}
            />
            
            <div className="pa-flex pa-justify-end">
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
                      setActionError(t('admin.structureForms.errors.saveFailed', { item: formLabels.team }))
                    } else if (result.data) {
                      setTeams((prev) => prev.map((t) => (t.id === editId ? (result.data as Team) : t)))
                      setSuccessMessage(t('admin.structureForms.messages.updated', { item: formLabels.team }))
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
                      setActionError(t('admin.structureForms.errors.saveFailed', { item: formLabels.team }))
                    } else if (result.data) {
                      setTeams((prev) => [result.data as Team, ...prev])
                      setTeamForm((prev) => ({
                        ...prev,
                        levelId: '',
                        seasonId: '',
                        name: '',
                        isActive: true,
                      }))
                      setSuccessMessage(t('admin.structureForms.messages.created', { item: formLabels.team }))
                    }
                  }

                  setSubmitting((prev) => ({ ...prev, team: false }))
                }}
              >
                {t(editType === 'team' ? 'admin.structureForms.actions.updateItem' : 'admin.structureForms.actions.createItem', { item: formLabels.team })}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      )}

      {activeFormType === 'season' && (
      <div className="pa-form-container">
        <Card
          title={t(editType === 'season' ? 'admin.structureForms.pageTitle.edit' : 'admin.structureForms.pageTitle.add', { item: formLabels.season })}
          className="pa-mb-6"
        >
          <div className="pa-flex pa-flex-col pa-gap-4">
            <Input
              label={t('admin.structureForms.fields.seasonName.label')}
              placeholder={t('admin.structureForms.fields.seasonName.placeholder')}
              value={seasonForm.name}
              onChange={(e) => setSeasonForm((prev) => ({ ...prev, name: e.target.value }))}
              onBlur={() => markTouched('season.name')}
              required
              error={seasonNameError}
            />
            
            <div className="pa-grid pa-grid-2 pa-gap-4">
              <Input
                label={t('admin.structureForms.fields.seasonStart.label')}
                type="date"
                value={seasonForm.startDate}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, startDate: e.target.value }))}
                onBlur={() => markTouched('season.startDate')}
                required
                error={seasonStartError}
              />
              <Input
                label={t('admin.structureForms.fields.seasonEnd.label')}
                type="date"
                value={seasonForm.endDate}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, endDate: e.target.value }))}
                onBlur={() => markTouched('season.endDate')}
                required
                error={seasonEndError || seasonRangeError}
              />
            </div>
            
            <Checkbox
              checked={seasonForm.isActive}
              onChange={(e) => setSeasonForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              label={t('admin.structureForms.fields.seasonActive.label')}
            />
            
            <div className="pa-flex pa-justify-end">
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
                      setActionError(t('admin.structureForms.errors.saveFailed', { item: formLabels.season }))
                    } else if (result.data) {
                      setSeasons((prev) => prev.map((s) => (s.id === editId ? (result.data as Season) : s)))
                      setSuccessMessage(t('admin.structureForms.messages.updated', { item: formLabels.season }))
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
                      setActionError(t('admin.structureForms.errors.saveFailed', { item: formLabels.season }))
                    } else if (result.data) {
                      setSeasons((prev) => [result.data as Season, ...prev])
                      setSeasonForm((prev) => ({
                        ...prev,
                        name: '',
                        startDate: '',
                        endDate: '',
                        isActive: false,
                      }))
                      setSuccessMessage(t('admin.structureForms.messages.created', { item: formLabels.season }))
                    }
                  }

                  setSubmitting((prev) => ({ ...prev, season: false }))
                }}
              >
                {t(editType === 'season' ? 'admin.structureForms.actions.updateItem' : 'admin.structureForms.actions.createItem', { item: formLabels.season })}
              </Button>
            </div>
          </div>
        </Card>
      </div>
      )}

      {(!currentOrganization || (!activeFormType && !loading)) && !activeFormType && currentOrganization && (
        <Card>
           {/* This is a fallback block just in case, but normally the logic above covers it. 
               The original code had a strange condition block at the end. 
               I'll simplify the original missing org check below.
           */}
        </Card>
      )}
      {!currentOrganization && (
        <Card>
          <div className="pa-text-muted">{t('admin.structureForms.empty.missingOrganization')}</div>
        </Card>
      )}
    </div>
  )
}
