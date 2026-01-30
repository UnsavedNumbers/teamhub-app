import { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '../platformAdmin'
import { cn } from '../../utils/cn'
import { 
  getAnnouncementTypeOptions, 
  type AnnouncementType 
} from '../../utils/announcementTypes'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import '../../styles/orgAdmin.css'

interface Team {
  id: string
  name: string
}

interface CreateAnnouncementModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (
    title: string, 
    content: string, 
    priority: 'normal' | 'urgent', 
    teamId: string | null,
    type: AnnouncementType,
    isOrgWide: boolean
  ) => Promise<void>
  teams: Team[]
  selectedTeamId: string | null
}

export default function CreateAnnouncementModal({
  isOpen,
  onClose,
  onSubmit,
  teams,
  selectedTeamId
}: CreateAnnouncementModalProps) {
  const { context } = useUserContext()
  const { currentOrganization } = useOrganization()
  const t = useT()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [type, setType] = useState<AnnouncementType>('general')
  const [isOrgWide, setIsOrgWide] = useState(false)
  const [teamId, setTeamId] = useState(selectedTeamId || (teams.length > 0 ? teams[0].id : ''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sort teams alphabetically (memoized to avoid render-loop resets)
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams]
  )
  
  // Check if user can create org-wide announcements (org_admin only)
  const canCreateOrgWide = context.roles?.includes('org_admin') || false
  
  // Get organization name for "Everyone in [Org Name]" text
  const orgName = currentOrganization?.name || 'this organization'

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTeamId(selectedTeamId || (sortedTeams.length > 0 ? sortedTeams[0].id : ''))
      setTitle('')
      setContent('')
      setPriority('normal')
      setType('general')
      setIsOrgWide(false)
      setError(null)
    }
  }, [isOpen, selectedTeamId, sortedTeams])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Technical Issue 9: Use nullish coalescing for string operations
    const trimmedTitle = (title ?? '').trim()
    const trimmedContent = (content ?? '').trim()
    
    if (!trimmedTitle || !trimmedContent || loading) return
    if (!isOrgWide && !teamId) return

    setLoading(true)
    setError(null)

    try {
      // Technical Issue 7: Wrap async operations in try/catch
      await onSubmit(
        trimmedTitle, 
        trimmedContent, 
        priority, 
        isOrgWide ? null : teamId,
        type,
        isOrgWide
      )
      // Reset form only on success (onClose will be called by parent)
      setTitle('')
      setContent('')
      setPriority('normal')
      setType('general')
      setIsOrgWide(false)
      setTeamId(selectedTeamId || (sortedTeams.length > 0 ? sortedTeams[0].id : ''))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create announcement. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setTitle('')
    setContent('')
    setPriority('normal')
    setType('general')
    setIsOrgWide(false)
    setTeamId(selectedTeamId || (sortedTeams.length > 0 ? sortedTeams[0].id : ''))
    setError(null)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      handleClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      style={{ cursor: loading ? 'wait' : 'default' }}
    >
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />
      <div className="relative w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>New Announcement</CardTitle>
            <button 
              onClick={handleClose}
              disabled={loading}
              className="pa-text-slate-400 hover:pa-text-slate-600 dark:hover:pa-text-slate-200 pa-transition-colors disabled:pa-opacity-50 disabled:pa-cursor-not-allowed"
              type="button"
            >
              <span className="material-symbols-outlined pa-icon-md">close</span>
            </button>
          </CardHeader>
          <CardContent>

            {error && (
              <div 
                className="pa-mb-6 pa-p-4"
                style={{ 
                  background: 'var(--pa-danger-bg, #fef2f2)', 
                  borderLeft: '4px solid var(--pa-danger, #ef4444)' 
                }}
              >
                <div className="pa-text-sm pa-font-medium" style={{ color: 'var(--pa-danger-dark, #991b1b)' }}>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="pa-space-y-6">
              {/* Audience Selector */}
              {canCreateOrgWide && (
                <div className="pa-form-group">
                  <label className="oa-filter-label">{t('admin.announcements.audience')}</label>
                  <div className="oa-toggle-group">
                    <button
                      type="button"
                      onClick={() => setIsOrgWide(false)}
                      disabled={loading}
                      className={cn('oa-toggle-btn', !isOrgWide && 'active', loading && 'pa-opacity-50 pa-cursor-not-allowed')}
                    >
                      {t('admin.announcements.audienceTeamOnly')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOrgWide(true)}
                      disabled={loading}
                      className={cn('oa-toggle-btn', isOrgWide && 'active', loading && 'pa-opacity-50 pa-cursor-not-allowed')}
                    >
                      {t('admin.announcements.audienceEveryone', { orgName })}
                    </button>
                  </div>
                </div>
              )}

              {/* Team Selector (only if not org-wide) */}
              {!isOrgWide && (
                <Select
                  label="Team"
                  required
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  disabled={loading || sortedTeams.length === 0}
                  options={[
                    { value: '', label: sortedTeams.length === 0 ? 'No teams available' : 'Select a team' },
                    ...sortedTeams.map(t => ({ value: t.id, label: t.name }))
                  ]}
                  error={!teamId && sortedTeams.length > 0 ? 'Team is required' : undefined}
                />
              )}

              <Input
                label="Title"
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                placeholder="Announcement title"
                error={!title.trim() ? 'Title is required' : undefined}
              />

              {/* Type Selector */}
              <Select
                label="Type"
                required
                value={type}
                onChange={(e) => setType(e.target.value as AnnouncementType)}
                disabled={loading}
                options={getAnnouncementTypeOptions().map(opt => ({
                  value: opt.value,
                  label: `${opt.emoji} ${opt.label}`
                }))}
              />

              <div className="pa-form-group">
                <label className="pa-label pa-label--required">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  disabled={loading}
                  className={cn(
                    'pa-input',
                    !content.trim() && 'pa-input--error'
                  )}
                  placeholder="What do you want to announce?"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                />
                {!content.trim() && (
                  <div className="pa-helper pa-helper--error">
                    Content is required
                  </div>
                )}
              </div>

              {/* Priority */}
              <div className="pa-form-group">
                <label className="pa-label">
                  {t('admin.announcements.priority')}
                </label>
                <div className="oa-toggle-group pa-mt-2">
                  <button
                    type="button"
                    onClick={() => setPriority('normal')}
                    disabled={loading}
                    className={cn(
                      'oa-toggle-btn',
                      priority === 'normal' && 'active',
                      loading && 'pa-opacity-50 pa-cursor-not-allowed'
                    )}
                  >
                    {t('admin.announcements.priorityNormal')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('urgent')}
                    disabled={loading}
                    className={cn(
                      'oa-toggle-btn',
                      priority === 'urgent' && 'active',
                      loading && 'pa-opacity-50 pa-cursor-not-allowed'
                    )}
                  >
                    {t('admin.announcements.priorityUrgent')}
                  </button>
                </div>
              </div>

              <div className="pa-form-actions">
                <Button 
                  variant="secondary" 
                  onClick={handleClose} 
                  type="button" 
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  type="submit" 
                  disabled={loading || !title.trim() || !content.trim() || (!isOrgWide && !teamId)}
                  loading={loading}
                >
                  Post Announcement
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
