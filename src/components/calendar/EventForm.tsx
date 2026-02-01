
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useUserContext } from '../../hooks/useUserContext'
import { getSports, getPrograms } from '../../data/services/sportsService'
import { getTeams } from '../../data/services/teamsService'
import { supabase } from '../../lib/supabase'
import { 
  EventFormData, 
  EVENT_TYPE_LABELS
} from '../../types/calendar'
import Button from '../portal/Button'
import Card from '../portal/Card'
import { SectionHeader } from '../portal/Typography'

interface EventFormProps {
  initialValues?: Partial<EventFormData>
  onSubmit: (data: EventFormData) => Promise<void>
  loading?: boolean
  error?: string | null
  mode: 'create' | 'edit'
}

export default function EventForm({ initialValues, onSubmit, loading: parentLoading, error: parentError, mode }: EventFormProps) {
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  
  const [sports, setSports] = useState<{ id: string; name: string }[]>([])
  const [programs, setPrograms] = useState<{ id: string; name: string; sport_id: string }[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([])
  const [seasons, setSeasons] = useState<{ id: string; name: string }[]>([])
  
  const [dataLoading, setDataLoading] = useState(true)

  const defaultValues: EventFormData = { 
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
      sales_start_at: '',
      sales_end_at: '',
      status: 'draft',
      ticket_types: []
    },
    ...initialValues
  }

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EventFormData>({
    defaultValues,
    mode: 'onTouched'
  })

  // Watch fields for cascading dropdowns
  const watchSportId = watch('sport_id')
  const watchProgramId = watch('program_id')
  const watchSeasonId = watch('season_id')

  // Data fetching logic similar to admin/CreateEvent.tsx
  const fetchSports = useCallback(async () => {
    if (!isReady || !context?.orgId) return
    try {
      const { data } = await getSports(context)
      setSports((data || []).map(s => ({ id: s.id, name: s.name })))
    } catch (err) {
      console.error('Error fetching sports:', err)
    } finally {
      setDataLoading(false)
    }
  }, [context, isReady])

  const fetchProgramsForSport = useCallback(async (sportId: string) => {
    if (!isReady || !context?.orgId) return
    try {
      const { data } = await getPrograms(context, sportId)
      setPrograms((data || []).map(p => ({ id: p.id, name: p.name, sport_id: p.sport_id })))
    } catch (err) {
      console.error('Error fetching programs:', err)
    }
  }, [context, isReady])

  const fetchSeasonsForProgram = useCallback(async (sportId: string, programId: string) => {
    if (!isReady || !context?.orgId) return
    try {
      const { data: teamsData } = await getTeams(context, { sportId, programId, activeOnly: true })
      const teamIds = (teamsData || []).map(t => t.id)
      
      if (teamIds.length === 0) {
        setSeasons([])
        return
      }

      const { data: tsData } = await supabase
        .from('team_seasons_view')
        .select('season_id, name, is_active, end_date')
        .in('team_id', teamIds)
        .order('start_date', { ascending: false })

      const bySeasonId = new Map<string, { id: string; name: string }>()
      const today = new Date().toISOString().split('T')[0]
      
      ;(tsData || []).forEach((row: any) => {
        if (!row.season_id || !row.name) return
        const isActive = row.is_active ?? false
        const isFuture = (row.end_date || '') >= today
        if (!isActive && !isFuture) return
        
        if (!bySeasonId.has(row.season_id)) {
          bySeasonId.set(row.season_id, { id: row.season_id, name: row.name })
        }
      })
      setSeasons(Array.from(bySeasonId.values()))
    } catch (err) {
      console.error('Error fetching seasons:', err)
    }
  }, [context, isReady])

  const filterTeamsForSeason = useCallback(async (seasonId: string) => {
    if (!context?.orgId) return
    const { data } = await supabase.from('team_seasons').select('team_id').eq('season_id', seasonId)
    if (!data || data.length === 0) {
      setTeams([])
      return
    }
    const allowed = new Set(data.map(r => r.team_id))
    const { data: teamsData } = await getTeams(context, {
      sportId: watchSportId || undefined,
      programId: watchProgramId || undefined,
      activeOnly: true
    })
    
    setTeams((teamsData || []).filter(t => allowed.has(t.id)).map(t => ({ id: t.id, name: t.name })))
  }, [context, watchSportId, watchProgramId])

  // Effects
  useEffect(() => { fetchSports() }, [fetchSports])

  useEffect(() => {
    if (watchSportId) fetchProgramsForSport(watchSportId)
    else setPrograms([])
  }, [watchSportId, fetchProgramsForSport])

  useEffect(() => {
    if (watchProgramId && watchSportId) fetchSeasonsForProgram(watchSportId, watchProgramId)
    else setSeasons([])
  }, [watchProgramId, watchSportId, fetchSeasonsForProgram])

  useEffect(() => {
    if (watchSeasonId) filterTeamsForSeason(watchSeasonId)
    else setTeams([])
  }, [watchSeasonId, filterTeamsForSeason])

  const inputClass = "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg)]/20 focus:border-[var(--org-btn-primary-bg)] outline-none transition-all font-bold placeholder:font-normal"
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5"
  const errorClass = "text-xs text-red-500 font-bold mt-1"

  if (dataLoading) return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div></div>

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {parentError && <div className="p-4 bg-red-50 text-red-600 rounded-lg font-bold">{parentError}</div>}
      
      <Card className="p-6">
        <SectionHeader className="mb-4">Event Details</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Title</label>
            <Controller name="title" control={control} rules={{ required: 'Required' }} render={({ field }) => (
              <input {...field} className={inputClass} placeholder="Game vs. Wildcats" />
            )} />
            {errors.title && <p className={errorClass}>{errors.title.message}</p>}
          </div>

          <div>
             <label className={labelClass}>Type</label>
             <Controller name="type" control={control} rules={{ required: 'Required' }} render={({ field }) => (
               <select {...field} className={inputClass}>
                 {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                   <option key={key} value={key}>{label}</option>
                 ))}
               </select>
             )} />
          </div>

          <div>
            <label className={labelClass}>Sport</label>
            <Controller name="sport_id" control={control} render={({ field }) => (
               <select {...field} className={inputClass} onChange={e => {
                   field.onChange(e)
                   setValue('program_id', '')
                   setValue('season_id', '')
                   setValue('team_id', '')
               }}>
                 <option value="">Select Sport</option>
                 {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
             )} />
          </div>

          <div>
            <label className={labelClass}>Program</label>
            <Controller name="program_id" control={control} render={({ field }) => (
               <select {...field} className={inputClass} disabled={!watchSportId} onChange={e => {
                   field.onChange(e)
                   setValue('season_id', '')
                   setValue('team_id', '')
               }}>
                 <option value="">Select Program</option>
                 {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
             )} />
          </div>

          <div>
            <label className={labelClass}>Season</label>
            <Controller name="season_id" control={control} rules={{ required: 'Required' }} render={({ field }) => (
               <select {...field} className={inputClass} disabled={!watchProgramId} onChange={e => {
                   field.onChange(e)
                   setValue('team_id', '')
               }}>
                 <option value="">Select Season</option>
                 {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
             )} />
             {errors.season_id && <p className={errorClass}>{errors.season_id.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Team</label>
            <Controller name="team_id" control={control} rules={{ required: 'Required' }} render={({ field }) => (
               <select {...field} className={inputClass} disabled={!watchSeasonId}>
                 <option value="">Select Team</option>
                 {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             )} />
             {errors.team_id && <p className={errorClass}>{errors.team_id.message}</p>}
          </div>

          <div className="md:col-span-1">
             <label className={labelClass}>Start Time</label>
             <Controller name="start_time" control={control} rules={{ required: 'Required' }} render={({ field }) => (
               <input type="datetime-local" {...field} className={inputClass} />
             )} />
             {errors.start_time && <p className={errorClass}>{errors.start_time.message}</p>}
          </div>

          <div className="md:col-span-1">
             <label className={labelClass}>End Time</label>
             <Controller name="end_time" control={control} render={({ field }) => (
               <input type="datetime-local" {...field} className={inputClass} />
             )} />
          </div>
          
           <div className="md:col-span-1">
             <label className={labelClass}>Arrival Time</label>
             <Controller name="arrival_time" control={control} render={({ field }) => (
               <input type="datetime-local" {...field} className={inputClass} />
             )} />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader className="mb-4">Location</SectionHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
                <label className={labelClass}>Venue Name</label>
                <Controller name="location.venue_name" control={control} render={({ field }) => (
                  <input {...field} className={inputClass} placeholder="e.g. Central Park Field 1" />
                )} />
             </div>
             <div className="md:col-span-2">
                <label className={labelClass}>Address</label>
                 <Controller name="location.address_line1" control={control} render={({ field }) => (
                  <input {...field} className={inputClass} placeholder="123 Main St" />
                )} />
             </div>
              <div className="md:col-span-1">
                <label className={labelClass}>City</label>
                 <Controller name="location.city" control={control} render={({ field }) => (
                  <input {...field} className={inputClass} placeholder="New York" />
                )} />
             </div>
              <div className="md:col-span-1">
                <label className={labelClass}>State</label>
                 <Controller name="location.state" control={control} render={({ field }) => (
                  <input {...field} className={inputClass} placeholder="NY" />
                )} />
             </div>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader className="mb-4">Notes</SectionHeader>
        <div className="space-y-4">
             <div>
                <label className={labelClass}>General Notes</label>
                <Controller name="notes" control={control} render={({ field }) => (
                  <textarea {...field} className={inputClass} rows={3} />
                )} />
             </div>
             <div>
                <label className={labelClass}>Uniform Notes</label>
                <Controller name="uniform_notes" control={control} render={({ field }) => (
                  <textarea {...field} className={inputClass} rows={2} placeholder="e.g. Wear blue jersey" />
                )} />
             </div>
        </div>
      </Card>

      <Card className="p-6">
        <SectionHeader className="mb-4">RSVP Settings</SectionHeader>
        <div className="space-y-4">
             <div className="flex items-center gap-3">
               <Controller name="rsvp_enabled" control={control} render={({ field }) => (
                 <input 
                    type="checkbox" 
                    id="rsvp_enabled"
                    checked={field.value} 
                    onChange={e => field.onChange(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-[var(--org-btn-primary-bg)] focus:ring-[var(--org-btn-primary-bg)]"
                 />
               )} />
               <label htmlFor="rsvp_enabled" className="text-sm font-bold text-slate-700 dark:text-slate-300">Enable RSVP</label>
             </div>

             {/* Simple RSVP Type selection if enabled */}
        </div>
      </Card>
      
      <Card className="p-6">
        <SectionHeader className="mb-4">Recurrence</SectionHeader>
        <div className="space-y-4">
             <div className="flex items-center gap-3">
               <Controller name="recurring.enabled" control={control} render={({ field }) => (
                 <input 
                    type="checkbox" 
                    id="recurring_enabled"
                    checked={field.value} 
                    onChange={e => field.onChange(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-[var(--org-btn-primary-bg)] focus:ring-[var(--org-btn-primary-bg)]"
                 />
               )} />
               <label htmlFor="recurring_enabled" className="text-sm font-bold text-slate-700 dark:text-slate-300">Repeat Event</label>
             </div>
             
             {/* Basic Recurrence UI */}
             <div className={watch('recurring.enabled') ? 'block' : 'hidden'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                   <div>
                      <label className={labelClass}>Frequency</label>
                      <Controller name="recurring.frequency" control={control} render={({ field }) => (
                         <select {...field} className={inputClass}>
                            <option value="weekly">Weekly</option>
                            <option value="daily">Daily</option>
                            <option value="monthly">Monthly</option>
                         </select>
                      )} />
                   </div>
                   <div>
                       <label className={labelClass}>End Date</label>
                       <Controller name="recurring.end_date" control={control} render={({ field }) => (
                          <input type="date" {...field} className={inputClass} />
                       )} />
                   </div>
                </div>
             </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
         <Button variant="secondary" onClick={() => navigate(-1)} disabled={parentLoading}>Cancel</Button>
         <Button variant="primary" type="submit" disabled={parentLoading}>
           {mode === 'create' ? 'Create Event' : 'Save Changes'}
         </Button>
      </div>
    </form>
  )
}
