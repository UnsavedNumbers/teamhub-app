import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserContext } from '../hooks/useUserContext'
import {
  getSetupOrganizationFlag,
  clearSetupOrganizationFlag,
} from '../utils/setupOrganization'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../data/services/messagesService'
import {
  getUpcomingEventsForUser,
} from '../data/services/eventsService'
import {
  getUnpaidFeeAssignments,
} from '../data/services/paymentsService'
import { getPrimarySportForUser, getSportFromEvent, type SportInfo } from '../utils/sportContext'
import { SportHero } from '../components/portal/SportHero'
import { SportCardImage } from '../components/portal/SportCardImage'
import PortalHeader from '../components/portal/PortalHeader'
import type { CalendarEvent } from '../types/calendar'

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

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [unread, setUnread] = useState<UserNotification[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [paymentItems, setPaymentItems] = useState<PaymentOverview[]>([])
  const [primarySport, setPrimarySport] = useState<SportInfo | null>(null)
  const [eventSports, setEventSports] = useState<Record<string, SportInfo | null>>({})

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
      const { data, error } = await getNotifications(context, 3)
      if (!error && data) {
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
      if (!error) {
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
      const { data: unpaid } = await getUnpaidFeeAssignments(context)
      
      const items: PaymentOverview[] = []
      
      // Add unpaid items
      unpaid.slice(0, 2).forEach(assignment => {
        items.push({
          title: assignment.fee?.title ?? 'Fee',
          subtitle: 'Due soon',
          status: 'due',
          amount: `$${((assignment.amount_due_cents - assignment.amount_paid_cents) / 100).toFixed(2)}`,
        })
      })

      // Add a sample paid item for display
      if (items.length < 3) {
        items.push({
          title: 'Spring Registration',
          subtitle: 'Varsity Soccer',
          status: 'paid',
        })
      }

      // Add upcoming pending item
      if (items.length < 3) {
        items.push({
          title: 'Uniform Package',
          subtitle: 'Upcoming May 1',
          status: 'pending',
        })
      }

      setPaymentItems(items)
    }

    loadPayments()
  }, [context, isReady])

  const markAsRead = async (notificationId: string) => {
    // Optimistic UI: remove immediately
    setUnread((prev) => prev.filter((n) => n.id !== notificationId))

    const { success, error } = await markNotificationRead(context, notificationId)
    
    // If update fails, reload to ensure UI is correct
    if (!success || error) {
      const { data } = await getNotifications(context, 3)
      if (data) {
        const unreadData = data.filter((n: any) => !n.read_at)
        setUnread(unreadData.slice(0, 3).map((n: any) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          created_at: n.created_at,
        })))
      }
    }
  }

  const markAllAsRead = async () => {
    if (unread.length === 0) return

    setUnread([])

    const { success, error } = await markAllNotificationsRead(context)

    if (!success || error) {
      const { data } = await getNotifications(context, 3)
      if (data) {
        const unreadData = data.filter((n: any) => !n.read_at)
        setUnread(unreadData.slice(0, 3).map((n: any) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          created_at: n.created_at,
        })))
      }
    }
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
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-slate-100 antialiased relative">
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
        <div className="px-6 -mx-6 mb-8">
          <SportHero sport={primarySport} height="60vh" forceDefault={true}>
            <div className="max-w-[1200px] mx-auto px-6 pb-12">
              {/* Breadcrumbs & Greeting */}
              <div className="mb-8">
          <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60 mb-6">
            <Link to="/portal/dashboard" className="hover:text-white transition-colors">Home</Link>
            <span className="material-symbols-outlined text-[10px]">chevron_right</span>
            <span className="text-white">Parent Portal</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-white mb-2 leading-none">
                {getGreeting()}, {firstName}.
              </h1>
              <p className="text-white/80 text-lg font-light tracking-wide">
                Elite performance starts with the right logistics.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="px-6 py-3 border border-white/20 rounded-lg flex flex-col bg-black/20 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Active Season</span>
                <span className="font-bold text-white">Spring 2024</span>
              </div>
              <div className="px-6 py-3 border border-white/20 rounded-lg flex flex-col bg-black/20 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Players</span>
                <span className="font-bold text-white">2 Active</span>
              </div>
            </div>
              </div>
            </div>
            </div>
          </SportHero>
        </div>

        <div className="px-6">
          {unread.length > 0 && (
          <div className="mb-10 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Notifications</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={markAllAsRead}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Mark all read
                </button>
                <Link to="/portal/uniforms" className="text-xs font-bold text-[#137fec] hover:underline">
                  View Uniforms
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {unread.map((n) => (
                <div
                  key={n.id}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{n.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{n.body}</p>
                    </div>
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 px-6">
          {/* Main Content: Priority Actions */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Priority Actions</h2>
              <Link to="/portal/calendar" className="text-xs font-bold text-[#137fec] cursor-pointer hover:underline">
                View Full Calendar
              </Link>
            </div>
            <div className="space-y-6">
              {eventsLoading ? (
                <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white mx-auto"></div>
                </div>
              ) : upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <Link 
                    key={event.id} 
                    to={`/portal/calendar/events/${event.id}`}
                    className="group bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300 cursor-pointer block"
                  >
                    <div className="flex flex-col md:flex-row h-full">
                      <div className="md:w-1/3">
                        <SportCardImage 
                          sport={eventSports[event.id] || null} 
                          className="h-full rounded-none"
                          height="h-full min-h-[200px]"
                        />
                      </div>
                      <div className="flex-1 p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-2 h-2 rounded-full ${event.type === 'practice' ? 'bg-[#137fec]' : 'bg-orange-500'}`}></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{formatEventTime(event)}</span>
                          </div>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight uppercase">
                            {event.title}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 font-light mb-6">
                            {event.notes ?? `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} event`}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Link to={`/portal/calendar/events/${event.id}`} className="bg-[#137fec] hover:bg-[#137fec]/90 text-white px-8 py-3 rounded font-bold text-sm tracking-wide transition-all active:scale-95 flex items-center gap-2">
                            VIEW <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </Link>
                          {event.event_location?.maps_url && (
                            <a href={event.event_location.maps_url} target="_blank" rel="noopener noreferrer" className="border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-8 py-3 rounded font-bold text-sm tracking-wide transition-all text-slate-900 dark:text-white flex items-center gap-2">
                              LOCATION <span className="material-symbols-outlined text-sm">location_on</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-12 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                    <span className="material-symbols-outlined text-slate-400 text-4xl">event</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No upcoming events</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">Check back later for scheduled activities.</p>
                  <Link to="/portal/calendar" className="inline-block bg-[#137fec] hover:bg-[#137fec]/90 text-white px-6 py-3 rounded font-bold text-sm tracking-wide transition-all">
                    View Calendar
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Status Lines & Announcements */}
          <div className="lg:col-span-4 space-y-12">
            {/* Financials */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                Financial Overview
              </h2>
              <div className="space-y-4">
                {paymentItems.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between group py-2">
                      <div className="flex items-center gap-3">
                        <div className={`size-2 rounded-full ${
                          item.status === 'paid' ? 'bg-emerald-500' :
                          item.status === 'due' ? 'bg-[#137fec] animate-pulse' :
                          'bg-slate-300'
                        }`}></div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black">{item.subtitle}</p>
                        </div>
                      </div>
                      {item.status === 'paid' ? (
                        <span className="text-xs font-bold text-emerald-500">PAID</span>
                      ) : item.status === 'due' ? (
                        <Link to="/portal/payments" className="text-xs font-bold text-[#137fec] underline">
                          PAY {item.amount}
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">PENDING</span>
                      )}
                    </div>
                    {idx < paymentItems.length - 1 && (
                      <div className="h-px bg-slate-50 dark:bg-slate-800 w-full"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bulletin */}
            <div className="bg-slate-50 dark:bg-slate-900/80 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">campaign</span> Bulletin Board
              </h2>
              <div className="space-y-6">
                <div className="relative pl-6 border-l-2 border-[#137fec]">
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-wider">Weather Update</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                    Fields are currently open. In case of lightning, we will transition to the indoor facility.
                  </p>
                </div>
                <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-wider">Coach&apos;s Note</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                    Great hustle in yesterday&apos;s game. Focus for next week: defensive positioning.
                  </p>
                </div>
              </div>
              <Link 
                to="/portal/messages"
                className="w-full mt-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors block text-center"
              >
                All Announcements
              </Link>
            </div>

            {/* Team Quick Links */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Support</h2>
              <Link 
                to="/portal/settings" 
                className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#137fec] flex items-center justify-between group"
              >
                Contact League Office
                <span className="material-symbols-outlined text-lg opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </Link>
              <a 
                href="#" 
                className="text-sm font-bold text-slate-900 dark:text-white hover:text-[#137fec] flex items-center justify-between group"
              >
                Help & Documentation
                <span className="material-symbols-outlined text-lg opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
