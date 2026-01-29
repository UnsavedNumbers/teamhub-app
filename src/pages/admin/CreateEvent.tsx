
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'

import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage, normalizeSupabaseError } from '../../utils/errorUtils'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input, 
  Select,
  DatePicker,
  TimePicker,
  Checkbox,
  Badge
} from '../../components/platformAdmin'
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete'
import type { StructuredAddress } from '../../types/location'
import { startTransition } from 'react'
import { 
    EventFormData, 
    EVENT_TYPE_LABELS, 
    EventType,
} from '../../types/calendar'

const STORAGE_KEY = 'createEvent_formData'
const DRAFT_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

const validateCoordinate = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return null
  return Math.round(num * 1e6) / 1e6
}

interface Team { id: string; name: string }
interface Season { id: string; name: string; team_id: string; is_active?: boolean }

export default function CreateEvent() {
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [showLocationDetails, setShowLocationDetails] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)

  const t = useT()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const hasRestoredRef = useRef(false)

  // Default form values
  const getDefaultValues = (): EventFormData => ({ 
    title: '', 
    type: 'practice', 
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
    rsvp_type: null
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

  const { control, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<EventFormData>({
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

  const watchTeamId = watch('team_id')
  const watchRSVPEnabled = watch('rsvp_enabled')
  
  // Watch all form values for persistence
  const formValues = watch()

  // Clear any saved draft when navigating away (route change/unmount)
  // This keeps drafts only for tab switching / browser discard scenarios.
  useEffect(() => {
    return () => {
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [])

  // Save form data when page visibility changes (user switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Save when user switches away
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
        } catch (err) {
          console.error('Failed to save form data on visibility change:', err)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [formValues, showLocationDetails, showRecurring])

  const fetchTeams = useCallback(async () => {
    if (!isReady) return
    
    // Using Supabase directly for Admin pages to ensure real data access if service is mocked
    const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('org_id', context.orgId!)
        .eq('is_active', true)
        .order('name')
    
    if (!error && data) {
      setTeams(data)
      
      // After teams are loaded, if we have a restored team_id, ensure it's valid
      // Use a small delay to ensure form is initialized
      setTimeout(() => {
        const currentTeamId = watch('team_id')
        if (currentTeamId) {
          const teamExists = data.some(t => t.id === currentTeamId)
          if (!teamExists) {
            // Restored team doesn't exist, clear it
            setValue('team_id', '', { shouldValidate: false })
          } else {
            // Team exists, trigger validation to clear any false errors
            trigger('team_id')
          }
        } else if (data.length === 1) {
          // Auto-select if there's only one team
          setValue('team_id', data[0].id, { shouldValidate: false })
          trigger('team_id')
        }
      }, 100)
    } else if (error) {
       console.error(error)
    }
    setLoading(false)
  }, [context, isReady, watch, setValue, trigger])

  const fetchSeasons = useCallback(async (teamId: string, restoreSeasonId?: string) => {
    if (!isReady || !teamId) {
      setSeasons([])
      setValue('season_id', '', { shouldValidate: false })
      return
    }
    
    // Fetch all seasons for the selected team
    const { data, error } = await supabase
        .from('team_seasons_view')
        .select('season_id, name, is_active, start_date, end_date')
        .eq('team_id', teamId)
        .order('start_date', { ascending: false }) // Most recent/future first

    if (!error && data) {
      // Map all available seasons for the team
      const mappedSeasons = data
        .filter(s => s.season_id && s.name)
        .map(s => ({
          id: s.season_id as string,
          name: s.name as string,
          team_id: teamId,
          is_active: s.is_active ?? false
        }))
      
      console.log('Fetched seasons for team:', teamId, 'Count:', mappedSeasons.length, 'Data:', mappedSeasons)
      setSeasons(mappedSeasons)
      
      // If we have a restored season_id, try to use it if it's valid
      if (restoreSeasonId) {
        const restoredSeason = mappedSeasons.find(s => s.id === restoreSeasonId)
        if (restoredSeason) {
          setValue('season_id', restoredSeason.id, { shouldValidate: false })
          setTimeout(() => trigger('season_id'), 100)
          return
        }
      }
      
      // Auto-select the active season if it exists, otherwise select the first one
      if (mappedSeasons.length > 0) {
        const activeSeason = mappedSeasons.find(s => s.is_active)
        const seasonToSelect = activeSeason || mappedSeasons[0]
        setValue('season_id', seasonToSelect.id, { shouldValidate: false })
        setTimeout(() => trigger('season_id'), 100)
      } else {
        // No seasons available, clear the selection
        setValue('season_id', '', { shouldValidate: false })
      }
    } else {
      // No seasons found or error, clear the selection
      console.error('Error fetching seasons:', error)
      setSeasons([])
      setValue('season_id', '', { shouldValidate: false })
    }
  }, [context, isReady, setValue, trigger])

  useEffect(() => { 
    if (isReady) fetchTeams() 
  }, [isReady, fetchTeams])

  useEffect(() => { 
    if (watchTeamId && isReady) {
      // Check if we have a season_id that needs to be restored
      const currentSeasonId = watch('season_id')
      fetchSeasons(watchTeamId, currentSeasonId || undefined)
    } else if (!watchTeamId) {
      // Team cleared, clear seasons
      setSeasons([])
      setValue('season_id', '', { shouldValidate: false })
    }
  }, [watchTeamId, isReady, fetchSeasons, watch, setValue])

  const onSubmit = async (data: EventFormData) => {
    setSaving(true)
    setError(null)
    setErrorDetail(null)
    
    try {
      // 1. Insert Event
      type EventInsert = Database['public']['Tables']['events']['Insert']
      const eventInsertData = {
        title: data.title,
        type: data.type,
        team_id: data.team_id,
        season_id: data.season_id,
        start_time: new Date(data.start_time).toISOString(),
        end_time: data.end_time ? new Date(data.end_time).toISOString() : new Date(data.start_time).toISOString(),
        arrival_time: data.arrival_time ? new Date(data.arrival_time).toISOString() : null,
        timezone: data.timezone,
        notes: data.notes,
        uniform_notes: data.uniform_notes,
        equipment_notes: data.equipment_notes,
        weather_dependent: data.weather_dependent,
        external_link: data.external_link,
        rsvp_enabled: data.rsvp_enabled,
        rsvp_type: data.rsvp_enabled ? data.rsvp_type : null,
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
          type RecurringPatternInsert = Database['public']['Tables']['recurring_event_patterns']['Insert']
          const recurData = {
              parent_event_id: eventDataAny.id,
              frequency: data.recurring.frequency as Database['public']['Enums']['recurrence_frequency'],
              days_of_week: data.recurring.days_of_week.length > 0 ? data.recurring.days_of_week : [new Date(data.start_time).getDay()],
              end_date: data.recurring.end_date || null,
              max_occurrences: data.recurring.max_occurrences ? parseInt(data.recurring.max_occurrences) : null
          } satisfies RecurringPatternInsert
           const { error: recurError } = await supabase.from('recurring_event_patterns').insert(recurData)
           if (recurError) throw recurError
      }

      // Clear saved form data on successful submission
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch (err) {
        console.error('Failed to clear saved form data:', err)
      }

      navigate('/admin/events')
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
      } else if (rawError.includes('row-level security') || rawError.includes('RLS') || rawError.includes('policy')) {
        friendlyError = "You don't have permission to create this event. Check that you're in the right organization and have admin access."
        detail = displayMessage
      } else if (rawError) {
        friendlyError = 'Failed to create event. Please check all required fields and try again.'
        detail = displayMessage
      }
      
      setError(friendlyError)
      setErrorDetail(detail)
      trigger()
    } finally { 
      setSaving(false) 
    }
  }

  const eventTypeOptions = (Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(key => ({
      value: key,
      label: EVENT_TYPE_LABELS[key]
  }))

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Create Event" 
        subtitle={t('admin.events.createSubtitle')}
        breadcrumbs={[
          { label: 'Events', path: '/admin/events' },
          { label: 'Create Event' },
        ]}
      />
      <div className="pa-form-container">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>
                <div>{error}</div>
                {errorDetail && <div className="pa-mt-2 pa-text-muted" style={{ fontSize: '0.875rem' }}>{errorDetail}</div>}
              </div>
            )}
            
            {/* SECTION 1: EVENT BASICS */}
            <div className="pa-mb-4">
              <Controller name="title" control={control} rules={{ required: t('admin.events.validation.titleRequired'), minLength: { value: 3, message: t('admin.events.validation.titleMinLength') } }} render={({ field }) => <Input {...field} label="Event Title" required error={errors.title?.message || undefined} />} />
            </div>
            
            {/* Mobile: Single column | Tablet: Single column | Desktop: Three columns with medium-width selects */}
            <div className="pa-form-grid pa-form-grid-3 pa-mb-4">
              <div className="pa-select-wrapper">
                <Controller name="type" control={control} render={({ field }) => <Select {...field} value={field.value || ''} label="Event Type" options={eventTypeOptions} />} />
              </div>
              <div className="pa-select-wrapper">
                <Controller 
                  name="team_id" 
                  control={control} 
                  rules={{ required: t('admin.events.validation.teamRequired') }} 
                  render={({ field }) => (
                    <Select 
                      {...field} 
                      value={field.value || ''} 
                      label="Team" 
                      options={teams.map(t => ({value:t.id, label:t.name}))} 
                      required 
                      error={errors.team_id?.message || undefined}
                      onChange={(value) => {
                        field.onChange(value)
                        // Clear season when team changes
                        if (String(value) !== String(field.value)) {
                          setValue('season_id', '', { shouldValidate: false })
                        }
                      }}
                    />
                  )} 
                />
              </div>
              {watchTeamId && seasons.length > 0 ? (
                seasons.length > 1 ? (
                  // Show dropdown when there are multiple seasons
                  <div className="pa-select-wrapper">
                    <Controller 
                      name="season_id" 
                      control={control} 
                      rules={{ required: t('admin.events.validation.seasonRequired') }} 
                      render={({ field }) => (
                        <Select 
                          {...field} 
                          value={field.value || ''} 
                          label="Season" 
                          options={seasons.map(s => ({value:s.id, label:s.name}))} 
                          required 
                          disabled={loading}
                          error={errors.season_id?.message || undefined}
                        />
                      )} 
                    />
                  </div>
                ) : (
                  // Show season name as badge when there's only one season
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label className="pa-label">Season</label>
                    <div style={{ display: 'flex', alignItems: 'center', minHeight: '42px' }}>
                      <Badge variant="info">{seasons[0]?.name || 'No season available'}</Badge>
                    </div>
                    <Controller 
                      name="season_id" 
                      control={control} 
                      rules={{ required: t('admin.events.validation.seasonRequired') }} 
                      render={({ field }) => (
                        <input type="hidden" {...field} value={seasons[0]?.id || ''} />
                      )} 
                    />
                  </div>
                )
              ) : watchTeamId ? (
                // Team selected but no seasons available
                <div>
                  <label className="pa-label">Season</label>
                  <div className="pa-input" style={{ backgroundColor: 'var(--pa-bg-secondary)', cursor: 'not-allowed', color: 'var(--pa-text-muted)' }}>
                    No active or future seasons available
                  </div>
                  <Controller 
                    name="season_id" 
                    control={control} 
                    rules={{ required: t('admin.events.validation.seasonRequired') }} 
                    render={({ field }) => (
                      <input type="hidden" {...field} value="" />
                    )} 
                  />
                </div>
              ) : (
                // No team selected
                <div className="pa-select-wrapper">
                  <Controller 
                    name="season_id" 
                    control={control} 
                    rules={{ required: t('admin.events.validation.seasonRequired') }} 
                    render={({ field }) => (
                      <Select 
                        {...field} 
                        value={field.value || ''} 
                        label="Season" 
                        options={[]} 
                        required 
                        disabled={true}
                        error={errors.season_id?.message || undefined}
                      />
                    )} 
                  />
                </div>
              )}
            </div>

            {/* SECTION 2: DATE + TIME */}
            {/* Mobile: Single column | Tablet: Date + Start Time side-by-side | Desktop: Date + Start Time + End Time + Arrival Time (all in one row) */}
            <div className="pa-mb-4">
              <div className="pa-form-grid pa-form-grid-4 pa-form-grid-tablet-2col">
                <Controller 
                  name="start_time" 
                  control={control} 
                  rules={{ required: t('admin.events.validation.startTimeRequired') }} 
                  render={({ field }) => (
                    <DatePicker 
                      label="Event Date" 
                      value={field.value ? field.value.split('T')[0] : ''}
                      onChange={(date) => {
                        const time = field.value?.split('T')[1] || '09:00'
                        field.onChange(`${date}T${time}`)
                      }}
                      required
                      error={errors.start_time?.message}
                    />
                  )} 
                />
                <div className="pa-max-w-xs">
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
                <div className="pa-max-w-xs">
                  <Controller 
                    name="end_time" 
                    control={control} 
                    rules={{ required: t('admin.events.validation.endTimeRequired') }}
                    render={({ field }) => (
                      <TimePicker 
                        label="End Time" 
                        value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                        onChange={(time) => {
                          const startDate = watch('start_time')?.split('T')[0] || new Date().toISOString().split('T')[0]
                          field.onChange(time ? `${startDate}T${time}` : '')
                        }}
                        required
                        error={errors.end_time?.message}
                      />
                    )} 
                  />
                </div>
                <div className="pa-max-w-xs">
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

          {/* SECTION 3: LOCATION */}
          {/* Venue Name: search like CreateTravelPlan; Address: plain input auto-filled from venue */}
          <div className="pa-mb-4">
            <div className="pa-mb-2">
              <Button type="button" variant="ghost" onClick={() => setShowLocationDetails(!showLocationDetails)}>{showLocationDetails ? 'Simple Location' : 'Detailed Location'}</Button>
            </div>
            
            <div className="pa-space-y-4">
              <div className="pa-form-grid pa-form-grid-2 pa-form-grid-tablet-2col">
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
                      label="Venue Name"
                      placeholder="Search for venue..."
                      types={['establishment', 'geocode']}
                    />
                  )}
                />
                <Controller
                  name="location.address_line1"
                  control={control}
                  render={({ field }) => <Input {...field} label="Address" />}
                />
              </div>
              
              {showLocationDetails && (
                <>
                  {/* Mobile: Single column | Tablet: City + State side-by-side, Zip single | Desktop: City + State + Zip side-by-side */}
                  <div className="pa-form-grid pa-form-grid-3 pa-form-grid-tablet-2col">
                    <Controller name="location.city" control={control} render={({ field }) => <Input {...field} label="City" />} />
                    <Controller name="location.state" control={control} render={({ field }) => <Input {...field} label="State" />} />
                    <Controller name="location.postal_code" control={control} render={({ field }) => <Input {...field} label="Zip Code" />} />
                  </div>
                  {/* Mobile: Vertical | Desktop: Inline */}
                  <div className="pa-checkbox-group pa-checkbox-group--inline">
                    <Controller name="location.is_tbd" control={control} render={({ field: { value, onChange } }) => <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} label="Location TBD" />} />
                    <Controller name="location.is_virtual" control={control} render={({ field: { value, onChange } }) => <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} label="Virtual Event" />} />
                  </div>
                  <Controller name="location.virtual_link" control={control} render={({ field }) => <Input {...field} label="Virtual Link" placeholder="https://zoom.us/..." />} />
                </>
              )}
            </div>
          </div>
          
          {/* SECTION 4: RSVP + RECURRENCE (SETTINGS) */}
          {/* Mobile: Vertical checkboxes | Desktop: Inline checkboxes */}
          <div className="pa-mb-4">
            <div className="pa-checkbox-group pa-checkbox-group--inline pa-mb-4">
              <div className="pa-flex pa-items-center pa-gap-2">
                <span className="pa-label">RSVP Required?</span>
                <Controller name="rsvp_enabled" control={control} render={({ field: { value, onChange } }) => (
                  <Checkbox checked={!!value} onChange={(e) => { 
                    onChange(e.target.checked)
                    if (!e.target.checked) {
                      setValue('rsvp_type', null)
                    }
                  }} label="" />
                )} />
              </div>
              <div className="pa-flex pa-items-center pa-gap-2">
                <span className="pa-label">Recurring Event?</span>
                <Controller name="recurring.enabled" control={control} render={({ field: { value, onChange } }) => (
                  <Checkbox checked={!!value} onChange={(e) => { onChange(e.target.checked); setShowRecurring(e.target.checked); }} label="" />
                )} />
              </div>
            </div>
            
            {watchRSVPEnabled && (
              <div className="pa-mb-4">
                <div className="pa-select-wrapper">
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
              <div className="pa-form-grid pa-form-grid-2 pa-form-grid-tablet-2col">
                <div className="pa-select-wrapper">
                  <Controller name="recurring.frequency" control={control} render={({ field }) => <Select {...field} label="Frequency" options={[{value:'weekly', label:'Weekly'}]} />} />
                </div>
                <div className="pa-max-w-sm">
                  <Controller name="recurring.end_date" control={control} render={({ field }) => <DatePicker {...field} label="Recurs Until" />} />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: NOTES + PREP */}
          {/* Mobile: Single column | Tablet: Single column | Desktop: Uniform/Equipment (left) + General Notes (right) side-by-side */}
          <div className="pa-form-grid pa-form-grid-2 pa-mb-6">
            <div className="pa-space-y-2">
              <Controller name="uniform_notes" control={control} render={({ field }) => <Input {...field} label="Uniform Notes" placeholder="e.g. Home Kit" />} />
              <Controller name="equipment_notes" control={control} render={({ field }) => <Input {...field} label="Equipment Notes" placeholder="e.g. Bring water" />} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label className="pa-label" style={{ display: 'block', marginBottom: 'var(--pa-space-2)' }}>General Notes</label>
              <Controller name="notes" control={control} render={({ field }) => (
                <textarea 
                  className="pa-input pa-textarea" 
                  {...field} 
                  placeholder="General Notes..." 
                  style={{ 
                    flex: '1',
                    minHeight: '80px',
                    width: '100%',
                    resize: 'vertical'
                  }} 
                />
              )} />
            </div>
          </div>

          {/* SECTION 6: ACTIONS */}
          {/* Mobile: Full-width stacked | Tablet: Full-width or right-aligned | Desktop: Right-aligned */}
          <div className="pa-form-actions">
            <Button 
              variant="blue" 
              onClick={() => {
                // Clear saved form data when canceling
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
            </Button>
            <Button type="submit" loading={saving} className="pa-form-submit-btn w-full sm:w-auto">Create Event</Button>
          </div>
        </form>
      </Card>
      </div>
    </div>
  )
}

