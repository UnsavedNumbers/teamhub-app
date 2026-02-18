/**
 * Platform Admin Contact Submissions Page
 * 
 * View and manage contact form submissions from all surfaces.
 * Platform admins can view, filter, search, and update submission status.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/useI18n'
import { useAuth } from '../../hooks/useAuth'
import { PageHeader, PlatformDataTable, FilterBar, Badge, OfflineBanner, type ColumnConfig } from '../../components/platformAdmin'
import { getContactSubmissions, getContactSubmissionStats, updateContactSubmission, type ContactSubmission, type ContactSubmissionFilters } from '../../data/services/contactSubmissionsService'
import { getLink } from '../../utils/routes'
import { showSuccess, showError } from '../../utils/toast'
import '../../styles/platformAdmin.css'

export default function ContactSubmissions() {
  const t = useT()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [totalCount, setTotalCount] = useState(0)
  
  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [surfaceFilter, setSurfaceFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  
  // Stats
  const [stats, setStats] = useState<{
    total: number
    new: number
    in_progress: number
    resolved: number
    closed: number
  } | null>(null)

  // Update dialog state
  const [updateDialog, setUpdateDialog] = useState<{
    open: boolean
    submission: ContactSubmission | null
    status: ContactSubmission['status']
    notes: string
  }>({
    open: false,
    submission: null,
    status: 'new',
    notes: '',
  })
  const [updating, setUpdating] = useState(false)

  // Fetch submissions
  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const filters: ContactSubmissionFilters = {}
      if (statusFilter) filters.status = statusFilter as ContactSubmission['status']
      if (surfaceFilter) filters.surface = surfaceFilter as any
      if (search) filters.search = search
      if (dateFrom) filters.date_from = dateFrom
      if (dateTo) filters.date_to = dateTo

      const result = await getContactSubmissions(filters, page, rowsPerPage)
      
      if (result.error) {
        showError(result.error.message)
        setSubmissions([])
        setTotalCount(0)
      } else {
        setSubmissions(result.data || [])
        // For now, use data length as total (would need count from service)
        setTotalCount(result.data?.length || 0)
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load submissions')
      setSubmissions([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, statusFilter, surfaceFilter, search, dateFrom, dateTo])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await getContactSubmissionStats()
      if (!result.error && result.data) {
        setStats(result.data)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }, [])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Handle status update
  const handleStatusUpdate = useCallback(async (submission: ContactSubmission, newStatus: ContactSubmission['status'], notes: string) => {
    setUpdating(true)
    try {
      const result = await updateContactSubmission(submission.id, {
        status: newStatus,
        admin_notes: notes,
        viewed_by_platform_admin_id: user?.id || null,
        viewed_at: new Date().toISOString(),
      })

      if (result.error) {
        showError(result.error.message)
      } else {
        showSuccess('Submission updated successfully')
        setUpdateDialog({ open: false, submission: null, status: 'new', notes: '' })
        fetchSubmissions()
        fetchStats()
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update submission')
    } finally {
      setUpdating(false)
    }
  }, [user?.id, fetchSubmissions, fetchStats])

  // Columns configuration
  const columns: ColumnConfig<ContactSubmission>[] = [
    {
      id: 'submitted_at',
      label: 'Date',
      sortable: true,
      render: (submission) => {
        const date = new Date(submission.submitted_at)
        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        )
      },
    },
    {
      id: 'surface',
      label: 'Surface',
      render: (submission) => (
        <Badge variant={submission.surface === 'help' ? 'info' : submission.surface === 'portal' ? 'primary' : 'warning'}>
          {submission.surface.toUpperCase()}
        </Badge>
      ),
    },
    {
      id: 'subject_label',
      label: 'Subject',
      render: (submission) => (
        <div>
          <div style={{ fontWeight: 600 }}>{submission.subject_label}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {submission.message.length > 60 ? `${submission.message.substring(0, 60)}...` : submission.message}
          </div>
        </div>
      ),
    },
    {
      id: 'email',
      label: 'Contact',
      render: (submission) => (
        <div>
          {submission.name && <div style={{ fontWeight: 600 }}>{submission.name}</div>}
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{submission.email || 'No email'}</div>
          {submission.role_context && submission.role_context !== 'public' && (
            <Badge variant="secondary" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
              {submission.role_context}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'org_name',
      label: 'Organization',
      render: (submission) => submission.org_name || '-',
    },
    {
      id: 'status',
      label: 'Status',
      render: (submission) => {
        const statusColors: Record<ContactSubmission['status'], 'success' | 'warning' | 'info' | 'secondary'> = {
          new: 'info',
          in_progress: 'warning',
          resolved: 'success',
          closed: 'secondary',
        }
        return (
          <Badge variant={statusColors[submission.status]}>
            {submission.status.replace('_', ' ').toUpperCase()}
          </Badge>
        )
      },
    },
    {
      id: 'webhook_success',
      label: 'Webhook',
      render: (submission) => (
        <Badge variant={submission.webhook_success ? 'success' : 'error'}>
          {submission.webhook_success ? 'Sent' : 'Failed'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (submission) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="pa-btn pa-btn--compact pa-btn--secondary"
            onClick={() => {
              setUpdateDialog({
                open: true,
                submission,
                status: submission.status,
                notes: submission.admin_notes || '',
              })
            }}
          >
            <span className="material-symbols-outlined">edit</span>
            Update
          </button>
        </div>
      ),
    },
  ]

  // Active filters for FilterBar
  const activeFilters = [
    statusFilter && { key: 'status', label: `Status: ${statusFilter}` },
    surfaceFilter && { key: 'surface', label: `Surface: ${surfaceFilter}` },
    dateFrom && { key: 'dateFrom', label: `From: ${dateFrom}` },
    dateTo && { key: 'dateTo', label: `To: ${dateTo}` },
  ].filter(Boolean) as { key: string; label: string }[]

  const handleRemoveFilter = (key: string) => {
    if (key === 'status') setStatusFilter('')
    if (key === 'surface') setSurfaceFilter('')
    if (key === 'dateFrom') setDateFrom('')
    if (key === 'dateTo') setDateTo('')
    setPage(0)
  }

  const handleClearAll = () => {
    setSearch('')
    setStatusFilter('')
    setSurfaceFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  return (
    <div>
      <OfflineBanner />
      <PageHeader
        title="Contact Submissions"
        subtitle="View and manage contact form submissions from all surfaces"
        breadcrumbs={[
          { label: 'Platform Admin', path: getLink('platformAdmin.dashboard') },
          { label: 'Contact Submissions' },
        ]}
      />

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="pa-card">
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Total</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{stats.total}</div>
          </div>
          <div className="pa-card">
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>New</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6' }}>{stats.new}</div>
          </div>
          <div className="pa-card">
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>In Progress</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{stats.in_progress}</div>
          </div>
          <div className="pa-card">
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Resolved</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{stats.resolved}</div>
          </div>
          <div className="pa-card">
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Closed</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6b7280' }}>{stats.closed}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by message, subject, email, or name..."
        statusOptions={[
          { value: '', label: 'All Statuses' },
          { value: 'new', label: 'New' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'closed', label: 'Closed' },
        ]}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusLabel="Status"
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        showDateRange={true}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClearAll={handleClearAll}
      />

      {/* Additional Surface Filter */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Surface:</label>
        <select
          value={surfaceFilter}
          onChange={(e) => {
            setSurfaceFilter(e.target.value)
            setPage(0)
          }}
          className="pa-input"
          style={{ width: '200px' }}
        >
          <option value="">All Surfaces</option>
          <option value="help">Help</option>
          <option value="portal">Portal</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      <PlatformDataTable
        columns={columns}
        rows={submissions}
        loading={loading}
        emptyMessage="No contact submissions found"
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={(size) => {
          setRowsPerPage(size)
          setPage(0)
        }}
        onRowClick={(submission) => {
          // Navigate to detail view (to be implemented)
          console.log('View submission:', submission.id)
        }}
      />

      {/* Update Dialog */}
      {updateDialog.open && updateDialog.submission && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            if (!updating) {
              setUpdateDialog({ open: false, submission: null, status: 'new', notes: '' })
            }
          }}
        >
          <div
            className="pa-card"
            style={{
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Update Submission</h2>
              <button
                className="pa-btn pa-btn--compact pa-btn--ghost"
                onClick={() => {
                  if (!updating) {
                    setUpdateDialog({ open: false, submission: null, status: 'new', notes: '' })
                  }
                }}
                disabled={updating}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="pa-label">Status</label>
              <select
                value={updateDialog.status}
                onChange={(e) => setUpdateDialog({ ...updateDialog, status: e.target.value as ContactSubmission['status'] })}
                className="pa-input"
                disabled={updating}
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="pa-label">Admin Notes</label>
              <textarea
                value={updateDialog.notes}
                onChange={(e) => setUpdateDialog({ ...updateDialog, notes: e.target.value })}
                className="pa-input"
                rows={4}
                placeholder="Add notes about this submission..."
                disabled={updating}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="pa-btn pa-btn--secondary"
                onClick={() => {
                  if (!updating) {
                    setUpdateDialog({ open: false, submission: null, status: 'new', notes: '' })
                  }
                }}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                className="pa-btn pa-btn--primary"
                onClick={() => {
                  if (updateDialog.submission) {
                    handleStatusUpdate(updateDialog.submission, updateDialog.status, updateDialog.notes)
                  }
                }}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
