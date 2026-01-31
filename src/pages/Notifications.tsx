import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead 
} from '../data/services/messagesService'
import { getAthletes } from '../data/services/familyService'
import { getTeamsForParent } from '../data/services/teamsService'
import { NotificationRecord } from '../types/notifications'
import PortalHeader from '../components/portal/PortalHeader'
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
    <div className="pt-5 border-t border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--org-btn-primary-bg)]" aria-hidden />
        {title}
      </h3>
      
      {/* Select All Option */}
      <button
        onClick={onSelectAll}
        className="flex items-center gap-3 w-full text-left cursor-pointer mb-3 pb-3 border-b border-gray-50 dark:border-slate-800/50 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all group"
      >
        <div className={cn(
          "w-5 h-5 rounded border flex items-center justify-center transition-all shadow-inner",
          isAllSelected 
            ? "bg-[var(--org-btn-primary-bg)] border-[var(--org-btn-primary-bg)] text-white" 
            : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 group-hover:border-[var(--org-btn-primary-bg)]"
        )}>
          {isAllSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-white">
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
                  : "border-transparent hover:border-[var(--org-btn-primary-bg)]/40 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:shadow-sm hover:translate-y-[-1px]"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded border flex items-center justify-center transition-all",
                isSelected 
                  ? "bg-[var(--org-btn-primary-bg)] border-[var(--org-btn-primary-bg)] text-white" 
                  : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 group-hover:border-[var(--org-btn-primary-bg)]"
              )}>
                {isSelected && <span className="material-symbols-outlined text-[14px] animate-in zoom-in">check</span>}
              </div>
              <span className={cn(
                "text-sm transition-colors",
                isSelected ? "font-bold text-[var(--org-btn-primary-bg)]" : "font-medium text-slate-700 dark:text-slate-300"
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

export default function Notifications() {
  const { context, isReady } = useUserContext()
  
  // State
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [athletes, setAthletes] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const programs = MOCK_PROGRAMS
  const sports = MOCK_SPORTS
  
  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all')
  const [filterByType, setFilterByType] = useState<'all' | 'athlete' | 'team' | 'program' | 'sport'>('all')
  
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<Set<string>>(new Set())
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set())
  const [selectedProgramIds, setSelectedProgramIds] = useState<Set<string>>(new Set())
  const [selectedSportIds, setSelectedSportIds] = useState<Set<string>>(new Set())
  
  // Data Fetching
  useEffect(() => {
    if (!isReady) return

    const loadData = async () => {
      setLoading(true)
      try {
        // Fetch Notifications
        const { data: notifs, error: notifError } = await getNotifications(context, 50) // Fetch reasonable limit
        if (notifError) throw notifError
        setNotifications(notifs || [])

        // Fetch Athletes for filters
        const { data: myAthletes } = await getAthletes(context)
        if (myAthletes) {
          setAthletes(myAthletes)
          // Default all selected
          setSelectedAthleteIds(new Set(myAthletes.map((a: any) => a.id)))
        }

        // Fetch Teams for filters (optional, but good for context)
        const { data: myTeams } = await getTeamsForParent(context)
        if (myTeams) {
          setTeams(myTeams)
          setSelectedTeamIds(new Set(myTeams.map((t: any) => t.id)))
        }

        // Init Mock Data Selections
        setSelectedProgramIds(new Set(MOCK_PROGRAMS.map(p => p.id)))
        setSelectedSportIds(new Set(MOCK_SPORTS.map(s => s.id)))

      } catch (err) {
        console.error('Error loading notifications page data:', err)
        showError('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [context, isReady])

  // Filtering Logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Tab Filter
      if (activeTab === 'unread' && n.read_at) return false
      if (activeTab === 'archived' && !n.read_at) return false // Assuming archived = read for now, or we could add an 'archived' state

      // TODO: Implement advanced filtering based on metadata if available
      // The current notification record doesn't strictly link to athlete_id in top level, 
      // typically it's in metadata or implied by team_id/user_id.
      // For this implementation, we will primarily filter by Tab as the backend support for athlete-filtering might be complex without specific metadata.

      return true
    })
  }, [notifications, activeTab, selectedAthleteIds /* filterByType */])

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

  const handleMarkRead = async (id: string) => {
    const { success } = await markNotificationRead(context, id)
    if (success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    }
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

  const getColorClass = (action: string) => {
    // Return text class
    if (action.includes('urgent')) return 'text-red-500'
    if (action.includes('payment')) return 'text-emerald-600'
    return 'text-[var(--org-btn-primary-bg)]'
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-white">
      <PortalHeader />
      
      <main className="max-w-[1400px] mx-auto flex flex-col lg:flex-row min-h-screen gap-6 p-6">
        
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-72 flex flex-col gap-6 bg-white dark:bg-slate-900 p-6 rounded-xl h-fit border border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Filters</h3>
            <div className="flex flex-col gap-2">
              <div 
                onClick={() => setFilterByType(filterByType === 'athlete' ? 'all' : 'athlete')}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  filterByType === 'athlete' 
                    ? 'bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-btn-primary-bg)]' 
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
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
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
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
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
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
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
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

          <button 
            onClick={clearFilters}
            className="mt-4 flex w-full items-center justify-center rounded-lg h-10 px-4 bg-gray-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            Clear All Filters
          </button>
        </aside>

        {/* Notification Feed Content */}
        <section className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          
          {/* Feed Header */}
          <div className="p-8 border-b border-gray-100 dark:border-slate-800 flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-slate-900 dark:text-white text-3xl sm:text-5xl font-black leading-none tracking-tight">Notifications</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                {filteredNotifications.length} updates
              </p>
            </div>
            <button 
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[var(--org-btn-primary-bg)] transition-colors mb-2"
            >
              <span className="material-symbols-outlined text-lg">done_all</span>
              Mark all as read
            </button>
          </div>

          {/* Tabs */}
          <div className="px-8 border-b border-gray-100 dark:border-slate-800">
            <div className="flex gap-10 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('all')}
                className={`border-b-4 py-4 text-sm font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'all' 
                    ? 'border-[var(--org-btn-primary-bg)] text-slate-900 dark:text-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Activity
              </button>
              <button 
                onClick={() => setActiveTab('unread')}
                className={`border-b-4 py-4 text-sm font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'unread' 
                    ? 'border-[var(--org-btn-primary-bg)] text-slate-900 dark:text-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Unread
              </button>
              <button 
                onClick={() => setActiveTab('archived')}
                className={`border-b-4 py-4 text-sm font-bold transition-colors whitespace-nowrap ${
                  activeTab === 'archived' 
                    ? 'border-[var(--org-btn-primary-bg)] text-slate-900 dark:text-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Archived
              </button>
            </div>
          </div>

          {/* Notification List (The Stream) */}
          <div className="flex flex-col min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center p-20">
                 <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--org-btn-primary-bg)]"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-20 text-center">
                 <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700 mb-4">notifications_off</span>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white">No notifications found</h3>
                 <p className="text-slate-500 mt-2">You're all caught up!</p>
               </div>
            ) : (
              groupedNotifications.map((group, groupIdx) => (
                <div key={groupIdx}>
                  {/* Date Header */}
                  {group.label !== 'Today' && (
                    <div className="bg-gray-50 dark:bg-slate-800/30 px-8 py-4 border-b border-gray-100 dark:border-slate-800">
                      <span className="tracking-[0.15em] text-xs font-bold text-slate-400 uppercase">{group.label}</span>
                    </div>
                  )}

                  {/* Items */}
                  {group.items.map((notification) => {
                    const timeStr = new Date(notification.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    const isUnread = !notification.read_at
                    
                    return (
                      <div 
                        key={notification.id} 
                        className={`group flex flex-col md:flex-row md:items-center p-8 border-b border-gray-100 dark:border-slate-800 transition-colors ${
                          isUnread ? 'bg-white dark:bg-slate-900' : 'bg-gray-50/50 dark:bg-slate-900/50'
                        } hover:bg-gray-50 dark:hover:bg-slate-800/50`}
                      >
                       <div className="flex items-start md:items-center w-full gap-4 md:gap-8">
                          
                          {/* Time Column */}
                          <div className="min-w-[100px] md:min-w-[120px] pt-1 md:pt-0">
                             <h2 className={`text-2xl md:text-3xl font-black tabular-nums whitespace-nowrap ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                               {timeStr}
                             </h2>
                          </div>

                          {/* Icon & Content Container */}
                          <div className="flex items-start gap-4 md:gap-6 flex-1">
                            
                            {/* Icon Column */}
                            <div className="flex flex-col items-center pt-1 md:pt-0">
                               <span className={`material-symbols-outlined text-3xl md:text-4xl font-light ${isUnread ? getColorClass(notification.action) : 'text-slate-400'}`}>
                                 {getIcon(notification.action)}
                               </span>
                               {isUnread && (
                                 <span className="tracking-[0.15em] text-[0.65rem] font-bold text-[var(--org-btn-primary-bg)] mt-1 uppercase">NEW</span>
                               )}
                            </div>

                            {/* Text Content */}
                            <div className={`flex flex-col ${!isUnread && 'opacity-60'}`}>
                               <div className="flex flex-wrap gap-2 items-center mb-1">
                                <h3 className={`text-lg md:text-xl font-bold ${isUnread ? 'text-slate-900 dark:text-white' : 'line-through text-slate-900 dark:text-white'}`}>
                                  {notification.title}
                                </h3>
                                {/* Mobile-only status chips could go here */}
                               </div>
                               <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm md:text-base">
                                  {notification.body}
                               </p>
                               {/* Actions */}
                               <div className="flex gap-4 mt-3">
                                 {notification.link_url && (
                                   <Link to={notification.link_url} className="text-sm font-bold text-[var(--org-link-color)] hover:underline flex items-center gap-1">
                                      View Details <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                   </Link>
                                 )}
                                 {/* Helper to mark as read if unread */}
                                 {isUnread && (
                                    <button 
                                      onClick={() => handleMarkRead(notification.id)}
                                      className="text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                      Dismiss
                                    </button>
                                 )}
                               </div>
                            </div>
                          </div>
              
                          {/* Desktop Meta Column */}
                          <div className="hidden md:flex flex-col items-end gap-2 min-w-[100px]">
                            {/* We don't always have a tag, but if we did: */}
                             {notification.role_context && (
                                <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-300 uppercase">
                                  {notification.role_context}
                                </span>
                             )}
                          </div>
                       </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Load More Footer - only if we have data */}
          {!loading && filteredNotifications.length > 0 && (
            <div className="p-8 flex justify-center">
              <button className="org-btn-secondary flex items-center gap-2 px-8 py-3 rounded-lg font-bold transition-all">
                  Load Older Activity
                  <span className="material-symbols-outlined">expand_more</span>
              </button>
            </div>
          )}
        </section>

      </main>

      {/* Help Center Sticky */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => window.open('/help', '_blank')}
          className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-xl rounded-full px-6 py-3 flex items-center gap-3 hover:scale-105 transition-transform"
        >
          <span className="material-symbols-outlined text-[var(--org-btn-primary-bg)]">contact_support</span>
          <span className="text-sm font-bold text-slate-900 dark:text-white">Help Center</span>
        </button>
      </div>
    </div>
  )
}
