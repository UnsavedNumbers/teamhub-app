import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'

import { useUserContext } from '../../hooks/useUserContext'
import { getTeams, getTeamDetails } from '../../data/services/teamsService'
import { getErrorMessage } from '../../utils/errorUtils'
import { 
  AdminPageHeader, 
  Card, 
  Button, 
  Input, 
  Select 
} from '../../components/platformAdmin'

interface Team { id: string; name: string }
interface Season { id: string; name: string }
interface TravelFormData { 
  team_id: string
  season_id: string
  title: string
  location: string
  destination_city: string
  destination_state: string
  start_date: string
  end_date: string
  venue_name: string
  venue_address: string
  hotel_name: string
  hotel_address: string
  hotel_phone: string
  hotel_confirmation: string
  maps_url: string
  notes: string
}

export default function CreateTravelPlan() {
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [itineraryFile, setItineraryFile] = useState<File | null>(null)


  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const { control, handleSubmit, watch, setValue } = useForm<TravelFormData>({
    defaultValues: { 
      team_id: '', season_id: '', title: '', location: '', destination_city: '', 
      destination_state: '', start_date: '', end_date: '', venue_name: '', venue_address: '', 
      hotel_name: '', hotel_address: '', hotel_phone: '', hotel_confirmation: '', 
      maps_url: '', notes: '' 
    },
  })

  const watchTeamId = watch('team_id')

  const fetchTeams = useCallback(async () => {
    if (!isReady) return
    
    const { data, error } = await getTeams(context, { activeOnly: true })
    if (!error) {
      setTeams(data.map(t => ({ id: t.id, name: t.name })))
    }
    setLoading(false)
  }, [context, isReady])

  const fetchSeasons = useCallback(async (teamId: string) => {
    if (!isReady) return
    
    const { data, error } = await getTeamDetails(context, teamId)
    if (!error && data?.seasons) {
      setSeasons(data.seasons.map(s => ({ id: s.id, name: s.name })))
    }
  }, [context, isReady])

  useEffect(() => { 
    if (isReady) fetchTeams() 
  }, [isReady, fetchTeams])

  useEffect(() => { 
    if (watchTeamId && isReady) { 
      fetchSeasons(watchTeamId)
      setValue('season_id', '')
    } 
  }, [watchTeamId, isReady, setValue, fetchSeasons])

  const onSubmit = async (_data: TravelFormData) => {
    setSaving(true)
    setError(null)
    
    try {
      // In fake data mode, just navigate back with success
      // TODO: Replace with real Supabase insert when migrating
      /*
      const { data: inserted, error: insertError } = await supabase
        .from('travel_plans')
        .insert({
          team_id: data.team_id,
          season_id: data.season_id,
          title: data.title,
          location: data.location,
          destination_city: data.destination_city || null,
          destination_state: data.destination_state || null,
          start_date: data.start_date,
          end_date: data.end_date,
          venue_name: data.venue_name || null,
          venue_address: data.venue_address || null,
          hotel_name: data.hotel_name || null,
          hotel_address: data.hotel_address || null,
          hotel_phone: data.hotel_phone || null,
          hotel_confirmation: data.hotel_confirmation || null,
          maps_url: data.maps_url || null,
          notes: data.notes || null,
          status: 'draft'
        })
        .select('id')
        .single()
      
      if (insertError) throw insertError

      if (itineraryFile && inserted?.id && currentOrganization?.id) {
        const objectPath = `${currentOrganization.id}/${data.team_id}/${inserted.id}/${itineraryFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('travel-itineraries')
          .upload(objectPath, itineraryFile, { upsert: true, contentType: itineraryFile.type || undefined })
        
        if (uploadError) throw uploadError
        
        await supabase.from('travel_plans')
          .update({ itinerary_file_path: objectPath })
          .eq('id', inserted.id)
      }
      */
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500))
      navigate('/admin/travel')
    } catch (err: unknown) { 
      setError(getErrorMessage(err) || 'Failed to create travel plan') 
    } finally { 
      setSaving(false) 
    }
  }

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Create Travel Plan" 
        breadcrumbs={[
          { label: 'Travel Plans', path: '/admin/travel' },
          { label: 'Create Travel Plan' },
        ]}
      />
      <div className="pa-form-container">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
            
            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
              <Controller name="team_id" control={control} rules={{ required: 'Team is required' }} render={({ field }) => <Select {...field} label="Team" options={teams.map(t => ({value:t.id, label:t.name}))} required />} />
              <Controller name="season_id" control={control} rules={{ required: 'Season is required' }} render={({ field }) => <Select {...field} label="Season" options={seasons.map(s => ({value:s.id, label:s.name}))} required disabled={!watchTeamId} />} />
            </div>

            <div className="pa-mb-4">
              <Controller name="title" control={control} rules={{ required: 'Title is required' }} render={({ field }) => <Input {...field} label="Trip Title" required />} />
            </div>

            <div className="pa-mb-4">
              <Controller name="location" control={control} rules={{ required: 'Location is required' }} render={({ field }) => <Input {...field} label="Location (city/state or details)" required />} />
            </div>

            <div className="pa-grid pa-grid-2 pa-gap-4 pa-mb-4">
              <Controller name="destination_city" control={control} render={({ field }) => <Input {...field} label="Destination City" />} />
              <Controller name="destination_state" control={control} render={({ field }) => <Input {...field} label="Destination State" />} />
              <Controller name="start_date" control={control} rules={{ required: 'Start date is required' }} render={({ field }) => <Input {...field} label="Start Date" type="date" required />} />
              <Controller name="end_date" control={control} rules={{ required: 'End date is required' }} render={({ field }) => <Input {...field} label="End Date" type="date" required />} />
            </div>

            <h3 className="pa-h3 pa-mb-4 pa-mt-6">VENUE & HOTEL</h3>
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

            <h3 className="pa-h3 pa-mb-4">ITINERARY FILE</h3>
            <div className="pa-mb-6">
              <input type="file" onChange={e => setItineraryFile(e.target.files?.[0] ?? null)} className="pa-mb-2" />
              {itineraryFile && <div className="pa-body-s">Selected: {itineraryFile.name}</div>}
            </div>

            <div className="pa-mb-8">
              <textarea className="pa-input pa-textarea" placeholder="Trip Notes..." style={{ minHeight: '120px' }} value={watch('notes')} onChange={e => setValue('notes', e.target.value)} />
              <div className="pa-label">Notes</div>
            </div>

            <div className="pa-flex pa-justify-end pa-gap-3">
              <Button variant="blue" onClick={() => navigate('/admin/travel')}>Cancel</Button>
              <Button type="submit" loading={saving}>Create Draft Plan</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
