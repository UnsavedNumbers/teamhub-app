import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getLink, RouteKeys } from '../utils/routes'
import { useOptionalAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import { notificationService } from '../data/services/notificationService'
import { getAthletes } from '../data/services/familyService'
import { getTeamsForParent } from '../data/services/teamsService'
import { NotificationRecord } from '../types/notifications'
import type { NotificationCursor } from '../data/services/userNotificationsService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle } from '../components/portal/Typography'
import NotificationErrorBoundary from '../components/common/NotificationErrorBoundary'
import { showError, showSuccess } from '../utils/toast'
import { cn } from '../utils/cn'

// Mock Data for demonstration
const MOCK_PROGRAMS = [
  { id: 'p1', name: 'Competitive' },
  { id: 'p2', name: 'Development' },
  { id: 'p3', name: 'Recreational' },
]

const MOCK_SPORTS = [
  { id: 's1', name: 'Soccer' },
  { id: 's2', name: 'Basketball' },
  { id: 's3', name: 'Volleyball' },
  { id: 's4', name: 'Baseball' },
]

interface FilterSectionProps {
  title: string
  items: { id: string; name: string }[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
}

const FilterSection = ({ title, items, selectedIds, onToggle, onSelectAll }: FilterSectionProps) => {
  const isAllSelected = selectedIds.size === items.length
  
  return (
    <div className="pt-5 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--org-btn-primary-bg)]" aria-hidden />
        {title}
      </h3>
      
      {/* Select All Option */}
      <button
        onClick={onSelectAll}
        className="flex items-center gap-3 w-full text-left cursor-pointer mb-3 pb-3 border-b border-gray-50 dark:border-gray-800/50 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group"
      >
        <div className={cn(
          "w-5 h-5 rounded border flex items-center justify-center transition-all shadow-inner",
          isAllSelected 
            ? "bg-[var(--org-btn-primary-bg)] border-[var(--org-btn-primary-bg)] text-white" 
            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-[var(--org-btn-primary-bg)]"
        )}>
          {isAllSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
        </div>
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          All {title}
        </span>
      </button>

      {/* Scrollable List */}
      <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {items.map(item => {
          const isSelected = selectedIds.has(item.id)
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={cn(
                "flex items-center gap-3 w-full text-left cursor-pointer p-3 rounded-xl transition-all border group",
                isSelected 
                  ? "bg-[var(--org-btn-primary-bg)]/8 dark:bg-[var(--org-btn-primary-bg)]/12 border-[var(--org-btn-primary-bg)]/40 shadow-sm" 
                  : "border-transparent hover:border-[var(--org-btn-primary-bg)]/40 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:shadow-sm hover:translate-y-[-1px]"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded border flex items-center justify-center transition-all",
                isSelected 
                  ? "bg-[var(--org-btn-primary-bg)] border-[var(--org-btn-primary-bg)] text-white" 
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 group-hover:border-[var(--org-btn-primary-bg)]"
              )}>
                {isSelected && <span className="material-symbols-outlined text-[14px] animate-in zoom-in">check</span>}
              </div>
              <span className={cn(
                "text-sm transition-colors",
                isSelected ? "font-bold text-[var(--org-btn-primary-bg)]" : "font-medium text-gray-700 dark:text-gray-300"
              )}>
                {item.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'

export default function Notifications() {
  useDebugLifecycle('Notifications')
  const auth = useOptionalAuth()
  const { currentOrganization, isLoading: orgLoading } = useOrganization()
  const context = useMemo(
    () => ({
      userId: auth?.user?.id ?? '',
      email: auth?.user?.email ?? null,
      orgId: currentOrganization?.id ?? '',
      organizationName: currentOrganization?.name ?? null,
      roles: currentOrganization?.roles ?? [],
      isPlatformAdmin: auth?.profile?.isPlatformAdmin ?? false,
    }),
    [auth?.user?.id, auth?.user?.email, currentOrganization?.id, currentOrganization?.name, currentOrganization?.roles, auth?.profile?.isPlatformAdmin]
  )
  const isReady = !auth?.loading && !orgLoading && !!auth?.user && !!currentOrganization

  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<NotificationCursor | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [athletes, setAthletes] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const programs = MOCK_PROGRAMS
  const sports = MOCK_SPORTS
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all')
  const [filterByType, setFilterByType] = useState<'all' | 'athlete' | 'team' | 'program' | 'sport'>('all')
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<Set<string>>(new Set())
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set())
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set())
  const [selectedSportIds, setSelectedSportIds] = useState<Set<string>>(new Set())
  const subscriptionRef = useRef<any>(null)

  // Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    setIsOffline(!navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Real-time subscription
  useEffect(() => {
    if (!isReady || !context.userId) return

    import('../lib/supabase').then(({ supabase }) => {
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${context.userId}`
          },
          (payload: any) => {
            const newNotif = mapDbNotification(payload.new)
            setNotifications((prev) => [newNotif, ...prev])
          }
        )
        .subscribe()
      
      subscriptionRef.current = channel
    })

    return () => {
      if (subscriptionRef.current) {
        import('../lib/supabase').then(({ supabase }) => {
          supabase.channel('notifications').unsubscribe()
        })
        subscriptionRef.current = null
      }
    }
  }, [isReady, context.userId])

  const loadNotifications = useCallback(async (cursor: NotificationCursor | null = null, append: boolean = false) => {
    if (!isReady) return

    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const includeArchived = activeTab === 'archived'
      const { data: notifs, error: notifError, nextCursor: newCursor } = await notificationService.getNotifications(
        context,
        {
          limit: 50,
          cursor,
          includeArchived,
          includeDeleted: false,
        }
      )
      
      if (notifError) throw notifError
      
      if (append) {
        setNotifications((prev) => [...prev, ...(notifs || [])])
      } else {
        setNotifications(notifs || [])
      }
      setNextCursor(newCursor)
    } catch (err) {
      console.error('Error loading notifications:', err)
      if (!append) {
        showError('Failed to load notifications')
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [isReady, context, activeTab])

  useEffect(() => {
    loadNotifications(null, false)
  }, [loadNotifications])

  useEffect(() => {
    if (!isReady) return

    const loadFilterData = async () => {
      try {
        // Fetch Athletes for filters
        const { data: myAthletes } = await getAthletes(context)
        if (myAthletes) {
          setAthletes(myAthletes)
          setSelectedAthleteIds(new Set(myAthletes.map((a: any) => a.id)))
        }

        // Fetch Teams for filters
        const { data: myTeams } = await getTeamsForParent(context)
        if (myTeams) {
          setTeams(myTeams)
          setSelectedTeamIds(new Set(myTeams.map((t: any) => t.id)))
        }

        // Init Mock Data Selections
        setSelectedProgramIds(new Set(MOCK_PROGRAMS.map(p => p.id)))
        setSelectedSportIds(new Set(MOCK_SPORTS.map(s => s.id)))
      } catch (err) {
        console.error('Error loading filter data:', err)
      }
    }

    loadFilterData()
  }, [isReady, context])

  // Helper to map DB notification (for real-time updates)
  const mapDbNotification = useCallback((row: any): NotificationRecord => {
    return {
      id: row.id,
      user_id: row.user_id,
      org_id: row.org_id,
      team_id: row.team_id ?? null,
      action: row.action ?? 'system_generated_notice',
      presentation_type: row.presentation_type ?? 'info',
      role_context: row.role_context ?? 'guardian',
      entity_type: row.entity_type ?? null,
      entity_id: row.entity_id ?? null,
      title: row.title,
      body: row.body,
      link_url: row.link_url ?? null,
      metadata: row.metadata ?? null,
      dedupe_key: row.dedupe_key,
      read_at: row.read_at ?? null,
      archived_at: row.archived_at ?? null,
      deleted_at: row.deleted_at ?? null,
      created_at: row.created_at,
    }
  }, [])

  // Filtering Logic (client-side as per requirements)
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Tab Filter
      if (activeTab === 'unread' && n.read_at) return false
      if (activeTab === 'archived' && !n.archived_at) return false
      if (activeTab === 'all' && n.archived_at) return false // Don't show archived in "all" tab

      // Client-side filtering by athlete/team/program/sport (if metadata available)
      // Note: This is client-side filtering as per requirements
      // Backend doesn't support these filters, so we filter what we have

      return true
    })
  }, [notifications, activeTab])

  // Grouping Logic
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; items: NotificationRecord[] }[] = []
    let lastDate = ''

    filteredNotifications.forEach(n => {
      const date = new Date(n.created_at)
      const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

      let label = dateStr
      if (dateStr === todayStr) label = 'Today'
      else if (dateStr === yesterdayStr) label = `Yesterday - ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
      else label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()

      if (label !== lastDate) {
        groups.push({ label, items: [] })
        lastDate = label
      }
      groups[groups.length - 1].items.push(n)
    })

    return groups
  }, [filteredNotifications])

  // Actions
  const handleMarkAllRead = async () => {
    const { data, error } = await notificationService.markAllAsRead(context)
    if (!error && data) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
      showSuccess('All notifications marked as read')
    } else if (error) {
      showError(error.message || 'Failed to mark all as read')
    }
  }

  const handleMarkRead = async (id: string) => {
    const { data, error } = await notificationService.markAsRead(context, id)
    if (!error && data) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    } else if (error) {
      showError(error.message || 'Failed to mark as read')
    }
  }

  const handleArchive = async (id: string) => {
    const { data, error } = await notificationService.archiveNotification(context, id)
    if (!error && data) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, archived_at: new Date().toISOString() } : n))
      showSuccess('Notification archived')
    } else if (error) {
      showError(error.message || 'Failed to archive notification')
    }
  }

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return
    await loadNotifications(nextCursor, true)
  }

  const handleToggle = (id: string, currentSet: Set<string>, setFunction: (s: Set<string>) => void) => {
    const next = new Set(currentSet)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setFunction(next)
  }

  const handleSelectAll = (items: any[], currentSet: Set<string>, setFunction: (s: Set<string>) => void) => {
    if (currentSet.size === items.length) {
      setFunction(new Set()) // Deselect all
    } else {
      setFunction(new Set(items.map(i => i.id))) // Select all
    }
  }

  const clearFilters = () => {
    setActiveTab('all')
    setFilterByType('all')
    if (athletes.length) setSelectedAthleteIds(new Set(athletes.map(a => a.id)))
    if (teams.length) setSelectedTeamIds(new Set(teams.map(t => t.id)))
    setSelectedProgramIds(new Set(programs.map(p => p.id)))
    setSelectedSportIds(new Set(sports.map(s => s.id)))
  }

  // Helper to get icon for notification
  const getIcon = (action: string) => {
    if (action.includes('event') || action.includes('schedule')) return 'calendar_today'
    if (action.includes('payment') || action.includes('fee')) return 'payments'
    if (action.includes('message') || action.includes('chat')) return 'chat_bubble'
    if (action.includes('game') || action.includes('score')) return 'leaderboard'
    return 'notifications' // default
  }

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const formatRelativeTime = (value: string) => {
    const created = new Date(value).getTime()
    const diffMs = Date.now() - created
    const minutes = Math.max(0, Math.floor(diffMs / 60000))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  const getStatusTag = (notification: NotificationRecord, isUnread: boolean) => {
    if (notification.archived_at) return { label: 'Archived', tone: 'muted' as const }
    if (isUnread) return { label: 'New', tone: 'accent' as const }
    if (notification.action.includes('payment')) return { label: 'Logged', tone: 'muted' as const }
    if (notification.action.includes('message')) return { label: 'Updated', tone: 'muted' as const }
    if (notification.action.includes('event')) return { label: 'Updated', tone: 'muted' as const }
    return { label: 'Info', tone: 'muted' as const }
  }

  if (!auth) return null
  if (auth.loading && !auth.user) return null
  if (!auth.user) return <Navigate to={getLink(RouteKeys.AUTH_LOGIN)} replace />
  if (!currentOrganization && !orgLoading) return null

  return (
    <NotificationErrorBoundary>
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Notifications' },
        ]}
      >
        <div className="mb-6 sm:mb-8">
          <PageTitle>Notifications</PageTitle>
          <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-light tracking-wide mt-1">
            Stay on top of team, athlete, and program updates.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-280px)] lg:min-h-[600px]">
        
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-[320px] lg:flex-shrink-0 flex flex-col border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[var(--org-link-color)] transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div 
                onClick={() => setFilterByType(filterByType === 'athlete' ? 'all' : 'athlete')}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  filterByType === 'athlete' 
                    ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-btn-primary-bg)]' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">person</span>
                  <span className="text-sm font-bold">By Athlete</span>
                </div>
                {filterByType === 'athlete' && <span className="material-symbols-outlined text-sm">check_circle</span>}
              </div>
              
              <div 
                onClick={() => setFilterByType(filterByType === 'team' ? 'all' : 'team')}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  filterByType === 'team' 
                    ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-btn-primary-bg)]' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">groups</span>
                  <span className="text-sm font-medium">By Team</span>
                </div>
                 {filterByType === 'team' && <span className="material-symbols-outlined text-sm">check_circle</span>}
              </div>

              <div 
                onClick={() => setFilterByType(filterByType === 'program' ? 'all' : 'program')}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  filterByType === 'program' 
                    ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-btn-primary-bg)]' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">category</span>
                  <span className="text-sm font-medium">By Program</span>
                </div>
                 {filterByType === 'program' && <span className="material-symbols-outlined text-sm">check_circle</span>}
              </div>

              <div 
                onClick={() => setFilterByType(filterByType === 'sport' ? 'all' : 'sport')}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  filterByType === 'sport' 
                    ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-btn-primary-bg)]' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">sports_basketball</span>
                  <span className="text-sm font-medium">By Sport</span>
                </div>
                 {filterByType === 'sport' && <span className="material-symbols-outlined text-sm">check_circle</span>}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {filterByType === 'athlete' && athletes.length > 0 && (
              <FilterSection 
                title="Active Athletes" 
                items={athletes.map(a => ({ id: a.id, name: `${a.first_name} ${a.last_name}` }))}
                selectedIds={selectedAthleteIds}
                onToggle={(id) => handleToggle(id, selectedAthleteIds, setSelectedAthleteIds)}
                onSelectAll={() => handleSelectAll(athletes, selectedAthleteIds, setSelectedAthleteIds)}
              />
            )}

            {filterByType === 'team' && teams.length > 0 && (
              <FilterSection 
                title="Active Teams" 
                items={teams.map(t => ({ id: t.id, name: t.name }))}
                selectedIds={selectedTeamIds}
                onToggle={(id) => handleToggle(id, selectedTeamIds, setSelectedTeamIds)}
                onSelectAll={() => handleSelectAll(teams, selectedTeamIds, setSelectedTeamIds)}
              />
            )}

            {filterByType === 'program' && (
              <FilterSection 
                title="Programs" 
                items={programs}
                selectedIds={selectedProgramIds}
                onToggle={(id) => handleToggle(id, selectedProgramIds, setSelectedProgramIds)}
                onSelectAll={() => handleSelectAll(programs, selectedProgramIds, setSelectedProgramIds)}
              />
            )}

            {filterByType === 'sport' && (
              <FilterSection 
                title="Sports" 
                items={sports}
                selectedIds={selectedSportIds}
                onToggle={(id) => handleToggle(id, selectedSportIds, setSelectedSportIds)}
                onSelectAll={() => handleSelectAll(sports, selectedSportIds, setSelectedSportIds)}
              />
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button 
              onClick={clearFilters}
              className="flex w-full items-center justify-center rounded-lg h-10 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </aside>

        {/* Notification Feed Content */}
        <section className="portal-notif-feed flex-1 min-w-0">
          <div className="portal-notif-feed__header">
            <div className="portal-notif-feed__heading">
              <p className="portal-notif-feed__micro">Family activity stream</p>
              <h2 className="portal-notif-feed__title">Notifications</h2>
              <p className="portal-notif-feed__subtitle">{filteredNotifications.length} updates</p>
            </div>
            <button
              onClick={handleMarkAllRead}
              className="portal-notif-feed__markall"
              disabled={notifications.every((n) => n.read_at)}
            >
              <span className="material-symbols-outlined">done_all</span>
              Mark all as read
            </button>
          </div>

          <div className="portal-notif-feed__tabs" role="tablist">
            {(['all', 'unread', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn('portal-notif-feed__tab', activeTab === tab && 'is-active')}
              >
                {tab === 'all' && 'All Activity'}
                {tab === 'unread' && 'Unread'}
                {tab === 'archived' && 'Archived'}
              </button>
            ))}
          </div>

          <div className="portal-notif-feed__list">
            {loading ? (
              <div className="portal-notif-feed__loading">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="portal-notif-feed__skeleton" />
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="portal-notif-feed__empty">
                <div className="portal-notif-feed__empty-icon">
                  <span className="material-symbols-outlined" aria-hidden>
                    notifications_off
                  </span>
                </div>
                <div>
                  <h3 className="portal-notif-feed__empty-title">No notifications found</h3>
                  <p className="portal-notif-feed__empty-copy">You are all caught up.</p>
                </div>
              </div>
            ) : (
              groupedNotifications.map((group) => (
                <div key={group.label} className="portal-notif-group">
                  {group.label !== 'Today' && (
                    <div className="portal-notif-group__header">
                      <span className="portal-notif-feed__micro">{group.label}</span>
                    </div>
                  )}
                  {group.items.map((notification) => {
                    const isUnread = !notification.read_at
                    const isArchived = Boolean(notification.archived_at)
                    const icon = getIcon(notification.action)
                    const statusTag = getStatusTag(notification, isUnread)
                    const metaLabel =
                      notification.role_context?.toUpperCase() ||
                      notification.action.replace(/_/g, ' ').toUpperCase()
                    return (
                      <article
                        key={notification.id}
                        className={cn(
                          'portal-notif-row',
                          isUnread && 'portal-notif-row--unread',
                          isArchived && 'portal-notif-row--archived'
                        )}
                      >
                        <div className="portal-notif-row__time">{formatTime(notification.created_at)}</div>
                        <div className="portal-notif-row__icon">
                          <span className="material-symbols-outlined portal-notif-row__icon-symbol">{icon}</span>
                          <span
                            className={cn(
                              'portal-notif-label',
                              statusTag.tone === 'accent'
                                ? 'portal-notif-label--accent'
                                : 'portal-notif-label--muted'
                            )}
                          >
                            {statusTag.label}
                          </span>
                        </div>
                        <div className="portal-notif-row__body">
                          <div className="portal-notif-row__title-line">
                            <h3 className="portal-notif-row__title">{notification.title}</h3>
                            {notification.presentation_type === 'urgent' && (
                              <span className="portal-notif-row__meta-chip">Urgent</span>
                            )}
                            {notification.role_context && (
                              <span className="portal-notif-row__meta-chip">{notification.role_context.toUpperCase()}</span>
                            )}
                          </div>
                          <p className="portal-notif-row__text">{notification.body}</p>
                          <div className="portal-notif-row__actions">
                            {notification.link_url && (
                              <Link to={notification.link_url} className="portal-notif-row__action-link">
                                View details
                                <span className="material-symbols-outlined portal-notif-row__action-icon">
                                  arrow_forward
                                </span>
                              </Link>
                            )}
                            {isUnread && (
                              <button
                                type="button"
                                className="portal-notif-row__action-button"
                                onClick={() => handleMarkRead(notification.id)}
                              >
                                Mark read
                              </button>
                            )}
                            {!notification.archived_at && activeTab !== 'archived' && (
                              <button
                                type="button"
                                className="portal-notif-row__action-button"
                                onClick={() => handleArchive(notification.id)}
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="portal-notif-row__meta">
                          <span className="portal-notif-row__meta-chip">{metaLabel}</span>
                          <span className="portal-notif-row__meta-time">{formatRelativeTime(notification.created_at)}</span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {isOffline && (
            <div className="portal-notif-feed__offline">
              <span className="material-symbols-outlined">wifi_off</span>
              <span>You're offline. Some features may be unavailable.</span>
            </div>
          )}

          {!loading && filteredNotifications.length > 0 && nextCursor && (
            <div className="portal-notif-feed__footer">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore || isOffline}
                className="portal-notif-feed__loadmore"
              >
                {loadingMore ? (
                  <>
                    <div className="portal-notif-feed__spinner" />
                    Loading...
                  </>
                ) : (
                  <>
                    Load Older Activity
                    <span className="material-symbols-outlined">expand_more</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        </div>
      </PortalLayout>
    </NotificationErrorBoundary>
  )
}

