import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'
import { getAnnouncementById, updateAnnouncement, type Announcement } from '../../data/services/messagesService'
import { AdminPageHeader, Card, Button, Input, Select } from '../../components/admin'
import { showSuccess, showError } from '../../utils/toast'
import { getAnnouncementEmoji } from '../../utils/announcementTypes'
import { cn } from '../../utils/cn'
import '../../styles/orgAdmin.css'

export default function AdminAnnouncementDetail() {
  const { announcementId } = useParams<{ announcementId: string }>()
  const { context, isReady } = useUserContext()
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

  const isOrgAdmin = context.roles?.includes('org_admin') ?? false
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
        navigate('/admin/announcements', { replace: true })
      }
      return
    }

    setLoading(true)

    try {
      const { data, error } = await getAnnouncementById(context, announcementId)

      if (!isMountedRef.current) return

      if (error || !data) {
        setLoading(false)
        navigate('/admin/announcements', { replace: true })
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
      navigate('/admin/announcements', { replace: true })
    }
  }, [announcementId, context, isReady, navigate])

  useEffect(() => {
    if (isReady && announcementId) {
      fetchData()
    }
  }, [isReady, announcementId, fetchData])

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
            <Button variant="primary" onClick={() => navigate('/admin/announcements')} className="oa-mt-4">
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
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Announcements', path: '/admin/announcements' },
          { label: announcement.title },
        ]}
      />

      <Card className="oa-p-8">
        <div className="oa-space-y-6">
          {/* Priority and Author Info */}
          <div className="oa-flex oa-items-center oa-gap-4 oa-flex-wrap">
            {isUrgent && (
              <span className="oa-px-3 oa-py-1 oa-bg-red-500 oa-text-white oa-text-xs oa-font-black oa-uppercase oa-tracking-widest oa-rounded">
                Urgent
              </span>
            )}
            {isOrgWide && (
              <span className="oa-px-3 oa-py-1 oa-bg-purple-500/10 oa-text-purple-500 dark:oa-text-purple-400 oa-text-xs oa-font-bold oa-uppercase oa-tracking-widest oa-rounded">
                Org-Wide
              </span>
            )}
            <span className={cn(
              'oa-px-3 oa-py-1 oa-text-xs oa-font-bold oa-uppercase oa-tracking-widest oa-rounded',
              authorRole === 'coach'
                ? 'oa-bg-[var(--org-btn-primary-bg)]/10 oa-text-[var(--org-link-color)]'
                : 'oa-bg-purple-500/10 oa-text-purple-500 dark:oa-text-purple-400'
            )}>
              {authorRole === 'coach' ? 'Coach' : authorRole === 'org_admin' ? 'Admin' : 'Parent'}
            </span>
            {authorEmail && (
              <span className="oa-text-sm oa-text-slate-500 dark:oa-text-slate-400">{authorEmail}</span>
            )}
          </div>

          {/* Team Name */}
          {isOrgWide ? (
            <div className="oa-flex oa-items-center oa-gap-3">
              <span className="material-symbols-outlined oa-text-slate-400">business</span>
              <p className="oa-font-bold oa-text-slate-900 dark:oa-text-white">All Teams</p>
            </div>
          ) : teamName ? (
            <div className="oa-flex oa-items-center oa-gap-3">
              <span className="material-symbols-outlined oa-text-slate-400">group</span>
              <p className="oa-font-bold oa-text-slate-900 dark:oa-text-white">{teamName}</p>
            </div>
          ) : null}

          {/* Dates */}
          <div className="oa-flex oa-items-center oa-gap-3">
            <span className="material-symbols-outlined oa-text-slate-400">schedule</span>
            <div>
              <p className="oa-font-black oa-text-slate-900 dark:oa-text-white">{formatDate(announcement.created_at)}</p>
              <p className="oa-text-sm oa-font-bold oa-text-slate-500 dark:oa-text-slate-400">{formatTime(announcement.created_at)}</p>
            </div>
          </div>

          {announcement.updated_at !== announcement.created_at && (
            <div className="oa-flex oa-items-center oa-gap-3">
              <span className="material-symbols-outlined oa-text-slate-400">edit</span>
              <p className="oa-text-sm oa-font-bold oa-text-slate-500 dark:oa-text-slate-400">
                Updated {formatDate(announcement.updated_at)} at {formatTime(announcement.updated_at)}
              </p>
            </div>
          )}

          {/* Title - Inline Editable */}
          <div className="oa-pt-4 oa-border-t oa-border-slate-200 dark:oa-border-slate-700">
            <div className="oa-flex oa-items-start oa-gap-3">
              <span className="oa-text-3xl">{emoji}</span>
              <div className="oa-flex-1">
                {isEditingTitle && canEdit ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Announcement title"
                    className="oa-text-xl oa-font-bold"
                  />
                ) : (
                  <div className="oa-flex oa-items-center oa-gap-2 oa-group">
                    <h2 className="oa-text-xl oa-font-bold oa-text-slate-900 dark:oa-text-white">{announcement.title}</h2>
                    {canEdit && (
                      <button
                        onClick={() => setIsEditingTitle(true)}
                        className="oa-opacity-0 group-hover:oa-opacity-100 oa-transition-opacity oa-text-slate-400 hover:oa-text-slate-600"
                        title="Edit title"
                      >
                        <span className="material-symbols-outlined oa-text-sm">edit</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Priority and Type - Always Editable for Org Admins */}
          {canEdit && (isEditingTitle || isEditingContent) && (
            <div className="oa-space-y-4 oa-pt-4 oa-border-t oa-border-slate-200 dark:oa-border-slate-700">
              <div className="oa-grid oa-grid-cols-2 oa-gap-4">
                <div>
                  <label className="oa-block oa-text-sm oa-font-medium oa-text-slate-700 dark:oa-text-slate-300 oa-mb-2">
                    Priority
                  </label>
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
                  <label className="oa-block oa-text-sm oa-font-medium oa-text-slate-700 dark:oa-text-slate-300 oa-mb-2">
                    Type
                  </label>
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

          {/* Content - Inline Editable */}
          <div className="oa-pt-4 oa-border-t oa-border-slate-200 dark:oa-border-slate-700">
            {isEditingContent && canEdit ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Announcement content"
                className="oa-w-full oa-min-h-[200px] oa-p-3 oa-border oa-border-slate-300 dark:oa-border-slate-600 oa-rounded oa-bg-white dark:oa-bg-slate-800 oa-text-slate-900 dark:oa-text-white oa-resize-y"
                style={{ fontFamily: 'inherit' }}
              />
            ) : (
              <div className="oa-group">
                <p className="oa-text-slate-600 dark:oa-text-slate-300 oa-whitespace-pre-wrap oa-leading-relaxed">
                  {announcement.content}
                </p>
                {canEdit && (
                  <button
                    onClick={() => setIsEditingContent(true)}
                    className="oa-opacity-0 group-hover:oa-opacity-100 oa-transition-opacity oa-mt-2 oa-text-slate-400 hover:oa-text-slate-600"
                    title="Edit content"
                  >
                    <span className="material-symbols-outlined oa-text-sm">edit</span> Edit
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Save/Cancel Buttons - Show when editing */}
          {canEdit && (isEditingTitle || isEditingContent) && (
            <div className="oa-flex oa-gap-2 oa-pt-4 oa-border-t oa-border-slate-200 dark:oa-border-slate-700">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || !editTitle.trim() || !editContent.trim()}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="oa-mt-6">
        <Button variant="primary" onClick={() => navigate('/admin/announcements')}>
          Back to Announcements
        </Button>
      </div>
    </div>
  )
}
