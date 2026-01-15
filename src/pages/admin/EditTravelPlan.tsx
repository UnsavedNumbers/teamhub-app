import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
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

export interface MeetingLocation {
  name: string
  address: string
  time?: string
  notes?: string
  maps_url?: string
}

interface TravelPlanRow {
  id: string
  team_id: string
  season_id: string
  title: string
  location: string
  destination_city: string | null
  destination_state: string | null
  start_date: string
  end_date: string
  status: 'draft' | 'published' | 'cancelled'
  published_at: string | null
  cancelled_at: string | null
  venue_name: string | null
  venue_address: string | null
  hotel_name: string | null
  hotel_address: string | null
  hotel_phone: string | null
  hotel_confirmation: string | null
  maps_url: string | null
  notes: string | null
  itinerary_file_path: string | null
  meeting_locations: unknown | null
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

function parseMeetingLocations(value: unknown): MeetingLocation[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => {
      const o = v as Partial<MeetingLocation> | null
      if (!o) return null
      if (typeof o.name !== 'string' || typeof o.address !== 'string') return null
      return {
        name: o.name,
        address: o.address,
        time: typeof o.time === 'string' ? o.time : undefined,
        notes: typeof o.notes === 'string' ? o.notes : undefined,
        maps_url: typeof o.maps_url === 'string' ? o.maps_url : undefined,
      }
    })
    .filter(Boolean) as MeetingLocation[]
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

  const canAdmin = useMemo(() => {
    return !!profile && (profile.role === 'admin' || profile.organizations.some((org) => org.role === 'org_admin'))
  }, [profile])

  const fetchTeams = useCallback(async () => {
    if (!currentOrganization?.id) return
    const { data } = await supabase
      .from('teams')
      .select('id, name')
      .eq('org_id', currentOrganization.id)
      .order('name')
    setTeams((data as Team[]) || [])
  }, [currentOrganization?.id])

  const fetchSeasons = useCallback(async (teamId: string) => {
    const { data } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false })
    setSeasons((data as unknown as Season[]) || [])
  }, [])

  const loadPlan = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('travel_plans')
        .select(
          'id, team_id, season_id, title, location, destination_city, destination_state, start_date, end_date, status, published_at, cancelled_at, venue_name, venue_address, hotel_name, hotel_address, hotel_phone, hotel_confirmation, maps_url, notes, itinerary_file_path, meeting_locations'
        )
        .eq('id', id)
        .single()
      if (error) throw error

      const row = data as unknown as TravelPlanRow
      setPlan(row)

      setValue('team_id', row.team_id)
      setValue('season_id', row.season_id)
      setValue('title', row.title)
      setValue('location', row.location)
      setValue('destination_city', row.destination_city ?? '')
      setValue('destination_state', row.destination_state ?? '')
      setValue('start_date', row.start_date)
      setValue('end_date', row.end_date)
      setValue('venue_name', row.venue_name ?? '')
      setValue('venue_address', row.venue_address ?? '')
      setValue('hotel_name', row.hotel_name ?? '')
      setValue('hotel_address', row.hotel_address ?? '')
      setValue('hotel_phone', row.hotel_phone ?? '')
      setValue('hotel_confirmation', row.hotel_confirmation ?? '')
      setValue('maps_url', row.maps_url ?? '')
      setValue('notes', row.notes ?? '')

      setMeetingLocations(parseMeetingLocations(row.meeting_locations))
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to load travel plan')
    } finally {
      setLoading(false)
    }
  }, [id, setValue])

  useEffect(() => {
    if (!canAdmin) {
      navigate('/portal/unauthorized')
      return
    }
    fetchTeams()
    loadPlan()
  }, [canAdmin, navigate, fetchTeams, loadPlan])

  useEffect(() => {
    if (watchTeamId) {
      fetchSeasons(watchTeamId)
      setValue('season_id', '')
    }
  }, [watchTeamId, fetchSeasons, setValue])

  async function uploadItineraryIfNeeded(planId: string, teamId: string) {
    if (!itineraryFile || !currentOrganization?.id) return null
    const objectPath = `${currentOrganization.id}/${teamId}/${planId}/${itineraryFile.name}`
    const { error } = await supabase.storage.from('travel-itineraries').upload(objectPath, itineraryFile, {
      upsert: true,
      contentType: itineraryFile.type || undefined,
    })
    if (error) throw error
    return objectPath
  }

  const onSubmit = async (data: TravelFormData) => {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      const itineraryPath = await uploadItineraryIfNeeded(id, data.team_id)

      const { error } = await supabase
        .from('travel_plans')
        .update({
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
          meeting_locations: meetingLocations.length ? meetingLocations : null,
          ...(itineraryPath ? { itinerary_file_path: itineraryPath } : {}),
        } as never)
        .eq('id', id)

      if (error) throw error
      navigate('/admin/travel')
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to save travel plan')
    } finally {
      setSaving(false)
    }
  }

  async function publishPlan() {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('travel_plans')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          cancelled_at: null,
        } as never)
        .eq('id', id)
      if (error) throw error
      await loadPlan()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to publish travel plan')
    } finally {
      setSaving(false)
    }
  }

  async function cancelPlan() {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('travel_plans')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        } as never)
        .eq('id', id)
      if (error) throw error
      await loadPlan()
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to cancel travel plan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminSkeletonTable rows={8} columns={2} />
  if (!plan) return null

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Edit Travel Plan
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => navigate('/admin/travel')}>Back</Button>
          <Button
            variant="contained"
            color="success"
            onClick={publishPlan}
            disabled={saving || plan.status === 'published'}
          >
            Publish
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={cancelPlan}
            disabled={saving || plan.status === 'cancelled'}
          >
            Cancel Trip
          </Button>
        </Stack>
      </Box>

      <Card>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Status: <strong>{plan.status}</strong>
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="team_id"
                  control={control}
                  rules={{ required: 'Team is required' }}
                  render={({ field }) => (
                    <TextField {...field} select label="Team" fullWidth required error={!!errors.team_id} helperText={errors.team_id?.message}>
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
                    <TextField {...field} label="Trip Name" fullWidth required error={!!errors.title} helperText={errors.title?.message} />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller name="destination_city" control={control} render={({ field }) => <TextField {...field} label="Destination City" fullWidth />} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller name="destination_state" control={control} render={({ field }) => <TextField {...field} label="Destination State" fullWidth />} />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="location"
                  control={control}
                  rules={{ required: 'Location is required' }}
                  render={({ field }) => (
                    <TextField {...field} label="Location (city/state or details)" fullWidth required error={!!errors.location} helperText={errors.location?.message} />
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

              <Grid item xs={12} md={6}>
                <Controller name="venue_name" control={control} render={({ field }) => <TextField {...field} label="Venue Name" fullWidth />} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller name="venue_address" control={control} render={({ field }) => <TextField {...field} label="Venue Address" fullWidth />} />
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
                  Meeting Locations
                </Typography>
                <Stack spacing={2}>
                  {meetingLocations.map((loc, idx) => (
                    <Card key={idx} variant="outlined">
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Name"
                              fullWidth
                              value={loc.name}
                              onChange={(e) => {
                                const next = [...meetingLocations]
                                next[idx] = { ...next[idx], name: e.target.value }
                                setMeetingLocations(next)
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              label="Address"
                              fullWidth
                              value={loc.address}
                              onChange={(e) => {
                                const next = [...meetingLocations]
                                next[idx] = { ...next[idx], address: e.target.value }
                                setMeetingLocations(next)
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              label="Time (optional)"
                              fullWidth
                              value={loc.time ?? ''}
                              onChange={(e) => {
                                const next = [...meetingLocations]
                                next[idx] = { ...next[idx], time: e.target.value || undefined }
                                setMeetingLocations(next)
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} md={8}>
                            <TextField
                              label="Maps URL (optional)"
                              fullWidth
                              value={loc.maps_url ?? ''}
                              onChange={(e) => {
                                const next = [...meetingLocations]
                                next[idx] = { ...next[idx], maps_url: e.target.value || undefined }
                                setMeetingLocations(next)
                              }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              label="Notes (optional)"
                              fullWidth
                              multiline
                              rows={2}
                              value={loc.notes ?? ''}
                              onChange={(e) => {
                                const next = [...meetingLocations]
                                next[idx] = { ...next[idx], notes: e.target.value || undefined }
                                setMeetingLocations(next)
                              }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Button
                              color="error"
                              onClick={() => setMeetingLocations(meetingLocations.filter((_, i) => i !== idx))}
                            >
                              Remove
                            </Button>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                  <Button
                    variant="outlined"
                    onClick={() => setMeetingLocations([...meetingLocations, { name: '', address: '' }])}
                  >
                    Add Meeting Location
                  </Button>
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Itinerary File
                </Typography>
                <Stack spacing={1}>
                  {plan.itinerary_file_path ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Current: {plan.itinerary_file_path}
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No itinerary uploaded yet.
                    </Typography>
                  )}
                  <Button variant="outlined" component="label">
                    Choose file
                    <input
                      type="file"
                      hidden
                      onChange={(e) => setItineraryFile(e.target.files?.[0] ?? null)}
                    />
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
                  render={({ field }) => <TextField {...field} label="Notes" fullWidth multiline rows={4} />}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button onClick={() => navigate('/admin/travel')}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}

