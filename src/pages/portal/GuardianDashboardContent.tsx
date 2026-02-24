import { Link } from 'react-router-dom'
import {
  Calendar,
  MessageSquare,
  Ticket,
  CreditCard,
  HandHelping,
  Receipt,
  Megaphone,
  Image,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getLink } from '../../utils/routes'
import { useUserContext } from '../../hooks/useUserContext'
import { getUpcomingEventsForUser } from '../../data/services/eventsService'
import { getAnnouncements } from '../../data/services/messagesService'
import { getUnpaidFeeAssignments } from '../../data/services/paymentsService'
import { getTeamsForParent } from '../../data/services/teamsService'
import { getPrimarySportForUser } from '../../utils/sportContext'
import type { Announcement } from '../../data/services/messagesService'
import type { CalendarEvent } from '../../types/calendar'
import type { SportInfo } from '../../utils/sportContext'
import { ActionCard, ContextHero, RecentActivityList, DataSnapshotChart } from '../../components/portal/workspace'
import type { RecentActivityItem } from '../../components/portal/workspace'
import { QUERY_CONFIG } from '../../constants/api'

const GUARDIAN_ACTIONS = [
  { to: getLink('portal.calendar'), icon: Calendar, label: 'View Schedule', subtext: 'Upcoming events' },
  { to: getLink('portal.messages'), icon: MessageSquare, label: 'Message Coach', subtext: 'Huddles & announcements' },
  { to: getLink('portal.myTickets'), icon: Ticket, label: 'View Tickets', subtext: 'Event tickets' },
  { to: getLink('portal.payments'), icon: CreditCard, label: 'Manage Registrations', subtext: 'Fees & payments' },
  { to: getLink('portal.calendar'), icon: HandHelping, label: 'Volunteer Signup', subtext: 'Find opportunities' },
]

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Guardian dashboard workspace content: action cards, hero, recent activity, chart, feed.
 */
export default function GuardianDashboardContent() {
  const { context, isReady } = useUserContext()
  const [sport, setSport] = useState<SportInfo | null>(null)

  useEffect(() => {
    if (!isReady || !context?.orgId) return
    getPrimarySportForUser(context).then(setSport).catch(() => setSport(null))
  }, [context, isReady])

  const { data: upcomingEvents } = useQuery({
    queryKey: ['portal-upcoming-events', context?.orgId],
    queryFn: async () => {
      const { data } = await getUpcomingEventsForUser(context!, 5)
      return data ?? []
    },
    enabled: isReady && !!context?.orgId,
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
  })

  const { data: announcements } = useQuery({
    queryKey: ['portal-announcements', context?.orgId],
    queryFn: async () => {
      const { data: teams } = await getTeamsForParent(context!)
      if (!teams?.length) return [] as Announcement[]
      const all: Announcement[] = []
      for (const t of teams.slice(0, 3)) {
        const { data } = await getAnnouncements(context!, { teamId: t.id })
        if (data) all.push(...(data as Announcement[]))
      }
      return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
    },
    enabled: isReady && !!context?.orgId,
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
  })

  const { data: unpaid } = useQuery({
    queryKey: ['portal-unpaid-fees', context?.orgId],
    queryFn: async () => {
      const { data } = await getUnpaidFeeAssignments(context!)
      return data ?? []
    },
    enabled: isReady && !!context?.orgId,
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
  })

  const events = (upcomingEvents ?? []) as CalendarEvent[]
  const eventCountThisWeek = events.filter((e) => {
    const start = new Date(e.start_time)
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return start >= now && start <= weekEnd
  }).length

  const firstEvent = events[0]
  const headline = eventCountThisWeek > 0
    ? `${eventCountThisWeek} event${eventCountThisWeek !== 1 ? 's' : ''} this week`
    : 'No events this week'
  const subtext = firstEvent
    ? `${firstEvent.type === 'practice' ? 'Practice' : 'Game'} ${firstEvent.title} • ${new Date(firstEvent.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
    : 'Add events to your calendar.'

  const badges: { label: string; href?: string }[] = []
  if (announcements && announcements.length > 0) badges.push({ label: `${announcements.length} unread`, href: getLink('portal.messages') })
  const balance = unpaid?.reduce((sum: number, a: any) => sum + (a.balance_cents ?? (a.amount_cents - (a.paid_cents_total ?? 0)) ?? 0), 0) ?? 0
  if (balance > 0) badges.push({ label: 'Outstanding balance', href: getLink('portal.payments') })
  badges.push({ label: 'RSVP needed', href: getLink('portal.calendar') })

  const activityItems: RecentActivityItem[] = []
  announcements?.slice(0, 3).forEach((a) => {
    activityItems.push({
      id: a.id,
      title: a.title,
      subtitle: a.content?.slice(0, 60),
      href: `/portal/messages/${a.id}`,
      icon: Megaphone,
      timestamp: formatTimeAgo(new Date(a.created_at)),
    })
  })
  unpaid?.slice(0, 2).forEach((a: any) => {
    activityItems.push({
      id: a.id,
      title: a.fee?.title ?? 'Fee due',
      subtitle: a.balance_cents ? `$${(a.balance_cents / 100).toFixed(2)}` : undefined,
      href: getLink('portal.payments'),
      icon: Receipt,
      timestamp: 'Due soon',
    })
  })

  const chartData = events.length
    ? [
        { label: 'Mon', value: events.filter((e) => new Date(e.start_time).getDay() === 1).length },
        { label: 'Tue', value: events.filter((e) => new Date(e.start_time).getDay() === 2).length },
        { label: 'Wed', value: events.filter((e) => new Date(e.start_time).getDay() === 3).length },
        { label: 'Thu', value: events.filter((e) => new Date(e.start_time).getDay() === 4).length },
        { label: 'Fri', value: events.filter((e) => new Date(e.start_time).getDay() === 5).length },
        { label: 'Sat', value: events.filter((e) => new Date(e.start_time).getDay() === 6).length },
        { label: 'Sun', value: events.filter((e) => new Date(e.start_time).getDay() === 0).length },
      ]
    : [
        { label: 'Mon', value: 0 },
        { label: 'Tue', value: 0 },
        { label: 'Wed', value: 0 },
        { label: 'Thu', value: 0 },
        { label: 'Fri', value: 0 },
        { label: 'Sat', value: 0 },
        { label: 'Sun', value: 0 },
      ]

  return (
    <div className="space-y-8">
      <section>
        <h1 className="sr-only">Guardian dashboard</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {GUARDIAN_ACTIONS.map((action) => (
            <ActionCard
              key={action.to + action.label}
              to={action.to}
              icon={action.icon}
              label={action.label}
              subtext={action.subtext}
            />
          ))}
        </div>
      </section>

      <ContextHero
        headline={headline}
        subtext={subtext}
        badges={badges}
        sport={sport}
        primaryAction={firstEvent ? { label: 'View schedule', href: getLink('portal.calendar') } : undefined}
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivityList
            title="Recent activity"
            viewAllHref={getLink('portal.calendar')}
            items={activityItems}
            emptyMessage="No recent activity. Check calendar and messages."
          />
        </div>
        <div>
          <DataSnapshotChart
            title="Events this week"
            data={chartData}
            valueLabel="Events"
          />
          <div className="mt-4 rounded-xl border-2 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">Upcoming</h3>
            <p className="mt-2 text-4xl font-black text-slate-900 dark:text-slate-100">{events.length}</p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">events scheduled</p>
            <Link
              to={getLink('portal.payments')}
              className="mt-4 block text-sm font-bold uppercase tracking-wide text-[var(--org-link-color)] hover:underline"
            >
              Payment summary →
            </Link>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">Team feed</h2>
          <Link to={getLink('portal.photos')} className="text-sm font-bold uppercase tracking-wide text-[var(--org-link-color)] hover:underline">
            View all →
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3">
          {announcements?.slice(0, 4).map((a) => (
            <Link
              key={a.id}
              to={`/portal/messages/${a.id}`}
              className="group flex min-w-[240px] flex-col rounded-xl border-2 border-slate-200 bg-white p-5 transition-all hover:border-[var(--org-link-color)]/30 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--org-btn-primary-bg)]/10 group-hover:bg-[var(--org-btn-primary-bg)]/20">
                <Megaphone className="h-6 w-6 text-[var(--org-link-color)]" />
              </div>
              <p className="mt-3 truncate text-sm font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">{a.title}</p>
              <p className="mt-2 line-clamp-2 text-xs font-medium text-slate-600 dark:text-slate-400">{a.content}</p>
            </Link>
          ))}
          <Link
            to={getLink('portal.photos')}
            className="flex min-w-[240px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-slate-500 transition-all hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Image className="h-10 w-10" />
            <span className="mt-3 text-sm font-bold uppercase tracking-wide">Photos</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
