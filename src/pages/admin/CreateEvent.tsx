
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'

import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { 
  PageHeader, 
  Card, 
  Button, 
  Input, 
  Select,
  Checkbox
} from '../../components/platformAdmin'
import { 
    EventFormData, 
    EVENT_TYPE_LABELS, 
    EventType,
} from '../../types/calendar'

interface Team { id: string; name: string }
interface Season { id: string; name: string; team_id: string }

export default function CreateEvent() {
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLocationDetails, setShowLocationDetails] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)


  const t = useT()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

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

  const fetchTeams = useCallback(async () => {
    if (!isReady) return
    
    // Using Supabase directly for Admin pages to ensure real data access if service is mocked
    const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .eq('org_id', context.orgId!)
        .eq('status', 'active')
        .order('name')
    
    if (!error && data) {
      setTeams(data)
    } else if (error) {
       console.error(error)
    }
    setLoading(false)
  }, [context, isReady])

  const fetchSeasons = useCallback(async (teamId: string) => {
    if (!isReady) return
    
    const { data, error } = await supabase
        .from('team_seasons_view')
        .select('season_id, name')
        .eq('team_id', teamId)
        .eq('is_active', true)

    if (!error && data) {
      const mappedSeasons = data.map(s => ({
          id: s.season_id,
          name: s.name,
          team_id: teamId
      }))
      setSeasons(mappedSeasons)
      if (mappedSeasons.length > 0) setValue('season_id', mappedSeasons[0].id)
    }
  }, [context, isReady, setValue])

  useEffect(() => { 
    if (isReady) fetchTeams() 
  }, [isReady, fetchTeams])

  useEffect(() => { 
    if (watchTeamId && isReady) fetchSeasons(watchTeamId) 
  }, [watchTeamId, isReady, fetchSeasons])

  const onSubmit = async (data: EventFormData) => {
    setSaving(true)
    setError(null)
    
    try {
      // 1. Insert Event
      type EventInsert = Database['public']['Tables']['events']['Insert']
      const eventInsertData = {
        title: data.title,
        type: data.type,
        team_id: data.team_id,
        season_id: data.season_id,
        start_time: new Date(data.start_time).toISOString(),
        end_time: data.end_time ? new Date(data.end_time).toISOString() : '',
        arrival_time: data.arrival_time ? new Date(data.arrival_time).toISOString() : '',
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
          is_tbd: data.location.is_tbd,
          is_virtual: data.location.is_virtual,
          virtual_link: data.location.virtual_link || null
      } satisfies LocationInsert
      
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

      navigate('/admin/events')
    } catch (err: unknown) { 
      setError(getErrorMessage(err) || 'Failed to create event') 
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
      <PageHeader title="Create Event" />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
          
          {/* SECTION 1: EVENT BASICS */}
          <div className="pa-grid pa-grid-2 pa-mb-4 pa-gap-4">
            <Controller name="title" control={control} rules={{ required: 'Title is required' }} render={({ field }) => <Input {...field} label="Event Title" required error={errors.title?.message || undefined} />} />
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
                <Controller name="recurring.end_date" control={control} render={({ field }) => <Input {...field} label="Recurs Until" type="date" />} />
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
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Event</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

