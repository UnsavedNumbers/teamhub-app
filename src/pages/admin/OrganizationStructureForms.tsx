import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getSports, getSystemSports, getPrograms, createSport, createProgram, updateProgram, uploadSportIcon } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { createLevel, updateLevel } from '../../data/services/levelsService'
import { getTeams, createTeam, updateTeam } from '../../data/services/teamsService'
import { getSeasons, createSeason, updateSeason } from '../../data/services/seasonsService'
import type { Sport, Program, Level, Team, Season, GenderCategory, LevelType } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, Input, Select, DatePicker, Checkbox } from '../../components/platformAdmin'
import { FileUpload } from '../../components/common/FileUpload'
import OfflineBanner from '../../components/admin/OfflineBanner'
import HierarchyCreationPrompt from '../../components/admin/HierarchyCreationPrompt'
import { CreateSeasonModal } from '../../components/admin/CreateSeasonModal'
import { getNextLevel, getParentContextKey, getListPageRoute, getEntityLabelKey, type FormType, type PromptState, isValidPromptState, validateEntityExists } from '../../utils/hierarchyCreation'
import { savePromptState, loadPromptState, clearPromptState } from '../../utils/sessionStorageHelpers'
import { getLink } from '../../utils/routes'

interface RadioOption {
  value: string
  label: string
  helper?: string
}

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
  const navigate = useNavigate()
  const { isOffline } = useOffline()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [promptState, setPromptState] = useState<PromptState | null>(null)
  const hasRestoredPrompt = useRef(false)
  const isNavigatingRef = useRef(false)
  const isMountedRef = useRef(true)
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
  const [showCreateSeasonModal, setShowCreateSeasonModal] = useState(false)
  const [refreshingSeasons, setRefreshingSeasons] = useState(false)

  const [sportForm, setSportForm] = useState({
    name: '',
    iconFile: null as File | null,
  })
  const [uploadingIcon, setUploadingIcon] = useState(false)

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
  // Bug Prevention #5: Use URLSearchParams API to handle encoding
  const returnUrl = searchParams.get('returnUrl')
  const requestedFormType = isFormType(typeParam) ? typeParam : null
  const activeFormType = editType ?? requestedFormType
  const [editInitialized, setEditInitialized] = useState(false)

  // Context from query params for pre-populating forms (declared early for useCallback)
  const contextSportId = searchParams.get('sport_id')?.trim() || null
  const contextProgramId = searchParams.get('program_id')?.trim() || null
  const contextLevelId = searchParams.get('level_id')?.trim() || null

  // Determine where to navigate back to on cancel
  const handleCancel = useCallback(() => {
    // If returnUrl is provided and valid, use it
    if (returnUrl && returnUrl.startsWith('/')) {
      navigate(returnUrl, { replace: true })
      return
    }
    
    // If editing, try to infer where they came from based on edit type
    if (editType) {
      switch (editType) {
        case 'program':
          // Programs are typically edited from Programs page
          navigate(getLink('admin.programs.list'), { replace: true })
          return
        case 'level':
          // Levels are typically edited from Levels page
          navigate(getLink('admin.levels.list'), { replace: true })
          return
        case 'team':
          // Teams are typically edited from Teams page
          navigate(getLink('admin.teams.list'), { replace: true })
          return
        case 'season':
          // Seasons are typically edited from Seasons page
          navigate(getLink('admin.seasons.list'), { replace: true })
          return
        case 'sport':
          // Sports are typically edited from Sports page
          navigate(getLink('admin.sports.list'), { replace: true })
          return
      }
    }
    
    // For create forms, try to infer from context or use browser history
    if (activeFormType) {
      // If we have context params, we likely came from a specific page
      if (contextProgramId) {
        // Likely came from Programs page
        navigate(getLink('admin.programs.list'), { replace: true })
        return
      }
      if (contextSportId) {
        // Likely came from Sports page
        navigate(getLink('admin.sports.list'), { replace: true })
        return
      }
      if (contextLevelId) {
        // Likely came from Levels page
        navigate(getLink('admin.levels.list'), { replace: true })
        return
      }
    }
    
    // Default: try browser history, fallback to structure overview
    if (window.history.length > 1) {
      navigate(-1) // navigate(-1) doesn't support replace option
    } else {
      navigate(getLink('admin.organization.structure'), { replace: true })
    }
  }, [returnUrl, editType, activeFormType, contextProgramId, contextSportId, contextLevelId, navigate])

  // Handle "Add Next" button in hierarchy creation prompt
  const handleAddNext = useCallback(() => {
    if (!promptState || !promptState.nextLevel || !isMountedRef.current || isNavigatingRef.current) return

    // Build navigation URL with parent context
    const parentContextKey = getParentContextKey(promptState.nextLevel)
    const parentId = promptState.entityId
    
    // Build query params
    const params = new URLSearchParams()
    params.set('type', promptState.nextLevel)
    if (parentContextKey && parentId) {
      params.set(parentContextKey, parentId)
    }
    
    // Set returnUrl to the list page for the entity being created (not current page)
    const listPageRoute = getListPageRoute(promptState.entityType)
    // Validate returnUrl is not a forms page URL before using
    if (listPageRoute && !listPageRoute.includes('/forms')) {
      params.set('returnUrl', listPageRoute)
    }

    // Clear all success state before navigation
    setPromptState(null)
    clearPromptState()
    setSuccessMessage(null)
    
    // Set navigation lock
    isNavigatingRef.current = true

    // Navigate to next form
    navigate(`${getLink('admin.organization.forms')}?${params.toString()}`, { replace: true })
    
    // Clear navigation lock after a short delay (navigation is async)
    setTimeout(() => {
      isNavigatingRef.current = false
    }, 100)
  }, [promptState, navigate])

  // Handle "Dismiss" button in hierarchy creation prompt
  const handleDismissPrompt = useCallback(() => {
    if (!promptState || !isMountedRef.current || isNavigatingRef.current) return
    
    // Get the list page route for the created entity type
    const listPageRoute = getListPageRoute(promptState.entityType)
    const itemLabel = t(getEntityLabelKey(promptState.entityType) as any) || promptState.entityName
    
    // Clear all success state before navigation
    setPromptState(null)
    clearPromptState()
    setSuccessMessage(null)
    
    // Set navigation lock
    isNavigatingRef.current = true
    
    // Navigate to parent list page with success message in state
    navigate(listPageRoute, {
      replace: true,
      state: {
        successMessage: t('admin.structureForms.messages.created', { item: itemLabel })
      }
    })
    
    // Clear navigation lock after a short delay (navigation is async)
    setTimeout(() => {
      isNavigatingRef.current = false
    }, 100)
  }, [promptState, navigate, t])

  useEffect(() => {
    if (!isReady) return
    if (!context.orgId) {
      setLoadError(t('admin.structureForms.errors.loadFailed'))
      setLoading(false)
      return
    }

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

        // Check before each state update to prevent memory leaks
        if (!isActive) return
        setSports(Array.isArray(sportsResult.data) ? sportsResult.data : [])
        if (!isActive) return
        setSystemSports(Array.isArray(systemSportsResult.data) ? systemSportsResult.data : [])
        if (!isActive) return
        setPrograms(Array.isArray(programsResult.data) ? programsResult.data : [])
        if (!isActive) return
        setLevels(Array.isArray(levelsResult.data) ? levelsResult.data : [])
        if (!isActive) return
        setTeams(Array.isArray(teamsResult.data) ? teamsResult.data : [])
        if (!isActive) return
        setSeasons(Array.isArray(seasonsResult.data) ? seasonsResult.data : [])
      } catch (err) {
        if (!isActive) return
        console.error('[OrganizationStructureForms] Error loading data:', err)
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

  // Restore prompt from sessionStorage after data is loaded
  useEffect(() => {
    // Only restore once, and only when data is loaded
    if (hasRestoredPrompt.current || loading || !isReady) {
      return
    }

    const stored = loadPromptState()
    if (!stored) {
      hasRestoredPrompt.current = true
      return
    }

    // Validate stored prompt state
    if (!isValidPromptState(stored)) {
      console.warn('[OrganizationStructureForms] Invalid prompt state in sessionStorage, clearing')
      clearPromptState()
      hasRestoredPrompt.current = true
      return
    }

    // Validate entity still exists
    const entityExists = validateEntityExists(stored.entityType, stored.entityId, {
      sports,
      programs,
      levels,
      teams,
      seasons,
    })

    if (!entityExists) {
      console.warn('[OrganizationStructureForms] Entity from prompt no longer exists, clearing')
      clearPromptState()
      hasRestoredPrompt.current = true
      return
    }

    // Restore prompt state
    setPromptState(stored)
    hasRestoredPrompt.current = true
  }, [loading, isReady, sports, programs, levels, teams, seasons])

  // Clear prompt state when navigating away from forms page or when form type changes
  useEffect(() => {
    // If we're not on the forms page, clear the prompt
    if (!location.pathname.includes('/organization/structure/forms')) {
      if (promptState) {
        setPromptState(null)
        clearPromptState()
      }
      if (successMessage) {
        setSuccessMessage(null)
      }
      return
    }

    // If we're on the forms page, check if the prompt is for a different form type
    // If the active form type doesn't match the prompt's next level, clear it
    if (promptState && activeFormType && promptState.nextLevel !== activeFormType) {
      // User navigated to a different form type, clear the old prompt
      setPromptState(null)
      clearPromptState()
      setSuccessMessage(null)
      return
    }

    // If we're on the forms page, re-validate prompt state
    if (!promptState || loading) {
      return
    }

    // Re-validate entity exists
    const entityExists = validateEntityExists(promptState.entityType, promptState.entityId, {
      sports,
      programs,
      levels,
      teams,
      seasons,
    })

    if (!entityExists) {
      // Entity no longer exists, clear prompt
      setPromptState(null)
      clearPromptState()
    }
  }, [location.pathname, promptState, loading, sports, programs, levels, teams, seasons, successMessage, activeFormType])

  // Cleanup: clear prompt on unmount if it was dismissed
  useEffect(() => {
    return () => {
      // Only clear if prompt was explicitly dismissed (not if component unmounts during navigation)
      // The prompt will be restored on remount if it still exists in sessionStorage
    }
  }, [])

  const sportOptions = useMemo(() => {
    // Deduplicate by sport ID as a safety measure
    const uniqueSports = Array.from(
      new Map(sports.map((sport) => [sport.id, sport])).values()
    )
    return [
      { value: '', label: t('admin.structureForms.fields.programSport.select') },
      ...uniqueSports.map((sport) => ({ value: sport.id, label: sport.name })),
    ]
  }, [sports, t])

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

  // Clear success state on route/location changes (user navigates away from forms page)
  useEffect(() => {
    // Only clear if we're actually leaving the forms page
    if (location.pathname !== getLink('admin.organization.forms')) {
      if (isMountedRef.current) {
        setSuccessMessage(null)
        setPromptState(null)
        clearPromptState()
      }
    }
  }, [location.pathname])

  // Clear success state when form type changes (user switches between forms)
  useEffect(() => {
    if (isMountedRef.current) {
      setSuccessMessage(null)
      // Clear prompt state when entering edit mode (prompts are only for newly created entities)
      if (editType) {
        setPromptState(null)
        clearPromptState()
      }
    }
  }, [editType, activeFormType])

  // Reset refs on mount and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    isNavigatingRef.current = false
    return () => {
      isMountedRef.current = false
    }
  }, [])

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
    const filteredSports = systemSports.filter(sport => !existingSportIds.has(sport.id))
    
    // Deduplicate by name (keep only system sports)
    const seenNames = new Set<string>()
    return filteredSports.filter(sport => {
      if (seenNames.has(sport.name)) {
        return false
      }
      seenNames.add(sport.name)
      return true
    })
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
    return (
      <div className="pa-root">
        <OfflineBanner />
        <AdminPageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          breadcrumbs={[
            { label: t('admin.structureForms.breadcrumbs.organizations'), path: getLink('admin.organization.structure') },
            { label: activeFormLabel },
          ]}
        />
        <div className="pa-skeleton" style={{ height: '500px' }} />
      </div>
    )
  }

  // Validate context query params exist in loaded data
  if (activeFormType === 'program' && contextSportId) {
    const sportExists = sports.some(s => s.id === contextSportId)
    if (!sportExists) {
      return (
        <div className="pa-root">
          <OfflineBanner />
          <AdminPageHeader
            title={pageTitle}
            subtitle={pageSubtitle}
            breadcrumbs={[
              { label: t('admin.structureForms.breadcrumbs.organizations'), path: getLink('admin.organization.structure') },
              { label: activeFormLabel },
            ]}
          />
          <Card className="pa-mb-6">
            <div className="pa-text-muted pa-mb-4">
              {t('admin.structureForms.empty.noSportsForProgram')}
            </div>
            <Link to={`${getLink('admin.organization.forms')}?type=sport`}>
              <Button>{t('admin.structureForms.empty.createSportFirst')}</Button>
            </Link>
          </Card>
        </div>
      )
    }
  }

  if (activeFormType === 'level' && contextProgramId) {
    const programExists = programs.some(p => p.id === contextProgramId)
    if (!programExists) {
      return (
        <div className="pa-root">
          <OfflineBanner />
          <AdminPageHeader
            title={pageTitle}
            subtitle={pageSubtitle}
            breadcrumbs={[
              { label: t('admin.structureForms.breadcrumbs.organizations'), path: getLink('admin.organization.structure') },
              { label: activeFormLabel },
            ]}
          />
          <Card className="pa-mb-6">
            <div className="pa-text-muted pa-mb-4">
              {t('admin.structureForms.empty.noProgramsForLevel')}
            </div>
            <Link to={`${getLink('admin.organization.forms')}?type=program`}>
              <Button>{t('admin.structureForms.empty.createProgramFirst')}</Button>
            </Link>
          </Card>
        </div>
      )
    }
  }

  if (activeFormType === 'team' && contextLevelId) {
    const levelExists = levels.some(l => l.id === contextLevelId)
    if (!levelExists) {
      return (
        <div className="pa-root">
          <OfflineBanner />
          <AdminPageHeader
            title={pageTitle}
            subtitle={pageSubtitle}
            breadcrumbs={[
              { label: t('admin.structureForms.breadcrumbs.organizations'), path: getLink('admin.organization.structure') },
              { label: activeFormLabel },
            ]}
          />
          <Card className="pa-mb-6">
            <div className="pa-text-muted pa-mb-4">
              {t('admin.structureForms.empty.noLevelsForTeam')}
            </div>
            <Link to={`${getLink('admin.organization.forms')}?type=level`}>
              <Button>{t('admin.structureForms.empty.createLevelFirst')}</Button>
            </Link>
          </Card>
        </div>
      )
    }
  }

  // Check prerequisites only when creating new (not editing)
  if (!editType && activeFormType === 'program' && sports.length === 0) {
    return (
      <div className="pa-root">
        <OfflineBanner />
        <AdminPageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          breadcrumbs={[
            { label: t('admin.structureForms.breadcrumbs.organizations'), path: getLink('admin.organization.structure') },
            { label: activeFormLabel },
          ]}
        />
        <Card className="pa-mb-6">
          <div className="pa-text-muted pa-mb-4">
            {t('admin.structureForms.empty.noSportsForProgram')}
          </div>
          <Link to={`${getLink('admin.organization.forms')}?type=sport`}>
            <Button>{t('admin.structureForms.empty.createSportFirst')}</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (!editType && activeFormType === 'level' && programs.length === 0) {
    return (
      <div className="pa-root">
        <OfflineBanner />
        <AdminPageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          breadcrumbs={[
            { label: t('admin.structureForms.breadcrumbs.organizations'), path: getLink('admin.organization.structure') },
            { label: activeFormLabel },
          ]}
        />
        <Card className="pa-mb-6">
          <div className="pa-text-muted pa-mb-4">
            {t('admin.structureForms.empty.noProgramsForLevel')}
          </div>
          <Link to={`${getLink('admin.organization.forms')}?type=program`}>
            <Button>{t('admin.structureForms.empty.createProgramFirst')}</Button>
          </Link>
        </Card>
      </div>
    )
  }

  if (!editType && activeFormType === 'team' && levels.length === 0) {
    return (
      <div className="pa-root">
        <OfflineBanner />
        <AdminPageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          breadcrumbs={[
            { label: t('admin.structureForms.breadcrumbs.organizations'), path: getLink('admin.organization.structure') },
            { label: activeFormLabel },
          ]}
        />
        <Card className="pa-mb-6">
          <div className="pa-text-muted pa-mb-4">
            {t('admin.structureForms.empty.noLevelsForTeam')}
          </div>
          <Link to={`${getLink('admin.organization.forms')}?type=level`}>
            <Button>{t('admin.structureForms.empty.createLevelFirst')}</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <OfflineBanner />
      <AdminPageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        breadcrumbs={[
          { label: t('admin.structureForms.breadcrumbs.organizations'), path: getLink('admin.organization.structure') },
          { label: activeFormLabel },
        ]}
      />

      {/* Show prompt if available - success messages never shown on forms page, only on list pages via navigation state */}
      {!loading && promptState && promptState.nextLevel ? (
        <HierarchyCreationPrompt
          createdEntityType={promptState.entityType}
          createdEntityId={promptState.entityId}
          createdEntityName={promptState.entityName}
          onAddNext={handleAddNext}
          onDismiss={handleDismissPrompt}
        />
      ) : null}

      {actionError && (
        <Card className="mb-4" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
          <div className="pa-body-m pa-text-danger" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
            {actionError}
          </div>
        </Card>
      )}

      {loadError && (
        <Card className="mb-4" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
          <div className="pa-body-m pa-text-danger" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
            {loadError}
          </div>
        </Card>
      )}

      {!activeFormType && (
        <div className="pa-form-container">
          <Card title={t('admin.structureForms.selector.title')} className="pa-mb-6">
            <div className="pa-flex pa-flex-col pa-gap-3">
              <Link to={`${getLink('admin.organization.forms')}?type=sport`}>
                <Button>{t('admin.structureForms.actions.addItem', { item: formLabels.sport })}</Button>
              </Link>
              <Link to={`${getLink('admin.organization.forms')}?type=program`}>
                <Button variant="primary">{t('admin.structureForms.actions.addItem', { item: formLabels.program })}</Button>
              </Link>
              <Link to={`${getLink('admin.organization.forms')}?type=level`}>
                <Button variant="primary">{t('admin.structureForms.actions.addItem', { item: formLabels.level })}</Button>
              </Link>
              <Link to={`${getLink('admin.organization.forms')}?type=team`}>
                <Button variant="primary">{t('admin.structureForms.actions.addItem', { item: formLabels.team })}</Button>
              </Link>
              <Link to={`${getLink('admin.organization.forms')}?type=season`}>
                <Button variant="primary">{t('admin.structureForms.actions.addItem', { item: formLabels.season })}</Button>
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
                    <p className="pa-mb-2">All available sports have been added to your organization.</p>
                    {systemSports.length === 0 && (
                      <p className="pa-text-sm pa-text-muted">
                        No system sports are available. Please contact support if you need additional sports.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="pa-grid pa-grid-2">
                    <Select
                      label={t('admin.structureForms.fields.sportName.label')}
                      value={sportForm.name}
                      onChange={(e) => {
                        setSportForm((prev) => ({ ...prev, name: e.target.value }))
                        setActionError(null) // Clear errors when user changes selection
                      }}
                      onBlur={() => markTouched('sport.name')}
                      options={[
                        { value: '', label: 'Select a sport...' },
                        ...availableSystemSports.map(sport => ({ value: sport.name, label: sport.name }))
                      ]}
                      required
                      disabled={isOffline || USE_FAKE_DATA}
                      error={sportNameError ? 'Please select a sport' : undefined}
                    />
                  </div>
                )}
                {availableSystemSports.length > 0 && (
                  <div className="pa-form-group">
                    <FileUpload
                      label="Sport Icon (Optional)"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      maxSize={5 * 1024 * 1024}
                      helperText="Upload a custom icon for this sport. PNG, JPEG, WebP, or SVG. Max 5MB."
                      value={sportForm.iconFile}
                      onFileSelect={(file) => {
                        setSportForm((prev) => ({ ...prev, iconFile: file }))
                        setActionError(null)
                      }}
                      disabled={isOffline || USE_FAKE_DATA || submitting.sport}
                      buttonText="Choose file"
                      replaceText="Replace file"
                    />
                  </div>
                )}
                {USE_FAKE_DATA && (
                  <div className="pa-card pa-mt-4" style={{ background: 'var(--pa-info-bg)', border: '1px solid var(--pa-info)', padding: 'var(--pa-space-3)' }}>
                    <div className="pa-flex pa-items-center pa-gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-info)' }}>info</span>
                      <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
                        Demo mode: Sign in to add sports to your organization.
                      </span>
                    </div>
                  </div>
                )}
                {isOffline && (
                  <div className="pa-card pa-mt-4" style={{ background: 'var(--pa-warning-bg)', border: '1px solid var(--pa-warning)', padding: 'var(--pa-space-3)' }}>
                    <div className="pa-flex pa-items-center pa-gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--pa-warning)' }}>wifi_off</span>
                      <span className="pa-body-s" style={{ color: 'var(--pa-n900)' }}>
                        You are offline. Please reconnect to add sports.
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
            {editType !== 'sport' && (
              <div className="pa-flex pa-justify-end pa-gap-3">
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={submitting.sport || uploadingIcon}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!canCreateSport || submitting.sport || uploadingIcon || isOffline || USE_FAKE_DATA}
                  loading={submitting.sport || uploadingIcon}
                  onClick={async () => {
                  if (!canCreateSport || !currentOrganization?.id || submitting.sport) return

                  // Block if offline
                  if (isOffline) {
                    setActionError('You appear to be offline. Please reconnect and try again.')
                    return
                  }

                  // Block if in demo mode (already handled by disabled state, but add explicit check)
                  if (USE_FAKE_DATA) {
                    setActionError('This action is not available in demo mode. Please sign in to add sports to your organization.')
                    return
                  }

                  // Clear success state at the START (before setSubmitting)
                  setSuccessMessage(null)
                  setPromptState(null)
                  clearPromptState()
                  
                  setSubmitting((prev) => ({ ...prev, sport: true }))
                  setActionError(null)

                  try {
                    const result = await createSport({
                      org_id: currentOrganization.id,
                      name: sportForm.name.trim(),
                      color: '#137fec',
                    })
                    
                    if (result.error) {
                      setActionError(result.error.message || t('admin.structureForms.errors.saveFailed', { item: formLabels.sport }))
                    } else if (result.data) {
                      // Upload icon if provided
                      if (sportForm.iconFile && result.data.id) {
                        setUploadingIcon(true)
                        try {
                          const iconResult = await uploadSportIcon(context, result.data.id, sportForm.iconFile)
                          if (iconResult.error) {
                            console.error('[OrganizationStructureForms] Error uploading icon:', iconResult.error)
                            // Don't fail the whole operation - sport was created successfully
                            setActionError(`Sport added successfully, but icon upload failed: ${iconResult.error.message}`)
                          }
                        } catch (iconErr) {
                          console.error('[OrganizationStructureForms] Unexpected error uploading icon:', iconErr)
                          // Don't fail the whole operation
                        } finally {
                          setUploadingIcon(false)
                        }
                      }

                      // Refetch sports to ensure UI is up to date
                      const freshSportsResult = await getSports(context)
                      if (!freshSportsResult.error && freshSportsResult.data) {
                        setSports(Array.isArray(freshSportsResult.data) ? freshSportsResult.data : [])
                      } else {
                        // Fallback to optimistic update
                        if (result.data) {
                          setSports((prev) => {
                            // Check if already exists to avoid duplicates
                            const data = result.data
                            if (!data) return prev
                            const exists = prev.some(s => s.id === data.id)
                            if (exists) return prev
                            return [data as Sport, ...prev]
                          })
                        }
                      }
                      setSportForm((prev) => ({ ...prev, name: '', iconFile: null }))
                      
                      // Check if there's a next level and save prompt state
                      const nextLevel = getNextLevel('sport')
                      if (nextLevel && result.data) {
                        const promptData: PromptState = {
                          entityType: 'sport',
                          entityId: result.data.id,
                          entityName: result.data.name,
                          nextLevel,
                          timestamp: Date.now(),
                        }
                        savePromptState(promptData)
                        setPromptState(promptData)
                        setSuccessMessage(null) // Don't show simple message, show prompt instead
                        
                        // Stay on page to show prompt - navigation will happen via "Not Now" or "Add Next"
                      } else {
                        // No next level - navigate to list page with success message in state
                        // Clear any existing prompt
                        clearPromptState()
                        setPromptState(null)
                        setSuccessMessage(null)
                        
                        const listPageRoute = getListPageRoute('sport')
                        navigate(listPageRoute, {
                          replace: true,
                          state: {
                            successMessage: t('admin.structureForms.messages.created', { item: formLabels.sport })
                          }
                        })
                      }
                    }
                  } catch (err) {
                    console.error('[OrganizationStructureForms] Unexpected error creating sport:', err)
                    setActionError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
                  } finally {
                    setSubmitting((prev) => ({ ...prev, sport: false }))
                  }
                }}
              >
                  {USE_FAKE_DATA 
                    ? 'Sign in to Add Sport'
                    : t('admin.structureForms.actions.createItem', { item: formLabels.sport })
                  }
                </Button>
              </div>
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
            
            <div className="pa-flex pa-justify-end pa-gap-3">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={submitting.program}
              >
                Cancel
              </Button>
              <Button
                disabled={!canCreateProgram || submitting.program}
                loading={submitting.program}
                onClick={async () => {
                  if (!canCreateProgram || !currentOrganization?.id) return
                  
                  // Clear success state at the START (before setSubmitting)
                  setSuccessMessage(null)
                  setPromptState(null)
                  clearPromptState()
                  
                  setSubmitting((prev) => ({ ...prev, program: true }))
                  setActionError(null)

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
                      // Refetch programs to ensure UI is up to date
                      const freshProgramsResult = await getPrograms(context)
                      if (!freshProgramsResult.error && freshProgramsResult.data) {
                        setPrograms(Array.isArray(freshProgramsResult.data) ? freshProgramsResult.data : [])
                      } else {
                        // Fallback to optimistic update
                        setPrograms((prev) => [result.data as Program, ...prev])
                      }
                      setProgramForm((prev) => ({
                        ...prev,
                        name: '',
                        sportId: '',
                        gender: 'coed',
                        nameTouched: false,
                      }))
                      
                      // Check if there's a next level and save prompt state
                      const nextLevel = getNextLevel('program')
                      if (nextLevel && result.data) {
                        const promptData: PromptState = {
                          entityType: 'program',
                          entityId: result.data.id,
                          entityName: result.data.name,
                          nextLevel,
                          timestamp: Date.now(),
                        }
                        savePromptState(promptData)
                        setPromptState(promptData)
                        setSuccessMessage(null) // Don't show simple message, show prompt instead
                        // Stay on page to show prompt - navigation will happen via "Not Now" or "Add Next"
                      } else {
                        // No next level - navigate to list page with success message in state
                        // Clear any existing prompt
                        clearPromptState()
                        setPromptState(null)
                        setSuccessMessage(null)
                        
                        const listPageRoute = getListPageRoute('program')
                        navigate(listPageRoute, {
                          replace: true,
                          state: {
                            successMessage: t('admin.structureForms.messages.created', { item: formLabels.program })
                          }
                        })
                      }
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
            
            <div className="pa-flex pa-justify-end pa-gap-3">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={submitting.level}
              >
                Cancel
              </Button>
              <Button
                disabled={!canCreateLevel || submitting.level}
                loading={submitting.level}
                onClick={async () => {
                  if (!canCreateLevel || !currentOrganization?.id) return
                  
                  // Clear success state at the START (before setSubmitting)
                  setSuccessMessage(null)
                  setPromptState(null)
                  clearPromptState()
                  
                  setSubmitting((prev) => ({ ...prev, level: true }))
                  setActionError(null)

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
                      // Refetch levels to ensure UI is up to date
                      const freshLevelsResult = await getLevels(context)
                      if (!freshLevelsResult.error && freshLevelsResult.data) {
                        setLevels(Array.isArray(freshLevelsResult.data) ? freshLevelsResult.data : [])
                      } else {
                        // Fallback to optimistic update
                        setLevels((prev) => [result.data as Level, ...prev])
                      }
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
                      
                      // Check if there's a next level and save prompt state
                      const nextLevel = getNextLevel('level')
                      if (nextLevel && result.data) {
                        const promptData: PromptState = {
                          entityType: 'level',
                          entityId: result.data.id,
                          entityName: result.data.name,
                          nextLevel,
                          timestamp: Date.now(),
                        }
                        savePromptState(promptData)
                        setPromptState(promptData)
                        setSuccessMessage(null) // Don't show simple message, show prompt instead
                        // Stay on page to show prompt - navigation will happen via "Not Now" or "Add Next"
                      } else {
                        // No next level - navigate to list page with success message in state
                        // Clear any existing prompt
                        clearPromptState()
                        setPromptState(null)
                        setSuccessMessage(null)
                        
                        const listPageRoute = getListPageRoute('level')
                        navigate(listPageRoute, {
                          replace: true,
                          state: {
                            successMessage: t('admin.structureForms.messages.created', { item: formLabels.level })
                          }
                        })
                      }
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
                <div className="pa-flex pa-flex-col pa-gap-2">
                  <div className="pa-flex pa-gap-2" style={{ alignItems: 'flex-start' }}>
                    <div className="pa-flex-1">
                      <Select
                        label={t('admin.structureForms.fields.teamSeason.label')}
                        required
                        value={teamForm.seasonId}
                        onChange={(e) => setTeamForm((prev) => ({ ...prev, seasonId: e.target.value }))}
                        onBlur={() => markTouched('team.season')}
                        options={seasonOptions}
                        error={teamSeasonError}
                        disabled={refreshingSeasons}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setShowCreateSeasonModal(true)}
                      disabled={submitting.team || refreshingSeasons}
                      style={{ 
                        marginTop: 'var(--pa-space-5)', // Align with input field (accounts for label height)
                        alignSelf: 'flex-start',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Create Season
                    </Button>
                  </div>
                </div>
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
            
            <div className="pa-flex pa-justify-end pa-gap-3">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={submitting.team}
              >
                Cancel
              </Button>
              <Button
                disabled={!canCreateTeam || submitting.team}
                loading={submitting.team}
                onClick={async () => {
                  if (!canCreateTeam || !currentOrganization?.id) return
                  
                  // Clear success state at the START (before setSubmitting)
                  setSuccessMessage(null)
                  setPromptState(null)
                  clearPromptState()
                  
                  setSubmitting((prev) => ({ ...prev, team: true }))
                  setActionError(null)
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
                    // Validate level exists before creating team
                    if (teamForm.levelId) {
                      const levelExists = levels.some(l => l.id === teamForm.levelId)
                      if (!levelExists) {
                        setActionError('The selected level is no longer available. Please select a different level.')
                        setSubmitting((prev) => ({ ...prev, team: false }))
                        return
                      }
                    }

                    // Validate season exists in the seasons list before creating team
                    const seasonExists = teamForm.seasonId 
                      ? seasons.some(s => s.id === teamForm.seasonId)
                      : false
                    
                    if (teamForm.seasonId && !seasonExists) {
                      setActionError('The selected season is no longer available. Please select a different season.')
                      setSubmitting((prev) => ({ ...prev, team: false }))
                      return
                    }

                    // Ensure seasonId is a valid non-empty string or undefined
                    const seasonId = teamForm.seasonId && teamForm.seasonId.trim() 
                      ? teamForm.seasonId.trim() 
                      : undefined

                    // Ensure level_id is a valid UUID or null (not empty string)
                    const levelId = teamForm.levelId && teamForm.levelId.trim()
                      ? teamForm.levelId.trim()
                      : null

                    const result = await createTeam(context, {
                      org_id: currentOrganization.id,
                      name: teamForm.name.trim(),
                      level_id: levelId,
                      program_id: selectedLevel?.program_id ?? null,
                      sport_id: selectedProgram?.sport_id ?? null,
                      is_active: teamForm.isActive,
                      season_id: seasonId,
                    })
                    if (result.error) {
                      // Log the actual error for debugging
                      console.error('[OrganizationStructureForms] Error creating team:', result.error)
                      // Show more specific error if available
                      const errorMessage = result.error.message || t('admin.structureForms.errors.saveFailed', { item: formLabels.team })
                      setActionError(errorMessage)
                    } else if (result.data) {
                      setTeams((prev) => [result.data as Team, ...prev])
                      setTeamForm((prev) => ({
                        ...prev,
                        levelId: '',
                        seasonId: '',
                        name: '',
                        isActive: true,
                      }))
                      
                      // Team has no next level - navigate to list page with success message in state
                      clearPromptState()
                      setPromptState(null)
                      setSuccessMessage(null)
                      
                      const listPageRoute = getListPageRoute('team')
                      navigate(listPageRoute, {
                        replace: true,
                        state: {
                          successMessage: t('admin.structureForms.messages.created', { item: formLabels.team })
                        }
                      })
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

      {/* Create Season Modal */}
      {activeFormType === 'team' && (
        <CreateSeasonModal
          open={showCreateSeasonModal}
          onClose={() => setShowCreateSeasonModal(false)}
          onSeasonCreated={async (newSeason) => {
            // Refresh seasons list
            setRefreshingSeasons(true)
            try {
              const seasonsResult = await getSeasons(context)
              if (!seasonsResult.error && seasonsResult.data) {
                const updatedSeasons = Array.isArray(seasonsResult.data) ? seasonsResult.data : []
                setSeasons(updatedSeasons)
                
                // Verify the new season is in the list before setting it
                const seasonInList = updatedSeasons.find(s => s.id === newSeason.id)
                if (seasonInList) {
                  // Auto-select the newly created season
                  setTeamForm((prev) => ({ ...prev, seasonId: newSeason.id }))
                  // Clear any validation errors
                  setTouched((prev) => {
                    const updated = { ...prev }
                    delete updated['team.season']
                    return updated
                  })
                } else {
                  console.warn('[OrganizationStructureForms] Newly created season not found in refreshed list')
                  // Still set it - it might be a timing issue
                  setTeamForm((prev) => ({ ...prev, seasonId: newSeason.id }))
                }
              } else {
                console.error('[OrganizationStructureForms] Error refreshing seasons:', seasonsResult.error)
                // Still set the seasonId even if refresh failed - the season was created
                setTeamForm((prev) => ({ ...prev, seasonId: newSeason.id }))
              }
            } catch (err) {
              console.error('[OrganizationStructureForms] Error refreshing seasons:', err)
              // Still set the seasonId even if refresh failed - the season was created
              setTeamForm((prev) => ({ ...prev, seasonId: newSeason.id }))
            } finally {
              setRefreshingSeasons(false)
            }
          }}
        />
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
              <DatePicker
                label={t('admin.structureForms.fields.seasonStart.label')}
                value={seasonForm.startDate}
                onChange={(value) => setSeasonForm((prev) => ({ ...prev, startDate: value }))}
                required
                error={seasonStartError}
              />
              <DatePicker
                label={t('admin.structureForms.fields.seasonEnd.label')}
                value={seasonForm.endDate}
                onChange={(value) => setSeasonForm((prev) => ({ ...prev, endDate: value }))}
                minValue={seasonForm.startDate}
                required
                error={seasonEndError || seasonRangeError}
              />
            </div>
            
            <Checkbox
              checked={seasonForm.isActive}
              onChange={(e) => setSeasonForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              label={t('admin.structureForms.fields.seasonActive.label')}
            />
            
            <div className="pa-flex pa-justify-end pa-gap-3">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={submitting.season}
              >
                Cancel
              </Button>
              <Button
                disabled={!canCreateSeason || submitting.season}
                loading={submitting.season}
                onClick={async () => {
                  if (!canCreateSeason || !currentOrganization?.id) return
                  
                  // Clear success state at the START (before setSubmitting)
                  setSuccessMessage(null)
                  setPromptState(null)
                  clearPromptState()
                  
                  setSubmitting((prev) => ({ ...prev, season: true }))
                  setActionError(null)

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
                      
                      // Season has no next level - navigate to list page with success message in state
                      clearPromptState()
                      setPromptState(null)
                      setSuccessMessage(null)
                      
                      const listPageRoute = getListPageRoute('season')
                      navigate(listPageRoute, {
                        replace: true,
                        state: {
                          successMessage: t('admin.structureForms.messages.created', { item: formLabels.season })
                        }
                      })
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
