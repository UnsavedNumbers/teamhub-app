import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'
import { getAnnouncementById, updateAnnouncement, type Announcement } from '../../data/services/messagesService'
import { AdminPageHeader, Card, Button, Input, Select } from '../../components/admin'
import { showSuccess, showError } from '../../utils/toast'
import { getAnnouncementEmoji } from '../../utils/announcementTypes'
import { hasAnyRole } from '../../utils/roleHelpers'
import { getLink, RouteKeys } from '../../utils/routes'
import '../../styles/orgAdmin.css'

export default function AdminAnnouncementDetail() {
  const { announcementId } = useParams<{ announcementId: string }>()
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()
  const isMountedRef = useRef(true)
  
  useDebugLifecycle('AdminAnnouncementDetail', { announcementId })

  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editPriority, setEditPriority] = useState<'normal' | 'urgent'>('normal')
  const [editType, setEditType] = useState<'general' | 'reminder' | 'schedule_change' | 'urgent' | 'payment' | 'travel'>('general')

  const isOrgAdmin = hasAnyRole(currentOrganization, ['org_admin'])
  const canEdit = isOrgAdmin || announcement?.author_id === context.userId

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!announcementId || !isReady) {
      if (!announcementId) {
        setLoading(false)
        navigate(getLink(RouteKeys.ADMIN_ANNOUNCEMENTS), { replace: true })
      }
      return
    }

    setLoading(true)

    try {
      const { data, error } = await getAnnouncementById(context, announcementId)

      if (error || !data) {
        if (!isMountedRef.current) return
        setLoading(false)
        navigate(getLink(RouteKeys.ADMIN_ANNOUNCEMENTS), { replace: true })
        return
      }

      setAnnouncement(data)
      setEditTitle(data.title)
      setEditContent(data.content)
      setEditPriority(data.priority || 'normal')
      setEditType(data.type || 'general')
      setLoading(false)
    } catch (err) {
      if (!isMountedRef.current) return
      console.error('Error fetching announcement:', err)
      setLoading(false)
      navigate(getLink(RouteKeys.ADMIN_ANNOUNCEMENTS), { replace: true })
    }
  }, [announcementId, context, isReady, navigate])

  useEffect(() => {
    if (isReady && announcementId) {
      fetchData()
    }
  }, [isReady, announcementId, fetchData])

  const detailPath = announcementId ? getLink(RouteKeys.ADMIN_ANNOUNCEMENT_DETAIL, { id: announcementId }) : undefined

  const handleSave = useCallback(async () => {
    if (!announcement || !canEdit) return

    setSaving(true)
    try {
      const { data, error } = await updateAnnouncement(context, announcement.id, {
        title: editTitle,
        content: editContent,
        priority: editPriority,
        type: editType,
      })

      if (error) throw error

      if (data) {
        setAnnouncement(data)
        setEditTitle(data.title)
        setEditContent(data.content)
        setEditPriority(data.priority || 'normal')
        setEditType(data.type || 'general')
        setIsEditingTitle(false)
        setIsEditingContent(false)
        showSuccess('Announcement updated successfully')
      }
    } catch (err) {
      console.error('Error updating announcement:', err)
      showError(err instanceof Error ? err.message : 'Failed to update announcement')
    } finally {
      setSaving(false)
    }
  }, [announcement, canEdit, context, editTitle, editContent, editPriority, editType])

  const handleCancelEdit = useCallback(() => {
    if (announcement) {
      setEditTitle(announcement.title)
      setEditContent(announcement.content)
      setEditPriority(announcement.priority || 'normal')
      setEditType(announcement.type || 'general')
    }
    setIsEditingTitle(false)
    setIsEditingContent(false)
  }, [announcement])

  if (loading) {
    return (
      <div>
        <AdminPageHeader title="Loading..." />
        <Card>
          <div className="oa-p-8 oa-text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-current oa-mx-auto"></div>
          </div>
        </Card>
      </div>
    )
  }

  if (!announcement) {
    return (
      <div>
        <AdminPageHeader title="Announcement Not Found" />
        <Card>
          <div className="oa-p-8 oa-text-center">
            <p className="oa-text-slate-600 dark:oa-text-slate-400">Announcement not found</p>
            <Button variant="primary" onClick={() => navigate(getLink(RouteKeys.ADMIN_ANNOUNCEMENTS))} className="oa-mt-4">
              Back to Announcements
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const priority = (announcement.priority || 'normal').toLowerCase()
  const authorRole = announcement.author?.role || 'parent'
  const authorEmail = announcement.author?.email || ''
  const authorLabel = authorRole === 'coach' ? 'Coach' : authorRole === 'org_admin' ? 'Admin' : 'Parent'
  const teamName = announcement.team?.name || null
  const isUrgent = priority === 'urgent'
  const isOrgWide = announcement.team_id === null
  const announcementType = announcement.type || 'general'
  const emoji = getAnnouncementEmoji(announcementType)

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div>
      <AdminPageHeader 
        title={isEditingTitle ? 'Edit Announcement' : announcement.title}
        breadcrumbs={[
          { label: 'Admin', path: getLink(RouteKeys.ADMIN_DASHBOARD) },
          { label: 'Announcements', path: getLink(RouteKeys.ADMIN_ANNOUNCEMENTS) },
          { label: announcement.title, path: detailPath },
        ]}
      />

      <Card className="oa-overflow-hidden">
        {/* Message header: From / To / Type / Date */}
        <header className="oa-px-5 oa-pt-5 oa-pb-4 oa-border-b oa-border-slate-200 dark:oa-border-slate-700">
          <div className="oa-flex oa-flex-wrap oa-items-start oa-gap-4 oa-gap-y-3">
            <div className="oa-min-w-0 oa-flex-1">
              <div className="oa-flex oa-items-center oa-gap-2 oa-flex-wrap">
                <span className="oa-text-xs oa-font-medium oa-text-slate-500 dark:oa-text-slate-400 oa-shrink-0">From:</span>
                <span className="oa-text-sm oa-font-semibold oa-text-slate-900 dark:oa-text-white oa-truncate">
                  {authorLabel}
                </span>
                {authorEmail && (
                  <span className="oa-text-sm oa-text-slate-500 dark:oa-text-slate-400 oa-truncate">&lt;{authorEmail}&gt;</span>
                )}
              </div>
              <div className="oa-flex oa-items-center oa-gap-2 oa-mt-0.5">
                <span className="oa-text-xs oa-font-medium oa-text-slate-500 dark:oa-text-slate-400 oa-shrink-0">To:</span>
                <span className="oa-text-sm oa-text-slate-700 dark:oa-text-slate-300">
                  {isOrgWide ? 'All Teams' : teamName ?? '—'}
                </span>
              </div>
              <div className="oa-flex oa-items-center oa-gap-2 oa-mt-0.5">
                <span className="oa-text-xs oa-font-medium oa-text-slate-500 dark:oa-text-slate-400 oa-shrink-0">Type of Announcement:</span>
                <span className="oa-text-sm oa-font-medium oa-text-slate-700 dark:oa-text-slate-300 oa-capitalize">
                  <span className="oa-inline-flex oa-align-middle oa-mr-1" aria-hidden>{emoji}</span>
                  {announcementType.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            <div className="oa-shrink-0 oa-text-right">
              <div className="oa-text-sm oa-font-medium oa-text-slate-700 dark:oa-text-slate-300">
                {formatDate(announcement.created_at)}
              </div>
              <div className="oa-text-xs oa-text-slate-500 dark:oa-text-slate-400">{formatTime(announcement.created_at)}</div>
              {announcement.updated_at !== announcement.created_at && (
                <div className="oa-text-xs oa-text-slate-400 dark:oa-text-slate-500 oa-mt-1">
                  Edited {formatDate(announcement.updated_at)}
                </div>
              )}
            </div>
          </div>
          <div className="oa-flex oa-items-center oa-gap-2 oa-flex-wrap oa-mt-3">
            {isUrgent && (
              <span className="oa-px-2 oa-py-0.5 oa-bg-red-500 oa-text-white oa-text-xs oa-font-semibold oa-uppercase oa-tracking-wide oa-rounded">
                Urgent
              </span>
            )}
            {isOrgWide && (
              <span className="oa-px-2 oa-py-0.5 oa-bg-slate-200 dark:oa-bg-slate-600 oa-text-slate-700 dark:oa-text-slate-200 oa-text-xs oa-font-medium oa-rounded">
                Org-Wide
              </span>
            )}
          </div>
        </header>

        {/* Subject - same horizontal alignment as header */}
        <div className="oa-px-5 oa-pt-4 oa-pb-2">
          <div className="oa-text-xs oa-font-medium oa-text-slate-500 dark:oa-text-slate-400 oa-mb-2">Subject</div>
          {isEditingTitle && canEdit ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Subject"
              className="oa-text-xl oa-font-bold"
            />
          ) : (
            <h2 className="oa-text-xl oa-font-bold oa-text-slate-900 dark:oa-text-white oa-m-0 oa-tracking-tight" style={{ fontFamily: 'var(--pa-font-display)' }}>
              {announcement.title}
            </h2>
          )}
        </div>

        {/* Priority and Type - when editing */}
        {canEdit && (isEditingTitle || isEditingContent) && (
          <div className="oa-px-5 oa-pb-4">
            <div className="oa-grid oa-grid-cols-2 oa-gap-4 oa-max-w-md">
              <div>
                <label className="oa-block oa-text-xs oa-font-medium oa-text-slate-500 dark:oa-text-slate-400 oa-mb-1">Priority</label>
                <Select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as 'normal' | 'urgent')}
                  options={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'urgent', label: 'Urgent' },
                  ]}
                />
              </div>
              <div>
                <label className="oa-block oa-text-xs oa-font-medium oa-text-slate-500 dark:oa-text-slate-400 oa-mb-1">Type</label>
                <Select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as typeof editType)}
                  options={[
                    { value: 'general', label: 'General' },
                    { value: 'reminder', label: 'Reminder' },
                    { value: 'schedule_change', label: 'Schedule Change' },
                    { value: 'urgent', label: 'Urgent' },
                    { value: 'payment', label: 'Payment' },
                    { value: 'travel', label: 'Travel' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* Message body - same horizontal alignment as header */}
        <div className="oa-px-5 oa-pb-6">
          <div className="oa-text-xs oa-font-medium oa-text-slate-500 dark:oa-text-slate-400 oa-mb-2">Message</div>
          {isEditingContent && canEdit ? (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Message"
              rows={Math.max(10, Math.ceil(editContent.split('\n').length))}
              className="oa-w-full oa-p-3 oa-border oa-border-slate-300 dark:oa-border-slate-600 oa-rounded oa-resize-y oa-text-sm oa-leading-relaxed oa-bg-white dark:oa-bg-slate-800 oa-text-slate-900 dark:oa-text-slate-100"
              style={{ minHeight: 'auto' }}
            />
          ) : (
            <div className="oa-text-sm oa-leading-relaxed oa-whitespace-pre-wrap oa-text-slate-700 dark:oa-text-slate-300">
              {announcement.content}
            </div>
          )}
        </div>

        <footer className="oa-px-5 oa-pt-6 oa-pb-6 oa-border-t oa-border-slate-200 dark:oa-border-slate-700" style={{ marginTop: 'var(--pa-space-6)' }}>
            {canEdit && (isEditingTitle || isEditingContent) ? (
              <div className="oa-flex oa-flex-wrap oa-items-center oa-gap-2">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || !editTitle.trim() || !editContent.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="ghost" onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="oa-flex oa-flex-wrap oa-items-center oa-gap-2">
                {canEdit && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setIsEditingTitle(true)
                      setIsEditingContent(true)
                    }}
                  >
                    Edit Announcement
                  </Button>
                )}
                <Button variant="ghost" onClick={() => navigate(getLink(RouteKeys.ADMIN_ANNOUNCEMENTS))}>
                  Back to Announcements
                </Button>
              </div>
            )}
        </footer>
      </Card>
    </div>
  )
}
