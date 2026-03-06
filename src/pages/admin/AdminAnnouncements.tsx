import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { getAnnouncements, createAnnouncement, deleteAnnouncement, type Announcement } from '../../data/services/messagesService'
import { getTeams } from '../../data/services/teamsService'
import { showSuccess, showError } from '../../utils/toast'
import { useAuth } from '../../hooks/useAuth'
import { 
  AdminPageHeader, 
  Card, 
  Badge, 
  Button, 
  EmptyState,
  Select,
  ConfirmDialog,
} from '../../components/admin'
import OrgDataTable from '../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../components/admin/OrgDataTable'
import PullToRefreshContainer from '../../components/common/mobile/PullToRefreshContainer'
import { cn } from '../../utils/cn'
import CreateAnnouncementModal from '../../components/admin/CreateAnnouncementModal'
import { getAnnouncementEmoji, type AnnouncementType } from '../../utils/announcementTypes'
import { hasAnyRole } from '../../utils/roleHelpers'
import { getLink, RouteKeys } from '../../utils/routes'
import '../../styles/orgAdmin.css'

interface AnnouncementDisplay {
  id: string
  title: string
  team_name: string
  team_id: string | null
  org_id: string | null
  author_id: string
  author_email: string
  author_role: string
  priority: 'normal' | 'urgent'
  type: AnnouncementType
  created_at: string
  is_org_wide: boolean
}

type PriorityFilter = 'all' | 'urgent' | 'normal'

import { useT } from '../../i18n/useI18n'

export default function AdminAnnouncements() {
  const t = useT()
  const navigate = useNavigate()
  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const isOrgAdmin = hasAnyRole(currentOrganization, ['org_admin'])
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
  void actionError
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const deleteRequestIdRef = useRef(0)

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

  // Type guard for Announcement
  function isAnnouncement(obj: any): obj is Announcement {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      typeof obj.id === 'string' &&
      typeof obj.title === 'string' &&
      typeof obj.content === 'string' &&
      'priority' in obj &&
      'type' in obj
    )
  }

  // Fetch announcements with race condition protection
  const fetchAnnouncements = useCallback(async () => {
    if (!isReady) return

    const currentRequestId = ++requestIdRef.current
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await getAnnouncements(context, { includeOrgWide: true })

      // Check if still mounted and request is current
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) return

      if (fetchError) {
        if (!isMountedRef.current || currentRequestId !== requestIdRef.current) return
        setError(fetchError.message ?? 'Failed to load announcements')
        setAnnouncements([])
        setTotalCount(0)
        return
      }

      // Calculate date cutoff for recent filter (90 days)
      const now = new Date()
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      // Transform with safe defaults and apply date filter
      // Technical Issue 4: Use nullish coalescing for arrays
      // Technical Issue 1: Use optional chaining for nested properties
      // Technical Issue 2: Use type guards before assertions
      // Technical Issue 3: Validate dates before parsing
      let displayAnnouncements: AnnouncementDisplay[] = (data ?? []).map(ann => {
        // Type guard check - if it's a real Announcement, use it; otherwise map from FakeAnnouncement
        let announcement: Announcement
        let teamName: string
        let authorEmail: string
        let authorRole: string
        let authorId: string
        
        if (isAnnouncement(ann)) {
          announcement = ann
          teamName = ann.team?.name ?? (announcement.team_id === null ? 'All Teams' : 'Unknown Team')
          authorEmail = ann.author?.email ?? ''
          authorRole = ann.author?.role ?? 'parent'
          authorId = ann.author_id
        } else {
          // Handle FakeAnnouncement - map to Announcement structure
          const fakeAnn = ann as unknown as { id: string; title: string; team_id: string | null; org_id: string; created_by_user_id: string; created_at: string }
          announcement = {
            id: fakeAnn.id,
            title: fakeAnn.title,
            team_id: fakeAnn.team_id,
            org_id: fakeAnn.org_id,
            author_id: fakeAnn.created_by_user_id,
            content: '',
            priority: 'normal',
            type: 'general',
            created_at: fakeAnn.created_at,
            updated_at: fakeAnn.created_at,
          }
          teamName = fakeAnn.team_id === null ? 'All Teams' : 'Unknown Team'
          authorEmail = ''
          authorRole = 'parent'
          authorId = fakeAnn.created_by_user_id
        }
        
        const isOrgWide = announcement.team_id === null
        
        // Technical Issue 3: Validate date before use
        const createdAt = announcement.created_at ?? ''
        const validDate = createdAt && !isNaN(new Date(createdAt).getTime())
          ? createdAt
          : new Date().toISOString()
        
        return {
          id: announcement.id ?? '',
          title: announcement.title ?? 'Untitled',
          team_name: teamName,
          team_id: announcement.team_id ?? null,
          org_id: announcement.org_id ?? null,
          author_id: authorId,
          author_email: authorEmail,
          author_role: authorRole,
          priority: announcement.priority ?? 'normal',
          type: (announcement.type ?? 'general') as AnnouncementType,
          created_at: validDate,
          is_org_wide: isOrgWide,
        }
      })

      // Apply date range filter
      if (dateRangeFilter === 'recent') {
        displayAnnouncements = displayAnnouncements.filter(ann => {
          const createdDate = new Date(ann.created_at)
          return !isNaN(createdDate.getTime()) && createdDate >= ninetyDaysAgo
        })
      }

      // Apply priority filter
      if (priorityFilter !== 'all') {
        displayAnnouncements = displayAnnouncements.filter(ann => ann.priority === priorityFilter)
      }

      // Apply team filter (include org-wide announcements)
      if (selectedTeamFilter) {
        displayAnnouncements = displayAnnouncements.filter(ann => 
          ann.team_id === selectedTeamFilter || ann.is_org_wide
        )
      }

      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) return
      setTotalCount(displayAnnouncements.length)

      // Client-side pagination
      // Technical Issue 10: Validate pagination indices before slice
      const from = Math.max(0, page * rowsPerPage)
      const to = Math.min(displayAnnouncements.length, from + rowsPerPage)
      const paginated = from < displayAnnouncements.length 
        ? displayAnnouncements.slice(from, to)
        : []
      
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) return
      setAnnouncements(paginated)
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
  }, [orgId, userId, isReady, priorityFilter, selectedTeamFilter, dateRangeFilter, page, rowsPerPage, context])

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
    teamId: string | null,
    type: AnnouncementType,
    isOrgWide: boolean,
    visibleToFans: boolean
  ) => {
    if (!user) {
      showError('You must be logged in to create announcements')
      return
    }

    if (!orgId) {
      showError('Organization context is required')
      return
    }

    try {
      const { data, error: createError } = await createAnnouncement(
        context,
        title, 
        content, 
        priority, 
        teamId, 
        user.id,
        orgId,
        type,
        isOrgWide,
        visibleToFans
      )

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
    if (!deleteDialog.announcement || !isReady) return

    const currentDeleteRequestId = ++deleteRequestIdRef.current
    const announcementId = deleteDialog.announcement.id

    setActionLoading(true)
    setActionError(null)
    setDeletingId(announcementId)

    try {
      const { success, error: deleteError } = await deleteAnnouncement(context, announcementId)

      // Check if still mounted and request is current
      if (!isMountedRef.current || currentDeleteRequestId !== deleteRequestIdRef.current) return

      if (deleteError || !success) {
        const errorMessage = deleteError?.message ?? 'Failed to delete announcement'
        setActionError(errorMessage)
        showError(errorMessage)
        return
      }

      showSuccess('Announcement deleted successfully')
      setDeleteDialog({ open: false, announcement: null })
      setDeletingId(null)
      
      // Always refetch after successful delete (Issue 2 Solution)
      await fetchAnnouncements()
    } catch (err) {
      if (!isMountedRef.current || currentDeleteRequestId !== deleteRequestIdRef.current) return
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete announcement'
      setActionError(errorMessage)
      showError(errorMessage)
    } finally {
      if (isMountedRef.current && currentDeleteRequestId === deleteRequestIdRef.current) {
        setActionLoading(false)
        setDeletingId(null)
      }
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
        <div className="oa-flex oa-items-center oa-gap-2">
          <span className="oa-text-lg">{getAnnouncementEmoji(row.type)}</span>
          {row.is_org_wide && (
            <Badge variant="info">ORG-WIDE</Badge>
          )}
          {row.priority === 'urgent' && (
            <Badge variant="danger">URGENT</Badge>
          )}
          <span className="oa-font-bold oa-text-slate-900 dark:oa-text-white">{row.title}</span>
        </div>
      )
    },
    {
      id: 'team_name',
      label: 'Scope',
      render: (row) => (
        <span className="oa-text-sm oa-font-medium oa-text-slate-700 dark:oa-text-slate-300">
          {row.is_org_wide ? 'All Teams' : row.team_name}
        </span>
      )
    },
    {
      id: 'type',
      label: 'Type',
      render: (row) => (
        <div className="oa-flex oa-items-center oa-gap-2">
          <span>{getAnnouncementEmoji(row.type)}</span>
          <span className="oa-text-sm oa-font-medium oa-text-slate-700 dark:oa-text-slate-300">
            {row.type.charAt(0).toUpperCase() + row.type.slice(1).replace('_', ' ')}
          </span>
        </div>
      )
    },
    {
      id: 'author',
      label: 'Author',
      render: (row) => (
        <div className="oa-flex oa-flex-col">
          <Badge variant={row.author_role === 'coach' || row.author_role === 'org_admin' ? 'info' : 'neutral'}>
            {row.author_role === 'org_admin' ? 'Admin' : row.author_role === 'coach' ? 'Coach' : 'Parent'}
          </Badge>
          {row.author_email && (
            <span className="oa-text-xs oa-text-slate-500 oa-mt-1">{row.author_email}</span>
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
        <span className="oa-text-sm oa-text-slate-500">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      id: 'actions',
      label: '',
      align: 'right',
      render: (row) => {
        // Issue 3 Solution: Check permission in UI (defense in depth)
        const isAuthor = user?.id === row.author_id
        const canDelete = isOrgAdmin || isAuthor
        const isDeleting = deletingId === row.id

        return (
          <div className="oa-flex oa-gap-1 oa-justify-end">
            <Button
              variant="ghost"
              size="dense"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation()
                if (!actionLoading && !isDeleting) {
                  setDeleteDialog({ open: true, announcement: row })
                }
              }}
              disabled={!canDelete || actionLoading || isDeleting}
              title={!canDelete ? "You don't have permission to delete this announcement" : isDeleting ? "Deleting..." : "Delete announcement"}
              className="oa-text-danger hover:oa-bg-danger-surface"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
              ) : (
                <span className="material-symbols-outlined oa-icon-sm">delete</span>
              )}
            </Button>
          </div>
        )
      },
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
    <div className="oa-root">
      <PullToRefreshContainer
        onRefresh={async () => {
          await Promise.all([fetchTeams(), fetchAnnouncements()])
        }}
      >
      <AdminPageHeader 
        title="Announcements" 
        subtitle={t('admin.announcements.subtitle')}
        actions={
          isOrgAdmin ? (
            <Button 
              icon="add" 
              onClick={() => setIsCreateModalOpen(true)}
              disabled={isButtonDisabled}
              title={buttonTooltip}
            >
              New Announcement
            </Button>
          ) : undefined
        } 
      />

      {/* Show error message if teams fetch failed */}
      {teamsError && (
        <Card className="oa-mb-4">
          <div className="oa-p-4" style={{ background: 'var(--oa-danger-bg, #fef2f2)', borderLeft: '4px solid var(--oa-danger, #ef4444)' }}>
            <div className="oa-text-sm oa-font-medium" style={{ color: 'var(--oa-danger-dark, #991b1b)' }}>
              {teamsError}
            </div>
          </div>
        </Card>
      )}

      {/* Show error message if announcements fetch failed */}
      {error && (
        <Card className="oa-mb-4">
          <div className="oa-p-4" style={{ background: 'var(--oa-danger-bg, #fef2f2)', borderLeft: '4px solid var(--oa-danger, #ef4444)' }}>
            <div className="oa-flex oa-items-center oa-justify-between">
              <div className="oa-text-sm oa-font-medium" style={{ color: 'var(--oa-danger-dark, #991b1b)' }}>
                {error}
              </div>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => fetchAnnouncements()}
                disabled={loading}
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Show info message when no teams exist */}
      {hasTeams === false && !teamsError && (
        <Card className="oa-mb-4">
          <div className="oa-p-4" style={{ background: 'var(--oa-info-bg, #eff6ff)', borderLeft: '4px solid var(--oa-info, #3b82f6)' }}>
            <div className="oa-text-sm oa-font-medium" style={{ color: 'var(--oa-info-dark, #1e40af)' }}>
              No teams available. Create teams before posting announcements.
            </div>
          </div>
        </Card>
      )}

      {/* Filters (Redesigned) */}
      <div className="oa-filter-grid">
        {/* Priority Group */}
        <div className="oa-filter-group oa-filter-group--narrow">
          <label className="oa-filter-label">Priority Level</label>
          <div className="oa-toggle-group">
            <button 
                className={cn('oa-toggle-btn', priorityFilter === 'all' && 'active')}
                onClick={() => handleFilterChange('all')}
            >
                ALL
            </button>
            <button 
                className={cn('oa-toggle-btn', priorityFilter === 'urgent' && 'active')}
                onClick={() => handleFilterChange('urgent')}
            >
                URGENT
            </button>
            <button 
                className={cn('oa-toggle-btn', priorityFilter === 'normal' && 'active')}
                onClick={() => handleFilterChange('normal')}
            >
                NORMAL
            </button>
          </div>
        </div>

        {/* Team Selection */}
        <div className="oa-filter-group">
          <label className="oa-filter-label">Team Scope</label>
          <Select
            value={selectedTeamFilter || ''}
            onChange={(e: any) => handleTeamFilterChange(e.target.value)}
            options={[
              { value: '', label: 'All Teams (Global Scope)' },
              ...teams.map(t => ({ value: t.id, label: t.name }))
            ]}
            className="oa-w-full"
          />
        </div>

        {/* Time Range */}
        <div className="oa-filter-group oa-filter-group--narrow">
          <label className="oa-filter-label">Time Range</label>
          <div className="oa-toggle-group">
            <button 
                className={cn('oa-toggle-btn', dateRangeFilter === 'recent' && 'active')}
                onClick={() => setDateRangeFilter('recent')}
            >
                Recent (90 Days)
            </button>
            <button 
                className={cn('oa-toggle-btn', dateRangeFilter === 'all' && 'active')}
                onClick={() => setDateRangeFilter('all')}
            >
                All Time
            </button>
          </div>
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
            noCard
          >
            {hasTeams ? (
              <button className="oa-btn oa-btn--primary" onClick={() => setIsCreateModalOpen(true)}>
                New Announcement
              </button>
            ) : null}
          </EmptyState>
        </Card>
      ) : (
        <OrgDataTable 
          columns={columns} 
          rows={displayAnnouncements} 
          loading={loading} 
          totalCount={totalCount} 
          page={page} 
          rowsPerPage={rowsPerPage} 
          onPageChange={setPage} 
          onRowsPerPageChange={setRowsPerPage}
          onRowClick={(row) => navigate(getLink(RouteKeys.ADMIN_ANNOUNCEMENT_DETAIL, { id: row.id }))}
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
        onConfirm={() => { void handleDelete('') }}
        onCancel={() => {
          setDeleteDialog({ open: false, announcement: null })
          setActionError(null)
        }}
      />
      </PullToRefreshContainer>
    </div>
  )
}
