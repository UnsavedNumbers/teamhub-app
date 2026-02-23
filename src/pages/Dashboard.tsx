import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useUserContext } from '../hooks/useUserContext'
import {
  getSetupOrganizationFlag,
  clearSetupOrganizationFlag,
} from '../utils/setupOrganization'
import {
  getAnnouncements,
  type Announcement,
} from '../data/services/messagesService'
import { notificationService } from '../data/services/notificationService'
import {
  getUpcomingEventsForUser,
} from '../data/services/eventsService'
import {
  getUnpaidFeeAssignments,
} from '../data/services/paymentsService'
import { getTeamsForParent } from '../data/services/teamsService'
import { getPrimarySportForUser, getSportFromEvent, type SportInfo } from '../utils/sportContext'
import { SportHero } from '../components/portal/SportHero'
import { SportCardImage } from '../components/portal/SportCardImage'
import PortalHeader from '../components/portal/PortalHeader'
import type { CalendarEvent } from '../types/calendar'
import { showError, showSuccess, showInfo } from '../utils/toast'
import { supabase } from '../lib/supabase'
import { getAthletes } from '../data/services/familyService'
import { useT } from '../i18n/useI18n'
import { QUERY_CONFIG } from '../constants/api'

interface UserNotification {
  id: string
  title: string
  body: string
  created_at: string
}

interface PaymentOverview {
  title: string
  subtitle: string
  status: 'paid' | 'due' | 'pending'
  amount?: string
}

import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'

export default function Dashboard() {
  useDebugLifecycle('Dashboard')
  
  const { user, profile } = useAuth()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()
  const [unread, setUnread] = useState<UserNotification[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [paymentItems, setPaymentItems] = useState<PaymentOverview[]>([])
  const [primarySport, setPrimarySport] = useState<SportInfo | null>(null)
  const [eventSports, setEventSports] = useState<Record<string, SportInfo | null>>({})
  const [markingRead, setMarkingRead] = useState<string | null>(null)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)
  const [activePlayerCount, setActivePlayerCount] = useState<number | null>(null)
  const [activeSeasonName, setActiveSeasonName] = useState<string | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Safety net: If user landed here with setupOrganization flag, redirect to onboarding
  useEffect(() => {
    if (getSetupOrganizationFlag()) {
      clearSetupOrganizationFlag()
      navigate('/admin/onboarding', { replace: true })
    }
  }, [navigate])

  // Load notifications
  useEffect(() => {
    if (!isReady) return

    const loadNotifications = async () => {
      const { data, error } = await notificationService.getNotifications(context, 3)
      if (error) {
        console.error('Error loading notifications:', error)
        return
      }
      if (data) {
        // Filter to only unread notifications
        const unreadData = data.filter((n: any) => !n.read_at)
        setUnread(unreadData.slice(0, 3).map((n: any) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          created_at: n.created_at,
        })))
      }
    }

    loadNotifications()
  }, [context, isReady])

  // Load upcoming events
  useEffect(() => {
    if (!isReady) return

    const loadEvents = async () => {
      setEventsLoading(true)
      const { data, error } = await getUpcomingEventsForUser(context, 3)
      if (error) {
        console.error('Error loading events:', error)
        setEventsLoading(false)
        return
      }
      if (data) {
        setUpcomingEvents(data)

        // Load sports for events
        const sportsMap: Record<string, SportInfo | null> = {}
        await Promise.all(
          data.map(async (event) => {
            if (event.team_id) {
              const sport = await getSportFromEvent(context, event.id)
              if (sport) sportsMap[event.id] = sport
            }
          })
        )
        setEventSports(sportsMap)
      }
      setEventsLoading(false)
    }

    loadEvents()
  }, [context, isReady])

  // Load primary sport
  useEffect(() => {
    if (!isReady) return

    const loadSport = async () => {
      const sport = await getPrimarySportForUser(context)
      if (sport) {
        setPrimarySport(sport)
      }
    }

    loadSport()
  }, [context, isReady])

  // Load payment summary
  useEffect(() => {
    if (!isReady) return

    const loadPayments = async () => {
      setPaymentsLoading(true)
      const { data: unpaid, error } = await getUnpaidFeeAssignments(context)
      
      if (error) {
        console.error('Error loading payments:', error)
        setPaymentsLoading(false)
        return
      }
      
      const items: PaymentOverview[] = []
      
      // Add unpaid items
      unpaid.slice(0, 2).forEach(assignment => {
        // Handle both fake data (amount_due_cents/amount_paid_cents) and real data (balance_cents or amount_cents/paid_cents_total)
        const balanceCents = (assignment as any).balance_cents
        const amountDueCents = (assignment as any).amount_due_cents ?? (assignment as any).amount_cents ?? 0
        const amountPaidCents = (assignment as any).amount_paid_cents ?? (assignment as any).paid_cents_total ?? 0
        const amountDue = balanceCents ?? (amountDueCents - amountPaidCents)
        
        if (amountDue > 0) {
          items.push({
            title: assignment.fee?.title ?? 'Fee',
            subtitle: 'Due soon',
            status: 'due',
            amount: `$${(amountDue / 100).toFixed(2)}`,
          })
        }
      })

      setPaymentItems(items)
      setPaymentsLoading(false)
    }

    loadPayments()
  }, [context, isReady])

  // Load announcements
  useEffect(() => {
    if (!isReady) return

    const loadAnnouncements = async () => {
      setAnnouncementsLoading(true)
      
      // Get user's teams first
      const { data: teams, error: teamsError } = await getTeamsForParent(context)
      if (teamsError || !teams || teams.length === 0) {
        setAnnouncements([])
        setAnnouncementsLoading(false)
        return
      }
      
      // Get announcements for all user's teams
      const teamIds = teams.map(t => t.id)
      const allAnnouncements: Announcement[] = []
      
      for (const teamId of teamIds) {
        const { data, error } = await getAnnouncements(context, { teamId })
        if (!error && data) {
          allAnnouncements.push(...(data as Announcement[]))
        }
      }
      
      // Sort by created_at descending and take top 2
      const sorted = allAnnouncements.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      setAnnouncements(sorted.slice(0, 2))
      setAnnouncementsLoading(false)
    }

    loadAnnouncements()
  }, [context, isReady])

  // Load active player count and season
  const { data: athletesData } = useQuery({
    queryKey: ['athletes', context.orgId],
    queryFn: () => getAthletes(context),
    enabled: isReady,
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
  })

  useEffect(() => {
    if (!isReady || !athletesData) return

    const loadActiveStats = async () => {
      setStatsLoading(true)
      
      try {
        // Use athletes from React Query
        const { data: athletes, error: athletesError } = athletesData
        if (athletesError || !athletes || athletes.length === 0) {
          setActivePlayerCount(0)
          setActiveSeasonName(null)
          setStatsLoading(false)
          return
        }

        const athleteIds = athletes.map(a => a.id)
        if (athleteIds.length === 0) {
          setActivePlayerCount(0)
          setActiveSeasonName(null)
          setStatsLoading(false)
          return
        }

        // Get active team memberships for these athletes
        const { data: memberships, error: membershipsError } = await supabase
          .from('team_memberships')
          .select(`
            athlete_id,
            season_id,
            season:seasons(id, name, start_date, end_date, is_active)
          `)
          .in('athlete_id', athleteIds)
          .eq('status', 'active')

        if (membershipsError) {
          console.error('Error loading memberships:', membershipsError)
          setActivePlayerCount(0)
          setActiveSeasonName(null)
          setStatsLoading(false)
          return
        }

        if (!memberships || memberships.length === 0) {
          setActivePlayerCount(0)
          setActiveSeasonName(null)
          setStatsLoading(false)
          return
        }

        // Filter to only active seasons (by date or is_active flag)
        const now = new Date()
        const activeMemberships = memberships.filter((m: any) => {
          const season = m.season
          if (!season) return false
          
          // Check if season is active by date range
          const startDate = season.start_date ? new Date(season.start_date) : null
          const endDate = season.end_date ? new Date(season.end_date) : null
          
          const isActiveByDate = (!startDate || startDate <= now) && (!endDate || endDate >= now)
          const isActiveByFlag = season.is_active === true
          
          return isActiveByDate || isActiveByFlag
        })

        if (activeMemberships.length === 0) {
          setActivePlayerCount(0)
          setActiveSeasonName(null)
          setStatsLoading(false)
          return
        }

        // Count unique athletes with active memberships
        const activeAthleteIds = new Set(activeMemberships.map((m: any) => m.athlete_id))
        setActivePlayerCount(activeAthleteIds.size)

        // Get most common season name
        const seasonCounts = new Map<string, number>()
        activeMemberships.forEach((m: any) => {
          const seasonName = m.season?.name
          if (seasonName) {
            seasonCounts.set(seasonName, (seasonCounts.get(seasonName) || 0) + 1)
          }
        })

        let mostCommonSeason = ''
        let maxCount = 0
        seasonCounts.forEach((count, name) => {
          if (count > maxCount) {
            maxCount = count
            mostCommonSeason = name
          }
        })

        setActiveSeasonName(mostCommonSeason || null)
      } catch (err) {
        console.error('Error loading active stats:', err)
        setActivePlayerCount(0)
        setActiveSeasonName(null)
      } finally {
        setStatsLoading(false)
      }
    }

    loadActiveStats()
  }, [context, isReady, athletesData])

  const markAsRead = async (notificationId: string) => {
    if (markingRead === notificationId) return
    
    setMarkingRead(notificationId)
    
    // Optimistic UI: remove immediately
    const previousUnread = [...unread]
    setUnread((prev) => prev.filter((n) => n.id !== notificationId))

    const { data, error } = await notificationService.markAsRead(context, notificationId)
    const success = !error && data
    
    // If update fails, restore and show error
    if (!success || error) {
      setUnread(previousUnread)
      showError('Failed to mark notification as read. Please try again.')
    }
    
    setMarkingRead(null)
  }

  const markAllAsRead = async () => {
    if (unread.length === 0 || markingAllRead) return

    setMarkingAllRead(true)
    
    const previousUnread = [...unread]
    setUnread([])

    const { data, error } = await notificationService.markAllAsRead(context)
    const success = !error && data

    if (!success || error) {
      setUnread(previousUnread)
      showError('Failed to mark all notifications as read. Please try again.')
    } else {
      showSuccess('All notifications marked as read')
    }
    
    setMarkingAllRead(false)
  }

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'GOOD MORNING'
    if (hour < 17) return 'GOOD AFTERNOON'
    return 'GOOD EVENING'
  }

  // Get user's display name
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'PARENT'
  const firstName = displayName.split(' ')[0].toUpperCase()

  // Format event time
  const formatEventTime = (event: CalendarEvent) => {
    const start = new Date(event.start_time)
    const now = new Date()
    const isToday = start.toDateString() === now.toDateString()
    const isTomorrow = start.toDateString() === new Date(now.getTime() + 86400000).toDateString()
    
    const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    
    if (isToday) return `Live Now • ${event.event_location?.name ?? 'TBD'}`
    if (isTomorrow) return `Tomorrow • ${time}`
    return `${start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • ${time}`
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-slate-100 antialiased relative" data-testid="dashboard">
      {/* Background Field Markings (Grid) */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-[-1]"
        style={{
          backgroundImage: 'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />

      {/* Portal Nav with Mega Menu */}
      <PortalHeader />

      <main className="max-w-[1200px] mx-auto">
        {/* Sport Hero Section */}
        <div className="px-4 sm:px-6 -mx-4 sm:-mx-6 mb-6 sm:mb-8">
          <SportHero sport={primarySport} height="50vh sm:60vh" forceDefault={true}>
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-8 sm:pb-12">
              {/* Breadcrumbs & Greeting */}
              <div className="mb-6 sm:mb-8">
          <nav className="hidden sm:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60 mb-4 sm:mb-6">
            <Link to="/portal/dashboard" className="hover:text-white transition-colors">Home</Link>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-white">Parent Portal</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white mb-2 leading-none">
                {getGreeting()}, {firstName}.
              </h1>
              <p className="text-white/80 text-base sm:text-lg font-light tracking-wide">
                Elite performance starts with the right logistics.
              </p>
            </div>
            {!statsLoading && activePlayerCount !== null && activePlayerCount > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-4">
                {activeSeasonName && (
                  <div className="px-4 sm:px-6 py-2 sm:py-3 border border-white/20 rounded-lg flex flex-col bg-black/20 backdrop-blur-sm">
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Active Season</span>
                    <span className="font-bold text-white text-sm sm:text-base">{activeSeasonName}</span>
                  </div>
                )}
                <div className="px-4 sm:px-6 py-2 sm:py-3 border border-white/20 rounded-lg flex flex-col bg-black/20 backdrop-blur-sm">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t('portal.children.title')}</span>
                  <span className="font-bold text-white text-sm sm:text-base">{activePlayerCount} Active</span>
                </div>
              </div>
            )}
              </div>
            </div>
            </div>
          </SportHero>
        </div>

        <div className="px-4 sm:px-6">
          {unread.length > 0 && (
          <div className="mb-6 sm:mb-10 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Notifications</h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <button
                  onClick={markAllAsRead}
                  disabled={markingAllRead || unread.length === 0}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-left sm:text-right"
                >
                  {markingAllRead ? 'Marking...' : 'Mark all read'}
                </button>
                <Link to="/portal/uniforms" className="text-xs font-bold text-[var(--org-link-color)] hover:underline">
                  View Uniforms
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {unread.map((n) => (
                <div
                  key={n.id}
                  className="p-3 sm:p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{n.body}</p>
                    </div>
                    <button
                      onClick={() => markAsRead(n.id)}
                      disabled={markingRead === n.id}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
                    >
                      {markingRead === n.id ? 'Marking...' : 'Mark read'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 px-4 sm:px-6">
          {/* Main Content: Priority Actions */}
          <div className="lg:col-span-8 order-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Priority Actions</h2>
              <Link to="/portal/calendar" className="text-xs font-bold text-[var(--org-link-color)] cursor-pointer hover:underline">
                View Full Calendar
              </Link>
            </div>
            <div className="space-y-4 sm:space-y-6">
              {eventsLoading ? (
                <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
                </div>
              ) : upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <Link 
                    key={event.id} 
                    to={`/portal/calendar/events/${event.id}`}
                    className="group bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-[var(--org-btn-primary-bg, #137fec)]/5 transition-all duration-300 cursor-pointer block"
                  >
                    <div className="flex flex-col md:flex-row h-full">
                      <div className="md:w-1/3">
                        <SportCardImage 
                          sport={eventSports[event.id] || null} 
                          className="h-full rounded-none"
                          height="h-full min-h-[180px] sm:min-h-[200px]"
                        />
                      </div>
                      <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <div className={`w-2 h-2 rounded-full ${event.type === 'practice' ? 'bg-[var(--org-btn-primary-bg)]' : 'bg-orange-500'}`}></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formatEventTime(event)}</span>
                          </div>
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight uppercase">
                            {event.title}
                          </h3>
                          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-light mb-4 sm:mb-6">
                            {event.notes ?? `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} event`}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <span className="w-full sm:w-auto bg-[var(--org-btn-primary-bg)] hover:bg-[var(--org-btn-primary-bg)]/90 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2">
                            VIEW <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </span>
                          {event.event_location?.maps_url && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                window.open(event.event_location!.maps_url!, '_blank', 'noopener,noreferrer')
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  window.open(event.event_location!.maps_url!, '_blank', 'noopener,noreferrer')
                                }
                              }}
                              className="w-full sm:w-auto border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-6 sm:px-8 py-2.5 sm:py-3 rounded font-bold text-sm tracking-wide transition-all text-slate-900 dark:text-white flex items-center justify-center gap-2 cursor-pointer"
                            >
                              LOCATION <span className="material-symbols-outlined text-sm">location_on</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                    <span className="material-symbols-outlined text-slate-400 text-4xl">event</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No upcoming events</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">Check back later for scheduled activities.</p>
                  <Link to="/portal/calendar" className="inline-block bg-[var(--org-btn-primary-bg)] hover:bg-[var(--org-btn-primary-bg)]/90 text-white px-6 py-3 rounded font-bold text-sm tracking-wide transition-all">
                    View Calendar
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Status Lines & Announcements */}
          <div className="lg:col-span-4 space-y-8 sm:space-y-12 order-2">
            {/* Financials */}
            {!paymentsLoading && paymentItems.length > 0 && (
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-4 sm:mb-6 border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4">
                  Financial Overview
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {paymentItems.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 group py-2">
                        <div className="flex items-center gap-3">
                          <div className={`size-2 rounded-full flex-shrink-0 ${
                            item.status === 'paid' ? 'bg-emerald-500' :
                            item.status === 'due' ? 'bg-[var(--org-btn-primary-bg)] animate-pulse' :
                            'bg-slate-300'
                          }`}></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-black">{item.subtitle}</p>
                          </div>
                        </div>
                        <div className="sm:ml-auto">
                          {item.status === 'paid' ? (
                            <span className="text-xs font-bold text-emerald-500">PAID</span>
                          ) : item.status === 'due' ? (
                            <Link to="/portal/payments" className="text-xs font-bold text-[var(--org-link-color)] underline whitespace-nowrap">
                              PAY {item.amount}
                            </Link>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">PENDING</span>
                          )}
                        </div>
                      </div>
                      {idx < paymentItems.length - 1 && (
                        <div className="h-px bg-slate-50 dark:bg-slate-800 w-full"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bulletin */}
            {!announcementsLoading && announcements.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-900/80 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">campaign</span> Bulletin Board
                </h2>
                <div className="space-y-4 sm:space-y-6">
                  {announcements.map((announcement) => (
                    <div 
                      key={announcement.id}
                      className={`relative pl-4 sm:pl-6 border-l-2 ${
                        announcement.priority === 'urgent' 
                          ? 'border-[var(--org-btn-primary-bg, #137fec)]' 
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-wider">
                        {announcement.title}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                        {announcement.content}
                      </p>
                    </div>
                  ))}
                </div>
                <Link 
                  to="/portal/messages"
                  className="w-full mt-6 sm:mt-8 py-2.5 sm:py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors block text-center"
                >
                  All Announcements
                </Link>
              </div>
            )}

            {/* Team Quick Links */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Support</h2>
              <Link 
                to="/portal/settings" 
                className="text-sm font-bold text-slate-900 dark:text-white hover:text-[var(--org-link-color)] flex items-center justify-between group py-2"
              >
                Contact League Office
                <span className="material-symbols-outlined text-lg opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </Link>
              <button
                onClick={() => showInfo('Help documentation coming soon')}
                className="text-sm font-bold text-slate-900 dark:text-white hover:text-[var(--org-link-color)] flex items-center justify-between group text-left w-full py-2"
              >
                Help & Documentation
                <span className="material-symbols-outlined text-lg opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
