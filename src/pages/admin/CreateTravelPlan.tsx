import { useState, useEffect, useCallback } from 'react'
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
  Stack,
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
      destination_city: '',
      destination_state: '',
      start_date: '',
      end_date: '',
      venue_name: '',
      venue_address: '',
      hotel_name: '',
      hotel_address: '',
      hotel_phone: '',
      hotel_confirmation: '',
      maps_url: '',
      notes: '',
    },
  })

  const watchTeamId = watch('team_id')

  const fetchTeams = useCallback(async () => {
    if (!currentOrganization?.id) return
    const { data } = await supabase
      .from('teams')
      .select('id, name')
      .eq('org_id', currentOrganization.id)
      .order('name')
    setTeams((data as Team[]) || [])
    setLoading(false)
  }, [currentOrganization?.id])

  const fetchSeasons = useCallback(async (teamId: string) => {
    const { data } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false })
    const seasonsData = data as unknown as Season[]
    setSeasons(seasonsData || [])
  }, [])

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    if (currentOrganization?.id) {
      fetchTeams()
    }
  }, [profile, currentOrganization, navigate, fetchTeams])

  useEffect(() => {
    if (watchTeamId) {
      fetchSeasons(watchTeamId)
      setValue('season_id', '')
    }
  }, [watchTeamId, setValue, fetchSeasons])

  const onSubmit = async (data: TravelFormData) => {
    setSaving(true)
    setError(null)

    try {
      // Create draft plan first to get an id (needed for predictable storage object naming).
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
        status: 'draft',
      } as never)
        .select('id')
        .single()

      if (insertError) throw insertError

      // Optional itinerary upload (stored under {org_id}/{team_id}/{plan_id}/{filename})
      if (itineraryFile && inserted?.id && currentOrganization?.id) {
        const objectPath = `${currentOrganization.id}/${data.team_id}/${inserted.id}/${itineraryFile.name}`
        const { error: uploadError } = await supabase.storage.from('travel-itineraries').upload(objectPath, itineraryFile, {
          upsert: true,
          contentType: itineraryFile.type || undefined,
        })
        if (uploadError) throw uploadError

        const { error: updateError } = await supabase
          .from('travel_plans')
          .update({ itinerary_file_path: objectPath } as never)
          .eq('id', inserted.id)
        if (updateError) throw updateError
      }

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
                      label="Location (city/state or details)"
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
                  name="destination_city"
                  control={control}
                  render={({ field }) => <TextField {...field} label="Destination City" fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="destination_state"
                  control={control}
                  render={({ field }) => <TextField {...field} label="Destination State" fullWidth />}
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
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Venue
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller name="venue_name" control={control} render={({ field }) => <TextField {...field} label="Venue Name" fullWidth />} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller name="venue_address" control={control} render={({ field }) => <TextField {...field} label="Venue Address" fullWidth />} />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Hotel
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller name="hotel_name" control={control} render={({ field }) => <TextField {...field} label="Hotel Name" fullWidth />} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller name="hotel_address" control={control} render={({ field }) => <TextField {...field} label="Hotel Address" fullWidth />} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller name="hotel_phone" control={control} render={({ field }) => <TextField {...field} label="Hotel Phone" fullWidth />} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="hotel_confirmation"
                  control={control}
                  render={({ field }) => <TextField {...field} label="Hotel Confirmation (optional)" fullWidth />}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller name="maps_url" control={control} render={({ field }) => <TextField {...field} label="Map Link URL (optional)" fullWidth />} />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Itinerary File
                </Typography>
                <Stack spacing={1}>
                  <Button variant="outlined" component="label">
                    Choose file
                    <input type="file" hidden onChange={(e) => setItineraryFile(e.target.files?.[0] ?? null)} />
                  </Button>
                  {itineraryFile && (
                    <Typography variant="body2">Selected: {itineraryFile.name}</Typography>
                  )}
                </Stack>
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
                  'Create Draft Travel Plan'
                )}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
