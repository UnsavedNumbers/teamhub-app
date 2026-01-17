import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getAnnouncementById, type Announcement } from '../data/services/messagesService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

export default function AnnouncementDetail() {
  const { announcementId } = useParams<{ announcementId: string }>()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const isMountedRef = useRef(true)

  // Track if component is mounted to prevent state updates after unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!announcementId) {
      setLoading(false)
      navigate('/portal/messages', { replace: true })
      return
    }

    if (!isReady) {
      // Wait for context to be ready
      return
    }

    setLoading(true)

    try {
      const { data, error } = await getAnnouncementById(context, announcementId)

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return

      if (error || !data) {
        // Set loading to false before navigating to prevent hanging
        setLoading(false)
        
        // Handle different error types
        if (error?.message?.includes('not found') || error?.message?.includes('No rows')) {
          // 404 - announcement not found
          navigate('/portal/messages', { replace: true })
        } else {
          // Other errors - log and redirect
          console.error('Error fetching announcement:', error)
          navigate('/portal/messages', { replace: true })
        }
        return
      }

      setAnnouncement(data)
      setLoading(false)
    } catch (err) {
      // Catch any unexpected errors
      if (!isMountedRef.current) return
      console.error('Unexpected error fetching announcement:', err)
      setLoading(false)
      navigate('/portal/messages', { replace: true })
    }
  }, [announcementId, context, isReady, navigate])

  useEffect(() => {
    if (isReady && announcementId) {
      fetchData()
    }
  }, [isReady, announcementId, fetchData])

  // Get team context from query parameter for back navigation
  const teamId = searchParams.get('team')
  const backUrl = `/portal/messages${teamId ? `?team=${teamId}` : ''}`

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  if (!announcement) {
    return (
      <PortalLayout>
        <Card className="text-center py-12">
          <CardTitle>Announcement not found</CardTitle>
          <Button variant="primary" onClick={() => navigate(backUrl)} className="mt-4">
            Back to Messages
          </Button>
        </Card>
      </PortalLayout>
    )
  }

  // Safe access to optional properties
  const priority = (announcement.priority || 'normal').toLowerCase()
  const authorRole = announcement.author?.role || 'parent'
  const authorEmail = announcement.author?.email || ''
  const teamName = announcement.team?.name || null
  const isUrgent = priority === 'urgent'

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
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Messages', path: '/portal/messages' },
        { label: announcement.title },
      ]}
    >
      <div className="mb-12">
        <PageTitle>{announcement.title}</PageTitle>
      </div>

      <Card className="p-8 mb-6">
        <div className="space-y-6">
          {/* Priority and Author Info */}
          <div className="flex items-center gap-4 flex-wrap">
            {isUrgent && (
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded">
                Urgent
              </span>
            )}
            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded ${
              authorRole === 'coach'
                ? 'bg-[#137fec]/10 text-[#137fec]'
                : 'bg-purple-500/10 text-purple-500 dark:text-purple-400'
            }`}>
              {authorRole === 'coach' ? 'Coach' : authorRole === 'org_admin' ? 'Admin' : 'Parent'}
            </span>
            {authorEmail && (
              <span className="text-sm text-slate-500 dark:text-slate-400">{authorEmail}</span>
            )}
          </div>

          {/* Team Name (if team-specific) */}
          {teamName && (
            <div className="flex items-center gap-3">
              <Icon name="group" className="text-slate-400" />
              <p className="font-bold text-slate-900 dark:text-white">{teamName}</p>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-3">
            <Icon name="schedule" className="text-slate-400" />
            <div>
              <p className="font-black text-slate-900 dark:text-white">{formatDate(announcement.created_at)}</p>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{formatTime(announcement.created_at)}</p>
            </div>
          </div>

          {announcement.updated_at !== announcement.created_at && (
            <div className="flex items-center gap-3">
              <Icon name="edit" className="text-slate-400" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                Updated {formatDate(announcement.updated_at)} at {formatTime(announcement.updated_at)}
              </p>
            </div>
          )}

          {/* Content */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {announcement.content}
            </p>
          </div>
        </div>
      </Card>

      <Button variant="primary" onClick={() => navigate(backUrl)}>
        Back to Messages
      </Button>
    </PortalLayout>
  )
}
