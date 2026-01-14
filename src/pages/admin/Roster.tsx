import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTeamParams } from '../../hooks/useRouteParams'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

interface Season {
  id: string
  name: string
}

interface Membership {
  id: string
  child_id: string
  child: { first_name: string; last_name: string; family: { name: string } }
}

export default function Roster() {
  const { teamId } = useTeamParams()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [roster, setRoster] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const { profile } = useAuth()
  const navigate = useNavigate()

  const fetchSeasons = useCallback(async () => {
    const { data } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('team_id', teamId)
      .order('start_date', { ascending: false })

    const list = data as unknown as Season[]
    if (list && list.length > 0) {
      setSeasons(list)
      setSelectedSeason(list[0].id)
    }
    setLoading(false)
  }, [teamId])

  const fetchRoster = useCallback(async () => {
    const { data } = await supabase
      .from('team_memberships')
      .select('id, child_id, child:children(first_name, last_name, family:families(name))')
      .eq('team_id', teamId)
      .eq('season_id', selectedSeason)
      .eq('status', 'active')

    setRoster((data as unknown as Membership[]) || [])
  }, [teamId, selectedSeason])

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    if (teamId) fetchSeasons()
  }, [profile, teamId, navigate, fetchSeasons])

  useEffect(() => {
    if (selectedSeason) fetchRoster()
  }, [selectedSeason, teamId, fetchRoster])

  async function removePlayer(membershipId: string) {
    await supabase
      .from('team_memberships')
      .update({ status: 'inactive' } as never)
      .eq('id', membershipId)
    fetchRoster()
  }

  if (loading) {
    return <AdminSkeletonTable rows={6} columns={4} />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Team Roster
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowAddModal(true)}>
          Add Player
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            select
            label="Season"
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            fullWidth
          >
            {seasons.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell>Family</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">No players on roster</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                roster.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      {member.child.first_name} {member.child.last_name}
                    </TableCell>
                    <TableCell>{member.child.family?.name || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="error" onClick={() => removePlayer(member.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Player to Roster</DialogTitle>
        <DialogContent>
          <Typography color="textSecondary">
            Player selection functionality would be implemented here.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
