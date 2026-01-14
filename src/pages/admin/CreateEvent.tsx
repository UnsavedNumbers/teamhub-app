import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
} from '@mui/material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'
import { getErrorMessage } from '../../utils/errorUtils'

interface Team {
  id: string
  name: string
}

interface Season {
  id: string
  name: string
  team_id: string
}

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

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    defaultValues: {
      title: '',
      type: 'practice',
      team_id: '',
      season_id: '',
      start_time: '',
      end_time: '',
      arrival_time: '',
      location: '',
      notes: '',
    },
  })

  const watchTeamId = watch('team_id')

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    if (currentOrganization?.id) {
      fetchTeams()
    }
  }, [profile, currentOrganization, navigate])

  useEffect(() => {
    if (watchTeamId) {
      fetchSeasons(watchTeamId)
      setValue('season_id', '')
    }
  }, [watchTeamId, setValue])

  async function fetchTeams() {
    if (!currentOrganization?.id) return
    const { data } = await supabase
      .from('teams')
      .select('id, name')
      .eq('org_id', currentOrganization.id)
      .order('name')
    setTeams((data as Team[]) || [])
    setLoading(false)
  }

  async function fetchSeasons(teamId: string) {
    const { data } = await supabase
      .from('seasons')
      .select('id, name, team_id')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false })
    const seasonsData = data as unknown as Season[]
    setSeasons(seasonsData || [])
    if (seasonsData && seasonsData.length > 0) {
      setValue('season_id', seasonsData[0].id)
    }
  }

  const onSubmit = async (data: EventFormData) => {
    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase.from('events').insert({
        title: data.title,
        type: data.type,
        team_id: data.team_id,
        season_id: data.season_id,
        start_time: data.start_time,
        end_time: data.end_time,
        arrival_time: data.arrival_time || null,
        location: data.location || null,
        notes: data.notes || null,
      } as never)

      if (error) throw error
      navigate('/admin/events')
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to create event')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <AdminSkeletonTable rows={6} columns={2} />
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        Create Event
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="team_id"
                  control={control}
                  rules={{ required: 'Team is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Team"
                      fullWidth
                      required
                      error={!!errors.team_id}
                      helperText={errors.team_id?.message}
                    >
                      <MenuItem value="">Select team...</MenuItem>
                      {teams.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="season_id"
                  control={control}
                  rules={{ required: 'Season is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Season"
                      fullWidth
                      required
                      disabled={!watchTeamId}
                      error={!!errors.season_id}
                      helperText={errors.season_id?.message}
                    >
                      <MenuItem value="">Select season...</MenuItem>
                      {seasons.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="title"
                  control={control}
                  rules={{ required: 'Event title is required', minLength: { value: 3, message: 'Title must be at least 3 characters' } }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Event Title"
                      fullWidth
                      required
                      placeholder="e.g. Practice @ Main Field"
                      error={!!errors.title}
                      helperText={errors.title?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Type"
                      fullWidth
                    >
                      <MenuItem value="practice">Practice</MenuItem>
                      <MenuItem value="game">Game</MenuItem>
                      <MenuItem value="tournament">Tournament</MenuItem>
                      <MenuItem value="meeting">Meeting</MenuItem>
                    </TextField>
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="location"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Location"
                      fullWidth
                      placeholder="Address or venue name"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="start_time"
                  control={control}
                  rules={{ required: 'Start time is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Start Time"
                      type="datetime-local"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.start_time}
                      helperText={errors.start_time?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="end_time"
                  control={control}
                  rules={{ required: 'End time is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="End Time"
                      type="datetime-local"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.end_time}
                      helperText={errors.end_time?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="arrival_time"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Arrival Time (optional)"
                      type="datetime-local"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Notes"
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Additional details..."
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button onClick={() => navigate('/admin/events')}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Creating...
                  </>
                ) : (
                  'Create Event'
                )}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
