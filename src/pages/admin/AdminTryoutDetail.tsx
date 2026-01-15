import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import type { Database } from '../../lib/database.types'

type TryoutRow = {
  id: string
  org_id: string
  title: string
  name: string | null
  type: string
  start_at: string | null
  tryout_date: string | null
  location: string
}

type TryoutCriteriaRow = {
  id: string
  tryout_id: string
  name: string
  description: string | null
  sort_order: number
  min_score: number
  max_score: number
}

type RequiredDocRow = {
  id: string
  tryout_id: string
  key: string
  label: string
  description: string | null
  required: boolean
}

type RegistrationRow = {
  id: string
  child_id: string
  status: string
  created_at: string
  child?: { first_name: string; last_name: string }
}

type TeamRow = { id: string; name: string }
type SeasonRow = { id: string; name: string; team_id: string }

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function AdminTryoutDetail() {
  const { tryoutId } = useParams()
  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const [tryout, setTryout] = useState<TryoutRow | null>(null)
  const [criteria, setCriteria] = useState<TryoutCriteriaRow[]>([])
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocRow[]>([])
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([])
  const [loading, setLoading] = useState(true)

  const [newCriterionName, setNewCriterionName] = useState('')
  const [newCriterionDesc, setNewCriterionDesc] = useState('')
  const [newDocKey, setNewDocKey] = useState('')
  const [newDocLabel, setNewDocLabel] = useState('')
  const [newDocRequired, setNewDocRequired] = useState(true)

  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string>('')
  const selectedRegistration = useMemo(
    () => registrations.find(r => r.id === selectedRegistrationId) ?? null,
    [registrations, selectedRegistrationId]
  )

  const [scoreDraft, setScoreDraft] = useState<Record<string, { score: string; notes: string }>>({})

  const [convertTeamId, setConvertTeamId] = useState<string>('')
  const [convertSeasonId, setConvertSeasonId] = useState<string>('')
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [seasons, setSeasons] = useState<SeasonRow[]>([])

  const fetchAll = useCallback(async () => {
    if (!tryoutId || !profile || !currentOrganization) return

    // enforce admin/org_admin access at UX layer (RLS is real security)
    const isOrgAdmin = profile.role === 'admin' || profile.organizations.some(o => o.id === currentOrganization.id && o.role === 'org_admin')
    if (!isOrgAdmin) {
      navigate('/portal/unauthorized')
      return
    }

    setLoading(true)

    const { data: tryoutData, error: tryoutError } = await supabase
      .from('tryouts')
      .select('*')
      .eq('id', tryoutId)
      .eq('org_id', currentOrganization.id)
      .single()

    if (tryoutError) {
      console.error(tryoutError)
      setLoading(false)
      return
    }

    setTryout(tryoutData as unknown as TryoutRow)

    const { data: criteriaData } = await (supabase as any)
      .from('tryout_criteria')
      .select('id, tryout_id, name, description, sort_order, min_score, max_score')
      .eq('tryout_id', tryoutId)
      .order('sort_order', { ascending: true })

    setCriteria((criteriaData as TryoutCriteriaRow[]) || [])

    const { data: docData } = await (supabase as any)
      .from('tryout_required_documents')
      .select('id, tryout_id, key, label, description, required')
      .eq('tryout_id', tryoutId)
      .order('created_at', { ascending: true })

    setRequiredDocs((docData as RequiredDocRow[]) || [])

    const { data: regData } = await supabase
      .from('tryout_registrations')
      .select('id, child_id, status, created_at, child:children(first_name, last_name)')
      .eq('tryout_id', tryoutId)
      .order('created_at', { ascending: false })

    setRegistrations((regData as unknown as RegistrationRow[]) || [])

    const { data: teamData } = await supabase
      .from('teams')
      .select('id, name')
      .eq('org_id', currentOrganization.id)
      .order('name', { ascending: true })

    setTeams((teamData as TeamRow[]) || [])

    setLoading(false)
  }, [tryoutId, profile, currentOrganization, navigate])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  useEffect(() => {
    async function loadSeasons() {
      if (!convertTeamId) {
        setSeasons([])
        return
      }
      const { data } = await supabase
        .from('seasons')
        .select('id, name, team_id')
        .eq('team_id', convertTeamId)
        .order('start_date', { ascending: false })

      setSeasons((data as SeasonRow[]) || [])
    }
    void loadSeasons()
  }, [convertTeamId])

  async function addCriterion() {
    if (!tryoutId || !newCriterionName.trim()) return
    const { error } = await (supabase as any).from('tryout_criteria').insert({
      tryout_id: tryoutId,
      name: newCriterionName.trim(),
      description: newCriterionDesc.trim() || null,
      sort_order: criteria.length,
      min_score: 1,
      max_score: 10,
    })
    if (error) {
      alert(error.message)
      return
    }
    setNewCriterionName('')
    setNewCriterionDesc('')
    await fetchAll()
  }

  async function addRequiredDoc() {
    if (!tryoutId || !newDocKey.trim() || !newDocLabel.trim()) return
    const key = newDocKey.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
    const { error } = await (supabase as any).from('tryout_required_documents').insert({
      tryout_id: tryoutId,
      key,
      label: newDocLabel.trim(),
      required: newDocRequired,
    })
    if (error) {
      alert(error.message)
      return
    }
    setNewDocKey('')
    setNewDocLabel('')
    setNewDocRequired(true)
    await fetchAll()
  }

  async function updateRegistrationStatus(
    registrationId: string,
    status: Database['public']['Enums']['tryout_registration_status']
  ) {
    const { error } = await supabase
      .from('tryout_registrations')
      .update({ status })
      .eq('id', registrationId)
    if (error) alert(error.message)
    await fetchAll()
  }

  async function loadScoresForRegistration(registrationId: string) {
    // pull existing scores for this coach so they can edit
    if (!profile?.id) return
    const { data, error } = await (supabase as any)
      .from('tryout_scores')
      .select('criteria_id, score, notes')
      .eq('registration_id', registrationId)
      .eq('coach_id', profile.id)

    if (error) {
      console.error(error)
      return
    }
    const next: Record<string, { score: string; notes: string }> = {}
    ;(data as any[] | null)?.forEach((row) => {
      if (!row.criteria_id) return
      next[row.criteria_id] = { score: String(row.score ?? ''), notes: String(row.notes ?? '') }
    })
    setScoreDraft(next)
  }

  async function saveScores() {
    if (!selectedRegistration || !profile?.id) return

    for (const c of criteria) {
      const d = scoreDraft[c.id]
      if (!d) continue
      const scoreNum = Number(d.score)
      if (!Number.isFinite(scoreNum)) continue

      const { error } = await (supabase as any)
        .from('tryout_scores')
        .upsert(
          {
            registration_id: selectedRegistration.id,
            criteria_id: c.id,
            coach_id: profile.id,
            score: scoreNum,
            notes: d.notes || null,
            category: c.name, // legacy compatibility
          },
          { onConflict: 'registration_id,criteria_id,coach_id' }
        )

      if (error) {
        alert(error.message)
        return
      }
    }

    alert('Scores saved')
  }

  async function convertToTeamMember() {
    if (!selectedRegistration || !convertTeamId || !convertSeasonId) return
    const { error } = await supabase.rpc('convert_accepted_tryout_registration_to_team_member', {
      p_registration_id: selectedRegistration.id,
      p_team_id: convertTeamId,
      p_season_id: convertSeasonId,
    })
    if (error) {
      alert(error.message)
      return
    }
    alert('Converted to team member')
  }

  if (loading) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Loading tryout…
        </Typography>
      </Box>
    )
  }

  if (!tryout) {
    return (
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Tryout not found
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        {tryout.name ?? tryout.title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {tryout.start_at ? formatDateTime(tryout.start_at) : tryout.tryout_date ? new Date(tryout.tryout_date).toLocaleDateString() : 'TBD'} • {tryout.location}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Evaluation Criteria
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  label="Name"
                  value={newCriterionName}
                  onChange={(e) => setNewCriterionName(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Button variant="contained" onClick={addCriterion}>
                  Add
                </Button>
              </Box>
              <TextField
                label="Description (optional)"
                value={newCriterionDesc}
                onChange={(e) => setNewCriterionDesc(e.target.value)}
                size="small"
                fullWidth
                multiline
                minRows={2}
              />

              <Divider sx={{ my: 2 }} />

              {criteria.length === 0 ? (
                <Typography color="text.secondary">No criteria yet.</Typography>
              ) : (
                criteria.map((c) => (
                  <Box key={c.id} sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
                    {c.description && <Typography color="text.secondary" variant="body2">{c.description}</Typography>}
                  </Box>
                ))
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Required Documents
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  label="Key"
                  value={newDocKey}
                  onChange={(e) => setNewDocKey(e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Label"
                  value={newDocLabel}
                  onChange={(e) => setNewDocLabel(e.target.value)}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Required</InputLabel>
                  <Select
                    label="Required"
                    value={newDocRequired ? 'yes' : 'no'}
                    onChange={(e) => setNewDocRequired(e.target.value === 'yes')}
                  >
                    <MenuItem value="yes">Yes</MenuItem>
                    <MenuItem value="no">No</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" onClick={addRequiredDoc}>
                  Add
                </Button>
              </Box>

              {requiredDocs.length === 0 ? (
                <Typography color="text.secondary">No required documents.</Typography>
              ) : (
                requiredDocs.map((d) => (
                  <Box key={d.id} sx={{ mb: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>{d.label} {d.required ? '(required)' : '(optional)'}</Typography>
                    <Typography color="text.secondary" variant="body2">key: {d.key}</Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Registrations
              </Typography>
              {registrations.length === 0 ? (
                <Typography color="text.secondary">No registrations yet.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Athlete</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {registrations.map((r) => (
                      <TableRow
                        key={r.id}
                        hover
                        selected={r.id === selectedRegistrationId}
                        onClick={() => {
                          setSelectedRegistrationId(r.id)
                          void loadScoresForRegistration(r.id)
                        }}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{r.child ? `${r.child.first_name} ${r.child.last_name}` : r.child_id}</TableCell>
                        <TableCell>{r.status}</TableCell>
                        <TableCell>
                          <Button size="small" onClick={(e) => { e.stopPropagation(); void updateRegistrationStatus(r.id, 'checked_in') }}>
                            Check-in
                          </Button>
                          <Button size="small" onClick={(e) => { e.stopPropagation(); void updateRegistrationStatus(r.id, 'offered') }}>
                            Offer
                          </Button>
                          <Button size="small" color="warning" onClick={(e) => { e.stopPropagation(); void updateRegistrationStatus(r.id, 'waitlisted') }}>
                            Waitlist
                          </Button>
                          <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); void updateRegistrationStatus(r.id, 'not_selected') }}>
                            Not selected
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {selectedRegistration && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Evaluation (selected athlete)
                </Typography>

                {criteria.length === 0 ? (
                  <Typography color="text.secondary">Add criteria to enable scoring.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {criteria.map((c) => (
                      <Grid key={c.id} container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
                          {c.description && <Typography color="text.secondary" variant="body2">{c.description}</Typography>}
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <TextField
                            label="Score"
                            size="small"
                            value={scoreDraft[c.id]?.score ?? ''}
                            onChange={(e) =>
                              setScoreDraft((prev) => ({
                                ...prev,
                                [c.id]: { score: e.target.value, notes: prev[c.id]?.notes ?? '' },
                              }))
                            }
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Notes"
                            size="small"
                            fullWidth
                            value={scoreDraft[c.id]?.notes ?? ''}
                            onChange={(e) =>
                              setScoreDraft((prev) => ({
                                ...prev,
                                [c.id]: { score: prev[c.id]?.score ?? '', notes: e.target.value },
                              }))
                            }
                          />
                        </Grid>
                      </Grid>
                    ))}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="contained" onClick={saveScores}>
                        Save scores
                      </Button>
                    </Box>
                  </Box>
                )}

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Convert to Team Member
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Team</InputLabel>
                      <Select label="Team" value={convertTeamId} onChange={(e) => { setConvertTeamId(e.target.value); setConvertSeasonId('') }}>
                        {teams.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small" disabled={!convertTeamId}>
                      <InputLabel>Season</InputLabel>
                      <Select label="Season" value={convertSeasonId} onChange={(e) => setConvertSeasonId(e.target.value)}>
                        {seasons.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button variant="contained" disabled={!convertTeamId || !convertSeasonId} onClick={convertToTeamMember}>
                    Convert
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}

