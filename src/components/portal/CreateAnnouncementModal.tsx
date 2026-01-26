
import { useState } from 'react'
import { CardTitle } from './Typography'
import Button from './Button'
import Icon from './Icon'

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

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !teamId) return

    setLoading(true)
    setError(null)

    try {
      await onSubmit(title, content, priority, teamId)
      onClose()
      // Reset form
      setTitle('')
      setContent('')
      setPriority('normal')
    } catch (err) {
      setError('Failed to create announcement. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <CardTitle>New Announcement</CardTitle>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <Icon name="close" size="text-xl" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              Team
            </label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg, #137fec)]/20 focus:border-[var(--org-btn-primary-bg, #137fec)] outline-none transition-all font-bold"
            >
              <option value="" disabled>Select a team</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg, #137fec)]/20 focus:border-[var(--org-btn-primary-bg, #137fec)] outline-none transition-all font-bold placeholder:font-normal"
              placeholder="Announcement title"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg, #137fec)]/20 focus:border-[var(--org-btn-primary-bg, #137fec)] outline-none transition-all font-medium placeholder:font-normal resize-none"
              placeholder="What do you want to announce?"
            />
          </div>

          <div>
             <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
              Priority
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="priority"
                  value="normal"
                  checked={priority === 'normal'}
                  onChange={() => setPriority('normal')}
                  className="hidden"
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${priority === 'normal' ? 'border-[var(--org-btn-primary-bg, #137fec)]' : 'border-slate-300 dark:border-slate-600'}`}>
                  {priority === 'normal' && <div className="w-2 h-2 rounded-full bg-[var(--org-btn-primary-bg)]" />}
                </div>
                <span className={`text-sm font-bold ${priority === 'normal' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Normal</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="priority"
                  value="urgent"
                  checked={priority === 'urgent'}
                  onChange={() => setPriority('urgent')}
                  className="hidden"
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${priority === 'urgent' ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}>
                   {priority === 'urgent' && <div className="w-2 h-2 rounded-full bg-red-500" />}
                </div>
                <span className={`text-sm font-bold ${priority === 'urgent' ? 'text-red-500' : 'text-slate-500'}`}>Urgent</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading || !title.trim() || !content.trim() || !teamId}>
              {loading ? 'Posting...' : 'Post Announcement'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
