import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input, 
  Select,
  DatePicker,
  Checkbox
} from '../../components/platformAdmin'
import { 
    EventFormData, 
    EVENT_TYPE_LABELS, 
    EventType,
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
  const [showLocationDetails, setShowLocationDetails] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)

  const [hasExistingRSVPs, setHasExistingRSVPs] = useState(false)


  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EventFormData>({
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
    
    setLoading(true)
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          event_location:event_locations(*)
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
            is_tbd: boolean | null
            is_virtual: boolean | null
            virtual_link: string | null
          }
        } | null; error: { message?: string } | null }

      if (eventError) throw eventError
      if (!event) throw new Error('Event not found')

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

      // Fetch teams and seasons
      await fetchTeams()
      if (event.team_id) {
        await fetchSeasons(event.team_id)
      }
    } catch (err) {
      setError(getErrorMessage(err) || 'Failed to load event')
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
        .eq('status', 'active')
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

  const onSubmit = async (data: EventFormData) => {
    if (!eventId) return
    
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
          const confirmChange = window.confirm(
            'Changing RSVP type will delete existing RSVP responses. Are you sure?'
          )
          if (!confirmChange) {
            setSaving(false)
            return
          }
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
          is_tbd: data.location.is_tbd,
          is_virtual: data.location.is_virtual,
          virtual_link: data.location.virtual_link || null
        } satisfies LocationUpdate
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
          is_tbd: data.location.is_tbd,
          is_virtual: data.location.is_virtual,
          virtual_link: data.location.virtual_link || null
        } satisfies LocationInsert
        await supabase.from('event_locations').insert(locInsertData)
      }

      navigate('/admin/events')
    } catch (err: unknown) { 
      setError(getErrorMessage(err) || 'Failed to update event') 
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
        title="Edit Event" 
        breadcrumbs={[
          { label: 'Events', path: '/admin/events' },
          { label: 'Edit Event' },
        ]}
      />
      <div className="pa-form-container">
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
            <div className="pa-grid pa-grid-3 pa-mb-4 pa-gap-4">
              <Controller name="start_time" control={control} rules={{ required: 'Start time is required' }} render={({ field }) => <Input {...field} label="Start Time" type="datetime-local" required />} />
              <Controller name="end_time" control={control} render={({ field }) => <Input {...field} label="End Time" type="datetime-local" />} />
              <Controller name="arrival_time" control={control} render={({ field }) => <Input {...field} label="Arrival Time" type="datetime-local" />} />
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
                <Controller name="location.address_line1" control={control} render={({ field }) => <Input {...field} label="Address" placeholder="123 Main St" />} />
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
            </div>
          </div>

          {/* SECTION 6: ACTIONS */}
          <div className="pa-flex pa-justify-end pa-gap-3">
            <Button variant="blue" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={saving}>Update Event</Button>
          </div>
        </form>
      </Card>
      </div>
    </div>
  )
}

