import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material'
import type { ChipProps } from '@mui/material/Chip'
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { adaptUserToTableRow, UserTableRow } from '../../utils/dataAdapters'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

type UserRow = Database['public']['Tables']['users']['Row']
type UserWithFamily = UserRow & { family: { name: string | null } | null }

export default function OrganizationUsers() {
  const [users, setUsers] = useState<UserTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some((org) => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    if (currentOrganization?.id) {
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, currentOrganization, navigate, page, rowsPerPage])

  async function fetchUsers() {
    if (!currentOrganization?.id) return

    setLoading(true)
    setError(null)

    try {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', currentOrganization.id)

      setTotalCount(count || 0)

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1

      const { data, error } = await supabase
        .from('users')
        .select('*, family:families(name)')
        .eq('org_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        setError(error.message)
        return
      }

      const rows = (data || []) as UserWithFamily[]
      const adapted = rows.map((user) =>
        adaptUserToTableRow(user, user.family?.name ? { name: user.family.name } : null)
      )
      setUsers(adapted)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const getRoleColor = (role: string): ChipProps['color'] => {
    switch (role) {
      case 'org_admin':
      case 'admin':
        return 'error'
      case 'coach':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (loading && users.length === 0) {
    return <AdminSkeletonTable rows={10} columns={5} />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Organization Users
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/admin/users/new')}>
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Family</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">No users found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>
                      <Chip label={user.role} color={getRoleColor(user.role)} size="small" />
                    </TableCell>
                    <TableCell>{user.familyName}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="primary" title="Edit User">
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
    </Box>
  )
}
