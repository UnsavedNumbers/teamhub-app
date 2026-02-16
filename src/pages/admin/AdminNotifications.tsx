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
} from '../../components/admin'
import { AdminFilterPanel } from '../../components/platformAdmin'
import type { FilterSectionConfig } from '../../components/platformAdmin/AdminFilterPanel'
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
    case 'urgent': return 'oa-text-danger'
    case 'warning': return 'oa-text-warning'
    default: return 'oa-text-primary'
  }
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
    <div className="oa-root oa-bg-gray-50/30 dark:oa-bg-slate-950">
      <AdminPageHeader
        title="Notifications"
        subtitle="Stay informed about important updates and activities across your organization"
        actions={
          <div className="oa-flex oa-gap-3">
            <Link to="/admin/notifications/analytics">
              <Button variant="ghost" icon="analytics">
                Analytics
              </Button>
            </Link>
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

      <div className="oa-flex oa-flex-col lg:oa-flex-row oa-gap-6 oa-p-6">
          {/* Sidebar Filters - Completely Redesigned */}
          <aside className="oa-w-full lg:oa-w-80 oa-shrink-0">
              <div className="oa-sticky oa-top-6">
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
          <div className="oa-flex-1 oa-flex oa-flex-col oa-gap-8 oa-min-w-0">
            {loading ? (
                <div className="oa-flex oa-justify-center oa-items-center oa-py-20">
                    <div className="oa-flex oa-flex-col oa-items-center oa-gap-4">
                        <div className="oa-w-12 oa-h-12 oa-rounded-full oa-border-4 oa-border-gray-200 dark:oa-border-slate-800 oa-border-t-[var(--org-btn-primary-bg)] oa-animate-spin"></div>
                        <p className="oa-text-sm oa-text-slate-500 oa-font-medium">Loading notifications...</p>
                    </div>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <Card className="oa-border-2 oa-border-dashed">
                    <EmptyState 
                        icon="notifications_off" 
                        title="No Notifications Found" 
                        description="Try adjusting your filters to see more results, or check back later for new updates." 
                        noCard
                    />
                </Card>
            ) : (
                groupedNotifications.map((group, idx) => (
                    <div key={idx} className="oa-animate-in oa-fade-in oa-slide-in-from-bottom-2 oa-duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="oa-flex oa-items-center oa-gap-3 oa-mb-4">
                            <div className="oa-h-px oa-flex-1 oa-bg-gradient-to-r oa-from-transparent oa-via-gray-200 dark:oa-via-slate-700 oa-to-transparent"></div>
                            <h3 className="oa-text-xs oa-font-black oa-uppercase oa-tracking-[0.2em] oa-text-slate-500 dark:oa-text-slate-400 oa-px-3 oa-py-1 oa-bg-white dark:oa-bg-slate-900 oa-rounded-full oa-border oa-border-gray-200 dark:oa-border-slate-800">
                                {group.label}
                            </h3>
                            <div className="oa-h-px oa-flex-1 oa-bg-gradient-to-r oa-from-transparent oa-via-gray-200 dark:oa-via-slate-700 oa-to-transparent"></div>
                        </div>
                        <div className="oa-flex oa-flex-col oa-gap-3">
                            {group.items.map((notification, nIdx) => {
                                const isUnread = !notification.read_at
                                const icon = getIcon(notification.action)
                                getPresentationColor(notification.presentation_type)

                                return (
                                    <Card 
                                        key={notification.id} 
                                        
                                        className={cn(
                                            'oa-group oa-transition-all oa-duration-200 oa-cursor-pointer hover:oa-shadow-lg hover:oa-translate-y-[-2px]',
                                            isUnread 
                                                ? 'oa-border-l-4 oa-border-l-[var(--org-btn-primary-bg)] oa-bg-gradient-to-r oa-from-[var(--org-btn-primary-bg)]/5 oa-to-transparent' 
                                                : 'oa-opacity-90 hover:oa-opacity-100'
                                        )}
                                        style={{ animationDelay: `${(idx * 50) + (nIdx * 30)}ms` }}
                                    >
                                        <div className="oa-p-5 sm:oa-p-6 oa-flex oa-flex-col sm:oa-flex-row oa-gap-4 sm:oa-items-start">
                                            {/* Icon with gradient background */}
                                            <div className={cn(
                                                "oa-relative oa-flex oa-items-center oa-justify-center oa-w-14 oa-h-14 oa-rounded-2xl oa-shrink-0 oa-transition-transform oa-duration-200 group-hover:oa-scale-110",
                                                isUnread 
                                                    ? "oa-bg-gradient-to-br oa-from-[var(--org-btn-primary-bg)] oa-to-[#7dd3fc] oa-shadow-lg oa-shadow-[var(--org-btn-primary-bg)]/20" 
                                                    : "oa-bg-gray-100 dark:oa-bg-slate-800"
                                            )}>
                                                {isUnread && (
                                                    <div className="oa-absolute oa-inset-0 oa-rounded-2xl oa-bg-gradient-to-br oa-from-white/20 oa-to-transparent"></div>
                                                )}
                                                <span className={cn(
                                                    "material-symbols-outlined oa-text-2xl oa-relative oa-z-10",
                                                    isUnread ? "oa-text-white" : "oa-text-slate-400"
                                                )}>
                                                    {icon}
                                                </span>
                                            </div>

                                            {/* Content */}
                                            <div className="oa-flex-1 oa-min-w-0">
                                                <div className="oa-flex oa-flex-wrap oa-items-center oa-gap-2 oa-mb-2">
                                                    <h4 className={cn(
                                                        "oa-text-base oa-font-bold oa-leading-tight",
                                                        isUnread ? "oa-text-slate-900 dark:oa-text-white" : "oa-text-slate-600 dark:oa-text-slate-400"
                                                    )}>
                                                        {notification.title}
                                                    </h4>
                                                    {isUnread && (
                                                        <span className="oa-inline-flex oa-items-center oa-gap-1 oa-px-2 oa-py-0.5 oa-bg-[var(--org-btn-primary-bg)] oa-text-white oa-text-[10px] oa-font-black oa-uppercase oa-tracking-wider oa-rounded-md oa-shadow-sm oa-animate-in oa-zoom-in">
                                                            <span className="oa-w-1.5 oa-h-1.5 oa-rounded-full oa-bg-white oa-animate-pulse"></span>
                                                            NEW
                                                        </span>
                                                    )}
                                                    {notification.presentation_type === 'urgent' && (
                                                        <Badge variant="danger" className="oa-animate-pulse">URGENT</Badge>
                                                    )}
                                                    {notification.role_context && (
                                                        <Badge variant="neutral" className="oa-text-[10px]">
                                                            {notification.role_context.toUpperCase()}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="oa-text-sm oa-text-slate-600 dark:oa-text-slate-300 oa-leading-relaxed oa-mb-3">
                                                    {notification.body}
                                                </p>
                                                <div className="oa-flex oa-flex-wrap oa-items-center oa-gap-4">
                                                    <div className="oa-flex oa-items-center oa-gap-1.5 oa-text-xs oa-text-slate-400">
                                                        <span className="material-symbols-outlined oa-text-[14px]">schedule</span>
                                                        {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    {notification.link_url && (
                                                        <Link 
                                                            to={notification.link_url} 
                                                            className="oa-inline-flex oa-items-center oa-gap-1 oa-text-xs oa-font-bold oa-text-[var(--org-btn-primary-bg)] hover:oa-underline oa-transition-colors"
                                                        >
                                                            View Details 
                                                            <span className="material-symbols-outlined oa-text-[14px] group-hover:oa-translate-x-1 oa-transition-transform">arrow_forward</span>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="oa-flex oa-items-start oa-gap-2">
                                                {isUnread && (
                                                    <button
                                                        onClick={(e) => handleMarkRead(notification.id, e)}
                                                        className="oa-inline-flex oa-items-center oa-gap-1.5 oa-px-3 oa-py-2 oa-text-xs oa-font-bold oa-text-slate-600 dark:oa-text-slate-300 hover:oa-text-[var(--org-btn-primary-bg)] oa-bg-white dark:oa-bg-slate-800 oa-border oa-border-gray-200 dark:oa-border-slate-700 oa-rounded-lg hover:oa-border-[var(--org-btn-primary-bg)] hover:oa-shadow-sm oa-transition-all"
                                                    >
                                                        <span className="material-symbols-outlined oa-text-[16px]">done</span>
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

