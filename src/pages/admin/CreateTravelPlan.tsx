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
}

interface TravelFormData {
  team_id: string
  season_id: string
  title: string
  location: string
  start_date: string
  end_date: string
  notes: string
}

export default function CreateTravelPlan() {
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
  } = useForm<TravelFormData>({
    defaultValues: {
      team_id: '',
      season_id: '',
      title: '',
      location: '',
      start_date: '',
      end_date: '',
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
      .select('id, name')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false })
    const seasonsData = data as unknown as Season[]
    setSeasons(seasonsData || [])
    if (seasonsData && seasonsData.length > 0) {
      setValue('season_id', seasonsData[0].id)
    }
  }

  const onSubmit = async (data: TravelFormData) => {
    setSaving(true)
    setError(null)

    try {
      const { error } = await supabase.from('travel_plans').insert({
        team_id: data.team_id,
        season_id: data.season_id,
        title: data.title,
        location: data.location,
        start_date: data.start_date,
        end_date: data.end_date,
        notes: data.notes || null,
      } as never)

      if (error) throw error
      navigate('/admin/travel')
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to create travel plan')
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
        Create Travel Plan
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
                  rules={{ required: 'Title is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Title"
                      fullWidth
                      required
                      error={!!errors.title}
                      helperText={errors.title?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="location"
                  control={control}
                  rules={{ required: 'Location is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Location"
                      fullWidth
                      required
                      error={!!errors.location}
                      helperText={errors.location?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="start_date"
                  control={control}
                  rules={{ required: 'Start date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Start Date"
                      type="date"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.start_date}
                      helperText={errors.start_date?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="end_date"
                  control={control}
                  rules={{ required: 'End date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="End Date"
                      type="date"
                      fullWidth
                      required
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.end_date}
                      helperText={errors.end_date?.message}
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
                      rows={4}
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button onClick={() => navigate('/admin/travel')}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Creating...
                  </>
                ) : (
                  'Create Travel Plan'
                )}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
