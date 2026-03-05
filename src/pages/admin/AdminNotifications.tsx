import { useState, useEffect, useMemo, useRef } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { Link } from 'react-router-dom'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../data/services/userNotificationsService'
import { NotificationRecord } from '../../types/notifications'
import {
  AdminPageHeader,
  Button,
  Badge,
} from '../../components/admin'
import { showSuccess, showError } from '../../utils/toast'
import { cn } from '../../utils/cn'
import { getTeams } from '../../data/services/teamsService'
import '../../styles/orgAdmin.css'

interface FilterItem {
  id: string
  label: string
  count?: number
  icon?: string
}

interface FilterSectionConfig {
  id: string
  title: string
  items: FilterItem[]
  searchable?: boolean
  multiSelect?: boolean
  layout?: 'list' | 'pills' | 'grid'
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
  const filterCloseTimeoutRef = useRef<number | null>(null)

  // State
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [filtersClosing, setFiltersClosing] = useState(false)
  const [sectionSearchQueries, setSectionSearchQueries] = useState<Record<string, string>>({})
  
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

  const activeFilterCount = useMemo(
    () => Object.values(selectedFilters).reduce((count, selection) => count + (selection?.size ?? 0), 0),
    [selectedFilters]
  )

  // Clean up
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (filterCloseTimeoutRef.current !== null) {
        window.clearTimeout(filterCloseTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!filtersVisible) return undefined
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseFilters()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filtersVisible])

  const handleOpenFilters = () => {
    if (filterCloseTimeoutRef.current !== null) {
      window.clearTimeout(filterCloseTimeoutRef.current)
      filterCloseTimeoutRef.current = null
    }
    setFiltersVisible(true)
    setFiltersClosing(false)
    requestAnimationFrame(() => {
      setFiltersOpen(true)
    })
  }

  const handleCloseFilters = () => {
    setFiltersOpen(false)
    setFiltersClosing(true)
    if (filterCloseTimeoutRef.current !== null) {
      window.clearTimeout(filterCloseTimeoutRef.current)
    }
    filterCloseTimeoutRef.current = window.setTimeout(() => {
      setFiltersVisible(false)
      setFiltersClosing(false)
      filterCloseTimeoutRef.current = null
    }, 260)
  }

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
        if (activeTab === 'unread' && n.read_at) return false
        if (activeTab === 'archived' && !n.archived_at) return false
        if (activeTab !== 'archived' && activeTab !== 'all' && n.archived_at) return false
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
  }, [notifications, selectedFilters, searchText, activeTab])

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

  const toggleFilterItem = (sectionId: string, itemId: string) => {
      const current = selectedFilters[sectionId] || new Set<string>()
      const next = new Set(current)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      handleFilterChange(sectionId, next)
  }

  const handleSectionSearch = (sectionId: string, query: string) => {
      setSectionSearchQueries((prev) => ({
          ...prev,
          [sectionId]: query,
      }))
  }
  
  const handleClearFilters = () => {
      const resetFilters: Record<string, Set<string>> = { teams: new Set() }
      STATIC_SECTIONS.forEach((section) => {
        resetFilters[section.id] = new Set()
      })
      setSelectedFilters(resetFilters)
      setSectionSearchQueries({})
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
    <div className="oa-root">
      <AdminPageHeader
        breadcrumbs={[{ label: 'Notifications' }]}
        title="Notifications"
        subtitle="Stay informed about important updates and activities across your organization"
        actions={
          <div className="oa-flex oa-gap-3">
            <Link to="/admin/notifications/analytics">
              <Button variant="ghost" icon="analytics">
                Analytics
              </Button>
            </Link>
            <Link to="/admin/organization?tab=notifications">
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

      <div className="oa-p-6">
        <section className="oa-notif-feed oa-card">
          <div className="oa-notif-feed__toolbar">
            <div className="oa-notif-feed__toolbar-meta">
              <span className="oa-notif-feed__toolbar-count">{filteredNotifications.length} updates</span>
              {activeFilterCount > 0 && (
                <span className="oa-notif-feed__toolbar-filter-count">{activeFilterCount} active filters</span>
              )}
            </div>
            <Button
              variant="ghost"
              icon="tune"
              onClick={handleOpenFilters}
            >
              Filters
            </Button>
          </div>

          <div className="oa-notif-feed__tabs" role="tablist">
            {(['all', 'unread', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn('oa-notif-feed__tab', activeTab === tab && 'is-active')}
              >
                {tab === 'all' && 'All Activity'}
                {tab === 'unread' && 'Unread'}
                {tab === 'archived' && 'Archived'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="oa-notif-feed__loading">
              {[1, 2, 3].map((i) => (
                <div key={i} className="oa-notif-feed__skeleton" />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="oa-notif-feed__empty">
              <div className="oa-notif-feed__empty-icon">
                <span className="material-symbols-outlined" aria-hidden>
                  notifications_off
                </span>
              </div>
              <div>
                <h3 className="oa-notif-feed__empty-title">No notifications found</h3>
                <p className="oa-notif-feed__empty-copy">Try adjusting your filters or check back later.</p>
              </div>
            </div>
          ) : (
            <div className="oa-notif-feed__list">
              {groupedNotifications.map((group) => (
                <div key={group.label} className="oa-notif-group">
                  {group.label !== 'Today' && (
                    <div className="oa-notif-group__header">
                      <span className="oa-notif-feed__micro">{group.label}</span>
                    </div>
                  )}
                  {group.items.map((notification) => {
                    const isUnread = !notification.read_at
                    const isArchived = Boolean(notification.archived_at)
                    const icon = getIcon(notification.action)
                    const statusTag = getStatusTag(notification, isUnread)
                    return (
                      <article
                        key={notification.id}
                        className={cn(
                          'oa-notif-row',
                          isUnread && 'oa-notif-row--unread',
                          isArchived && 'oa-notif-row--archived'
                        )}
                      >
                        <div className="oa-notif-row__time">{formatTime(notification.created_at)}</div>
                        <div className="oa-notif-row__icon">
                          <span className={cn('material-symbols-outlined', 'oa-notif-row__icon-symbol')}>
                            {icon}
                          </span>
                          <span
                            className={cn(
                              'oa-notif-label',
                              statusTag.tone === 'accent' ? 'oa-notif-label--accent' : 'oa-notif-label--muted'
                            )}
                          >
                            {statusTag.label}
                          </span>
                        </div>
                        <div className="oa-notif-row__body">
                          <div className="oa-notif-row__title-line">
                            <h3 className="oa-notif-row__title">{notification.title}</h3>
                            {notification.presentation_type === 'urgent' && <Badge variant="danger">Urgent</Badge>}
                            {isUnread && <Badge variant="info">New</Badge>}
                          </div>
                          <p className="oa-notif-row__text">{notification.body}</p>
                        </div>
                        <div className="oa-notif-row__meta">
                          <div className="oa-notif-row__actions oa-notif-row__actions--meta">
                            {notification.link_url && (
                              <Link to={notification.link_url} className="oa-notif-row__action-link">
                                View details
                                <span className="material-symbols-outlined oa-notif-row__action-icon">
                                  arrow_forward
                                </span>
                              </Link>
                            )}
                            {isUnread && (
                              <button
                                type="button"
                                className="oa-notif-row__action-button"
                                onClick={(e) => handleMarkRead(notification.id, e)}
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <span className="oa-notif-row__meta-time">{formatRelativeTime(notification.created_at)}</span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {filtersVisible && (
        <div className={cn('oa-notif-filters-overlay', filtersOpen && 'is-open', filtersClosing && 'is-closing')}>
          <button
            type="button"
            className="oa-notif-filters-overlay__backdrop"
            aria-label="Close filters"
            onClick={handleCloseFilters}
          />
          <section
            className={cn('oa-slideout-container oa-notif-filters-slideout', filtersOpen && 'is-open')}
            aria-modal="true"
            aria-labelledby="admin-notification-filters-title"
            role="dialog"
          >
            <div className="oa-slideout-header">
              <div className="oa-slideout-brand">
                <div className="oa-slideout-pill" aria-hidden />
                <span id="admin-notification-filters-title" className="oa-slideout-title">Filters</span>
              </div>
              <button
                type="button"
                onClick={handleCloseFilters}
                className="oa-header-btn"
                aria-label="Close filters"
              >
                <span className="material-symbols-outlined" aria-hidden>close</span>
              </button>
            </div>

            <div className="oa-slideout-body oa-notif-filters-slideout__body">
              <div className="oa-notif-filters-slideout__intro">
                <p className="oa-notif-filters-slideout__eyebrow">Notification filters</p>
                <h2 className="oa-notif-filters-slideout__heading">Refine the feed</h2>
                <p className="oa-notif-filters-slideout__copy">
                  Narrow the activity stream by status, type, role, team, or search.
                </p>
              </div>

              <div className="oa-notif-filters-panel__section">
                <label className="oa-notif-filters-panel__section-title" htmlFor="admin-notifications-search">
                  Search
                </label>
                <div className="oa-notif-filters-panel__search">
                  <span className="material-symbols-outlined oa-notif-filters-panel__search-icon" aria-hidden>
                    search
                  </span>
                  <input
                    id="admin-notifications-search"
                    type="text"
                    className="oa-notif-filters-panel__search-input"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search notifications"
                  />
                </div>
              </div>

              {filterSections.map((section) => {
                const sectionQuery = sectionSearchQueries[section.id] || ''
                const selected = selectedFilters[section.id] || new Set<string>()
                const visibleItems = section.items.filter((item) =>
                  !sectionQuery || item.label.toLowerCase().includes(sectionQuery.toLowerCase())
                )

                return (
                  <div key={section.id} className="oa-notif-filters-panel__section">
                    <div className="oa-notif-filters-panel__section-header">
                      <span className="oa-notif-filters-panel__section-title">{section.title}</span>
                      <span className="oa-notif-filters-panel__section-count">{selected.size} selected</span>
                    </div>

                    {section.searchable && (
                      <div className="oa-notif-filters-panel__search oa-notif-filters-panel__search--section">
                        <span className="material-symbols-outlined oa-notif-filters-panel__search-icon" aria-hidden>
                          search
                        </span>
                        <input
                          type="text"
                          className="oa-notif-filters-panel__search-input"
                          value={sectionQuery}
                          onChange={(event) => handleSectionSearch(section.id, event.target.value)}
                          placeholder={`Search ${section.title.toLowerCase()}`}
                        />
                      </div>
                    )}

                    <div className="oa-notif-filters-panel__chips">
                      {visibleItems.map((item) => {
                        const isSelected = selected.has(item.id)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={cn(
                              'oa-notif-filters-panel__chip',
                              isSelected && 'is-selected'
                            )}
                            onClick={() => toggleFilterItem(section.id, item.id)}
                          >
                            {item.icon && (
                              <span className="material-symbols-outlined oa-notif-filters-panel__chip-icon" aria-hidden>
                                {item.icon}
                              </span>
                            )}
                            <span>{item.label}</span>
                            {item.count !== undefined && (
                              <span className="oa-notif-filters-panel__chip-count">{item.count}</span>
                            )}
                          </button>
                        )
                      })}
                      {visibleItems.length === 0 && (
                        <p className="oa-notif-filters-panel__empty">No matching filters.</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="oa-slideout-footer oa-notif-filters-slideout__footer">
              <Button variant="ghost" onClick={handleClearFilters}>
                Clear filters
              </Button>
              <Button variant="primary" onClick={handleCloseFilters}>
                Apply
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

