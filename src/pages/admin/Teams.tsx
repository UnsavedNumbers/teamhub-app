import { useState, useEffect, useCallback } from 'react'
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
} from '@mui/material'
import { Add as AddIcon, Groups as TeamsIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { adaptTeamToTableRow, TeamTableRow } from '../../utils/dataAdapters'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'
import type { Database } from '../../lib/database.types'

type TeamRow = Database['public']['Tables']['teams']['Row']

export default function Teams() {
  const [teams, setTeams] = useState<TeamTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page] = useState(0)
  const [rowsPerPage] = useState(50)

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const fetchTeams = useCallback(async () => {
    if (!currentOrganization?.id) return

    setLoading(true)
    try {
      // Get paginated data
      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('org_id', currentOrganization.id)
        .order('name', { ascending: true })
        .range(from, to)

      if (error) {
        console.error('Error fetching teams:', error)
        setLoading(false)
        return
      }

      const teamRows = (data || []) as TeamRow[]
      const adaptedData = teamRows.map((team) => adaptTeamToTableRow(team, 0, 0, 0))

      setTeams(adaptedData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [currentOrganization?.id, page, rowsPerPage])

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    if (currentOrganization?.id) {
      fetchTeams()
    }
  }, [profile, currentOrganization, navigate, page, rowsPerPage, fetchTeams])

  async function handleCreateTeam() {
    if (!newTeamName.trim() || !currentOrganization?.id) return

    setCreating(true)
    setError(null)

    const { error } = await supabase.from('teams').insert({
      name: newTeamName.trim(),
      org_id: currentOrganization.id,
    } as never)

    if (error) {
      setError(error.message)
    } else {
      setNewTeamName('')
      setShowCreateModal(false)
      fetchTeams()
    }
    setCreating(false)
  }

  if (loading && teams.length === 0) {
    return <AdminSkeletonTable rows={6} columns={3} />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Teams
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateModal(true)}
        >
          New Team
        </Button>
      </Box>

      {teams.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Box sx={{ mb: 2 }}>
              <TeamsIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
            </Box>
            <Typography variant="h6" gutterBottom>
              No teams yet
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              Create your first team to get started.
            </Typography>
            <Button variant="contained" onClick={() => setShowCreateModal(true)}>
              Create Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {teams.map((team) => (
            <Grid item xs={12} sm={6} md={4} key={team.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => navigate(`/admin/teams/${team.id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        backgroundColor: 'primary.main',
                        borderRadius: 2,
                        p: 1.5,
                        color: 'white',
                      }}
                    >
                      <TeamsIcon />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {team.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {team.playerCount} players
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Team Dialog */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Team</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Team Name"
            fullWidth
            variant="outlined"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="e.g. U12 Lightning"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newTeamName.trim()) {
                handleCreateTeam()
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button
            onClick={handleCreateTeam}
            disabled={creating || !newTeamName.trim()}
            variant="contained"
          >
            {creating ? <CircularProgress size={20} /> : 'Create Team'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
