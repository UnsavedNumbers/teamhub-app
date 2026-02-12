
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller, useFieldArray } from 'react-hook-form'

import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage, normalizeSupabaseError } from '../../utils/errorUtils'
import { showSuccess } from '../../utils/toast'
import { getSports } from '../../data/services/sportsService'
import { getPrograms } from '../../data/services/sportsService'
import { getTeams } from '../../data/services/teamsService'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { useFeatureGate } from '../../lib/featureGate'
import {
  AdminPageHeader,
  Card,
  Button,
  Input,
  Select,
  Checkbox
} from '../../components/admin'
import { TimePicker } from '../../components/platformAdmin/TimePicker'
import { DateTimePicker } from '../../components/platformAdmin/DateTimePicker'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete'
import { FileUpload } from '../../components/common/FileUpload'
import type { StructuredAddress } from '../../types/location'
import { startTransition } from 'react'
import {
    EventFormData,
    EVENT_TYPE_LABELS,
    EventType,
} from '../../types/calendar'
import { API_TIMEOUT_MS } from '../../constants/api'
import { STORAGE_KEYS, STORAGE_EXPIRY } from '../../constants/storage'
import { getDefaultEventVisibility } from '../../utils/fanVisibilityHelpers'
import { uploadTicketBanner } from '../../data/services/organizationService'
import { getLink, RouteKeys } from '../../utils/routes'
import { deriveActorRoleFromRoles, logEvent } from '../../utils/eventLogger'
import '../../styles/orgAdmin.css'

const STORAGE_KEY = STORAGE_KEYS.FORM_AUTOSAVE
const DRAFT_TTL_MS = STORAGE_EXPIRY.FORM_AUTOSAVE

const isLocalhostEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

const formatDateTimeLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const buildLocalhostEventDefaults = (): Partial<EventFormData> => {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() + 5)
  start.setHours(18, 0, 0, 0)

  const arrival = new Date(start)
  arrival.setMinutes(arrival.getMinutes() - 30)

  const end = new Date(start)
  end.setHours(end.getHours() + 2)

  return {
    title: 'Local Test Game',
    type: 'game',
    start_time: formatDateTimeLocal(start),
    end_time: formatDateTimeLocal(end),
    arrival_time: formatDateTimeLocal(arrival),
    notes: 'Localhost test run: staff arrive 30 minutes early, gate opens 45 minutes before start.',
    uniform_notes: 'Home jersey, white socks, team warm-up top.',
    equipment_notes: 'Bring game ball, water, cones, and first-aid kit.',
    location: {
      venue_name: 'Main Field',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      place_id: '',
      latitude: '',
      longitude: '',
      is_tbd: false,
      is_virtual: false,
      virtual_link: ''
    },
    rsvp_enabled: false,
    rsvp_type: null,
    ticketing: {
      is_ticketed: true,
      event_type: 'game',
      sales_immediate: true,
      sales_start_at: '',
      sales_end_at: '',
      status: 'draft',
      event_description: 'Test ticketed event for local development.',
      ticket_banner_url: '',
      ticket_types: [
        { name: 'General Admission', description: 'Standard entry', price_dollars: '15.00', capacity: '150' },
        { name: 'Student', description: 'Student discounted entry', price_dollars: '8.00', capacity: '100' },
        { name: 'VIP', description: 'Premium seating and perks', price_dollars: '35.00', capacity: '40' }
      ]
    }
  }
}

const validateCoordinate = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return null
  return Math.round(num * 1e6) / 1e6
}

interface Sport { id: string; name: string }
interface Program { id: string; name: string; sport_id: string }
interface Team { id: string; name: string }
interface Season { id: string; name: string; team_id?: string; is_active?: boolean; start_date?: string; end_date?: string }

export default function CreateEvent() {
  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [showLocationDetails, setShowLocationDetails] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [orgVisibilityDefaults, setOrgVisibilityDefaults] = useState<Record<string, boolean> | null>(null)
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [hasStructure, setHasStructure] = useState(!isLocalhostEnvironment()) // Whether selected sport has program/season/team structure (start false on localhost so cascade runs fully)

  const t = useT()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const hasRestoredRef = useRef(false)
  const previousSportIdRef = useRef<string | undefined>(undefined)
  const previousProgramIdRef = useRef<string | undefined>(undefined)
  
  // Feature gate for ticketing
  const { allowed: ticketingAllowed, loading: ticketingGateLoading } = useFeatureGate('ticketing')

  // Default form values
  const getDefaultValues = (): EventFormData => ({ 
    title: '', 
    type: 'practice', 
    sport_id: '',
    program_id: '',
    team_id: '', 
    season_id: '', 
    start_time: '', 
    end_time: '', 
    arrival_time: '', 
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notes: '',
    uniform_notes: '',
    equipment_notes: '',
    weather_dependent: false,
    external_link: '',
    location: {
       venue_name: '',
       address_line1: '',
       address_line2: '',
       city: '',
       state: '',
       postal_code: '',
       place_id: '',
       latitude: '',
       longitude: '',
       is_tbd: false,
       is_virtual: false,
       virtual_link: ''
    },
    recurring: {
      enabled: false,
      frequency: 'weekly',
      days_of_week: [],
      end_date: '',
      max_occurrences: ''
    },
    rsvp_enabled: false,
    rsvp_type: null,
    ticketing: {
      is_ticketed: false,
      event_type: 'other',
      sales_immediate: true,
      sales_start_at: '',
      sales_end_at: '',
      status: 'draft',
      event_description: '',
      ticket_banner_url: '',
      ticket_types: []
    },
    ...(isLocalhostEnvironment() ? buildLocalhostEventDefaults() : {})
  })

  // Get initial values from sessionStorage (computed once during render)
  const initialValues: EventFormData = (() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const savedData = JSON.parse(saved) as any

        // Ignore stale drafts
        const savedAt = typeof savedData._savedAt === 'number' ? savedData._savedAt : null
        if (savedAt && Date.now() - savedAt > DRAFT_TTL_MS) {
          sessionStorage.removeItem(STORAGE_KEY)
          return getDefaultValues()
        }

        // Remove UI state from saved data (we'll restore it in useEffect)
        const { _uiState, ...formData } = savedData
        // Merge saved data with defaults
        return { ...getDefaultValues(), ...formData }
      }
    } catch (err) {
      console.error('Failed to restore form data:', err)
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // Ignore cleanup errors
      }
    }
    return getDefaultValues()
  })()

  const { control, handleSubmit, watch, setValue, trigger, getValues, formState: { errors } } = useForm<EventFormData>({
    defaultValues: initialValues,
    mode: 'onTouched',
  })

  // Restore UI state after form initialization
  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const savedData = JSON.parse(saved) as any

        // Ignore stale drafts
        const savedAt = typeof savedData._savedAt === 'number' ? savedData._savedAt : null
        if (savedAt && Date.now() - savedAt > DRAFT_TTL_MS) {
          sessionStorage.removeItem(STORAGE_KEY)
          return
        }

        if (savedData._uiState) {
          if (savedData._uiState.showLocationDetails) {
            setShowLocationDetails(true)
          }
          if (savedData._uiState.showRecurring) {
            setShowRecurring(true)
          }
        }
      }
    } catch (err) {
      // Ignore errors
    }
  }, [])

  const watchSportId = watch('sport_id')
  const watchProgramId = watch('program_id')
  const watchSeasonId = watch('season_id')
  const watchRSVPEnabled = watch('rsvp_enabled')
  const watchTicketingEnabled = watch('ticketing.is_ticketed')
  const watchTicketSalesImmediate = watch('ticketing.sales_immediate')
  const watchEventType = watch('type')

  useEffect(() => {
    if (!watchTicketingEnabled) return
    setValue('rsvp_enabled', false, { shouldValidate: false })
    setValue('rsvp_type', null, { shouldValidate: false })
  }, [watchTicketingEnabled, setValue])

  useEffect(() => {
    if (!isLocalhostEnvironment()) return

    const localhostDefaults = buildLocalhostEventDefaults()
    const defaultGeneralNotes = localhostDefaults.notes ?? ''
    const defaultUniformNotes = localhostDefaults.uniform_notes ?? ''
    const defaultEquipmentNotes = localhostDefaults.equipment_notes ?? ''

    const currentGeneralNotes = (getValues('notes') || '').trim()
    const currentUniformNotes = (getValues('uniform_notes') || '').trim()
    const currentEquipmentNotes = (getValues('equipment_notes') || '').trim()

    if (!currentUniformNotes && defaultUniformNotes) {
      setValue('uniform_notes', defaultUniformNotes, { shouldValidate: false, shouldDirty: false })
    }
    if (!currentEquipmentNotes && defaultEquipmentNotes) {
      setValue('equipment_notes', defaultEquipmentNotes, { shouldValidate: false, shouldDirty: false })
    }
    if (!currentGeneralNotes || currentGeneralNotes === 'Auto-filled localhost test event.') {
      setValue('notes', defaultGeneralNotes, { shouldValidate: false, shouldDirty: false })
    }
  }, [getValues, setValue])
  
  // Watch all form values for persistence
  const formValues = watch()
  
  // Ticket types field array
  const { fields: ticketTypeFields, append: appendTicketType, remove: removeTicketType } = useFieldArray({
    control,
    name: 'ticketing.ticket_types',
  })

  // Note: We do NOT clear saved drafts on unmount - users should be able to navigate
  // away to look up information and come back to their form. Drafts expire after 2 hours
  // or are cleared on successful submit.

  // Save form data when page visibility changes (user switches tabs) or before unload
  useEffect(() => {
    const saveFormData = () => {
      try {
        // Skip saving until we've restored initial state
        if (!hasRestoredRef.current) return

        // Only save if form has actual data (not just defaults)
        const hasData = formValues.title || formValues.team_id || formValues.start_time
        if (!hasData) {
          sessionStorage.removeItem(STORAGE_KEY)
          return
        }

        const dataToSave = {
          ...formValues,
          _uiState: {
            showLocationDetails,
            showRecurring
          },
          _savedAt: Date.now()
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 2000)
      } catch (err) {
        console.error('Failed to save form data:', err)
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveFormData()
      }
    }

    const handleBeforeUnload = () => {
      saveFormData()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Also save periodically (every 30 seconds) while user is working
    const autoSaveInterval = setInterval(saveFormData, API_TIMEOUT_MS)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearInterval(autoSaveInterval)
    }
  }, [formValues, showLocationDetails, showRecurring])

  // Cascade: Sport → Program → Season → Team. Each step populates the next dropdown.

  const fetchProgramsForSport = useCallback(async (sportId: string) => {
    if (!isReady || !context?.orgId) return
    try {
      const { data, error } = await getPrograms(context, sportId)
      if (error) throw error
      const programsList = (data || []).map(p => ({ id: p.id, name: p.name, sport_id: p.sport_id }))
      setPrograms(programsList)

      // Auto-select first program by default when empty or invalid for selected sport
      const currentProgramId = getValues('program_id')
      const hasValidCurrentProgram = programsList.some((program) => program.id === currentProgramId)
      if (programsList.length > 0 && !hasValidCurrentProgram) {
        setValue('program_id', programsList[0].id, { shouldValidate: false })
      }

      // Check full hierarchy: program + season + team must all exist
      const hasPrograms = programsList.length > 0
      let hasTeams = false
      let hasSeasons = false

      if (hasPrograms) {
        const { data: teamsData, error: teamsError } = await getTeams(context, {
          sportId,
          activeOnly: true,
        })
        if (!teamsError && teamsData && teamsData.length > 0) {
          hasTeams = true
          const teamIds = teamsData.map((team) => team.id)
          const { data: tsData, error: tsError } = await supabase
            .from('team_seasons_view')
            .select('season_id, is_active, end_date')
            .in('team_id', teamIds)

          if (!tsError && tsData && tsData.length > 0) {
            const today = new Date().toISOString().split('T')[0]
            hasSeasons = tsData.some((row: { season_id: string | null; is_active: boolean | null; end_date: string | null }) => {
              if (!row.season_id) return false
              const isActive = row.is_active ?? false
              const isFuture = (row.end_date || '') >= today
              return isActive || isFuture
            })
          }
        }
      }

      const hasFullStructure = hasPrograms && hasTeams && hasSeasons
      setHasStructure(hasFullStructure)

      if (!hasFullStructure) {
        setValue('season_id', '', { shouldValidate: false })
        setValue('team_id', '', { shouldValidate: false })
        setSeasons([])
        setTeams([])
        return
      }
    } catch (err) {
      console.error('Error fetching programs:', err)
      setPrograms([])
      setHasStructure(false)
    }
  }, [context, isReady, getValues, setValue])

  const fetchSports = useCallback(async () => {
    if (!isReady || !context?.orgId) return
    setLoading(true)
    try {
      const { data, error } = await getSports(context)
      if (error) throw error
      const sportsList = (data || []).map(s => ({ id: s.id, name: s.name }))
      setSports(sportsList)
      // Auto-select first sport when none selected, then eagerly fetch its programs
      // so that programs are populated before loading=false renders the form
      if (sportsList.length > 0 && !getValues('sport_id')) {
        setValue('sport_id', sportsList[0].id, { shouldValidate: false })
        previousSportIdRef.current = sportsList[0].id
        await fetchProgramsForSport(sportsList[0].id)
      }
    } catch (err) {
      console.error('Error fetching sports:', err)
      setSports([])
    } finally {
      setLoading(false)
    }
  }, [context, isReady, getValues, setValue, fetchProgramsForSport])

  const fetchSeasonsForProgram = useCallback(async (sportId: string, programId: string) => {
    if (!isReady || !context?.orgId) return
    try {
      const { data: teamsData, error: teamsError } = await getTeams(context, {
        sportId,
        programId,
        activeOnly: true,
      })
      if (teamsError) throw teamsError
      const teamIds = (teamsData || []).map(t => t.id)
      setTeams([])
      setValue('team_id', '', { shouldValidate: false })

      if (teamIds.length === 0) {
        setSeasons([])
        setValue('season_id', '', { shouldValidate: false })
        return
      }

      const { data: tsData, error: tsError } = await supabase
        .from('team_seasons_view')
        .select('season_id, name, is_active, start_date, end_date')
        .in('team_id', teamIds)
        .order('start_date', { ascending: false })

      if (tsError) {
        setSeasons([])
        setValue('season_id', '', { shouldValidate: false })
        return
      }

      const today = new Date().toISOString().split('T')[0]
      const bySeasonId = new Map<string, { id: string; name: string; is_active?: boolean; end_date?: string }>()
      ;(tsData || []).forEach((row: { season_id: string | null; name: string | null; is_active: boolean | null; end_date: string | null }) => {
        if (!row.season_id || !row.name) return
        const isActive = row.is_active ?? false
        const isFuture = (row.end_date || '') >= today
        if (!isActive && !isFuture) return
        if (!bySeasonId.has(row.season_id)) {
          bySeasonId.set(row.season_id, {
            id: row.season_id,
            name: row.name,
            is_active: row.is_active ?? undefined,
            end_date: row.end_date ?? undefined,
          })
        }
      })
      const seasonList = Array.from(bySeasonId.values())
      setSeasons(seasonList)

      const currentSeasonId = getValues('season_id')
      const hasValidCurrentSeason = seasonList.some((season) => season.id === currentSeasonId)
      if (!hasValidCurrentSeason) {
        setValue('season_id', '', { shouldValidate: false })
      }
      if (seasonList.length > 0 && (!hasValidCurrentSeason || isLocalhostEnvironment())) {
        setValue('season_id', seasonList[0].id, { shouldValidate: false })
      }
    } catch (err) {
      console.error('Error fetching seasons for program:', err)
      setSeasons([])
      setValue('season_id', '', { shouldValidate: false })
      setValue('team_id', '', { shouldValidate: false })
    }
  }, [context, isReady, setValue, getValues])

  const filterTeamsForSeason = useCallback(async (seasonId: string) => {
    if (!context?.orgId) return
    const { data, error } = await supabase
      .from('team_seasons')
      .select('team_id')
      .eq('season_id', seasonId)
    if (error || !data || data.length === 0) {
      setTeams([])
      setValue('team_id', '', { shouldValidate: false })
      return
    }
    const allowedTeamIds = new Set((data as { team_id: string }[]).map(r => r.team_id))
    const { data: teamsData, error: teamsError } = await getTeams(context, {
      sportId: watchSportId || undefined,
      programId: watchProgramId || undefined,
      activeOnly: true,
    })
    if (teamsError || !teamsData) {
      setTeams([])
      return
    }
    const filtered = teamsData.filter(t => allowedTeamIds.has(t.id)).map(t => ({ id: t.id, name: t.name }))
    setTeams(filtered)

    const currentTeamId = getValues('team_id')
    const hasValidCurrentTeam = filtered.some((team) => team.id === currentTeamId)
    if (!hasValidCurrentTeam) {
      setValue('team_id', '', { shouldValidate: false })
    }
    if (filtered.length > 0 && (!hasValidCurrentTeam || isLocalhostEnvironment())) {
      setValue('team_id', filtered[0].id, { shouldValidate: false })
    }
  }, [context, watchSportId, watchProgramId, setValue, getValues])

  useEffect(() => {
    if (isReady) fetchSports()
  }, [isReady, fetchSports])

  // Fetch organization visibility defaults
  useEffect(() => {
    const fetchOrgVisibilityDefaults = async () => {
      if (!isReady || !context?.orgId) return
      
      try {
        const { data, error } = await supabase
          .from('organization_visibility_settings')
          .select('fan_visibility_defaults')
          .eq('org_id', context.orgId)
          .maybeSingle()
        
        if (error) {
          console.error('Error fetching org visibility defaults:', error)
          return
        }
        
        const defaults = (data?.fan_visibility_defaults as Record<string, boolean> | null) ?? null
        setOrgVisibilityDefaults(defaults)
      } catch (err) {
        console.error('Error fetching org visibility defaults:', err)
      }
    }
    
    fetchOrgVisibilityDefaults()
  }, [isReady, context?.orgId])

  // Update visibility when event type changes (only for new events, not restored drafts)
  useEffect(() => {
    if (!hasRestoredRef.current) return // Don't override restored draft
    if (!watchEventType) return
    
    const defaultVisibility = getDefaultEventVisibility(watchEventType, orgVisibilityDefaults)
    setVisibility(defaultVisibility)
  }, [watchEventType, orgVisibilityDefaults])

  useEffect(() => {
    if (!watchSportId) {
      setPrograms([])
      setSeasons([])
      setTeams([])
      setHasStructure(false)
      setValue('program_id', '', { shouldValidate: false })
      setValue('season_id', '', { shouldValidate: false })
      setValue('team_id', '', { shouldValidate: false })
      previousSportIdRef.current = undefined
      previousProgramIdRef.current = undefined
      return
    }
    // Skip if sport was already eagerly loaded in fetchSports
    if (previousSportIdRef.current === watchSportId && programs.length > 0) return
    const sportChanged = previousSportIdRef.current !== undefined && previousSportIdRef.current !== watchSportId
    previousSportIdRef.current = watchSportId
    if (sportChanged) {
      setHasStructure(false)
      setValue('program_id', '', { shouldValidate: false })
      setValue('season_id', '', { shouldValidate: false })
      setValue('team_id', '', { shouldValidate: false })
      previousProgramIdRef.current = undefined
    }
    fetchProgramsForSport(watchSportId)
  }, [watchSportId, isReady, fetchProgramsForSport, setValue])

  useEffect(() => {
    if (!watchProgramId || !watchSportId) {
      setSeasons([])
      setTeams([])
      setValue('season_id', '', { shouldValidate: false })
      setValue('team_id', '', { shouldValidate: false })
      previousProgramIdRef.current = undefined
      return
    }
    const programChanged = previousProgramIdRef.current !== undefined && previousProgramIdRef.current !== watchProgramId
    previousProgramIdRef.current = watchProgramId
    if (programChanged) {
      setValue('season_id', '', { shouldValidate: false })
      setValue('team_id', '', { shouldValidate: false })
    }
    fetchSeasonsForProgram(watchSportId, watchProgramId)
  }, [watchProgramId, watchSportId, isReady, fetchSeasonsForProgram, setValue])

  useEffect(() => {
    if (!watchSeasonId || !watchSportId || !watchProgramId) return
    filterTeamsForSeason(watchSeasonId)
  }, [watchSeasonId, watchSportId, watchProgramId, filterTeamsForSeason])

  useEffect(() => {
    if (!watchSportId || hasStructure) return
    // On localhost prefill the type is already set by buildLocalhostEventDefaults;
    // don't override it while the cascade is still loading.
    if (isLocalhostEnvironment()) return
    if (watchEventType !== 'travel' && watchEventType !== 'social') {
      setValue('type', 'travel', { shouldValidate: false })
    }
  }, [watchSportId, hasStructure, watchEventType, setValue])

  const onSubmit = async (data: EventFormData) => {
    setSaving(true)
    setError(null)
    setErrorDetail(null)
    
    try {
      // Normalize times and satisfy DB constraint (end_time > start_time)
      const start = new Date(data.start_time)
      if (isNaN(start.getTime())) throw new Error('Invalid start time')

      // If no end_time provided, set to end of start day (23:59:59.999) local
      const end = data.end_time
        ? new Date(data.end_time)
        : (() => {
            const dt = new Date(start)
            dt.setHours(23, 59, 59, 999)
            return dt
          })()
      if (end <= start) {
        setError(t('admin.events.validation.endAfterStart' as any) || 'End time must be after start time.')
        setSaving(false)
        return
      }
      const arrival = data.arrival_time ? new Date(data.arrival_time) : null
      if (arrival && arrival >= start) {
        setError(t('admin.events.validation.arrivalBeforeStart' as any) || 'Arrival time must be before start time.')
        setSaving(false)
        return
      }

      // Ticketing sales window defaults
      const salesImmediate = data.ticketing?.sales_immediate ?? true
      const salesStartAt = salesImmediate
        ? null
        : (data.ticketing?.sales_start_at ? new Date(data.ticketing.sales_start_at) : null)
      const salesEndAt = salesImmediate
        ? null
        : (data.ticketing?.sales_end_at ? new Date(data.ticketing.sales_end_at) : null)
      const resolvedSalesEnd =
        data.ticketing?.is_ticketed && !salesImmediate && !salesEndAt
          ? end
          : salesEndAt || null

      const resolvedTeamId = data.team_id || null

      let selectedTeamOrgId: string | null = null
      if (resolvedTeamId) {
        const { data: selectedTeam, error: selectedTeamError } = await supabase
          .from('teams')
          .select('id, org_id')
          .eq('id', resolvedTeamId)
          .maybeSingle()

        if (selectedTeamError) {
          throw selectedTeamError
        }
        if (!selectedTeam?.org_id) {
          setError('Please select a valid team in your organization before creating this event.')
          setSaving(false)
          return
        }
        if (context.orgId && selectedTeam.org_id !== context.orgId) {
          setError('Selected team does not belong to your current organization.')
          setSaving(false)
          return
        }
        selectedTeamOrgId = selectedTeam.org_id
      }

      // 1. Insert Event
      type EventInsert = Database['public']['Tables']['events']['Insert']
      const eventInsertData = {
        org_id: context.orgId,
        title: data.title,
        type: data.type,
        team_id: resolvedTeamId,
        season_id: hasStructure ? data.season_id! : null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        arrival_time: arrival ? arrival.toISOString() : null,
        timezone: data.timezone,
        notes: data.notes,
        uniform_notes: data.uniform_notes,
        equipment_notes: data.equipment_notes,
        weather_dependent: data.weather_dependent,
        external_link: data.external_link,
        rsvp_enabled: data.rsvp_enabled,
        rsvp_type: data.rsvp_enabled ? data.rsvp_type : null,
        visibility: visibility,
        created_by_user_id: context.userId
      } satisfies EventInsert
      const { data: eventData, error: insertError } = await supabase.from('events').insert(eventInsertData).select().single()
      
      if (insertError) throw insertError
      if (!eventData) throw new Error('No data returned')

      // 2. Insert Location
      type LocationInsert = Database['public']['Tables']['event_locations']['Insert']
      const eventDataAny = eventData as any
      const locationData = {
          event_id: eventDataAny.id,
          venue_name: data.location.venue_name || null,
          address_line1: data.location.address_line1 || null,
          city: data.location.city || null,
          state: data.location.state || null,
          postal_code: data.location.postal_code || null,
          place_id: data.location.place_id || null,
          latitude: data.location.latitude ? parseFloat(data.location.latitude) : null,
          longitude: data.location.longitude ? parseFloat(data.location.longitude) : null,
          is_tbd: data.location.is_tbd,
          is_virtual: data.location.is_virtual,
          virtual_link: data.location.virtual_link || null
      } as LocationInsert & { place_id: string | null }
      
      const { error: locError } = await supabase.from('event_locations').insert(locationData)
      if (locError) console.error('Location save error', locError) // Don't block flow

      // 3. Handle Recurring
      if (data.recurring?.enabled) {
          const recurringEndDate = data.recurring.end_date || null
          let recurringMax = data.recurring.max_occurrences ? parseInt(data.recurring.max_occurrences) : null
          // Constraint requires at least one end condition
          if (!recurringEndDate && !recurringMax) {
            recurringMax = 1
          }

          type RecurringPatternInsert = Database['public']['Tables']['recurring_event_patterns']['Insert']
          const recurData = {
              parent_event_id: eventDataAny.id,
              frequency: data.recurring.frequency as Database['public']['Enums']['recurrence_frequency'],
              days_of_week: data.recurring.days_of_week.length > 0 ? data.recurring.days_of_week : [new Date(data.start_time).getDay()],
              end_date: recurringEndDate,
              max_occurrences: recurringMax
          } satisfies RecurringPatternInsert
           const { error: recurError } = await supabase.from('recurring_event_patterns').insert(recurData)
           if (recurError) throw recurError
      }

      // 4. Handle Ticketing
      if (data.ticketing?.is_ticketed) {
        const orgId = context.orgId || selectedTeamOrgId
        if (!orgId) {
          throw new Error('Failed to resolve organization ID for ticketing')
        }
        let finalBannerUrl = data.ticketing.ticket_banner_url?.trim() || null

        // Build ticketed_events insert
        type TicketedEventInsert = Database['public']['Tables']['ticketed_events']['Insert']
        const ticketedEventData: TicketedEventInsert = {
          event_id: eventDataAny.id,
          org_id: orgId,
          team_id: resolvedTeamId,
          event_type: data.ticketing.event_type as Database['public']['Enums']['ticketed_event_type'],
          title: data.title,
          description: data.notes || null,
          event_description: data.ticketing.event_description?.trim() || null,
          ticket_banner_url: finalBannerUrl,
          cover_image_path: finalBannerUrl,
          starts_at: new Date(data.start_time).toISOString(),
          ends_at: end.toISOString(),
          timezone: data.timezone,
          venue_name: data.location.venue_name?.trim() || null,
          venue_address_line1: data.location.address_line1?.trim() || null,
          venue_city: data.location.city?.trim() || null,
          venue_state: data.location.state?.trim() || null,
          venue_postal_code: data.location.postal_code?.trim() || null,
          venue_country: 'US',
          venue_is_virtual: data.location.is_virtual,
          venue_virtual_link: data.location.virtual_link?.trim() || null,
          sales_start_at: salesStartAt ? salesStartAt.toISOString() : null,
          sales_end_at: resolvedSalesEnd ? resolvedSalesEnd.toISOString() : null,
          status: data.ticketing.status as Database['public']['Enums']['ticketed_event_status'],
        }

        const { data: ticketedEventDataResult, error: ticketedEventError } = await supabase
          .from('ticketed_events')
          .insert(ticketedEventData)
          .select('id')
          .single()

        if (ticketedEventError) {
          throw new Error(`Ticketing setup failed: ${ticketedEventError.message}`)
        }

        if (!ticketedEventDataResult) {
          throw new Error('Failed to create ticketed event')
        }

        const ticketedEventId = ticketedEventDataResult.id

        if (bannerFile) {
          const { path, error: uploadError } = await uploadTicketBanner(orgId, ticketedEventId, bannerFile)
          if (uploadError) {
            console.error('Ticket banner upload failed:', uploadError)
          }

          if (!uploadError && path) {
            finalBannerUrl = path
            const { error: updateBannerError } = await supabase
              .from('ticketed_events')
              .update({
                ticket_banner_url: finalBannerUrl,
                cover_image_path: finalBannerUrl,
              })
              .eq('id', ticketedEventId)

            if (updateBannerError) {
              console.error('Ticket banner URL save failed:', updateBannerError)
            }
          }
        }

        // Insert ticket types
        if (data.ticketing.ticket_types && data.ticketing.ticket_types.length > 0) {
          type TicketTypeInsert = Database['public']['Tables']['ticket_types']['Insert']
          const ticketTypeInserts: TicketTypeInsert[] = data.ticketing.ticket_types
            .filter(tt => tt.name.trim() !== '')
            .map((tt, index) => {
              const priceDollars = parseFloat(tt.price_dollars)
              const priceCents = Number.isFinite(priceDollars) && priceDollars >= 0 
                ? Math.round(priceDollars * 100) 
                : 0
              
              const capacityStr = tt.capacity.trim()
              const capacity = capacityStr === '' ? null : parseInt(capacityStr)
              const capacityTotal = capacity !== null && !isNaN(capacity) && capacity > 0 ? capacity : null
              const capacityRemaining = capacityTotal

              return {
                org_id: orgId,
                ticketed_event_id: ticketedEventId,
                name: tt.name.trim(),
                price_cents: priceCents,
                currency: 'USD',
                capacity_total: capacityTotal,
                capacity_remaining: capacityRemaining,
                sort_order: index,
                is_active: true,
              } satisfies TicketTypeInsert
            })

          if (ticketTypeInserts.length > 0) {
            const { error: ticketTypesError } = await supabase
              .from('ticket_types')
              .insert(ticketTypeInserts)

            if (ticketTypesError) {
              throw new Error(`Failed to create ticket types: ${ticketTypesError.message}`)
            }
          }
        }
      }

      // Clear saved form data on successful submission
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch (err) {
        console.error('Failed to clear saved form data:', err)
      }

      // Distribute notifications
      const { distributeEventNotifications } = await import('../../data/services/notificationDistribution')
      if (resolvedTeamId) {
        const { data: teamData } = await supabase.from('teams').select('org_id').eq('id', resolvedTeamId).single()
        if (teamData?.org_id) {
        distributeEventNotifications({
          id: eventDataAny.id,
          team_id: resolvedTeamId,
          org_id: teamData.org_id,
          title: data.title,
          start_time: new Date(data.start_time).toISOString(),
          created_by_user_id: context.userId
        }).catch(err => console.error('Failed to distribute event notifications:', err))
        }
      }

      // Success message for ticketed events
      if (data.ticketing?.is_ticketed) {
        const ticketTypesCount = data.ticketing.ticket_types?.filter(tt => tt.name.trim() !== '').length || 0
        if (ticketTypesCount === 0) {
          showSuccess(t('admin.events.ticketing.success.noTypes'))
        } else {
          showSuccess(t('admin.events.ticketing.success.created'))
        }
      } else {
        showSuccess(t('admin.events.ticketing.success.created'))
      }

      navigate(getLink(RouteKeys.ADMIN_EVENTS))
    } catch (err: unknown) {
      // Parse database errors and show friendly messages
      const rawError = getErrorMessage(err) || ''
      const displayMessage = normalizeSupabaseError(err)
      let friendlyError = t('admin.events.validation.titleRequired') // default fallback
      let detail: string | null = null
      
      if (rawError.includes('end_time') && rawError.includes('not-null')) {
        friendlyError = t('admin.events.validation.endTimeRequired')
      } else if (rawError.includes('start_time') && rawError.includes('not-null')) {
        friendlyError = t('admin.events.validation.startTimeRequired')
      } else if (rawError.includes('title') && rawError.includes('not-null')) {
        friendlyError = t('admin.events.validation.titleRequired')
      } else if (rawError.includes('team_id') && rawError.includes('not-null')) {
        friendlyError = t('admin.events.validation.teamRequired')
      } else if (rawError.includes('season_id') && rawError.includes('not-null')) {
        friendlyError = t('admin.events.validation.seasonRequired')
      } else if (rawError.includes('Ticketing setup failed') || rawError.includes('Failed to create ticketed event') || rawError.includes('Failed to create ticket types')) {
        friendlyError = t('admin.events.ticketing.errors.setupFailed')
        detail = rawError.includes('Ticketing setup failed') ? rawError.replace('Ticketing setup failed: ', '') : displayMessage
      } else if (rawError.includes('row-level security') || rawError.includes('RLS') || rawError.includes('policy')) {
        friendlyError = "You don't have permission to create this event. Check that you're in the right organization and have admin access."
        detail = displayMessage
      } else if (rawError) {
        friendlyError = 'Failed to create event. Please check all required fields and try again.'
        detail = displayMessage
      }

      const logResult = await logEvent({
        category: 'EVENT',
        eventType: 'EVENT_CREATED',
        actorUserId: context.userId,
        actorRole: 'org_admin',
        orgId: context.orgId,
        metadata: {
          source: 'CreateEvent.onSubmit',
          operation: 'create',
          status: 'failed',
          event_title: data.title,
          event_type: data.type,
          error_message: rawError || displayMessage,
        },
      })
      if (logResult.error) {
        console.error('[CreateEvent] Failed to log create failure:', logResult.error)
      }
      
      setError(friendlyError)
      setErrorDetail(detail)
      trigger()
    } finally { 
      setSaving(false) 
    }
  }

  // Filter event types based on whether sport has structure
  const eventTypeOptions = (Object.keys(EVENT_TYPE_LABELS) as EventType[])
    .filter(key => {
      // If sport has no structure (no programs/seasons/teams), only allow 'travel' and 'social'
      if (!hasStructure) {
        return key === 'travel' || key === 'social'
      }
      // Otherwise, allow all event types
      return true
    })
    .map(key => ({
      value: key,
      label: EVENT_TYPE_LABELS[key]
    }))

  if (loading) return <div className="oa-skeleton oa-skeleton--tall" />

  return (
    <div className="oa-root">
      <AdminPageHeader 
        title="Create Event" 
        subtitle={t('admin.events.createSubtitle')}
        breadcrumbs={[
          { label: 'Events', path: getLink(RouteKeys.ADMIN_EVENTS) },
          { label: 'Create Event' },
        ]}
      />
      <div className="oa-form-container">
        <form onSubmit={handleSubmit(onSubmit, (errors) => console.error('Form validation errors:', errors))}>
            {error && (
              <div className="oa-alert oa-alert--error oa-mb-4">
                <div>{error}</div>
                {errorDetail && <div className="oa-alert__meta">{errorDetail}</div>}
              </div>
            )}
            
            {draftSaved && (
              <div className="oa-draft-saved oa-mb-4">
                <span className="material-symbols-outlined oa-draft-saved__icon">check_circle</span>
                <span>Draft saved</span>
              </div>
            )}
            
            <Card title="Event Basics" className="oa-mb-6">
              <div className="oa-form-section-body">
                <p className="oa-form-section-subtitle oa-mb-4">
                  {hasStructure 
                    ? 'Name the event and connect it to the correct sport, program, season, and team.' 
                    : 'Name the event and select a sport. Since this sport has no programs/teams configured, only Travel and Social Event types are available.'}
                </p>
                <div className="oa-mb-4">
                  <Controller name="title" control={control} rules={{ required: t('admin.events.validation.titleRequired'), minLength: { value: 3, message: t('admin.events.validation.titleMinLength') } }} render={({ field }) => <Input {...field} label="Event Title" required error={errors.title?.message || undefined} />} />
                </div>
                <div className="oa-form-grid oa-form-grid-4 oa-mb-4">
                  <div className="oa-select-wrapper">
                    <Controller
                      name="sport_id"
                      control={control}
                      render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value || ''}
                      label={t('admin.events.fields.sport')}
                          options={sports.map(s => ({ value: s.id, label: s.name }))}
                          onChange={(value) => {
                            field.onChange(value)
                            setValue('program_id', '', { shouldValidate: false })
                            setValue('season_id', '', { shouldValidate: false })
                            setValue('team_id', '', { shouldValidate: false })
                          }}
                        />
                      )}
                    />
                  </div>
                  {programs.length > 0 && (
                  <div className="oa-select-wrapper">
                    <Controller
                      name="program_id"
                      control={control}
                      render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value || ''}
                      label={t('admin.events.fields.program')}
                          options={programs.map(p => ({ value: p.id, label: p.name }))}
                          disabled={!watchSportId}
                          onChange={(value) => {
                            field.onChange(value)
                            setValue('season_id', '', { shouldValidate: false })
                            setValue('team_id', '', { shouldValidate: false })
                          }}
                        />
                      )}
                    />
                  </div>
                  )}
                  {hasStructure && (
                  <div className="oa-select-wrapper">
                    <Controller
                      name="season_id"
                      control={control}
                      rules={{ required: hasStructure ? t('admin.events.validation.seasonRequired') : false }}
                      render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value || ''}
                      label={t('admin.events.fields.season')}
                          options={seasons.map(s => ({ value: s.id, label: s.name }))}
                          required={hasStructure}
                          disabled={!watchProgramId || loading}
                          error={errors.season_id?.message || undefined}
                          onChange={(value) => {
                            field.onChange(value)
                            setValue('team_id', '', { shouldValidate: false })
                          }}
                        />
                      )}
                    />
                  </div>
                  )}
                  {hasStructure && (
                  <div className="oa-select-wrapper">
                    <Controller
                      name="team_id"
                      control={control}
                      rules={{ required: hasStructure ? t('admin.events.validation.teamRequired') : false }}
                      render={({ field }) => (
                    <Select
                      {...field}
                      value={field.value || ''}
                      label={t('admin.events.fields.team')}
                          options={teams.map(t => ({ value: t.id, label: t.name }))}
                          required={hasStructure}
                          disabled={!watchSeasonId || loading}
                          error={errors.team_id?.message || undefined}
                        />
                      )}
                    />
                  </div>
                  )}
                </div>
                <div className="oa-form-grid oa-form-grid-3 oa-mb-4">
                  <div className="oa-select-wrapper">
                <Controller name="type" control={control} render={({ field }) => <Select {...field} value={field.value || ''} label={t('admin.events.fields.eventType')} options={eventTypeOptions} />} />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Date & Time" className="oa-mb-6">
              <div className="oa-form-section-body">
                <p className="oa-form-section-subtitle oa-mb-4">Schedule the date, start, end, and arrival windows for this event.</p>
                <div className="oa-form-grid oa-form-grid-4 oa-form-grid-tablet-2col">
                  <Controller 
                    name="start_time" 
                    control={control} 
                    rules={{ required: t('admin.events.validation.startTimeRequired') }} 
                    render={({ field }) => (
                      <DateTimePicker 
                        label="Event Date" 
                        value={field.value ? field.value.split('T')[0] : ''}
                        onChange={(date) => {
                          const time = field.value?.split('T')[1] || '09:00'
                          field.onChange(`${date}T${time}`)
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        error={errors.start_time?.message}
                      />
                    )} 
                  />
                  <div className="oa-max-w-xs">
                    <Controller 
                      name="start_time" 
                      control={control} 
                      render={({ field }) => (
                        <TimePicker 
                          label="Start Time" 
                          value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                          onChange={(time) => {
                            const date = field.value?.split('T')[0] || new Date().toISOString().split('T')[0]
                            field.onChange(`${date}T${time}`)
                          }}
                          required
                        />
                      )} 
                    />
                  </div>
                  <div className="oa-max-w-xs">
                    <Controller 
                      name="end_time" 
                      control={control} 
                      render={({ field }) => (
                        <TimePicker 
                          label="End Time" 
                          value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                          onChange={(time) => {
                            const startDate = watch('start_time')?.split('T')[0] || new Date().toISOString().split('T')[0]
                            field.onChange(time ? `${startDate}T${time}` : '')
                          }}
                          error={errors.end_time?.message}
                        />
                      )} 
                    />
                  </div>
                  <div className="oa-max-w-xs">
                    <Controller 
                      name="arrival_time" 
                      control={control} 
                      render={({ field }) => (
                        <TimePicker 
                          label="Arrival Time" 
                          value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                          onChange={(time) => {
                            const startDate = watch('start_time')?.split('T')[0] || new Date().toISOString().split('T')[0]
                            field.onChange(time ? `${startDate}T${time}` : '')
                          }}
                        />
                      )} 
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Location" className="oa-mb-6">
              <div className="oa-form-section-body">
                <p className="oa-form-section-subtitle oa-mb-4">Point to a venue, mark the event as TBD, or capture a virtual link.</p>
                <div className="oa-mb-2">
                  <Button type="button" variant="ghost" onClick={() => setShowLocationDetails(!showLocationDetails)}>{showLocationDetails ? 'Simple Location' : 'Detailed Location'}</Button>
                </div>
                <div className="oa-space-y-4">
                  <div className="oa-form-grid oa-form-grid-2 oa-form-grid-tablet-2col">
                    <Controller
                      name="location.venue_name"
                      control={control}
                      render={({ field }) => (
                        <LocationAutocomplete
                          value={field.value || ''}
                          onInputChange={field.onChange}
                          onChange={(address: StructuredAddress, placeResult?: google.maps.places.PlaceResult) => {
                            startTransition(() => {
                              const placeName = placeResult?.name && placeResult.name !== address.formatted_address
                                ? placeResult.name
                                : ''
                              setValue('location.venue_name', placeName, { shouldValidate: false, shouldDirty: true })
                              setValue('location.address_line1', address.formatted_address, { shouldValidate: false, shouldDirty: true })
                              setValue('location.city', address.city, { shouldValidate: false, shouldDirty: true })
                              setValue('location.state', address.state, { shouldValidate: false, shouldDirty: true })
                              setValue('location.postal_code', address.postal_code, { shouldValidate: false, shouldDirty: true })
                              setValue('location.place_id', address.place_id, { shouldValidate: false, shouldDirty: true })
                              setValue('location.latitude', String(validateCoordinate(address.latitude) ?? ''), { shouldValidate: false, shouldDirty: true })
                              setValue('location.longitude', String(validateCoordinate(address.longitude) ?? ''), { shouldValidate: false, shouldDirty: true })
                              if (placeName) field.onChange(placeName)
                            })
                          }}
                          label={t('admin.events.location.venueName')}
                          placeholder="Search for venue..."
                          types={['establishment', 'geocode']}
                        />
                      )}
                    />
                    <Controller
                      name="location.address_line1"
                      control={control}
                      render={({ field }) => <Input {...field} label={t('admin.events.location.address')} />}
                    />
                  </div>
                  
                  {showLocationDetails && (
                    <>
                      <div className="oa-form-grid oa-form-grid-3 oa-form-grid-tablet-2col">
                        <Controller name="location.city" control={control} render={({ field }) => <Input {...field} label={t('admin.events.location.city')} />} />
                        <Controller name="location.state" control={control} render={({ field }) => <Input {...field} label={t('admin.events.location.state')} />} />
                        <Controller name="location.postal_code" control={control} render={({ field }) => <Input {...field} label={t('admin.events.location.postalCode')} />} />
                      </div>
                      <div className="oa-checkbox-stack">
                        <Controller name="location.is_tbd" control={control} render={({ field: { value, onChange } }) => <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} label={t('admin.events.location.isTBD')} />} />
                        <Controller name="location.is_virtual" control={control} render={({ field: { value, onChange } }) => <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} label={t('admin.events.location.isVirtual')} />} />
                      </div>
                      <Controller name="location.virtual_link" control={control} render={({ field }) => <Input {...field} label={t('admin.events.location.virtualLink')} placeholder="https://zoom.us/..." />} />
                    </>
                  )}
                </div>
              </div>
            </Card>
          
          {!ticketingGateLoading && ticketingAllowed && (
            <Card title={t('admin.events.ticketing.title')} className="oa-mb-6">
              <div className="oa-form-section-body">
                <p className="oa-form-section-subtitle oa-mb-4">Activate ticket sales, control the sales window, and manage inventory.</p>
                <div className="oa-checkbox-stack">
                  <Controller 
                    name="ticketing.is_ticketed" 
                    control={control} 
                    render={({ field: { value, onChange } }) => (
                      <Checkbox 
                        checked={!!value} 
                        onChange={(e) => onChange(e.target.checked)} 
                        label={t('admin.events.ticketing.isTicketed')}
                      />
                    )} 
                  />
                </div>

                {watchTicketingEnabled && (
                  <div className="oa-card oa-ticket-card oa-mb-4">
                    <div className="oa-mb-4">
                      <Controller
                        name="notes"
                        control={control}
                        render={({ field }) => (
                          <div className="oa-space-y-2">
                            <label className="oa-label">Internal Notes / Description</label>
                            <textarea
                              className="oa-input oa-textarea"
                              {...field}
                              placeholder="Internal notes (not shown to public)"
                              rows={2}
                            />
                          </div>
                        )}
                      />
                    </div>

                    <div className="oa-mb-4">
                      <Controller
                        name="ticketing.event_description"
                        control={control}
                        rules={{ maxLength: { value: 500, message: 'Max 500 characters' } }}
                        render={({ field }) => (
                          <div className="oa-space-y-2">
                            <label className="oa-label">Public Event Description</label>
                            <textarea
                              className="oa-input oa-textarea oa-textarea-expand"
                              {...field}
                              placeholder="Description shown to public users..."
                              rows={4}
                              maxLength={500}
                            />
                            {errors.ticketing?.event_description?.message && (
                              <span className="oa-error-message">{errors.ticketing.event_description.message}</span>
                            )}
                          </div>
                        )}
                      />
                    </div>

                    <div className="oa-mb-4">
                      <FileUpload
                        label="Ticket Banner Image"
                        onFileSelect={setBannerFile}
                        value={bannerFile}
                        accept="image/*"
                        maxSize={5 * 1024 * 1024}
                        buttonText="Upload Banner"
                        replaceText="Replace Banner"
                        helperText="Suggested size: 1200 x 400 px (3:1). Max 5MB."
                        showDropZone={true}
                        fullWidth={true}
                      />

                      {watch('ticketing.ticket_banner_url') && !bannerFile && (
                        <div className="oa-bg-surface-section oa-p-3 oa-rounded-lg oa-border oa-border-border-subtle oa-mt-4">
                          <p className="oa-text-xs oa-font-bold oa-uppercase oa-text-muted oa-mb-2">Current Banner</p>
                          <div className="oa-relative oa-w-full oa-h-32 oa-rounded-md oa-overflow-hidden oa-bg-gray-100 dark:oa-bg-gray-800">
                            <img
                              src={watch('ticketing.ticket_banner_url')}
                              alt="Current Banner"
                              className="oa-w-full oa-h-full oa-object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="oa-mb-4">
                      <Controller
                        name="ticketing.event_type"
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            value={field.value || 'other'}
                            label={t('admin.events.ticketing.eventType.label')}
                            options={[
                              { value: 'game', label: t('admin.events.ticketing.eventType.game') },
                              { value: 'tournament', label: t('admin.events.ticketing.eventType.tournament') },
                              { value: 'concert', label: t('admin.events.ticketing.eventType.concert') },
                              { value: 'fundraiser', label: t('admin.events.ticketing.eventType.fundraiser') },
                              { value: 'other', label: t('admin.events.ticketing.eventType.other') },
                            ]}
                          />
                        )}
                      />
                      <p className="oa-text-xs oa-text-muted oa-mt-1">{t('admin.events.ticketing.eventType.helper')}</p>
                    </div>

                    <div className="oa-mb-4">
                      <Controller
                        name="ticketing.status"
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            value={field.value || 'draft'}
                            label={t('admin.events.ticketing.status.label')}
                            options={[
                              { value: 'draft', label: t('admin.events.ticketing.status.draft') },
                              { value: 'published', label: t('admin.events.ticketing.status.published') },
                            ]}
                          />
                        )}
                      />
                    </div>

                    <div className="oa-mb-4">
                      <Controller
                        name="ticketing.sales_immediate"
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            checked={!!field.value}
                            onChange={(e) => {
                              field.onChange(e.target.checked)
                              if (e.target.checked) {
                                setValue('ticketing.sales_start_at', '', { shouldValidate: false })
                                setValue('ticketing.sales_end_at', '', { shouldValidate: false })
                              }
                            }}
                            label="Immediately"
                          />
                        )}
                      />
                    </div>

                    {!watchTicketSalesImmediate && (
                      <div className="oa-form-grid oa-form-grid-4 oa-form-grid-tablet-2col oa-mb-4">
                        <Controller
                          name="ticketing.sales_start_at"
                          control={control}
                          rules={{
                            validate: () => true
                          }}
                          render={({ field }) => (
                            <DateTimePicker
                              label={t('admin.events.ticketing.salesWindow.startDate' as any)}
                              value={field.value ? field.value.split('T')[0] : ''}
                              min={new Date().toISOString().slice(0, 10)}
                              onChange={(date) => {
                                const time = field.value?.split('T')[1] || '00:00'
                                field.onChange(`${date}T${time}`)
                              }}
                              error={errors.ticketing?.sales_start_at?.message}
                            />
                          )}
                        />
                        <div className="oa-max-w-xs">
                          <Controller
                            name="ticketing.sales_start_at"
                            control={control}
                            rules={{
                              validate: (_value) => {
                                if (watchTicketSalesImmediate) return true
                                return true
                              }
                            }}
                            render={({ field }) => (
                              <TimePicker
                                label={t('admin.events.ticketing.salesWindow.startTime' as any)}
                                value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                                onChange={(time) => {
                                  const date = field.value?.split('T')[0] || new Date().toISOString().split('T')[0]
                                  field.onChange(`${date}T${time}`)
                                }}
                                error={errors.ticketing?.sales_start_at?.message}
                              />
                            )}
                          />
                        </div>
                        <Controller
                          name="ticketing.sales_end_at"
                          control={control}
                          rules={{
                            validate: (value) => {
                              if (watchTicketSalesImmediate) return true
                              const startAt = watch('ticketing.sales_start_at')
                              if (startAt && value && new Date(value) <= new Date(startAt)) {
                                return t('admin.events.ticketing.salesWindow.endAfterStart' as any)
                              }
                              const eventStart = watch('start_time')
                              if (eventStart && value && new Date(value) > new Date(eventStart)) {
                                return t('admin.events.ticketing.salesWindow.endNotAfterEventStart' as any)
                              }
                              return true
                            }
                          }}
                          render={({ field }) => (
                            <DateTimePicker
                              label={t('admin.events.ticketing.salesWindow.endDate' as any)}
                              value={field.value ? field.value.split('T')[0] : ''}
                              max={watch('start_time')?.split('T')[0]}
                              onChange={(date) => {
                                const time = field.value?.split('T')[1] || '23:59'
                                field.onChange(`${date}T${time}`)
                              }}
                              error={errors.ticketing?.sales_end_at?.message}
                            />
                          )}
                        />
                        <div className="oa-max-w-xs">
                          <Controller
                            name="ticketing.sales_end_at"
                            control={control}
                            rules={{
                              validate: (value) => {
                                if (watchTicketSalesImmediate) return true
                                const startAt = watch('ticketing.sales_start_at')
                                if (startAt && value && new Date(value) <= new Date(startAt)) {
                                  return t('admin.events.ticketing.salesWindow.endAfterStart' as any)
                                }
                                const eventStart = watch('start_time')
                                if (eventStart && value && new Date(value) > new Date(eventStart)) {
                                  return t('admin.events.ticketing.salesWindow.endNotAfterEventStart' as any)
                                }
                                return true
                              }
                            }}
                            render={({ field }) => (
                              <TimePicker
                                label={t('admin.events.ticketing.salesWindow.endTime' as any)}
                                value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                                onChange={(time) => {
                                  const date = field.value?.split('T')[0] || new Date().toISOString().split('T')[0]
                                  field.onChange(`${date}T${time}`)
                                }}
                                error={errors.ticketing?.sales_end_at?.message}
                              />
                            )}
                          />
                        </div>
                      </div>
                    )}

                    <div className="oa-mb-4">
                      <div className="oa-flex oa-items-center oa-justify-between oa-mb-2">
                        <label className="oa-label">{t('admin.events.ticketing.ticketTypes.label')}</label>
                        <Button
                          type="button"
                          variant="ghost"
                            onClick={() => appendTicketType({ name: '', price_dollars: '', capacity: '', description: '' })}
                        >
                          {t('admin.events.ticketing.ticketTypes.add')}
                        </Button>
                      </div>
                      
                      {ticketTypeFields.length === 0 ? (
                        <p className="oa-text-sm oa-text-muted">{t('admin.events.ticketing.ticketTypes.none')}</p>
                      ) : (
                        <div className="oa-space-y-3">
                          {ticketTypeFields.map((field, index) => (
                            <div key={field.id} className="oa-ticket-type-card">
                              <div className="oa-form-grid oa-form-grid-3 oa-mb-2">
                                <Controller
                                  name={`ticketing.ticket_types.${index}.name`}
                                  control={control}
                                  rules={{
                                    validate: (value) => {
                                      const price = watch(`ticketing.ticket_types.${index}.price_dollars`)
                                      const capacity = watch(`ticketing.ticket_types.${index}.capacity`)
                                      if (price || capacity) {
                                        return value?.trim() ? true : t('admin.events.ticketing.ticketTypes.name.required')
                                      }
                                      return true
                                    }
                                  }}
                                  render={({ field }) => (
                                    <Input
                                      {...field}
                                      label={t('admin.events.ticketing.ticketTypes.name.label')}
                                      placeholder={t('admin.events.ticketing.ticketTypes.name.placeholder')}
                                      error={errors.ticketing?.ticket_types?.[index]?.name?.message}
                                    />
                                  )}
                                />
                                <Controller
                                  name={`ticketing.ticket_types.${index}.price_dollars`}
                                  control={control}
                                  rules={{
                                    validate: (value) => {
                                      const name = watch(`ticketing.ticket_types.${index}.name`)
                                      if (name?.trim()) {
                                        const parsed = parseFloat(value || '0')
                                        if (isNaN(parsed) || parsed < 0) {
                                          return 'Price must be a valid number >= 0'
                                        }
                                      }
                                      return true
                                    }
                                  }}
                                  render={({ field }) => (
                                    <Input
                                      {...field}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      label="Price ($)"
                                      placeholder="0.00"
                                      error={errors.ticketing?.ticket_types?.[index]?.price_dollars?.message}
                                    />
                                  )}
                                />
                                <div className="oa-ticket-type-actions">
                                  <Controller
                                    name={`ticketing.ticket_types.${index}.capacity`}
                                    control={control}
                                    rules={{
                                      validate: (value) => {
                                        if (value?.trim()) {
                                          const parsed = parseInt(value)
                                          if (isNaN(parsed) || parsed <= 0) {
                                            return t('admin.events.ticketing.ticketTypes.capacity.invalid')
                                          }
                                        }
                                        return true
                                      }
                                    }}
                                    render={({ field }) => (
                                      <Input
                                        {...field}
                                        type="number"
                                        min="1"
                                        label={t('admin.events.ticketing.ticketTypes.capacity.label')}
                                        placeholder={t('admin.events.ticketing.ticketTypes.capacity.placeholder')}
                                        error={errors.ticketing?.ticket_types?.[index]?.capacity?.message}
                                      />
                                    )}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => removeTicketType(index)}
                                  >
                                    {t('admin.events.ticketing.ticketTypes.remove')}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
          
            <Card title="RSVP & Recurrence" className="oa-mb-6">
              <div className="oa-form-section-body">
                <p className="oa-form-section-subtitle oa-mb-4">Collect RSVPs and set up recurring sessions for the event.</p>
                <div className="oa-checkbox-stack oa-mb-4">
                  {!watchTicketingEnabled && (
                    <Controller name="rsvp_enabled" control={control} render={({ field: { value, onChange } }) => (
                      <Checkbox checked={!!value} onChange={(e) => {
                        onChange(e.target.checked)
                        if (!e.target.checked) {
                          setValue('rsvp_type', null)
                        }
                      }} label="RSVP Required?" />
                    )} />
                  )}
                  <Controller name="recurring.enabled" control={control} render={({ field: { value, onChange } }) => (
                    <Checkbox checked={!!value} onChange={(e) => { onChange(e.target.checked); setShowRecurring(e.target.checked); }} label="Recurring Event?" />
                  )} />
                </div>

                {watchRSVPEnabled && (
                  <div className="oa-mb-4">
                    <div className="oa-select-wrapper">
                      <Controller 
                        name="rsvp_type" 
                        control={control} 
                        rules={{ required: watchRSVPEnabled ? 'RSVP type is required' : false }}
                        render={({ field }) => (
                          <Select 
                            {...field} 
                            value={field.value || ''}
                            label="RSVP Type" 
                            options={[
                              {value: 'general', label: t('admin.events.rsvpType.general')},
                              {value: 'athlete', label: t('admin.events.rsvpType.athlete')}
                            ]}
                            required
                            error={errors.rsvp_type?.message || undefined}
                          />
                        )} 
                      />
                    </div>
                  </div>
                )}

                {showRecurring && (
                  <div className="oa-form-grid oa-form-grid-2 oa-form-grid-tablet-2col">
                    <div className="oa-select-wrapper">
                      <Controller name="recurring.frequency" control={control} render={({ field }) => <Select {...field} label="Frequency" options={[{value:'weekly', label:'Weekly'}]} />} />
                    </div>
                    <div className="oa-max-w-sm">
                      <Controller name="recurring.end_date" control={control} render={({ field }) => <DateTimePicker {...field} label="Recurs Until" />} />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Notes & Prep" className="oa-mb-6">
              <div className="oa-form-section-body">
                <p className="oa-form-section-subtitle oa-mb-4">Capture uniform, equipment, and general notes for coaches and families.</p>
                <div className="oa-form-grid oa-form-grid-2 oa-mb-6">
                  <div className="oa-space-y-2">
                    <Controller name="uniform_notes" control={control} render={({ field }) => <Input {...field} label="Uniform Notes" placeholder="e.g. Home Kit" />} />
                    <Controller name="equipment_notes" control={control} render={({ field }) => <Input {...field} label="Equipment Notes" placeholder="e.g. Bring water" />} />
                  </div>
                  <div className="oa-notes-group">
                    <label className="oa-label">{t('admin.events.fields.generalNotes')}</label>
                    <Controller name="notes" control={control} render={({ field }) => (
                      <textarea 
                        className="oa-input oa-textarea oa-textarea-expand" 
                        {...field} 
                        placeholder="General Notes..." 
                      />
                    )} />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Fan Visibility" className="oa-mb-6">
              <div className="oa-form-section-body">
                <p className="oa-form-section-subtitle oa-mb-4">Control who can see this event in the public fan portal.</p>
                <Checkbox
                  checked={visibility === 'public'}
                  onChange={(e) => setVisibility(e.target.checked ? 'public' : 'private')}
                  label="Visible to Fans"
                  disabled={saving}
                  helper={watchTicketingEnabled ? 'Ticketed events shown to fans may include payment access.' : 'When enabled, this event appears in fan-facing views.'}
                />
              </div>
            </Card>

          {/* SECTION 8: ACTIONS */}
          {/* Mobile: Full-width stacked | Tablet: Full-width or right-aligned | Desktop: Right-aligned */}
          <div className="oa-form-actions">
            <OrgAdminButton
              variant="primary"
              onClick={() => {
                try {
                  sessionStorage.removeItem(STORAGE_KEY)
                } catch (err) {
                  console.error('Failed to clear saved form data:', err)
                }
                navigate(-1)
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </OrgAdminButton>
            <Button
              type="submit"
              loading={saving}
              className="oa-form-submit-btn w-full sm:w-auto"
            >
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
