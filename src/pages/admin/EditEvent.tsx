import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { startTransition } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getErrorMessage } from '../../utils/errorUtils'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { getLink } from '../../utils/routes'
import { showSuccess, showError } from '../../utils/toast'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input, 
  Select,
  DatePicker,
  TimePicker,
  Checkbox
} from '../../components/platformAdmin'
import { ConfirmDialog } from '../../components/platformAdmin/ConfirmDialog'
import { LocationAutocomplete } from '../../components/common/LocationAutocomplete'
import { 
    EventFormData, 
    EVENT_TYPE_LABELS, 
    EventType,
    isValidEventTimeOrder,
    RecurringEditMode,
} from '../../types/calendar'

interface Team { id: string; name: string }
interface Season { id: string; name: string; team_id: string }

export default function EditEvent() {
  const { eventId } = useParams<{ eventId: string }>()
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRsvpChangeDialog, setShowRsvpChangeDialog] = useState(false)
  const [pendingRsvpChange, setPendingRsvpChange] = useState<EventFormData | null>(null)
  const [showLocationDetails, setShowLocationDetails] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [hasExistingRSVPs, setHasExistingRSVPs] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringEditMode, setRecurringEditMode] = useState<RecurringEditMode>('this_only')
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [cancelDialog, setCancelDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()
  const { isOffline } = useOffline()

  const { control, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<EventFormData>({
    defaultValues: { 
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
    },
  })

  const watchTeamId = watch('team_id')
  const watchRSVPEnabled = watch('rsvp_enabled')


  const fetchEvent = useCallback(async () => {
    if (!isReady || !eventId) return
    
    // Validate eventId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(eventId)) {
      setError('Invalid event ID format')
      setNotFound(true)
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    setNotFound(false)
    
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          event_location:event_locations(*),
          recurring_pattern:recurring_event_patterns(*)
        `)
        .eq('id', eventId)
        .single() as { data: {
          id: string
          title: string
          type: string
          team_id: string
          season_id: string
          start_time: string
          end_time: string | null
          arrival_time: string | null
          timezone: string
          notes: string | null
          uniform_notes: string | null
          equipment_notes: string | null
          weather_dependent: boolean | null
          external_link: string | null
          rsvp_enabled: boolean | null
          rsvp_type: string | null
          event_location?: {
            venue_name: string | null
            address_line1: string | null
            address_line2: string | null
            city: string | null
            state: string | null
            postal_code: string | null
            place_id: string | null
            latitude: number | null
            longitude: number | null
            is_tbd: boolean | null
            is_virtual: boolean | null
            virtual_link: string | null
          }
          recurring_pattern?: {
            id: string
            frequency: string
            days_of_week: number[]
            end_date: string | null
            max_occurrences: number | null
          } | null
        } | null; error: { message?: string; code?: string } | null }

      if (eventError) {
        // Check if it's a permission error or not found
        if (eventError.code === 'PGRST116' || eventError.message?.includes('No rows')) {
          setNotFound(true)
          setError('Event not found')
        } else if (eventError.message?.includes('permission') || eventError.message?.includes('RLS')) {
          setError('You do not have permission to view this event')
        } else {
          throw eventError
        }
        setLoading(false)
        return
      }
      
      if (!event) {
        setNotFound(true)
        setError('Event not found')
        setLoading(false)
        return
      }

      // Check for existing RSVPs with safe error handling
      let generalCount = 0
      let athleteCount = 0
      
      try {
        const { count: genCount } = await supabase
          .from('event_general_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
        generalCount = genCount ?? 0
      } catch (err) {
        console.warn('Error checking general RSVPs:', err)
      }

      try {
        const { count: athCount } = await supabase
          .from('event_rsvps')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
        athleteCount = athCount ?? 0
      } catch (err) {
        console.warn('Error checking athlete RSVPs:', err)
      }

      setHasExistingRSVPs(generalCount > 0 || athleteCount > 0)

      // Populate form with safe defaults
      const startDate = event.start_time ? new Date(event.start_time) : new Date()
      const endDate = event.end_time ? new Date(event.end_time) : new Date()
      
      setValue('title', event.title || '')
      setValue('type', (event.type as any) || 'practice')
      setValue('team_id', event.team_id || '')
      setValue('season_id', event.season_id || '')
      setValue('start_time', new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
      setValue('end_time', new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
      setValue('arrival_time', event.arrival_time ? new Date(new Date(event.arrival_time).getTime() - new Date(event.arrival_time).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
      setValue('timezone', event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
      setValue('notes', event.notes || '')
      setValue('uniform_notes', event.uniform_notes || '')
      setValue('equipment_notes', event.equipment_notes || '')
      setValue('weather_dependent', event.weather_dependent ?? false)
      setValue('external_link', event.external_link || '')
      setValue('rsvp_enabled', event.rsvp_enabled ?? false)
      setValue('rsvp_type', (event.rsvp_enabled && event.rsvp_type) ? (event.rsvp_type as any) : null)

      if (event.event_location) {
        setValue('location.venue_name', event.event_location.venue_name || '')
        setValue('location.address_line1', event.event_location.address_line1 || '')
        setValue('location.address_line2', event.event_location.address_line2 || '')
        setValue('location.city', event.event_location.city || '')
        setValue('location.state', event.event_location.state || '')
        setValue('location.postal_code', event.event_location.postal_code || '')
        setValue('location.is_tbd', event.event_location.is_tbd || false)
        setValue('location.is_virtual', event.event_location.is_virtual || false)
        setValue('location.virtual_link', event.event_location.virtual_link || '')
        setShowLocationDetails(true)
      }

      // Load recurring pattern if it exists
      if (event.recurring_pattern) {
        setIsRecurring(true)
        setValue('recurring.enabled', true)
        setValue('recurring.frequency', (event.recurring_pattern.frequency as any) || 'weekly')
        setValue('recurring.days_of_week', event.recurring_pattern.days_of_week || [])
        setValue('recurring.end_date', event.recurring_pattern.end_date || '')
        setValue('recurring.max_occurrences', event.recurring_pattern.max_occurrences?.toString() || '')
        setShowRecurring(true)
      }

      // Fetch teams and seasons
      await fetchTeams()
      if (event.team_id) {
        await fetchSeasons(event.team_id)
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err) || 'Failed to load event'
      setError(errorMessage)
      if (err instanceof Error && (err.message.includes('permission') || err.message.includes('RLS'))) {
        setError('You do not have permission to view this event')
      }
    } finally {
      setLoading(false)
    }
  }, [isReady, eventId, setValue])

  const fetchTeams = useCallback(async () => {
    if (!isReady) return
    
    const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('org_id', context.orgId!)
        .eq('is_active', true)
        .order('name')
    
    if (!error && data) {
      setTeams(data)
    }
  }, [context, isReady])

  const fetchSeasons = useCallback(async (teamId: string) => {
    if (!isReady) return
    
    // Use view to get seasons associated with the team
    const { data, error } = await supabase
        .from('team_seasons_view')
        .select('season_id, name')
        .eq('team_id', teamId)
        .eq('is_active', true)
    
    if (!error && data) {
       // Map season_id to id
       const dataAny = data as any[]
       const mappedSeasons = dataAny.map((s: any) => ({
          id: s.season_id,
          name: s.name,
          team_id: teamId
      }))
      setSeasons(mappedSeasons)
    }
  }, [isReady])

  useEffect(() => { 
    if (isReady) fetchEvent() 
  }, [isReady, fetchEvent])

  useEffect(() => { 
    if (watchTeamId && isReady) fetchSeasons(watchTeamId) 
  }, [watchTeamId, isReady, fetchSeasons])

  const handleConfirmRsvpChange = async () => {
    if (!pendingRsvpChange) return
    setShowRsvpChangeDialog(false)
    // Continue with the submission
    await onSubmit(pendingRsvpChange)
    setPendingRsvpChange(null)
  }

  const onSubmit = async (data: EventFormData) => {
    if (!eventId) {
      setError('Event ID is required')
      return
    }

    // Validate event ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(eventId)) {
      setError('Invalid event ID format')
      return
    }

    // Check offline mode
    if (isOffline) {
      setError('Cannot save changes while offline. Please check your connection and try again.')
      showError('You are currently offline. Changes cannot be saved.')
      return
    }

    // Check demo mode
    if (USE_FAKE_DATA) {
      showError('Demo mode: Changes are not saved to the database.')
      // Still allow navigation to show the flow works
      setTimeout(() => {
        navigate(getLink('admin.events.list'))
      }, 1500)
      return
    }

    // Validate time order
    if (data.start_time && data.end_time) {
      if (!isValidEventTimeOrder(data.start_time, data.end_time, data.arrival_time || null)) {
        setError('Invalid time order: End time must be after start time, and arrival time must be before start time.')
        return
      }
    }
    
    setSaving(true)
    setError(null)
    
    try {
      // Check if RSVP type is changing and warn
      if (hasExistingRSVPs && data.rsvp_enabled) {
        const { data: currentEvent, error: currentEventError } = await supabase
          .from('events')
          .select('rsvp_type')
          .eq('id', eventId)
          .single() as { data: { rsvp_type: string | null } | null; error: { message?: string } | null }

        if (!currentEventError && currentEvent?.rsvp_type && currentEvent.rsvp_type !== data.rsvp_type) {
          // Store the data to save after confirmation
          setPendingRsvpChange(data)
          setShowRsvpChangeDialog(true)
          setSaving(false)
          return
        }
      }

      // Use stored procedure for safe RSVP config update
      if (data.rsvp_enabled !== undefined) {
        const { data: configResult, error: configError } = await supabase
          .rpc('update_event_rsvp_config', {
            p_event_id: eventId,
            p_rsvp_enabled: data.rsvp_enabled ?? false,
            p_rsvp_type: data.rsvp_type || null,
            p_clear_existing: true // User confirmed if needed
          } as any)

        if (configError) {
          const configData = (configResult as unknown as { error?: string; has_data?: boolean }) || {}
          if (configData?.error && configData?.has_data) {
            setError('Cannot change RSVP type: existing RSVPs found. Please clear them first.')
            setSaving(false)
            return
          }
          throw configError
        }
      }

      // Update event
      type EventUpdate = Database['public']['Tables']['events']['Update']
      const eventUpdateData = {
        title: data.title,
        type: data.type,
        team_id: data.team_id,
        season_id: data.season_id,
        start_time: new Date(data.start_time).toISOString(),
        end_time: data.end_time ? new Date(data.end_time).toISOString() : undefined,
        arrival_time: data.arrival_time ? new Date(data.arrival_time).toISOString() : null,
        timezone: data.timezone,
        notes: data.notes || null,
        uniform_notes: data.uniform_notes || null,
        equipment_notes: data.equipment_notes || null,
        weather_dependent: data.weather_dependent,
        external_link: data.external_link || null,
      } satisfies EventUpdate
      const { error: updateError } = await supabase
        .from('events')
        .update(eventUpdateData)
        .eq('id', eventId)

      if (updateError) throw updateError

      // Update location
      const { data: locationData } = await supabase
        .from('event_locations')
        .select('id')
        .eq('event_id', eventId)
        .single()

      if (locationData) {
        type LocationUpdate = Database['public']['Tables']['event_locations']['Update']
        const locUpdateData = {
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
        } as LocationUpdate & { place_id: string | null }
        await supabase
          .from('event_locations')
          .update(locUpdateData)
          .eq('id', (locationData as any).id)
      } else {
        type LocationInsert = Database['public']['Tables']['event_locations']['Insert']
        const locInsertData = {
          event_id: eventId,
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
        const { error: locInsertError } = await supabase.from('event_locations').insert(locInsertData)
        if (locInsertError) {
          console.error('Location insert error:', locInsertError)
          // Don't fail the whole update if location insert fails
        }
      }

      // Update recurring pattern if needed
      if (data.recurring?.enabled) {
        const { data: existingPattern } = await supabase
          .from('recurring_event_patterns')
          .select('id')
          .eq('parent_event_id', eventId)
          .single()

        if (existingPattern) {
          type RecurringPatternUpdate = Database['public']['Tables']['recurring_event_patterns']['Update']
          const patternUpdate: RecurringPatternUpdate = {
            frequency: data.recurring.frequency as Database['public']['Enums']['recurrence_frequency'],
            days_of_week: data.recurring.days_of_week.length > 0 ? data.recurring.days_of_week : [new Date(data.start_time).getDay()],
            end_date: data.recurring.end_date || null,
            max_occurrences: data.recurring.max_occurrences ? parseInt(data.recurring.max_occurrences) : null
          }
          const { error: patternError } = await supabase
            .from('recurring_event_patterns')
            .update(patternUpdate)
            .eq('id', (existingPattern as any).id)
          if (patternError) {
            console.error('Recurring pattern update error:', patternError)
            // Don't fail the whole update
          }
        } else if (data.recurring.enabled) {
          type RecurringPatternInsert = Database['public']['Tables']['recurring_event_patterns']['Insert']
          const patternInsert: RecurringPatternInsert = {
            parent_event_id: eventId,
            frequency: data.recurring.frequency as Database['public']['Enums']['recurrence_frequency'],
            days_of_week: data.recurring.days_of_week.length > 0 ? data.recurring.days_of_week : [new Date(data.start_time).getDay()],
            end_date: data.recurring.end_date || null,
            max_occurrences: data.recurring.max_occurrences ? parseInt(data.recurring.max_occurrences) : null
          }
          const { error: patternError } = await supabase
            .from('recurring_event_patterns')
            .insert(patternInsert)
          if (patternError) {
            console.error('Recurring pattern insert error:', patternError)
            // Don't fail the whole update
          }
        }
      }

      showSuccess('Event updated successfully!')
      navigate(getLink('admin.events.list'))
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err) || 'Failed to update event'
      setError(errorMessage)
      showError(errorMessage)
      
      // Handle specific error cases
      if (err instanceof Error) {
        if (err.message.includes('permission') || err.message.includes('RLS')) {
          setError('You do not have permission to update this event')
        } else if (err.message.includes('violates foreign key')) {
          setError('Invalid team or season selected. Please verify your selections.')
        } else if (err.message.includes('violates check constraint')) {
          setError('Invalid data provided. Please check all fields and try again.')
        }
      }
    } finally { 
      setSaving(false) 
    }
  }

  const eventTypeOptions = (Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(key => ({
      value: key,
      label: EVENT_TYPE_LABELS[key]
  }))

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />

  if (notFound) {
    return (
      <div className="pa-root">
        <AdminPageHeader 
          title="Event Not Found" 
          breadcrumbs={[
            { label: 'Events', path: getLink('admin.events.list') },
            { label: 'Edit Event' },
          ]}
        />
        <Card>
          <div className="pa-text-center pa-py-8">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--pa-warning)', marginBottom: 'var(--pa-space-4)' }}>
              event_busy
            </span>
            <h2 className="pa-heading-2 pa-mb-2">Event Not Found</h2>
            <p className="pa-body pa-mb-6">{error || 'The event you are looking for does not exist or has been deleted.'}</p>
            <Button onClick={() => navigate(getLink('admin.events.list'))}>Back to Events</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Edit Event" 
        subtitle={t('admin.events.editSubtitle')}
        breadcrumbs={[
          { label: 'Events', path: getLink('admin.events.list') },
          { label: 'Edit Event' },
        ]}
      />
      <div className="pa-form-container">
        {/* Offline indicator */}
        {isOffline && (
          <Card className="pa-mb-4" style={{ background: 'var(--pa-warning-bg)', border: '1px solid var(--pa-warning)' }}>
            <div className="pa-flex pa-items-center pa-gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>wifi_off</span>
              <span className="pa-body-s">You are offline. Changes cannot be saved until you reconnect.</span>
            </div>
          </Card>
        )}

        {/* Demo mode indicator */}
        {USE_FAKE_DATA && (
          <Card className="pa-mb-4" style={{ background: 'var(--pa-info-bg)', border: '1px solid var(--pa-info)' }}>
            <div className="pa-flex pa-items-center pa-gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>info</span>
              <span className="pa-body-s">Demo mode: Changes will not be saved to the database.</span>
            </div>
          </Card>
        )}

        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
            {hasExistingRSVPs && watchRSVPEnabled && (
              <div className="pa-card pa-mb-4 pa-text-warning" style={{ background: 'var(--pa-warning-bg)', border: 'none' }}>
                Warning: This event has existing RSVP responses. Changing RSVP type will delete them.
              </div>
            )}
            
            {/* SECTION 1: EVENT BASICS */}
            <div className="pa-mb-4">
              <Controller name="title" control={control} rules={{ required: 'Title is required' }} render={({ field }) => <Input {...field} label="Event Title" required error={errors.title?.message || undefined} />} />
            </div>

            <div className="pa-grid pa-grid-3 pa-mb-4 pa-gap-4">
              <Controller name="type" control={control} render={({ field }) => <Select {...field} value={field.value || ''} label="Event Type" options={eventTypeOptions} />} />
              <Controller name="team_id" control={control} rules={{ required: 'Team is required' }} render={({ field }) => <Select {...field} value={field.value || ''} label="Team" options={teams.map(t => ({value:t.id, label:t.name}))} required error={errors.team_id?.message || undefined} />} />
              <Controller name="season_id" control={control} rules={{ required: 'Season is required' }} render={({ field }) => <Select {...field} value={field.value || ''} label="Season" options={seasons.map(s => ({value:s.id, label:s.name}))} required disabled={!watchTeamId} />} />
            </div>

            {/* SECTION 2: DATE + TIME */}
            <div className="pa-mb-4">
              <div className="pa-form-grid pa-form-grid-4 pa-form-grid-tablet-2col">
                <Controller 
                  name="start_time" 
                  control={control} 
                  rules={{ required: 'Start date and time are required' }} 
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
                    render={({ field }) => (
                      <TimePicker 
                        label="End Time" 
                        value={field.value ? field.value.split('T')[1]?.substring(0, 5) || '' : ''}
                        onChange={(time) => {
                          const startDate = watch('start_time')?.split('T')[0] || new Date().toISOString().split('T')[0]
                          field.onChange(time ? `${startDate}T${time}` : '')
                        }}
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
          <div className="pa-mb-4">
            <div className="pa-flex pa-justify-between pa-items-center pa-mb-2">
              <div className="pa-label">Location</div>
              <Button type="button" variant="ghost" onClick={() => setShowLocationDetails(!showLocationDetails)}>{showLocationDetails ? 'Simple Location' : 'Detailed Location'}</Button>
            </div>
            
            <div className="pa-space-y-4">
              <div className="pa-grid pa-grid-2 pa-gap-4">
                <Controller name="location.venue_name" control={control} render={({ field }) => <Input {...field} label="Venue Name" placeholder="e.g. Field 1" />} />
                <Controller
                  name="location.address_line1"
                  control={control}
                  render={({ field }) => (
                    <LocationAutocomplete
                      value={field.value || ''}
                      onInputChange={field.onChange}
                      onChange={(address) => {
                        startTransition(() => {
                          setValue('location.address_line1', address.address_line1, { shouldValidate: false, shouldDirty: true })
                          setValue('location.city', address.city, { shouldValidate: false, shouldDirty: true })
                          setValue('location.state', address.state, { shouldValidate: false, shouldDirty: true })
                          setValue('location.postal_code', address.postal_code, { shouldValidate: false, shouldDirty: true })
                          setValue('location.place_id', address.place_id, { shouldValidate: false, shouldDirty: true })
                          setValue('location.latitude', address.latitude.toString(), { shouldValidate: false, shouldDirty: true })
                          setValue('location.longitude', address.longitude.toString(), { shouldValidate: false, shouldDirty: true })
                          trigger(['location.address_line1', 'location.city', 'location.state', 'location.postal_code'])
                        })
                      }}
                      label="Address"
                      placeholder="Enter an address"
                    />
                  )}
                />
              </div>
              
              {showLocationDetails && (
                <>
                  <div className="pa-grid pa-grid-3 pa-gap-4">
                    <Controller name="location.city" control={control} render={({ field }) => <Input {...field} label="City" />} />
                    <Controller name="location.state" control={control} render={({ field }) => <Input {...field} label="State" />} />
                    <Controller name="location.postal_code" control={control} render={({ field }) => <Input {...field} label="Zip Code" />} />
                  </div>
                  <div className="pa-flex pa-gap-4">
                    <Controller name="location.is_tbd" control={control} render={({ field: { value, onChange } }) => <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} label="Location TBD" />} />
                    <Controller name="location.is_virtual" control={control} render={({ field: { value, onChange } }) => <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} label="Virtual Event" />} />
                  </div>
                  <Controller name="location.virtual_link" control={control} render={({ field }) => <Input {...field} label="Virtual Link" placeholder="https://zoom.us/..." />} />
                </>
              )}
            </div>
          </div>
          
          {/* SECTION 4: RSVP + RECURRENCE (SETTINGS) */}
          <div className="pa-mb-4">
            <div className="pa-flex pa-items-center pa-gap-6 pa-mb-4">
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
            )}
            
            {showRecurring && (
              <div className="pa-space-y-4">
                <Controller name="recurring.frequency" control={control} render={({ field }) => <Select {...field} label="Frequency" options={[{value:'weekly', label:'Weekly'}]} />} />
                <Controller name="recurring.end_date" control={control} render={({ field }) => <DatePicker {...field} label="Recurs Until" />} />
              </div>
            )}
          </div>

          {/* SECTION 5: NOTES + PREP */}
          <div className="pa-grid pa-grid-2 pa-mb-6 pa-gap-4">
            <Controller name="notes" control={control} render={({ field }) => <textarea className="pa-input pa-textarea" {...field} placeholder="General Notes..." style={{ minHeight: '80px' }} />} />
            <div className="pa-space-y-2">
              <Controller name="uniform_notes" control={control} render={({ field }) => <Input {...field} label="Uniform Notes" placeholder="e.g. Home Kit" />} />
              <Controller name="equipment_notes" control={control} render={({ field }) => <Input {...field} label="Equipment Notes" placeholder="e.g. Bring water" />} />
              <Controller name="external_link" control={control} render={({ field }) => <Input {...field} label="External Link" placeholder="https://..." type="url" />} />
              <Controller name="weather_dependent" control={control} render={({ field: { value, onChange } }) => (
                <Checkbox checked={value} onChange={(e) => onChange(e.target.checked)} label="Weather Dependent" />
              )} />
            </div>
          </div>

          {/* Recurring Event Edit Mode Selection */}
          {isRecurring && (
            <div className="pa-mb-4 pa-card" style={{ background: 'var(--pa-info-bg)', border: '1px solid var(--pa-info)', padding: 'var(--pa-space-4)' }}>
              <div className="pa-label pa-mb-2">This is a recurring event. What would you like to edit?</div>
              <div className="pa-flex pa-gap-3">
                <label className="pa-flex pa-items-center pa-gap-2">
                  <input
                    type="radio"
                    name="recurringEditMode"
                    value="this_only"
                    checked={recurringEditMode === 'this_only'}
                    onChange={(e) => setRecurringEditMode(e.target.value as RecurringEditMode)}
                  />
                  <span className="pa-body-s">This occurrence only</span>
                </label>
                <label className="pa-flex pa-items-center pa-gap-2">
                  <input
                    type="radio"
                    name="recurringEditMode"
                    value="this_and_future"
                    checked={recurringEditMode === 'this_and_future'}
                    onChange={(e) => setRecurringEditMode(e.target.value as RecurringEditMode)}
                  />
                  <span className="pa-body-s">This and future occurrences</span>
                </label>
                <label className="pa-flex pa-items-center pa-gap-2">
                  <input
                    type="radio"
                    name="recurringEditMode"
                    value="all"
                    checked={recurringEditMode === 'all'}
                    onChange={(e) => setRecurringEditMode(e.target.value as RecurringEditMode)}
                  />
                  <span className="pa-body-s">All occurrences</span>
                </label>
              </div>
            </div>
          )}

          {/* SECTION 6: ACTIONS */}
          <div className="pa-flex pa-justify-between pa-items-center pa-mb-4">
            <div className="pa-flex pa-gap-3">
              <Button
                variant="ghost"
                onClick={() => setCancelDialog(true)}
                disabled={saving || actionLoading}
                style={{ color: 'var(--pa-warning)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>cancel</span>
                Cancel Event
              </Button>
              <Button
                variant="ghost"
                onClick={() => setDeleteDialog(true)}
                disabled={saving || actionLoading}
                style={{ color: 'var(--pa-danger)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>delete</span>
                Delete Event
              </Button>
            </div>
            <div className="pa-flex pa-justify-end pa-gap-3">
              <Button variant="blue" onClick={() => navigate(getLink('admin.events.list'))} disabled={saving || actionLoading}>Cancel</Button>
              <Button 
                type="submit" 
                loading={saving}
                disabled={isOffline || USE_FAKE_DATA || saving || actionLoading}
                title={isOffline ? 'Cannot save while offline' : USE_FAKE_DATA ? 'Demo mode: changes not saved' : undefined}
              >
                Update Event
              </Button>
            </div>
          </div>
        </form>
      </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        title="Delete Event"
        description={`Are you sure you want to delete this event? This action cannot be undone and will delete all associated data (RSVPs, attendance, etc.).`}
        confirmLabel="Delete"
        variant="danger"
        requireReason
        loading={actionLoading}
        error={actionError}
        onConfirm={async (_reason: string) => {
          if (!eventId) return
          setActionLoading(true)
          setActionError(null)
          
          try {
            const { error } = await supabase
              .from('events')
              .delete()
              .eq('id', eventId)
            
            if (error) throw error
            
            showSuccess('Event deleted successfully')
            navigate(getLink('admin.events.list'))
          } catch (err) {
            const errorMessage = getErrorMessage(err) || 'Failed to delete event'
            setActionError(errorMessage)
            showError(errorMessage)
          } finally {
            setActionLoading(false)
          }
        }}
        onCancel={() => {
          setDeleteDialog(false)
          setActionError(null)
        }}
      />

      {/* Cancel Event Dialog */}
      <ConfirmDialog
        open={cancelDialog}
        title="Cancel Event"
        description={`Are you sure you want to cancel this event? This will mark the event as cancelled and notify participants.`}
        confirmLabel="Cancel Event"
        variant="warning"
        requireReason
        loading={actionLoading}
        error={actionError}
        onConfirm={async (reason: string) => {
          if (!eventId) return
          setActionLoading(true)
          setActionError(null)
          
          try {
            const { error } = await supabase
              .from('events')
              .update({
                is_cancelled: true,
                cancellation_reason: reason || null,
                cancelled_at: new Date().toISOString(),
                cancelled_by_user_id: context.userId
              })
              .eq('id', eventId)
            
            if (error) throw error
            
            showSuccess('Event cancelled successfully')
            navigate(getLink('admin.events.list'))
          } catch (err) {
            const errorMessage = getErrorMessage(err) || 'Failed to cancel event'
            setActionError(errorMessage)
            showError(errorMessage)
          } finally {
            setActionLoading(false)
          }
        }}
        onCancel={() => {
          setCancelDialog(false)
          setActionError(null)
        }}
      />

      {/* RSVP Change Confirmation Dialog */}
      <ConfirmDialog
        open={showRsvpChangeDialog}
        title="Change RSVP Type"
        description="Changing RSVP type will delete existing RSVP responses. Are you sure?"
        confirmLabel="Continue"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleConfirmRsvpChange}
        onCancel={() => {
          setShowRsvpChangeDialog(false)
          setPendingRsvpChange(null)
        }}
      />
    </div>
  )
}

