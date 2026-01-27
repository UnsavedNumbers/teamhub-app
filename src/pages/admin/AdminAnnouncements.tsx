import { useState, useEffect, useCallback, useRef } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { getAnnouncements, createAnnouncement, type Announcement } from '../../data/services/messagesService'
import { getTeams } from '../../data/services/teamsService'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { useAuth } from '../../hooks/useAuth'
import { 
  AdminPageHeader, 
  Card, 
  Badge, 
  PlatformDataTable, 
  Button, 
  EmptyState,
  Select,
  ConfirmDialog,
  type ColumnConfig 
} from '../../components/platformAdmin'
import { cn } from '../../utils/cn'
import CreateAnnouncementModal from '../../components/admin/CreateAnnouncementModal'

interface AnnouncementDisplay {
  id: string
  title: string
  team_name: string
  team_id: string
  author_email: string
  author_role: string
  priority: 'normal' | 'urgent'
  created_at: string
}

type PriorityFilter = 'all' | 'urgent' | 'normal'

export default function AdminAnnouncements() {
  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const { context, isReady } = useUserContext()
  const { user } = useAuth()
  
  // Extract primitive values to avoid dependency issues
  const orgId = context.orgId
  const userId = context.userId

  const [announcements, setAnnouncements] = useState<AnnouncementDisplay[]>([])
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string | null>(null)
  const [dateRangeFilter, setDateRangeFilter] = useState<'recent' | 'all'>('recent')
  const [error, setError] = useState<string | null>(null)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [hasTeams, setHasTeams] = useState<boolean | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; announcement: AnnouncementDisplay | null }>({ 
    open: false, 
    announcement: null 
  })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    if (!isReady) return

    setTeamsLoading(true)
    setTeamsError(null)

    try {
      const { data, error: teamsError } = await getTeams(context, { activeOnly: true })

      if (!isMountedRef.current) return

      if (teamsError) {
        setTeamsError(teamsError.message || 'Failed to load teams')
        setTeams([])
        setHasTeams(false)
        return
      }

      const teamsData = (data || []).map(t => ({ id: t.id, name: t.name }))
      teamsData.sort((a, b) => a.name.localeCompare(b.name))
      
      setTeams(teamsData)
      setHasTeams(teamsData.length > 0)
    } catch (err) {
      if (!isMountedRef.current) return
      const errorMessage = err instanceof Error ? err.message : 'Failed to load teams'
      setTeamsError(errorMessage)
      setTeams([])
      setHasTeams(false)
    } finally {
      if (isMountedRef.current) {
        setTeamsLoading(false)
      }
    }
  }, [context, isReady])

  // Fetch announcements with race condition protection
  const fetchAnnouncements = useCallback(async () => {
    if (!isReady) return

    const currentRequestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await getAnnouncements(context, { includeOrgWide: true })

      // Check if still mounted and request is current
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) return

      if (fetchError) {
        setError(fetchError.message || 'Failed to load announcements')
        setAnnouncements([])
        setTotalCount(0)
        return
      }

      // Calculate date cutoff for recent filter (90 days)
      const now = new Date()
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      // Transform with safe defaults and apply date filter
      let displayAnnouncements: AnnouncementDisplay[] = (data || []).map(ann => ({
        id: ann.id || '',
        title: ann.title || 'Untitled',
        team_name: ann.team?.name ?? 'Unknown Team',
        team_id: ann.team_id || '',
        author_email: ann.author?.email ?? '',
        author_role: ann.author?.role ?? 'parent',
        priority: ann.priority || 'normal',
        created_at: ann.created_at || new Date().toISOString(),
      }))

      // Apply date range filter
      if (dateRangeFilter === 'recent') {
        displayAnnouncements = displayAnnouncements.filter(ann => {
          const createdDate = new Date(ann.created_at)
          return createdDate >= ninetyDaysAgo
        })
      }

      // Apply priority filter
      if (priorityFilter !== 'all') {
        displayAnnouncements = displayAnnouncements.filter(ann => ann.priority === priorityFilter)
      }

      // Apply team filter
      if (selectedTeamFilter) {
        displayAnnouncements = displayAnnouncements.filter(ann => ann.team_id === selectedTeamFilter)
      }

      setTotalCount(displayAnnouncements.length)

      // Client-side pagination
      const from = page * rowsPerPage
      const to = from + rowsPerPage
      setAnnouncements(displayAnnouncements.slice(from, to))
    } catch (err) {
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) return
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setAnnouncements([])
      setTotalCount(0)
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [orgId, userId, isReady, priorityFilter, selectedTeamFilter, dateRangeFilter, page, rowsPerPage])

  // Load data when ready
  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0)
  }, [priorityFilter, selectedTeamFilter, dateRangeFilter])

  const handleCreateAnnouncement = async (
    title: string,
    content: string,
    priority: 'normal' | 'urgent',
    teamId: string
  ) => {
    if (!user) {
      showError('You must be logged in to create announcements')
      return
    }

    try {
      const { data, error: createError } = await createAnnouncement(title, content, priority, teamId, user.id)

      if (createError) {
        showError(createError.message || 'Failed to create announcement')
        throw createError
      }

      if (data) {
        showSuccess('Announcement created successfully')
        setIsCreateModalOpen(false)
        await fetchAnnouncements()
      } else {
        showError('Failed to create announcement')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create announcement'
      showError(errorMessage)
      throw err
    }
  }

  const handleDelete = async (_reason: string) => {
    if (!deleteDialog.announcement) return

    setActionLoading(true)
    setActionError(null)

    try {
      const { error: deleteError } = await supabase
        .from('announcements')
        .delete()
        .eq('id', deleteDialog.announcement.id)

      if (deleteError) throw deleteError

      showSuccess('Announcement deleted successfully')
      setDeleteDialog({ open: false, announcement: null })
      await fetchAnnouncements()
    } catch (err) {
      const errorMessage = getErrorMessage(err) || 'Failed to delete announcement'
      setActionError(errorMessage)
      showError(errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const handleFilterChange = (newFilter: PriorityFilter) => {
    setPriorityFilter(newFilter)
    setPage(0)
  }

  const handleTeamFilterChange = (teamId: string) => {
    setSelectedTeamFilter(teamId === '' ? null : teamId)
    setPage(0)
  }

  const columns: ColumnConfig<AnnouncementDisplay>[] = [
    {
      id: 'title',
      label: 'Title',
      render: (row) => (
        <div className="pa-flex pa-items-center pa-gap-2">
          {row.priority === 'urgent' && (
            <Badge variant="danger">URGENT</Badge>
          )}
          <span className="pa-font-bold pa-text-slate-900 dark:pa-text-white">{row.title}</span>
        </div>
      )
    },
    {
      id: 'team_name',
      label: 'Team',
      render: (row) => (
        <span className="pa-text-sm pa-font-medium pa-text-slate-700 dark:pa-text-slate-300">
          {row.team_name}
        </span>
      )
    },
    {
      id: 'author',
      label: 'Author',
      render: (row) => (
        <div className="pa-flex pa-flex-col">
          <Badge variant={row.author_role === 'coach' || row.author_role === 'org_admin' ? 'info' : 'neutral'}>
            {row.author_role === 'org_admin' ? 'Admin' : row.author_role === 'coach' ? 'Coach' : 'Parent'}
          </Badge>
          {row.author_email && (
            <span className="pa-text-xs pa-text-slate-500 pa-mt-1">{row.author_email}</span>
          )}
        </div>
      )
    },
    {
      id: 'priority',
      label: 'Priority',
      render: (row) => (
        <Badge variant={row.priority === 'urgent' ? 'danger' : 'neutral'}>
          {row.priority.toUpperCase()}
        </Badge>
      )
    },
    {
      id: 'created_at',
      label: 'Created',
      render: (row) => (
        <span className="pa-text-sm pa-text-slate-500">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (row) => (
        <div className="pa-flex pa-gap-1 pa-justify-end">
          <Button
            variant="ghost"
            size="dense"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation()
              setDeleteDialog({ open: true, announcement: row })
            }}
            title="Delete announcement"
            className="pa-text-danger hover:pa-bg-danger-surface"
          >
            <span className="material-symbols-outlined pa-icon-sm">delete</span>
          </Button>
        </div>
      ),
    }
  ]

  const isButtonDisabled = hasTeams === false || hasTeams === null || teamsLoading
  const buttonTooltip = hasTeams === false
    ? "No teams available. Create teams before posting announcements."
    : hasTeams === null
    ? "Checking teams..."
    : ""

  // Filtered and paginated announcements are already computed in fetchAnnouncements
  const displayAnnouncements = announcements

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Announcements" 
        actions={
          <Button 
            icon="add" 
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isButtonDisabled}
            title={buttonTooltip}
          >
            New Announcement
          </Button>
        } 
      />

      {/* Show error message if teams fetch failed */}
      {teamsError && (
        <Card className="pa-mb-4" noPadding>
          <div className="pa-p-4" style={{ background: 'var(--pa-danger-bg, #fef2f2)', borderLeft: '4px solid var(--pa-danger, #ef4444)' }}>
            <div className="pa-text-sm pa-font-medium" style={{ color: 'var(--pa-danger-dark, #991b1b)' }}>
              {teamsError}
            </div>
          </div>
        </Card>
      )}

      {/* Show error message if announcements fetch failed */}
      {error && (
        <Card className="pa-mb-4" noPadding>
          <div className="pa-p-4" style={{ background: 'var(--pa-danger-bg, #fef2f2)', borderLeft: '4px solid var(--pa-danger, #ef4444)' }}>
            <div className="pa-text-sm pa-font-medium" style={{ color: 'var(--pa-danger-dark, #991b1b)' }}>
              {error}
            </div>
          </div>
        </Card>
      )}

      {/* Show info message when no teams exist */}
      {hasTeams === false && !teamsError && (
        <Card className="pa-mb-4" noPadding>
          <div className="pa-p-4" style={{ background: 'var(--pa-info-bg, #eff6ff)', borderLeft: '4px solid var(--pa-info, #3b82f6)' }}>
            <div className="pa-text-sm pa-font-medium" style={{ color: 'var(--pa-info-dark, #1e40af)' }}>
              No teams available. Create teams before posting announcements.
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className={cn('pa-flex', 'pa-flex-wrap', 'pa-gap-4', 'pa-mb-6', 'pa-items-center')}>
        <div className={cn('pa-flex', 'pa-gap-2')}>
          {(['all', 'urgent', 'normal'] as PriorityFilter[]).map((f) => (
            <Button
              key={f}
              variant={priorityFilter === f ? 'primary' : 'secondary'}
              size="compact"
              onClick={() => handleFilterChange(f)}
            >
              {f === 'all' ? 'ALL' : f.toUpperCase()}
            </Button>
          ))}
        </div>

        <Select
          value={selectedTeamFilter || ''}
          onChange={(e) => handleTeamFilterChange(e.target.value)}
          options={[
            { value: '', label: 'All Teams' },
            ...teams.map(t => ({ value: t.id, label: t.name }))
          ]}
          style={{ minWidth: '200px' }}
        />

        <div className={cn('pa-flex', 'pa-gap-2')}>
          <Button
            variant={dateRangeFilter === 'recent' ? 'primary' : 'secondary'}
            size="compact"
            onClick={() => setDateRangeFilter('recent')}
          >
            Recent (90 days)
          </Button>
          <Button
            variant={dateRangeFilter === 'all' ? 'primary' : 'secondary'}
            size="compact"
            onClick={() => setDateRangeFilter('all')}
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Table or Empty State */}
      {displayAnnouncements.length === 0 && !loading ? (
        <Card>
          <EmptyState 
            icon="campaign" 
            title="NO ANNOUNCEMENTS" 
            description={priorityFilter !== 'all' || selectedTeamFilter || dateRangeFilter === 'recent'
              ? "No announcements match your filters."
              : "Create your first announcement to get started."} 
            action={hasTeams ? { 
              label: 'New Announcement', 
              onClick: () => setIsCreateModalOpen(true) 
            } : undefined} 
          />
        </Card>
      ) : (
        <PlatformDataTable 
          columns={columns} 
          rows={displayAnnouncements} 
          loading={loading} 
          totalCount={totalCount} 
          page={page} 
          rowsPerPage={rowsPerPage} 
          onPageChange={setPage} 
          onRowsPerPageChange={setRowsPerPage}
        />
      )}

      {/* Create Modal */}
      <CreateAnnouncementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAnnouncement}
        teams={teams}
        selectedTeamId={null}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Announcement"
        description={deleteDialog.announcement ? `Are you sure you want to delete "${deleteDialog.announcement.title}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        requireReason={false}
        loading={actionLoading}
        error={actionError}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialog({ open: false, announcement: null })
          setActionError(null)
        }}
      />
    </div>
  )
}
