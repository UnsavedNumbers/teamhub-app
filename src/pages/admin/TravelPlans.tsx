import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
} from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

interface TravelPlan {
  id: string
  title: string
  location: string
  start_date: string
  end_date: string
  team: { name: string }
}

export default function TravelPlans() {
  const [plans, setPlans] = useState<TravelPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    fetchPlans()
  }, [profile, navigate, page, rowsPerPage])

  async function fetchPlans() {
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
        .select('id, title, location, start_date, end_date, team:teams(name)')
        .order('start_date', { ascending: false })
        .range(from, to)

      setPlans((data as unknown as TravelPlan[]) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDateRange(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
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
                  <TableCell>Location</TableCell>
                  <TableCell>Dates</TableCell>
                  <TableCell>Team</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id} hover>
                    <TableCell>{plan.title}</TableCell>
                    <TableCell>{plan.location}</TableCell>
                    <TableCell>{formatDateRange(plan.start_date, plan.end_date)}</TableCell>
                    <TableCell>{plan.team.name}</TableCell>
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
