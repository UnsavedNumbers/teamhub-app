import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
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
interface Season { id: string; name: string; team_id: string }

interface EventFormData {
  title: string
  type: 'practice' | 'game' | 'tournament' | 'meeting'
  team_id: string
  season_id: string
  start_time: string
  end_time: string
  arrival_time: string
  location: string
  notes: string
}

export default function CreateEvent() {
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EventFormData>({
    defaultValues: { title: '', type: 'practice', team_id: '', season_id: '', start_time: '', end_time: '', arrival_time: '', location: '', notes: '' },
  })

  const watchTeamId = watch('team_id')

  const fetchTeams = useCallback(async () => {
    if (!currentOrganization?.id) return
    const { data } = await supabase.from('teams').select('id, name').eq('org_id', currentOrganization.id).order('name')
    setTeams((data as Team[]) || [])
    setLoading(false)
  }, [currentOrganization?.id])

  const fetchSeasons = useCallback(async (teamId: string) => {
    const { data } = await supabase.from('seasons').select('id, name, team_id').eq('team_id', teamId).order('start_date', { ascending: false })
    const seasonsData = (data as any[]) || []
    setSeasons(seasonsData)
    if (seasonsData.length > 0) setValue('season_id', seasonsData[0].id)
  }, [setValue])

  useEffect(() => { fetchTeams() }, [fetchTeams])
  useEffect(() => { if (watchTeamId) fetchSeasons(watchTeamId) }, [watchTeamId, fetchSeasons])

  const onSubmit = async (data: EventFormData) => {
    setSaving(true); setError(null)
    try {
      const { error: insertError } = await supabase.from('events').insert({
        title: data.title, type: data.type, team_id: data.team_id, season_id: data.season_id,
        start_time: new Date(data.start_time).toISOString(),
        end_time: data.end_time ? new Date(data.end_time).toISOString() : null,
        arrival_time: data.arrival_time ? new Date(data.arrival_time).toISOString() : null,
        location: data.location, notes: data.notes,
        org_id: currentOrganization?.id
      } as never)
      if (insertError) throw insertError
      navigate('/admin/events')
    } catch (err: unknown) { setError(getErrorMessage(err) || 'Failed to create event') } finally { setSaving(false) }
  }

  if (loading) return <div className="pa-skeleton" style={{ height: '500px' }} />

  return (
    <div className="pa-root">
      <PageHeader title="Create Event" />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && <div className="pa-card pa-mb-4 pa-text-danger" style={{ background: 'var(--pa-danger-bg)', border: 'none' }}>{error}</div>}
          
          <div className="pa-grid pa-grid-2 pa-mb-4 pa-gap-4">
            <Controller name="title" control={control} rules={{ required: 'Title is required' }} render={({ field }) => <Input {...field} label="Event Title" required error={!!errors.title} helperText={errors.title?.message} />} />
            <Controller name="type" control={control} render={({ field }) => <Select {...field} label="Event Type" options={[{value:'practice', label:'Practice'}, {value:'game', label:'Game'}, {value:'tournament', label:'Tournament'}, {value:'meeting', label:'Meeting'}]} />} />
          </div>

          <div className="pa-grid pa-grid-2 pa-mb-4 pa-gap-4">
            <Controller name="team_id" control={control} rules={{ required: 'Team is required' }} render={({ field }) => <Select {...field} label="Team" options={teams.map(t => ({value:t.id, label:t.name}))} required error={!!errors.team_id} />} />
            <Controller name="season_id" control={control} rules={{ required: 'Season is required' }} render={({ field }) => <Select {...field} label="Season" options={seasons.map(s => ({value:s.id, label:s.name}))} required disabled={!watchTeamId} />} />
          </div>

          <div className="pa-grid pa-grid-3 pa-mb-4 pa-gap-4">
            <Controller name="start_time" control={control} rules={{ required: 'Start time is required' }} render={({ field }) => <Input {...field} label="Start Time" type="datetime-local" required />} />
            <Controller name="end_time" control={control} render={({ field }) => <Input {...field} label="End Time" type="datetime-local" />} />
            <Controller name="arrival_time" control={control} render={({ field }) => <Input {...field} label="Arrival Time" type="datetime-local" />} />
          </div>

          <div className="pa-mb-4">
            <Controller name="location" control={control} render={({ field }) => <Input {...field} label="Location" placeholder="e.g. Field 1, Central Park" />} />
          </div>

          <div className="pa-mb-6">
            <Controller name="notes" control={control} render={({ field }) => <textarea className="pa-input pa-textarea" {...field} placeholder="Notes..." style={{ minHeight: '100px' }} />} />
            <div className="pa-label pa-mt-1">Notes</div>
          </div>

          <div className="pa-flex pa-justify-end pa-gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Event</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
