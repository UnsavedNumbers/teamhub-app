import { useState, useEffect } from 'react'
import { Card, Button, Input, Select } from '../platformAdmin'
import { cn } from '../../utils/cn'

interface Team {
  id: string
  name: string
}

interface CreateAnnouncementModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (title: string, content: string, priority: 'normal' | 'urgent', teamId: string) => Promise<void>
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
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal')
  const [teamId, setTeamId] = useState(selectedTeamId || (teams.length > 0 ? teams[0].id : ''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sort teams alphabetically
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name))

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTeamId(selectedTeamId || (sortedTeams.length > 0 ? sortedTeams[0].id : ''))
      setTitle('')
      setContent('')
      setPriority('normal')
      setError(null)
    }
  }, [isOpen, selectedTeamId, sortedTeams])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !teamId || loading) return

    setLoading(true)
    setError(null)

    try {
      await onSubmit(title.trim(), content.trim(), priority, teamId)
      // Reset form only on success (onClose will be called by parent)
      setTitle('')
      setContent('')
      setPriority('normal')
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
      <div className="relative w-full max-w-lg">
        <Card>
          <div className="pa-p-6">
            <div className="pa-flex pa-items-center pa-justify-between pa-mb-6">
              <h2 className="pa-text-xl pa-font-bold pa-text-slate-900 dark:pa-text-white">
                New Announcement
              </h2>
              <button 
                onClick={handleClose}
                disabled={loading}
                className="pa-text-slate-400 hover:pa-text-slate-600 dark:hover:pa-text-slate-200 pa-transition-colors disabled:pa-opacity-50 disabled:pa-cursor-not-allowed"
                type="button"
              >
                <span className="material-symbols-outlined pa-icon-md">close</span>
              </button>
            </div>

            {error && (
              <div 
                className="pa-mb-4 pa-p-4"
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

            <form onSubmit={handleSubmit} className="pa-space-y-4">
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

              <div className="pa-form-group">
                <label className="pa-label pa-label--required">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  disabled={loading}
                  className={cn(
                    'pa-input',
                    !content.trim() && 'pa-input--error'
                  )}
                  placeholder="What do you want to announce?"
                />
                {!content.trim() && (
                  <div className="pa-helper pa-helper--error">
                    Content is required
                  </div>
                )}
              </div>

              <div className="pa-form-group">
                <label className="pa-label">
                  Priority
                </label>
                <div className="pa-flex pa-gap-4 pa-mt-2">
                  <label className="pa-flex pa-items-center pa-gap-2 pa-cursor-pointer pa-group">
                    <input
                      type="radio"
                      name="priority"
                      value="normal"
                      checked={priority === 'normal'}
                      onChange={() => setPriority('normal')}
                      disabled={loading}
                      className="hidden"
                    />
                    <div className={cn(
                      'pa-w-4 pa-h-4 pa-rounded-full pa-border-2 pa-flex pa-items-center pa-justify-center',
                      priority === 'normal' 
                        ? 'pa-border-[var(--org-btn-primary-bg, #137fec)]' 
                        : 'pa-border-slate-300 dark:pa-border-slate-600'
                    )}>
                      {priority === 'normal' && (
                        <div className="pa-w-2 pa-h-2 pa-rounded-full" style={{ background: 'var(--org-btn-primary-bg, #137fec)' }} />
                      )}
                    </div>
                    <span className={cn(
                      'pa-text-sm pa-font-bold',
                      priority === 'normal' ? 'pa-text-slate-900 dark:pa-text-white' : 'pa-text-slate-500'
                    )}>
                      Normal
                    </span>
                  </label>

                  <label className="pa-flex pa-items-center pa-gap-2 pa-cursor-pointer pa-group">
                    <input
                      type="radio"
                      name="priority"
                      value="urgent"
                      checked={priority === 'urgent'}
                      onChange={() => setPriority('urgent')}
                      disabled={loading}
                      className="hidden"
                    />
                    <div className={cn(
                      'pa-w-4 pa-h-4 pa-rounded-full pa-border-2 pa-flex pa-items-center pa-justify-center',
                      priority === 'urgent' 
                        ? 'pa-border-red-500' 
                        : 'pa-border-slate-300 dark:pa-border-slate-600'
                    )}>
                      {priority === 'urgent' && (
                        <div className="pa-w-2 pa-h-2 pa-rounded-full pa-bg-red-500" />
                      )}
                    </div>
                    <span className={cn(
                      'pa-text-sm pa-font-bold',
                      priority === 'urgent' ? 'pa-text-red-500' : 'pa-text-slate-500'
                    )}>
                      Urgent
                    </span>
                  </label>
                </div>
              </div>

              <div className="pa-flex pa-justify-end pa-gap-2 pa-pt-2">
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
                  disabled={loading || !title.trim() || !content.trim() || !teamId}
                  loading={loading}
                >
                  Post Announcement
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
