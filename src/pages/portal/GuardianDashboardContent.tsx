import { Link } from 'react-router-dom'
import {
  Calendar,
  MessageSquare,
  Users,
  CreditCard,
  FileText,
  Image,
  HandHelping,
  Award,
  Ticket,
  ShieldAlert,
  Settings,
  MapPin,
  Receipt,
  Megaphone,
  type LucideIcon,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getLink } from '../../utils/routes'
import { useUserContext } from '../../hooks/useUserContext'
import { getUpcomingEventsForUser } from '../../data/services/eventsService'
import { getAnnouncements, getNotifications } from '../../data/services/messagesService'
import { getUnpaidFeeAssignments } from '../../data/services/paymentsService'
import { getTeamsForParent } from '../../data/services/teamsService'
import { getPrimarySportForUser } from '../../utils/sportContext'
import { getAnnouncementEmoji } from '../../utils/announcementTypes'
import type { Announcement } from '../../data/services/messagesService'
import type { CalendarEvent } from '../../types/calendar'
import type { NotificationRecord } from '../../types/notifications'
import type { SportInfo } from '../../utils/sportContext'
import { ContextHero, RecentActivityList } from '../../components/portal/workspace'
import { SportCardImage } from '../../components/portal/SportCardImage'
import type { RecentActivityItem } from '../../components/portal/workspace'
import { QUERY_CONFIG } from '../../constants/api'

const GUARDIAN_ACTIONS = [
  { to: getLink('portal.calendar'), label: 'View Schedule', subtext: 'Upcoming events' },
  { to: getLink('portal.messages'), label: 'Message Coach', subtext: 'Direct messages' },
  { to: getLink('portal.myTickets'), label: 'View Tickets', subtext: 'Event tickets' },
  { to: getLink('portal.payments'), label: 'Manage Registrations', subtext: 'Fees & payments' },
  { to: getLink('portal.calendar'), label: 'Volunteer Signup', subtext: 'Find opportunities' },
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

  const getNotificationIcon = (action: NotificationRecord['action']): LucideIcon => {
    if (action === 'event_rsvp_required') return Ticket
    if (action.startsWith('event_')) return Calendar
    if (action.startsWith('message_') || action === 'huddle_created' || action === 'user_mentioned') return MessageSquare
    if (action.startsWith('travel_')) return MapPin
    if (action.startsWith('fee_') || action.startsWith('payout_')) return CreditCard
    if (action === 'announcement_created' || action === 'announcement_urgent') return Megaphone
    if (action === 'announcement_updated') return Image
    if (action === 'announcement_deleted') return FileText
    if (action.startsWith('uniform_')) return Award
    if (action.startsWith('athlete_') || action.startsWith('guardian_') || action.startsWith('team_')) return Users
    if (action.startsWith('invite_') || action === 'role_assigned' || action === 'role_removed' || action === 'access_revoked') return HandHelping
    if (action.startsWith('license_') || action.startsWith('feature_')) return Settings
    if (action === 'system_generated_notice') return ShieldAlert
    return FileText
  }

  const getActionState = (
    notification: NotificationRecord,
  ): { label?: string; tone?: RecentActivityItem['actionStateTone'] } => {
    switch (notification.action) {
      case 'fee_overdue':
        return { label: 'Overdue', tone: 'urgent' }
      case 'fee_payment_failed':
        return { label: 'Action needed', tone: 'urgent' }
      case 'event_rsvp_required':
        return { label: 'RSVP needed', tone: 'warning' }
      case 'event_canceled':
        return { label: 'Canceled', tone: 'urgent' }
      case 'event_rescheduled':
      case 'event_time_changed':
      case 'event_location_updated':
        return { label: 'Updated', tone: 'warning' }
      case 'fee_payment_completed':
        return { label: 'Paid', tone: 'success' }
      default:
        if (!notification.read_at) return { label: 'New', tone: 'default' }
        return {}
    }
  }

  const resolveNotificationHref = (notification: NotificationRecord): string => {
    const isPaymentNotification = notification.action.startsWith('fee_') || notification.action.startsWith('payout_')
    if (isPaymentNotification) {
      if (notification.entity_id) {
        return getLink('portal.paymentDetail', { id: notification.entity_id })
      }
      return getLink('portal.payments')
    }

    const fallbackHref =
      notification.entity_type === 'event' || notification.entity_type === 'travel'
        ? getLink('portal.calendar')
        : notification.entity_type === 'announcement'
          ? getLink('portal.announcements')
          : notification.entity_type === 'message'
            ? getLink('portal.messages')
            : getLink('portal.dashboard')

    return notification.link_url && notification.link_url.startsWith('/') ? notification.link_url : fallbackHref
  }

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

  const { data: parentTeams } = useQuery({
    queryKey: ['portal-parent-teams', context?.orgId],
    queryFn: async () => {
      const { data: teams } = await getTeamsForParent(context!)
      return teams ?? []
    },
    enabled: isReady && !!context?.orgId && !!context?.userId,
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
  })

  const { data: announcements } = useQuery({
    queryKey: ['portal-announcements', context?.orgId, (parentTeams ?? []).map((team: any) => team.id).join('|')],
    queryFn: async () => {
      const teams = parentTeams ?? []
      if (!teams?.length) return [] as Announcement[]
      const all: Announcement[] = []
      for (const t of teams.slice(0, 3)) {
        const { data } = await getAnnouncements(context!, { teamId: t.id })
        if (data) all.push(...(data as Announcement[]))
      }
      return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
    },
    enabled: isReady && !!context?.orgId && !!context?.userId,
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
  })

  const { data: notifications } = useQuery({
    queryKey: ['portal-recent-notifications', context?.orgId, context?.userId],
    queryFn: async () => {
      const { data } = await getNotifications(context!, { limit: 20 })
      return data ?? []
    },
    enabled: isReady && !!context?.orgId && !!context?.userId,
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

  const normalizeAssignment = (assignment: any) => {
    const rawAmount = assignment?.amount_cents ?? assignment?.amount_due_cents ?? 0
    const rawPaid = assignment?.paid_cents_total ?? assignment?.amount_paid_cents ?? 0
    const rawBalance = assignment?.balance_cents

    const amountCents = Number(rawAmount) || 0
    const paidCentsTotal = Number(rawPaid) || 0
    const balanceCents = rawBalance !== undefined && rawBalance !== null
      ? Number(rawBalance) || 0
      : Math.max(0, amountCents - paidCentsTotal)

    return {
      ...assignment,
      amountCents,
      paidCentsTotal,
      balanceCents,
    }
  }

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

  const normalizedUnpaid = (unpaid ?? []).map(normalizeAssignment)
  const teamNameById = new Map(
    (parentTeams ?? []).map((team: any) => [
      team.id,
      team.name ?? team.team_name ?? team.display_name ?? team.title,
    ]),
  )

  const badges: { label: string; href?: string }[] = []
  if (announcements && announcements.length > 0) badges.push({ label: `${announcements.length} unread`, href: getLink('portal.announcements') })
  const balance = normalizedUnpaid.reduce((sum: number, a: any) => sum + (a.balanceCents ?? 0), 0)
  if (balance > 0) badges.push({ label: 'Outstanding balance', href: getLink('portal.payments') })
  badges.push({ label: 'RSVP needed', href: getLink('portal.calendar') })

  const trimText = (value: string | null | undefined, maxLength: number): string | undefined => {
    if (!value) return undefined
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
  }

  const manualActivityItems: Array<{ item: RecentActivityItem; sortMs: number }> = []
  announcements?.slice(0, 3).forEach((a) => {
    const createdAtMs = new Date(a.created_at).getTime()
    const isRecent = Date.now() - createdAtMs < 24 * 60 * 60 * 1000
    const teamId = (a as any).team_id as string | null | undefined
    manualActivityItems.push({
      sortMs: createdAtMs,
      item: {
      id: a.id,
      title: a.title,
      subtitle: a.content?.slice(0, 60),
      contextLabel: teamId ? teamNameById.get(teamId) : undefined,
      actionState: isRecent ? 'New' : undefined,
      actionStateTone: isRecent ? 'default' : undefined,
      href: `/portal/announcements/${a.id}`,
      icon: Megaphone,
      timestamp: formatTimeAgo(new Date(a.created_at)),
      },
    })
  })
  normalizedUnpaid.slice(0, 2).forEach((a: any, index: number) => {
    manualActivityItems.push({
      sortMs: Date.now() - (2 + index) * 60 * 1000,
      item: {
        id: a.id,
        title: a.fee?.title ?? 'Fee due',
        subtitle: a.balanceCents > 0 ? `$${(a.balanceCents / 100).toFixed(2)}` : undefined,
        actionState: a.balanceCents > 0 ? 'Due soon' : undefined,
        actionStateTone: a.balanceCents > 0 ? 'warning' : undefined,
        href: getLink('portal.payments'),
        icon: Receipt,
        timestamp: 'Due soon',
      },
    })
  })

  const notificationActivityItems: Array<{ item: RecentActivityItem; sortMs: number }> = (notifications ?? []).map((n) => {
    const state = getActionState(n)

    return {
      sortMs: new Date(n.created_at).getTime(),
      item: {
        id: `notif-${n.id}`,
        title: n.title,
        subtitle: trimText(n.body, 90),
        href: resolveNotificationHref(n),
        icon: getNotificationIcon(n.action),
        timestamp: formatTimeAgo(new Date(n.created_at)),
        contextLabel: n.team_id ? teamNameById.get(n.team_id) : undefined,
        actionState: state.label,
        actionStateTone: state.tone,
      },
    }
  })

  const dedupe = new Set<string>()
  const activityItems = [...manualActivityItems, ...notificationActivityItems]
    .sort((a, b) => b.sortMs - a.sortMs)
    .filter(({ item }) => {
      const normalizedKey = `${item.title.trim().toLowerCase()}|${item.href.trim().toLowerCase()}|${(item.contextLabel ?? '').trim().toLowerCase()}`
      if (dedupe.has(normalizedKey)) return false
      dedupe.add(normalizedKey)
      return true
    })
    .slice(0, 10)
    .map(({ item }) => item)

  const unpaidAssignments = normalizedUnpaid
  const unpaidCount = unpaidAssignments.length
  const upcomingPaymentItems = unpaidAssignments
    .map((a: any) => {
      const itemBalance = a.balanceCents ?? 0
      return {
        id: a.id,
        title: a.fee?.title ?? 'Registration fee',
        amountLabel: `$${(Math.max(itemBalance, 0) / 100).toFixed(2)}`,
      }
    })
    .filter((item) => Number(item.amountLabel.replace('$', '')) > 0)
    .slice(0, 2)
  const paymentHeadline = balance > 0 ? `$${(balance / 100).toFixed(2)}` : 'All caught up'
  const paymentSubtext = balance > 0
    ? `${unpaidCount} payment${unpaidCount === 1 ? '' : 's'} due`
    : 'No upcoming payments due'
  const nextEventDate = firstEvent
    ? new Date(firstEvent.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null

  return (
    <div className="space-y-8">
      <section>
        <h1 className="sr-only">Guardian dashboard</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
          {GUARDIAN_ACTIONS.map((action) => (
            <Link
              key={action.to + action.label}
              to={action.to}
              className="group text-sm font-bold uppercase tracking-wide text-slate-700 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
            >
              {action.label}
              <span className="ml-2 hidden text-[11px] font-medium normal-case tracking-normal text-slate-500 dark:text-slate-400 lg:inline">
                {action.subtext}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <ContextHero
        className="-mx-4 sm:-mx-6"
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
            viewAllHref={getLink('portal.notifications')}
            items={activityItems}
            emptyMessage="You're all caught up! Check back soon for updates from your teams."
          />
        </div>
        <div>
          <div className="space-y-4">
            <section className="rounded-xl bg-slate-50 p-5 dark:bg-slate-900/70">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Events</p>
                  <p className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">{eventCountThisWeek}</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">this week</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{events.length} total</p>
                  {nextEventDate && <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Next {nextEventDate}</p>}
                </div>
              </div>
              <div className="space-y-2.5">
                {events.length === 0 ? (
                  <p className="rounded-xl bg-slate-100/70 px-3 py-3 text-sm font-medium text-slate-600 dark:bg-slate-800/70 dark:text-slate-400">
                    No upcoming events scheduled.
                  </p>
                ) : (
                  events.slice(0, 3).map((event) => {
                    const normalizedEventType = event.type ? event.type.replace(/_/g, ' ') : 'event'
                    const eventTypeLabel = normalizedEventType
                      ? `${normalizedEventType.charAt(0).toUpperCase()}${normalizedEventType.slice(1)}`
                      : 'Event'
                    const formattedDate = new Date(event.start_time).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                    const ticketBannerUrl = event.ticketed_event?.ticket_banner_url
                    const formattedArrivalTime = event.arrival_time
                      ? new Date(event.arrival_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      : null

                    return (
                      <Link
                        key={event.id}
                        to={`/portal/calendar/events/${event.id}`}
                        className="group flex items-center gap-3 rounded-xl bg-slate-100/70 p-2.5 transition-colors hover:bg-slate-200/70 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                      >
                        {ticketBannerUrl ? (
                          <img
                            src={ticketBannerUrl}
                            alt={event.title}
                            className="h-14 w-20 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <SportCardImage
                            sport={sport}
                            height="h-14"
                            className="w-20 shrink-0 !rounded-lg"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{event.title}</p>
                          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{eventTypeLabel}</p>
                          {formattedArrivalTime && (
                            <p className="mt-0.5 text-[11px] font-black uppercase tracking-wide text-rose-600 dark:text-rose-400">
                              Arrive by {formattedArrivalTime}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {formattedDate}
                        </span>
                      </Link>
                    )
                  })
                )}
                <Link
                  to={getLink('portal.calendar')}
                  className="block pt-1 text-sm font-bold uppercase tracking-wide text-[var(--org-link-color)] hover:underline"
                >
                  View all events →
                </Link>
              </div>
            </section>

            <section className="rounded-xl bg-slate-50 p-5 dark:bg-slate-900/70">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Upcoming payments</p>
              <p className="mt-2 text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">{paymentHeadline}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">{paymentSubtext}</p>
              {upcomingPaymentItems.length > 0 && (
                <div className="mt-4 space-y-2">
                  {upcomingPaymentItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-semibold text-slate-700 dark:text-slate-300">{item.title}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{item.amountLabel}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link
                to={getLink('portal.payments')}
                className="mt-4 block text-sm font-bold uppercase tracking-wide text-[var(--org-link-color)] hover:underline"
              >
                Payment summary →
              </Link>
            </section>
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
        <div className="grid grid-cols-1 gap-3 sm:flex sm:gap-4 sm:overflow-x-auto sm:pb-3">
          {announcements?.slice(0, 4).map((a) => (
            <Link
              key={a.id}
              to={`/portal/announcements/${a.id}`}
              className="group flex flex-col rounded-xl bg-slate-50 p-5 transition-colors hover:bg-slate-100 sm:min-w-[240px] dark:bg-slate-900/70 dark:hover:bg-slate-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800">
                <span className="text-base leading-none" aria-hidden>
                  {getAnnouncementEmoji(a.type)}
                </span>
              </div>
              <p className="mt-3 truncate text-sm font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">{a.title}</p>
              <p className="mt-2 line-clamp-2 text-xs font-medium text-slate-600 dark:text-slate-400">{a.content}</p>
            </Link>
          ))}
          <Link
            to={getLink('portal.photos')}
            className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-8 text-slate-500 transition-colors hover:bg-slate-100 sm:min-w-[240px] dark:bg-slate-900/70 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <span className="text-sm font-bold uppercase tracking-wide">Photos</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
