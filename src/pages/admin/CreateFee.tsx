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
  FormControlLabel,
  Checkbox,
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

interface Child {
  id: string
  first_name: string
  last_name: string
}

interface FeeFormData {
  team_id: string
  season_id: string
  child_id: string
  amount: string
  description: string
  due_date: string
  applyToAll: boolean
}

export default function CreateFee() {
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [children, setChildren] = useState<Child[]>([])
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
  } = useForm<FeeFormData>({
    defaultValues: {
      team_id: '',
      season_id: '',
      child_id: '',
      amount: '',
      description: '',
      due_date: '',
      applyToAll: false,
    },
  })

  const watchTeamId = watch('team_id')
  const watchApplyToAll = watch('applyToAll')

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

  const fetchChildren = useCallback(async (teamId: string) => {
    const { data } = await supabase
      .from('team_memberships')
      .select('child:children(id, first_name, last_name)')
      .eq('team_id', teamId)
      .eq('status', 'active')
    const memberships = data as unknown as { child: Child }[]
    const childList = memberships?.map(m => m.child) || []
    setChildren(childList)
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
      fetchChildren(watchTeamId)
      setValue('season_id', '')
      setValue('child_id', '')
    }
  }, [watchTeamId, setValue, fetchSeasons, fetchChildren])

  const onSubmit = async (data: FeeFormData) => {
    if (!data.team_id || !data.season_id || !data.amount) return

    setSaving(true)
    setError(null)

    const amountCents = Math.round(parseFloat(data.amount) * 100)

    try {
      if (data.applyToAll) {
        // Create fee assignments for all children on team
        const inserts = children.map((child) => ({
          organization_id: currentOrganization?.id,
          fee_id: null, // Will need to create fee first, then assignments
          child_id: child.id,
          amount_cents: amountCents,
          balance_cents: amountCents,
          paid_cents_total: 0,
          status: 'unpaid',
          due_date: data.due_date || null,
        }))

        // For now, using simplified approach - create fee_assignments directly
        // In production, should create fee template first, then assignments
        const { error } = await supabase.from('fee_assignments').insert(inserts as never[])
        if (error) throw error
      } else {
        if (!data.child_id) {
          setError('Select a child or apply to all')
          setSaving(false)
          return
        }

        const { error } = await supabase.from('fee_assignments').insert({
          organization_id: currentOrganization?.id,
          fee_id: null,
          child_id: data.child_id,
          amount_cents: amountCents,
          balance_cents: amountCents,
          paid_cents_total: 0,
          status: 'unpaid',
          due_date: data.due_date || null,
        } as never)

        if (error) throw error
      }

      navigate('/admin/payments')
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Failed to create fee')
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
        Create Fee
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
                  name="applyToAll"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox {...field} checked={field.value} />}
                      label="Apply to all players on team"
                    />
                  )}
                />
              </Grid>

              {!watchApplyToAll && (
                <Grid item xs={12}>
                  <Controller
                    name="child_id"
                    control={control}
                    rules={{ required: watchApplyToAll ? false : 'Player is required' }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        label="Player"
                        fullWidth
                        required={!watchApplyToAll}
                        disabled={!watchTeamId}
                        error={!!errors.child_id}
                        helperText={errors.child_id?.message}
                      >
                        <MenuItem value="">Select player...</MenuItem>
                        {children.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.first_name} {c.last_name}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <Controller
                  name="amount"
                  control={control}
                  rules={{
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Amount ($)"
                      type="number"
                      inputProps={{ step: '0.01', min: '0' }}
                      fullWidth
                      required
                      error={!!errors.amount}
                      helperText={errors.amount?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="due_date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Due Date"
                      type="date"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description"
                      fullWidth
                      placeholder="e.g. Season registration fee"
                    />
                  )}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
              <Button onClick={() => navigate('/admin/payments')}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Creating...
                  </>
                ) : watchApplyToAll ? (
                  `Create for ${children.length} players`
                ) : (
                  'Create Fee'
                )}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
