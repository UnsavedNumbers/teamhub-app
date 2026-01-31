import { useState, useEffect, useMemo, useRef } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { Link } from 'react-router-dom'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../data/services/messagesService'
import { NotificationRecord } from '../../types/notifications'
import {
  AdminPageHeader,
  Card,
  Button,
  Badge,
  EmptyState,
  AdminFilterPanel,
} from '../../components/platformAdmin'
import { showSuccess, showError } from '../../utils/toast'
import { cn } from '../../utils/cn'
import { getTeams } from '../../data/services/teamsService'
import '../../styles/orgAdmin.css'

// Helper to get icon for notification
const getIcon = (action: string) => {
  if (action.includes('event') || action.includes('schedule')) return 'calendar_today'
  if (action.includes('payment') || action.includes('fee')) return 'payments'
  if (action.includes('message') || action.includes('chat')) return 'chat_bubble'
  if (action.includes('game') || action.includes('score')) return 'leaderboard'
  return 'notifications' // default
}

const getPresentationColor = (presentation: string) => {
  switch (presentation) {
    case 'urgent': return 'pa-text-danger'
    case 'warning': return 'pa-text-warning'
    default: return 'pa-text-primary'
  }
}

type FilterSectionConfig = {
  id: string
  title: string
  layout?: string
  items: { id: string; label: string; icon?: string; count?: number }[]
  multiSelect?: boolean
  searchable?: boolean
}

const STATIC_SECTIONS: FilterSectionConfig[] = [
    {
        id: 'status',
        title: 'Status',
        layout: 'pills',
        items: [
            { id: 'unread', label: 'Unread', icon: 'mark_email_unread' },
            { id: 'read', label: 'Read/Archived', icon: 'archive' }
        ],
        multiSelect: true
    },
    {
        id: 'type',
        title: 'Notification Type',
        layout: 'pills',
        items: [
            { id: 'payment', label: 'Payments', icon: 'payments' },
            { id: 'event', label: 'Events/Schedule', icon: 'calendar_today' },
            { id: 'message', label: 'Messages', icon: 'chat' },
            { id: 'general', label: 'General', icon: 'info' }
        ],
        multiSelect: true
    },
    {
        id: 'role',
        title: 'Target Role',
        layout: 'pills',
        items: [
            { id: 'guardian', label: 'Guardian', icon: 'face' },
            { id: 'coach', label: 'Coach', icon: 'sports_whistle' },
            { id: 'org_admin', label: 'Admin', icon: 'admin_panel_settings' }
        ],
        multiSelect: true
    }
]

export default function AdminNotifications() {
  const { context, isReady } = useUserContext()
  const isMountedRef = useRef(true)

  // State
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')
  
  // Filter State
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Set<string>>>({})

  // Count helpers for richer filter chips
  const statusCounts = useMemo(() => ({
    unread: notifications.filter((n) => !n.read_at).length,
    read: notifications.filter((n) => !!n.read_at).length,
  }), [notifications])

  const typeCounts = useMemo(() => {
    const base = { payment: 0, event: 0, message: 0, general: 0 }
    notifications.forEach((n) => {
      if (n.action.includes('payment') || n.action.includes('fee')) base.payment += 1
      else if (n.action.includes('event') || n.action.includes('schedule')) base.event += 1
      else if (n.action.includes('message')) base.message += 1
      else base.general += 1
    })
    return base
  }, [notifications])

  const roleCounts = useMemo(() => {
    const base: Record<string, number> = { guardian: 0, coach: 0, org_admin: 0 }
    notifications.forEach((n) => {
      if (n.role_context && base[n.role_context] !== undefined) {
        base[n.role_context] += 1
      }
    })
    return base
  }, [notifications])

  // Clean up
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Data Fetching
  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: notifs, error: notifError } = await getNotifications(context, 100)
      if (notifError) throw notifError
      if (isMountedRef.current) setNotifications(notifs || [])

      const { data: teamData } = await getTeams(context, { activeOnly: true })
      if (isMountedRef.current && teamData) {
        setTeams(teamData)
        
        // Initialize Filters (Empty by default - chips unselected)
        const initialFilters: Record<string, Set<string>> = {}
        
        // Teams - empty
        initialFilters['teams'] = new Set()
        
        // Static Sections - empty
        STATIC_SECTIONS.forEach(section => {
            initialFilters[section.id] = new Set()
        })
        
        setSelectedFilters(initialFilters)
      }
    } catch (err) {
      console.error('Error loading admin notifications', err)
      showError('Failed to load notifications')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (isReady) fetchData()
  }, [isReady, context])

  // Filter Logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
        if (searchText && !(n.title?.toLowerCase().includes(searchText.toLowerCase()) || n.body?.toLowerCase().includes(searchText.toLowerCase()))) {
            return false
        }
        // Status Filter (only apply if something selected)
        const statusSet = selectedFilters['status']
        if (statusSet && statusSet.size > 0) {
          const isUnread = !n.read_at
          const statusKey = isUnread ? 'unread' : 'read'
          if (!statusSet.has(statusKey)) return false
        }
        
        // Team Filter
        const teamSet = selectedFilters['teams']
        if (teamSet && teamSet.size > 0 && n.team_id && !teamSet.has(n.team_id)) return false

        // Type Filter
        const typeSet = selectedFilters['type']
        if (typeSet && typeSet.size > 0) {
            let typeKey = 'general'
            if (n.action.includes('payment') || n.action.includes('fee')) typeKey = 'payment'
            else if (n.action.includes('event') || n.action.includes('schedule')) typeKey = 'event'
            else if (n.action.includes('message')) typeKey = 'message'
            
            if (!typeSet.has(typeKey)) return false
        }

        // Role Filter
        const roleSet = selectedFilters['role']
        if (roleSet && roleSet.size > 0 && n.role_context && !roleSet.has(n.role_context)) return false

        return true
    })
  }, [notifications, selectedFilters, searchText])

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
      else if (dateStr === yesterdayStr) label = `Yesterday — ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
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
    const { success } = await markAllNotificationsRead(context)
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })))
      showSuccess('All notifications marked as read')
    }
  }

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const { success } = await markNotificationRead(context, id)
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    }
  }
  
  const handleFilterChange = (sectionId: string, values: Set<string>) => {
      setSelectedFilters(prev => ({
          ...prev,
          [sectionId]: values
      }))
  }
  
  const handleClearFilters = () => {
      setSelectedFilters({})
  }

  // Filter Config
  const filterSections: FilterSectionConfig[] = useMemo(() => {
      const enrichedStatic = STATIC_SECTIONS.map((section) => {
        if (section.id === 'status') {
          return {
            ...section,
            items: section.items.map((item: { id: string; label: string; icon?: string }) => ({
              ...item,
              count: statusCounts[item.id as keyof typeof statusCounts],
            })),
          }
        }
        if (section.id === 'type') {
          return {
            ...section,
            items: section.items.map((item: { id: string; label: string; icon?: string }) => ({
              ...item,
              count: typeCounts[item.id as keyof typeof typeCounts],
            })),
          }
        }
        if (section.id === 'role') {
          return {
            ...section,
            items: section.items.map((item: { id: string; label: string; icon?: string }) => ({
              ...item,
              count: roleCounts[item.id] || 0,
            })),
          }
        }
        return section
      })

      return [
        ...enrichedStatic,
        {
            id: 'teams',
            title: 'Teams',
            items: teams.map(t => ({ id: t.id, label: t.name, count: notifications.filter(n => n.team_id === t.id).length })),
            searchable: true,
            multiSelect: true
        }
      ]
  }, [teams, notifications, statusCounts, typeCounts, roleCounts])

  return (
    <div className="pa-root pa-bg-gray-50/30 dark:pa-bg-slate-950">
      <AdminPageHeader
        title="Notifications"
        subtitle="Stay informed about important updates and activities across your organization"
        actions={
          <div className="pa-flex pa-gap-3">
            <Link to="/admin/settings">
                 <Button variant="ghost" icon="settings">
                    Settings
                 </Button>
            </Link>
            <Button 
                variant="secondary" 
                onClick={handleMarkAllRead} 
                icon="done_all"
                disabled={notifications.every(n => n.read_at)}
            >
                Mark all as read
            </Button>
          </div>
        }
      />

      <div className="pa-flex pa-flex-col lg:pa-flex-row pa-gap-6 pa-p-6">
          {/* Sidebar Filters - Completely Redesigned */}
          <aside className="pa-w-full lg:pa-w-80 pa-shrink-0">
              <div className="pa-sticky pa-top-6">
                  <AdminFilterPanel 
                  sections={filterSections}
                  selectedValues={selectedFilters}
                  onSelectionChange={handleFilterChange}
                  onClearAll={handleClearFilters}
                  resultCount={filteredNotifications.length}
                  searchValue={searchText}
                  onSearchChange={setSearchText}
              />
              </div>
          </aside>

          {/* Content - Enhanced Cards */}
          <div className="pa-flex-1 pa-flex pa-flex-col pa-gap-8 pa-min-w-0">
            {loading ? (
                <div className="pa-flex pa-justify-center pa-items-center pa-py-20">
                    <div className="pa-flex pa-flex-col pa-items-center pa-gap-4">
                        <div className="pa-w-12 pa-h-12 pa-rounded-full pa-border-4 pa-border-gray-200 dark:pa-border-slate-800 pa-border-t-[var(--org-btn-primary-bg)] pa-animate-spin"></div>
                        <p className="pa-text-sm pa-text-slate-500 pa-font-medium">Loading notifications...</p>
                    </div>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <Card className="pa-border-2 pa-border-dashed">
                    <EmptyState 
                        icon="notifications_off" 
                        title="No Notifications Found" 
                        description="Try adjusting your filters to see more results, or check back later for new updates." 
                        noCard
                    />
                </Card>
            ) : (
                groupedNotifications.map((group, idx) => (
                    <div key={idx} className="pa-animate-in pa-fade-in pa-slide-in-from-bottom-2 pa-duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="pa-flex pa-items-center pa-gap-3 pa-mb-4">
                            <div className="pa-h-px pa-flex-1 pa-bg-gradient-to-r pa-from-transparent pa-via-gray-200 dark:pa-via-slate-700 pa-to-transparent"></div>
                            <h3 className="pa-text-xs pa-font-black pa-uppercase pa-tracking-[0.2em] pa-text-slate-500 dark:pa-text-slate-400 pa-px-3 pa-py-1 pa-bg-white dark:pa-bg-slate-900 pa-rounded-full pa-border pa-border-gray-200 dark:pa-border-slate-800">
                                {group.label}
                            </h3>
                            <div className="pa-h-px pa-flex-1 pa-bg-gradient-to-r pa-from-transparent pa-via-gray-200 dark:pa-via-slate-700 pa-to-transparent"></div>
                        </div>
                        <div className="pa-flex pa-flex-col pa-gap-3">
                            {group.items.map((notification, nIdx) => {
                                const isUnread = !notification.read_at
                                const icon = getIcon(notification.action)
                                getPresentationColor(notification.presentation_type)

                                return (
                                    <Card 
                                        key={notification.id} 
                                        noPadding 
                                        className={cn(
                                            'pa-group pa-transition-all pa-duration-200 pa-cursor-pointer hover:pa-shadow-lg hover:pa-translate-y-[-2px]',
                                            isUnread 
                                                ? 'pa-border-l-4 pa-border-l-[var(--org-btn-primary-bg)] pa-bg-gradient-to-r pa-from-[var(--org-btn-primary-bg)]/5 pa-to-transparent' 
                                                : 'pa-opacity-90 hover:pa-opacity-100'
                                        )}
                                        style={{ animationDelay: `${(idx * 50) + (nIdx * 30)}ms` }}
                                    >
                                        <div className="pa-p-5 sm:pa-p-6 pa-flex pa-flex-col sm:pa-flex-row pa-gap-4 sm:pa-items-start">
                                            {/* Icon with gradient background */}
                                            <div className={cn(
                                                "pa-relative pa-flex pa-items-center pa-justify-center pa-w-14 pa-h-14 pa-rounded-2xl pa-shrink-0 pa-transition-transform pa-duration-200 group-hover:pa-scale-110",
                                                isUnread 
                                                    ? "pa-bg-gradient-to-br pa-from-[var(--org-btn-primary-bg)] pa-to-[#7dd3fc] pa-shadow-lg pa-shadow-[var(--org-btn-primary-bg)]/20" 
                                                    : "pa-bg-gray-100 dark:pa-bg-slate-800"
                                            )}>
                                                {isUnread && (
                                                    <div className="pa-absolute pa-inset-0 pa-rounded-2xl pa-bg-gradient-to-br pa-from-white/20 pa-to-transparent"></div>
                                                )}
                                                <span className={cn(
                                                    "material-symbols-outlined pa-text-2xl pa-relative pa-z-10",
                                                    isUnread ? "pa-text-white" : "pa-text-slate-400"
                                                )}>
                                                    {icon}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="pa-flex-1 pa-min-w-0">
                                                <div className="pa-flex pa-flex-wrap pa-items-center pa-gap-2 pa-mb-2">
                                                    <h4 className={cn(
                                                        "pa-text-base pa-font-bold pa-leading-tight",
                                                        isUnread ? "pa-text-slate-900 dark:pa-text-white" : "pa-text-slate-600 dark:pa-text-slate-400"
                                                    )}>
                                                        {notification.title}
                                                    </h4>
                                                    {isUnread && (
                                                        <span className="pa-inline-flex pa-items-center pa-gap-1 pa-px-2 pa-py-0.5 pa-bg-[var(--org-btn-primary-bg)] pa-text-white pa-text-[10px] pa-font-black pa-uppercase pa-tracking-wider pa-rounded-md pa-shadow-sm pa-animate-in pa-zoom-in">
                                                            <span className="pa-w-1.5 pa-h-1.5 pa-rounded-full pa-bg-white pa-animate-pulse"></span>
                                                            NEW
                                                        </span>
                                                    )}
                                                    {notification.presentation_type === 'urgent' && (
                                                        <Badge variant="danger" className="pa-animate-pulse">URGENT</Badge>
                                                    )}
                                                    {notification.role_context && (
                                                        <Badge variant="neutral" className="pa-text-[10px]">
                                                            {notification.role_context.toUpperCase()}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="pa-text-sm pa-text-slate-600 dark:pa-text-slate-300 pa-leading-relaxed pa-mb-3">
                                                    {notification.body}
                                                </p>
                                                <div className="pa-flex pa-flex-wrap pa-items-center pa-gap-4">
                                                    <div className="pa-flex pa-items-center pa-gap-1.5 pa-text-xs pa-text-slate-400">
                                                        <span className="material-symbols-outlined pa-text-[14px]">schedule</span>
                                                        {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    {notification.link_url && (
                                                        <Link 
                                                            to={notification.link_url} 
                                                            className="pa-inline-flex pa-items-center pa-gap-1 pa-text-xs pa-font-bold pa-text-[var(--org-btn-primary-bg)] hover:pa-underline pa-transition-colors"
                                                        >
                                                            View Details 
                                                            <span className="material-symbols-outlined pa-text-[14px] group-hover:pa-translate-x-1 pa-transition-transform">arrow_forward</span>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="pa-flex pa-items-start pa-gap-2">
                                                {isUnread && (
                                                    <button
                                                        onClick={(e) => handleMarkRead(notification.id, e)}
                                                        className="pa-inline-flex pa-items-center pa-gap-1.5 pa-px-3 pa-py-2 pa-text-xs pa-font-bold pa-text-slate-600 dark:pa-text-slate-300 hover:pa-text-[var(--org-btn-primary-bg)] pa-bg-white dark:pa-bg-slate-800 pa-border pa-border-gray-200 dark:pa-border-slate-700 pa-rounded-lg hover:pa-border-[var(--org-btn-primary-bg)] hover:pa-shadow-sm pa-transition-all"
                                                    >
                                                        <span className="material-symbols-outlined pa-text-[16px]">done</span>
                                                        Dismiss
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>
                ))
            )}
          </div>
      </div>
    </div>
  )
}
