import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material'
import { People as PeopleIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeamParams } from '../../hooks/useRouteParams'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

interface Team {
  id: string
  name: string
}

interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
}

export default function TeamDetail() {
  const { teamId } = useTeamParams()
  const [team, setTeam] = useState<Team | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [seasonForm, setSeasonForm] = useState({ name: '', start_date: '', end_date: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  const { profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    fetchTeamAndSeasons()
  }, [profile, teamId, navigate])

  async function fetchTeamAndSeasons() {
    setLoading(true)

    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    const { data: seasonsData } = await supabase
      .from('seasons')
      .select('*')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false })

    if (teamData) setTeam(teamData as Team)
    if (seasonsData) setSeasons(seasonsData as Season[])

    setLoading(false)
  }

  async function handleCreateSeason() {
    if (!seasonForm.name.trim() || !teamId) return

    setCreating(true)
    setError(null)

    const { error } = await supabase.from('seasons').insert({
      team_id: teamId,
      name: seasonForm.name.trim(),
      start_date: seasonForm.start_date,
      end_date: seasonForm.end_date,
    } as never)

    if (error) {
      setError(error.message)
    } else {
      setSeasonForm({ name: '', start_date: '', end_date: '' })
      setShowSeasonModal(false)
      fetchTeamAndSeasons()
    }
    setCreating(false)
  }

  if (loading) {
    return <AdminSkeletonTable rows={6} columns={3} />
  }

  if (!team) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" gutterBottom>
          Team not found
        </Typography>
        <Button onClick={() => navigate('/admin/teams')}>Back to Teams</Button>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {team.name}
        </Typography>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Seasons" />
          <Tab label="Roster" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => navigate(`/admin/teams/${teamId}/roster`)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      backgroundColor: 'success.main',
                      borderRadius: 2,
                      p: 1.5,
                      color: 'white',
                    }}
                  >
                    <PeopleIcon />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Manage Roster
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Add or remove players
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Seasons</Typography>
            <Button variant="outlined" onClick={() => setShowSeasonModal(true)}>
              New Season
            </Button>
          </Box>

          {seasons.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="textSecondary" sx={{ mb: 2 }}>
                  No seasons yet
                </Typography>
                <Button variant="contained" onClick={() => setShowSeasonModal(true)}>
                  Create First Season
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {seasons.map((season) => (
                <Grid item xs={12} md={6} key={season.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {season.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(season.start_date).toLocaleDateString()} -{' '}
                            {new Date(season.end_date).toLocaleDateString()}
                          </Typography>
                          {season.is_active && (
                            <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                              Active
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Roster</Typography>
              <Button variant="contained" onClick={() => navigate(`/admin/teams/${teamId}/roster`)}>
                Manage Roster
              </Button>
            </Box>
            <Typography color="textSecondary">
              Click "Manage Roster" to add or remove players from this team.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Create Season Dialog */}
      <Dialog open={showSeasonModal} onClose={() => setShowSeasonModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Season</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Season Name"
            fullWidth
            variant="outlined"
            value={seasonForm.name}
            onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
            placeholder="e.g. Spring 2024"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Start Date"
            type="date"
            fullWidth
            variant="outlined"
            value={seasonForm.start_date}
            onChange={(e) => setSeasonForm({ ...seasonForm, start_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="End Date"
            type="date"
            fullWidth
            variant="outlined"
            value={seasonForm.end_date}
            onChange={(e) => setSeasonForm({ ...seasonForm, end_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSeasonModal(false)}>Cancel</Button>
          <Button
            onClick={handleCreateSeason}
            disabled={creating || !seasonForm.name.trim() || !seasonForm.start_date || !seasonForm.end_date}
            variant="contained"
          >
            {creating ? <CircularProgress size={20} /> : 'Create Season'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
