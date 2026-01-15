import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Stack,
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

interface TravelPlan {
  id: string
  title: string
  location: string
  start_date: string
  end_date: string
  status: 'draft' | 'published' | 'cancelled'
  team: { name: string }
}

export default function TravelPlans() {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  const { profile } = useAuth()
  const navigate = useNavigate()

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const { count } = await supabase
        .from('travel_plans')
        .select('*', { count: 'exact', head: true })

      setTotalCount(count || 0)

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1

      const { data } = await supabase
        .from('travel_plans')
        .select('id, title, location, start_date, end_date, status, team:teams(name)')
        .order('start_date', { ascending: false })
        .range(from, to)

      setPlans((data as unknown as TravelPlan[]) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage])

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    fetchPlans()
  }, [profile, navigate, page, rowsPerPage, fetchPlans])

  function formatDateRange(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
  }

  function statusChip(status: TravelPlan['status']) {
    switch (status) {
      case 'draft':
        return <Chip size="small" label="Draft" />
      case 'published':
        return <Chip size="small" color="success" label="Published" />
      case 'cancelled':
        return <Chip size="small" color="error" label="Cancelled" />
      default:
        return <Chip size="small" label={status} />
    }
  }

  async function publishPlan(id: string) {
    await supabase
      .from('travel_plans')
      .update({ status: 'published', published_at: new Date().toISOString(), cancelled_at: null } as never)
      .eq('id', id)
    fetchPlans()
  }

  async function cancelPlan(id: string) {
    await supabase
      .from('travel_plans')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as never)
      .eq('id', id)
    fetchPlans()
  }

  if (loading && plans.length === 0) {
    return <AdminSkeletonTable rows={6} columns={4} />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Travel Plans
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/admin/travel/new')}>
          New Travel Plan
        </Button>
      </Box>

      {plans.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" gutterBottom>
              No travel plans
            </Typography>
            <Typography color="textSecondary" sx={{ mb: 3 }}>
              Create a travel plan to get started.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/admin/travel/new')}>
              Create Travel Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow
                    key={plan.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/travel/${plan.id}`)}
                  >
                    <TableCell>{plan.title}</TableCell>
                    <TableCell>{statusChip(plan.status)}</TableCell>
                    <TableCell>{plan.location}</TableCell>
                    <TableCell>{formatDateRange(plan.start_date, plan.end_date)}</TableCell>
                    <TableCell>{plan.team.name}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => navigate(`/admin/travel/${plan.id}`)}>
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="success"
                          variant="contained"
                          disabled={plan.status === 'published'}
                          onClick={() => publishPlan(plan.id)}
                        >
                          Publish
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="contained"
                          disabled={plan.status === 'cancelled'}
                          onClick={() => cancelPlan(plan.id)}
                        >
                          Cancel
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10))
              setPage(0)
            }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </Card>
      )}
    </Box>
  )
}
