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
  IconButton,
  Grid,
} from '@mui/material'
import type { ChipProps } from '@mui/material/Chip'
import { Add as AddIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useOrganization } from '../../contexts/OrganizationContext'
import { adaptFeeAssignmentToTableRow, FeeAssignmentTableRow } from '../../utils/dataAdapters'
import AdminSkeletonTable from '../../components/admin/AdminSkeletonTable'
import type { Database } from '../../lib/database.types.ts'

type FeeAssignmentRow = Database['public']['Tables']['fee_assignments']['Row']
type FeeAssignmentJoinedRow = FeeAssignmentRow & {
  child: { first_name: string; last_name: string } | null
  parent: { display_name: string | null } | null
  fee: { title: string | null } | null
}

export default function Payments() {
  const [payments, setPayments] = useState<FeeAssignmentTableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    outstanding: 0,
    collected: 0,
  })

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()

  const fetchPayments = useCallback(async () => {
    if (!currentOrganization?.id) return

    setLoading(true)

    try {
      // Build query
      let query = supabase
        .from('fee_assignments')
        .select('*, child:children(first_name, last_name), parent:users(display_name), fee:fees(title)', { count: 'exact' })
        .eq('organization_id', currentOrganization.id)

      // Apply filter
      if (filter === 'unpaid') {
        query = query.eq('status', 'unpaid')
      } else if (filter === 'partial') {
        query = query.eq('status', 'partial')
      } else if (filter === 'paid') {
        query = query.eq('status', 'paid')
      }

      // Get total count
      const { count } = await query
      setTotalCount(count || 0)

      // Get paginated data
      const from = page * rowsPerPage
      const to = from + rowsPerPage - 1

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Error fetching payments:', error)
        setLoading(false)
        return
      }

      const rows = (data || []) as FeeAssignmentJoinedRow[]
      const adaptedData = rows.map((assignment) =>
        adaptFeeAssignmentToTableRow(
          assignment,
          assignment.child,
          assignment.parent,
          assignment.fee?.title ? { title: assignment.fee.title } : null
        )
      )

      setPayments(adaptedData)

      // Calculate stats
      const { data: statsData } = await supabase
        .from('fee_assignments')
        .select('balance_cents, paid_cents_total, status')
        .eq('organization_id', currentOrganization.id)

      if (statsData) {
        const outstanding = statsData
          .filter(a => a.status === 'unpaid' || a.status === 'partial')
          .reduce((sum, a) => sum + (a.balance_cents || 0), 0)
        
        const collected = statsData
          .reduce((sum, a) => sum + (a.paid_cents_total || 0), 0)

        setStats({
          outstanding,
          collected,
        })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [currentOrganization?.id, filter, page, rowsPerPage])

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && !profile.organizations.some(org => org.role === 'org_admin'))) {
      navigate('/portal/unauthorized')
      return
    }
    if (currentOrganization?.id) {
      fetchPayments()
    }
  }, [profile, currentOrganization, navigate, page, rowsPerPage, filter, fetchPayments])

  async function markPaid(paymentId: string) {
    // First get the assignment to get amount_cents
    const { data: assignment } = await supabase
      .from('fee_assignments')
      .select('amount_cents')
      .eq('id', paymentId)
      .single()

    if (assignment) {
      await supabase
        .from('fee_assignments')
        .update({ 
          status: 'paid',
          balance_cents: 0,
          paid_cents_total: assignment.amount_cents
        })
        .eq('id', paymentId)
    }
    
    fetchPayments()
  }

  const getStatusColor = (status: string): ChipProps['color'] => {
    switch (status) {
      case 'paid':
        return 'success'
      case 'partial':
        return 'warning'
      case 'unpaid':
        return 'error'
      default:
        return 'default'
    }
  }

  if (loading && payments.length === 0) {
    return <AdminSkeletonTable rows={10} columns={6} />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Payments
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/admin/payments/new')}
        >
          Create Fee
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Outstanding
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'warning.main' }}>
                ${(stats.outstanding / 100).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Collected
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
                ${(stats.collected / 100).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Records
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {totalCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Buttons */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        {(['all', 'unpaid', 'partial', 'paid'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'contained' : 'outlined'}
            onClick={() => {
              setFilter(f)
              setPage(0)
            }}
            sx={{ textTransform: 'capitalize' }}
          >
            {f}
          </Button>
        ))}
      </Box>

      {/* Payments Table */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Child</TableCell>
                <TableCell>Parent</TableCell>
                <TableCell>Fee</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="textSecondary">
                      No payments found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>{payment.childName}</TableCell>
                    <TableCell>{payment.parentName}</TableCell>
                    <TableCell>{payment.feeTitle}</TableCell>
                    <TableCell align="right">{payment.amount}</TableCell>
                    <TableCell align="right">{payment.balance}</TableCell>
                    <TableCell>
                      <Chip
                        label={payment.status}
                        color={getStatusColor(payment.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{payment.dueDate}</TableCell>
                    <TableCell align="right">
                      {payment.status === 'unpaid' || payment.status === 'partial' ? (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => markPaid(payment.id)}
                          title="Mark as Paid"
                        >
                          <CheckCircleIcon />
                        </IconButton>
                      ) : null}
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
