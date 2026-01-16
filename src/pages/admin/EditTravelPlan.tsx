import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getErrorMessage } from '../../utils/errorUtils'
import { 
  PageHeader, 
  Card, 
  Button, 
  Input, 
  Select 
} from '../../components/platformAdmin'

interface Team { id: string; name: string }
interface Season { id: string; name: string }
export interface MeetingLocation { name: string; address: string; time?: string; notes?: string; maps_url?: string }

interface TravelPlanRow {
  id: string; team_id: string; season_id: string; title: string; location: string; destination_city: string | null; destination_state: string | null; start_date: string; end_date: string; status: 'draft' | 'published' | 'cancelled'; published_at: string | null; cancelled_at: string | null; venue_name: string | null; venue_address: string | null; hotel_name: string | null; hotel_address: string | null; hotel_phone: string | null; hotel_confirmation: string | null; maps_url: string | null; notes: string | null; itinerary_file_path: string | null; meeting_locations: unknown | null;
}

interface TravelFormData { team_id: string; season_id: string; title: string; location: string; destination_city: string; destination_state: string; start_date: string; end_date: string; venue_name: string; venue_address: string; hotel_name: string; hotel_address: string; hotel_phone: string; hotel_confirmation: string; maps_url: string; notes: string; }

function parseMeetingLocations(value: unknown): MeetingLocation[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => {
    const o = v as Partial<MeetingLocation> | null
    if (!o || typeof o.name !== 'string' || typeof o.address !== 'string') return null
    return { name: o.name, address: o.address, time: typeof o.time === 'string' ? o.time : undefined, notes: typeof o.notes === 'string' ? o.notes : undefined, maps_url: typeof o.maps_url === 'string' ? o.maps_url : undefined }
  }).filter(Boolean) as MeetingLocation[]
}

export default function EditTravelPlan() {
  const { id } = useParams<{ id: string }>()
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [plan, setPlan] = useState<TravelPlanRow | null>(null)
  const [meetingLocations, setMeetingLocations] = useState<MeetingLocation[]>([])
  const [itineraryFile, setItineraryFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<TravelFormData>({
    defaultValues: { team_id: '', season_id: '', title: '', location: '', destination_city: '', destination_state: '', start_date: '', end_date: '', venue_name: '', venue_address: '', hotel_name: '', hotel_address: '', hotel_phone: '', hotel_confirmation: '', maps_url: '', notes: '' },
  })

  const watchTeamId = watch('team_id')

  const fetchTeams = useCallback(async () => {
    if (!currentOrganization?.id) return
    const { data } = await supabase.from('teams').select('id, name').eq('org_id', currentOrganization.id).order('name')
    setTeams((data as Team[]) || [])
  }, [currentOrganization?.id])

  const fetchSeasons = useCallback(async (teamId: string) => {
    const { data } = await supabase.from('seasons').select('id, name').eq('team_id', teamId).order('start_date', { ascending: false })
    setSeasons((data as any[]) || [])
  }, [])

  const loadPlan = useCallback(async () => {
    if (!id) return
    setLoading(true); setError(null)
    try {
      const { data, error } = await supabase.from('travel_plans').select('*').eq('id', id).single()
      if (error) throw error
      const row = data as unknown as TravelPlanRow
      setPlan(row)
      setValue('team_id', row.team_id); setValue('season_id', row.season_id); setValue('title', row.title); setValue('location', row.location); setValue('destination_city', row.destination_city ?? ''); setValue('destination_state', row.destination_state ?? ''); setValue('start_date', row.start_date); setValue('end_date', row.end_date); setValue('venue_name', row.venue_name ?? ''); setValue('venue_address', row.venue_address ?? ''); setValue('hotel_name', row.hotel_name ?? ''); setValue('hotel_address', row.hotel_address ?? ''); setValue('hotel_phone', row.hotel_phone ?? ''); setValue('hotel_confirmation', row.hotel_confirmation ?? ''); setValue('maps_url', row.maps_url ?? ''); setValue('notes', row.notes ?? '')
      setMeetingLocations(parseMeetingLocations(row.meeting_locations))
    } catch (err: unknown) { setError(getErrorMessage(err) || 'Failed to load travel plan') } finally { setLoading(false) }
  }, [id, setValue])

  useEffect(() => { fetchTeams(); loadPlan(); }, [fetchTeams, loadPlan])
  useEffect(() => { if (watchTeamId) fetchSeasons(watchTeamId) }, [watchTeamId, fetchSeasons])

  const onSubmit = async (data: TravelFormData) => {
    if (!id) return
    setSaving(true); setError(null)
    try {
      let itineraryPath = plan?.itinerary_file_path
      if (itineraryFile && currentOrganization?.id) {
        const objectPath = `${currentOrganization.id}/${data.team_id}/${id}/${itineraryFile.name}`
        const { error: uploadError } = await supabase.storage.from('travel-itineraries').upload(objectPath, itineraryFile, { upsert: true, contentType: itineraryFile.type || undefined })
        if (uploadError) throw uploadError
        itineraryPath = objectPath
      }

      const { error: updateError } = await supabase.from('travel_plans').update({
        team_id: data.team_id, season_id: data.season_id, title: data.title, location: data.location, destination_city: data.destination_city || null, destination_state: data.destination_state || null, start_date: data.start_date, end_date: data.end_date, venue_name: data.venue_name || null, venue_address: data.venue_address || null, hotel_name: data.hotel_name || null, hotel_address: data.hotel_address || null, hotel_phone: data.hotel_phone || null, hotel_confirmation: data.hotel_confirmation || null, maps_url: data.maps_url || null, notes: data.notes || null, meeting_locations: meetingLocations.length ? meetingLocations : null, itinerary_file_path: itineraryPath
      } as any).eq('id', id)
      if (updateError) throw updateError
      navigate('/admin/travel')
    } catch (err: unknown) { setError(getErrorMessage(err) || 'Failed to save travel plan') } finally { setSaving(false) }
  }

  const handleStatusChange = async (status: string) => {
    if (!id) return
    setSaving(true)
    try {
      const updates: any = { status }
      if (status === 'published') { updates.published_at = new Date().toISOString(); updates.cancelled_at = null; }
      if (status === 'cancelled') updates.cancelled_at = new Date().toISOString()
      const { error } = await supabase.from('travel_plans').update(updates).eq('id', id)
      if (error) throw error
      await loadPlan()
    } catch (err: unknown) { setError(getErrorMessage(err) || `Failed to ${status} plan`) } finally { setSaving(false) }
  }

  if (loading) return <div className="pa-skeleton" style={{ height: '600px' }} />
  if (!plan) return null

  return (
    <div className="pa-root">
      <PageHeader title="Edit Travel Plan" actions={
        <div className="pa-flex pa-gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/travel')}>Back</Button>
          <Button variant="secondary" onClick={() => handleStatusChange('published')} disabled={saving || plan.status === 'published'}>Publish</Button>
          <Button variant="secondary" onClick={() => handleStatusChange('cancelled')} disabled={saving || plan.status === 'cancelled'}>Cancel Trip</Button>
        </div>
      } />

      <Card>
        <div className="pa-body-s pa-text-muted pa-mb-6">Status: <strong>{plan.status.toUpperCase()}</strong></div>
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
          
          <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
            <Controller name="team_id" control={control} rules={{ required: 'Team is required' }} render={({ field }) => <Select {...field} label="Team" options={teams.map(t => ({value:t.id, label:t.name}))} required />} />
            <Controller name="season_id" control={control} rules={{ required: 'Season is required' }} render={({ field }) => <Select {...field} label="Season" options={seasons.map(s => ({value:s.id, label:s.name}))} required disabled={!watchTeamId} />} />
          </div>

          <div className="pa-mb-4">
            <Controller name="title" control={control} rules={{ required: 'Title is required' }} render={({ field }) => <Input {...field} label="Trip Name" required />} />
          </div>

          <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
            <Controller name="destination_city" control={control} render={({ field }) => <Input {...field} label="Destination City" />} />
            <Controller name="destination_state" control={control} render={({ field }) => <Input {...field} label="Destination State" />} />
          </div>

          <div className="pa-mb-4">
            <Controller name="location" control={control} rules={{ required: 'Location is required' }} render={({ field }) => <Input {...field} label="Location (city/state or details)" required />} />
          </div>

          <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-6">
            <Controller name="start_date" control={control} rules={{ required: 'Start date is required' }} render={({ field }) => <Input {...field} label="Start Date" type="date" required />} />
            <Controller name="end_date" control={control} rules={{ required: 'End date is required' }} render={({ field }) => <Input {...field} label="End Date" type="date" required />} />
          </div>

          <h3 className="pa-h3 pa-mb-4">VENUE & HOTEL</h3>
          <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
            <Controller name="venue_name" control={control} render={({ field }) => <Input {...field} label="Venue Name" />} />
            <Controller name="venue_address" control={control} render={({ field }) => <Input {...field} label="Venue Address" />} />
            <Controller name="hotel_name" control={control} render={({ field }) => <Input {...field} label="Hotel Name" />} />
            <Controller name="hotel_address" control={control} render={({ field }) => <Input {...field} label="Hotel Address" />} />
            <Controller name="hotel_phone" control={control} render={({ field }) => <Input {...field} label="Hotel Phone" />} />
            <Controller name="hotel_confirmation" control={control} render={({ field }) => <Input {...field} label="Hotel Confirmation" />} />
          </div>

          <div className="pa-mb-6">
            <Controller name="maps_url" control={control} render={({ field }) => <Input {...field} label="Map Link URL" />} />
          </div>

          <h3 className="pa-h3 pa-mb-4">MEETING LOCATIONS</h3>
          <div className="pa-flex pa-flex-col pa-gap-4 pa-mb-6">
            {meetingLocations.map((loc, idx) => (
              <div key={idx} className="pa-card pa-bg-n50" style={{ padding: 'var(--pa-space-4)' }}>
                <div className="pa-grid pa-grid-2 pa-gap-3 pa-mb-3">
                  <Input label="Name" value={loc.name} onChange={e => { const next = [...meetingLocations]; next[idx].name = e.target.value; setMeetingLocations(next); }} />
                  <Input label="Address" value={loc.address} onChange={e => { const next = [...meetingLocations]; next[idx].address = e.target.value; setMeetingLocations(next); }} />
                  <Input label="Time" value={loc.time || ''} onChange={e => { const next = [...meetingLocations]; next[idx].time = e.target.value; setMeetingLocations(next); }} />
                  <Input label="Maps URL" value={loc.maps_url || ''} onChange={e => { const next = [...meetingLocations]; next[idx].maps_url = e.target.value; setMeetingLocations(next); }} />
                </div>
                <div className="pa-flex pa-justify-end">
                  <Button variant="secondary" onClick={() => setMeetingLocations(meetingLocations.filter((_, i) => i !== idx))}>Remove</Button>
                </div>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setMeetingLocations([...meetingLocations, { name: '', address: '' }])}>Add Meeting Location</Button>
          </div>

          <h3 className="pa-h3 pa-mb-4">ITINERARY FILE</h3>
          <div className="pa-mb-6">
            <div className="pa-body-s pa-text-muted pa-mb-2">Current: {plan.itinerary_file_path || 'None'}</div>
            <input type="file" onChange={e => setItineraryFile(e.target.files?.[0] ?? null)} className="pa-mb-2" />
          </div>

          <div className="pa-mb-8">
            <textarea className="pa-input pa-textarea" placeholder="Trip Notes..." style={{ minHeight: '120px' }} value={watch('notes')} onChange={e => setValue('notes', e.target.value)} />
            <div className="pa-label">Notes</div>
          </div>

          <div className="pa-flex pa-justify-end pa-gap-3">
            <Button variant="secondary" onClick={() => navigate('/admin/travel')}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
