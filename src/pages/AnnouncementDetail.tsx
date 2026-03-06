import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'
import { debug } from '../lib/debug'
import { supabase } from '../lib/supabase'
import { getAnnouncementById, type Announcement } from '../data/services/messagesService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { getAnnouncementEmoji } from '../utils/announcementTypes'
import { getLink, RouteKeys } from '../utils/routes'

export default function AnnouncementDetail() {
  const { announcementId } = useParams<{ announcementId: string }>()

  useDebugLifecycle('AnnouncementDetail', { announcementId })
  const [loading, setLoading] = useState(true)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [debugStuck, setDebugStuck] = useState<Record<string, unknown> | null>(null)
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const isMountedRef = useRef(true)
  const fetchAttemptRef = useRef(0)

  // Track if component is mounted to prevent state updates after unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // DEBUG LAYER 1: log every change in readiness + context
  useEffect(() => {
    debug.flow('AnnouncementDetail', 'Context/readiness changed', {
      isReady,
      announcementId,
      hasContext: !!context,
      orgId: (context as unknown as Record<string, unknown> | null)?.org_id ?? null,
      userId: (context as unknown as Record<string, unknown> | null)?.user_id ?? null,
    })
    console.log(
      '%c[AnnouncementDetail] readiness snapshot',
      'color:#0ea5e9;font-weight:bold',
      { isReady, announcementId, context }
    )
  }, [isReady, context, announcementId])

  // DEBUG LAYER 2: stuck-loading detector (6 s timeout)
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(async () => {
      if (!isMountedRef.current || !loading) return
      const { data: sessionData } = await supabase.auth.getSession()
      const snapshot = {
        loading,
        isReady,
        announcementId,
        fetchAttempts: fetchAttemptRef.current,
        hasSession: !!sessionData?.session,
        sessionExpiry: sessionData?.session?.expires_at ?? null,
        userId: sessionData?.session?.user?.id ?? null,
        contextOrgId: (context as unknown as Record<string, unknown> | null)?.org_id ?? null,
        contextUserId: (context as unknown as Record<string, unknown> | null)?.user_id ?? null,
        timestamp: new Date().toISOString(),
      }
      debug.error('AnnouncementDetail', 'WARNING: Still loading after 6 s - possible RLS block or missing context', snapshot)
      console.warn(
        '%c[AnnouncementDetail] WARNING: STUCK at Loading after 6 s',
        'color:#f97316;font-weight:bold;font-size:13px',
        snapshot
      )
      if (import.meta.env.DEV) {
        setDebugStuck(snapshot)
      }
    }, 6000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  const fetchData = useCallback(async () => {
    if (!announcementId) {
      debug.error('AnnouncementDetail', 'No announcementId - redirecting', {})
      setLoading(false)
      navigate(getLink(RouteKeys.PORTAL_ANNOUNCEMENTS), { replace: true })
      return
    }

    if (!isReady) {
      debug.flow('AnnouncementDetail', 'fetchData called but context not ready - waiting', {
        isReady,
        announcementId,
        hasContext: !!context,
      })
      console.log('%c[AnnouncementDetail] fetchData: context not ready yet', 'color:#94a3b8', { isReady, context })
      return
    }

    fetchAttemptRef.current += 1
    const attempt = fetchAttemptRef.current

    debug.flow('AnnouncementDetail', `fetchData start (attempt ${attempt})`, {
      announcementId,
      orgId: (context as unknown as Record<string, unknown> | null)?.org_id,
    })

    // Log auth session state right before the query
    const { data: sessionData } = await supabase.auth.getSession()
    console.log(
      `%c[AnnouncementDetail] attempt #${attempt} - auth session`,
      'color:#6366f1;font-weight:bold',
      {
        hasSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id ?? null,
        expiresAt: sessionData?.session?.expires_at ?? null,
        announcementId,
        context,
      }
    )

    setLoading(true)

    try {
      debug.flow('AnnouncementDetail', 'Calling getAnnouncementById', { announcementId, attempt })
      const { data, error } = await getAnnouncementById(context, announcementId)

      if (!isMountedRef.current) return

      debug.data('AnnouncementDetail', 'getAnnouncementById result', {
        attempt,
        hasData: !!data,
        errorMessage: error?.message ?? null,
        announcementId,
      })
      console.log(
        `%c[AnnouncementDetail] attempt #${attempt} - query result`,
        'color:#10b981;font-weight:bold',
        { data, error }
      )

      if (error || !data) {
        setLoading(false)
        const msg = error?.message ?? 'no data'
        const isNotFound = msg.includes('not found') || msg.includes('No rows') || msg.includes('PGRST116')
        debug.error('AnnouncementDetail', isNotFound ? 'Announcement not found (404)' : 'Fetch error - redirecting', {
          attempt, error: msg, announcementId,
        })
        console.warn(
          `%c[AnnouncementDetail] attempt #${attempt} - redirecting: ${isNotFound ? '404' : 'error'}`,
          'color:#f43f5e',
          { error }
        )
        navigate(getLink(RouteKeys.PORTAL_ANNOUNCEMENTS), { replace: true })
        return
      }

      setAnnouncement(data)
      setLoading(false)
      setDebugStuck(null)
    } catch (err) {
      if (!isMountedRef.current) return
      debug.error('AnnouncementDetail', 'Unexpected error in fetchData', { err, attempt, announcementId })
      console.error('%c[AnnouncementDetail] Unexpected error', 'color:#f43f5e;font-weight:bold', err)
      setLoading(false)
      navigate(getLink(RouteKeys.PORTAL_ANNOUNCEMENTS), { replace: true })
    }
  }, [announcementId, context, isReady, navigate])

  useEffect(() => {
    if (isReady && announcementId) {
      fetchData()
    }
  }, [isReady, announcementId, fetchData])

  // Get team context from query parameter for back navigation
  const backUrl = getLink(RouteKeys.PORTAL_ANNOUNCEMENTS)

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex flex-col items-center py-12 gap-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>

          {/* Dev-only stuck-state diagnostic overlay */}
          {import.meta.env.DEV && debugStuck && (
            <div style={{
              maxWidth: 640,
              background: '#fff7ed',
              border: '2px solid #f97316',
              borderRadius: 8,
              padding: '16px 20px',
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#1e293b',
              textAlign: 'left',
            }}>
              <strong style={{ color: '#f97316', fontSize: 13 }}>WARNING DEV: Stuck at Loading ({'>'}6 s)</strong>
              <p style={{ marginTop: 8, marginBottom: 4, color: '#64748b' }}>Check the console for full details. Snapshot:</p>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(debugStuck, null, 2)}
              </pre>
              <p style={{ marginTop: 10, marginBottom: 0, color: '#64748b', fontSize: 11 }}>
                Likely causes: <strong>RLS blocking the row</strong> (user not a member of this org/team),
                missing session, or context not resolving (no org linked to user).
              </p>
            </div>
          )}
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
            Back to Announcements
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
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: getLink(RouteKeys.PORTAL_DASHBOARD) },
        { label: 'Announcements', path: getLink(RouteKeys.PORTAL_ANNOUNCEMENTS) },
        { label: announcement.title },
      ]}
    >
      <div className="mb-12">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <PageTitle>{announcement.title}</PageTitle>
        </div>
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
            {isOrgWide && (
              <span className="px-3 py-1 bg-purple-500/10 text-purple-500 dark:text-purple-400 text-xs font-bold uppercase tracking-widest rounded">
                Org-Wide
              </span>
            )}
            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded ${
              authorRole === 'coach'
                ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-link-color)]'
                : 'bg-purple-500/10 text-purple-500 dark:text-purple-400'
            }`}>
              {authorRole === 'coach' ? 'Coach' : authorRole === 'org_admin' ? 'Admin' : 'Parent'}
            </span>
            {authorEmail && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{authorEmail}</span>
            )}
          </div>

          {/* Team Name (if team-specific) or Org-Wide indicator */}
          {isOrgWide ? (
            <div className="flex items-center gap-3">
              <Icon name="business" className="text-gray-400" />
              <p className="font-bold text-gray-900 dark:text-white">All Teams</p>
            </div>
          ) : teamName ? (
            <div className="flex items-center gap-3">
              <Icon name="group" className="text-gray-400" />
              <p className="font-bold text-gray-900 dark:text-white">{teamName}</p>
            </div>
          ) : null}

          {/* Dates */}
          <div className="flex items-center gap-3">
            <Icon name="schedule" className="text-gray-400" />
            <div>
              <p className="font-black text-gray-900 dark:text-white">{formatDate(announcement.created_at)}</p>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{formatTime(announcement.created_at)}</p>
            </div>
          </div>

          {announcement.updated_at !== announcement.created_at && (
            <div className="flex items-center gap-3">
              <Icon name="edit" className="text-gray-400" />
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                Updated {formatDate(announcement.updated_at)} at {formatTime(announcement.updated_at)}
              </p>
            </div>
          )}

          {/* Content */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {announcement.content}
            </p>
          </div>
        </div>
      </Card>

      <Button variant="primary" onClick={() => navigate(backUrl)}>
        Back to Announcements
      </Button>
    </PortalLayout>
  )
}

