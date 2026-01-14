import { useState, useEffect } from 'react'
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
  MenuItem,
  Select,
} from '@mui/material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'

interface UniformOrder {
  id: string
  jersey_size: string
  shorts_size: string
  status: 'pending' | 'ordered' | 'delivered'
  child: { first_name: string; last_name: string }
  team: { name: string }
}

export default function UniformOrders() {
  const [orders, setOrders] = useState<UniformOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'ordered' | 'delivered'>('all')
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
    fetchOrders()
  }, [profile, navigate, page, rowsPerPage, filter])

  async function fetchOrders() {
    setLoading(true)
    try {
      let query = supabase
        .from('uniform_orders')
        .select('id, jersey_size, shorts_size, status, child:children(first_name, last_name), team:teams(name)', { count: 'exact' })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { count } = await query
      setTotalCount(count || 0)

      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1

      const { data } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      setOrders((data as unknown as UniformOrder[]) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(orderId: string, status: 'pending' | 'ordered' | 'delivered') {
    await supabase.from('uniform_orders').update({ status } as never).eq('id', orderId)
    fetchOrders()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success'
      case 'ordered':
        return 'info'
      case 'pending':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (loading && orders.length === 0) {
    return <AdminSkeletonTable rows={10} columns={5} />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Uniform Orders
        </Typography>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as any)} size="small">
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="ordered">Ordered</MenuItem>
          <MenuItem value="delivered">Delivered</MenuItem>
        </Select>
      </Box>

      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Jersey Size</TableCell>
                <TableCell>Shorts Size</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">No uniform orders found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      {order.child.first_name} {order.child.last_name}
                    </TableCell>
                    <TableCell>{order.team.name}</TableCell>
                    <TableCell>{order.jersey_size}</TableCell>
                    <TableCell>{order.shorts_size}</TableCell>
                    <TableCell>
                      <Chip label={order.status} color={getStatusColor(order.status) as any} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value as any)}
                        size="small"
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="ordered">Ordered</MenuItem>
                        <MenuItem value="delivered">Delivered</MenuItem>
                      </Select>
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
