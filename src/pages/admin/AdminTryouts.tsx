import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
} from '@mui/material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

interface Tryout {
  id: string
  title: string
  type?: string | null
  age_group: string
  tryout_date: string
  location: string
  org_id: string
}

export default function AdminTryouts() {
  const [tryouts, setTryouts] = useState<Tryout[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const fetchTryouts = useCallback(async () => {
    setLoading(true)
    try {
      if (!currentOrganization) return

      const { count } = await supabase
        .from('tryouts')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', currentOrganization.id)

      setTotalCount(count || 0)

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1

      const { data } = await supabase
        .from('tryouts')
        .select('*')
        .eq('org_id', currentOrganization.id)
        .order('tryout_date', { ascending: false })
        .range(from, to)

      setTryouts((data as Tryout[]) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, currentOrganization])

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    if (currentOrganization) fetchTryouts()
  }, [profile, navigate, page, rowsPerPage, fetchTryouts, currentOrganization])

  if (loading && tryouts.length === 0) {
    return <AdminSkeletonTable rows={6} columns={5} />
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>
        Tryouts
      </Typography>

      {tryouts.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" gutterBottom>
              No tryouts
            </Typography>
            <Typography color="textSecondary">
              Tryouts will appear here when created.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Sport</TableCell>
                  <TableCell>Age Group</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Location</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tryouts.map((tryout) => (
                  <TableRow
                    key={tryout.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/tryouts/${tryout.id}`)}
                  >
                    <TableCell>{tryout.title}</TableCell>
                    <TableCell>
                      <Chip label={tryout.type ?? 'tryout'} size="small" />
                    </TableCell>
                    <TableCell>{tryout.age_group}</TableCell>
                    <TableCell>{new Date(tryout.tryout_date).toLocaleDateString()}</TableCell>
                    <TableCell>{tryout.location}</TableCell>
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
