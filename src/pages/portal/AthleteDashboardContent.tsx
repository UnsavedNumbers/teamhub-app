import { Link } from 'react-router-dom'
import {
  Calendar,
  Megaphone,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getLink } from '../../utils/routes'
import { useUserContext } from '../../hooks/useUserContext'
import { getUpcomingEventsForUser } from '../../data/services/eventsService'
import { getAnnouncements } from '../../data/services/messagesService'
import { getTeamsForParent } from '../../data/services/teamsService'
import { getPrimarySportForUser } from '../../utils/sportContext'
import { getAnnouncementEmoji } from '../../utils/announcementTypes'
import type { Announcement } from '../../data/services/messagesService'
import type { CalendarEvent } from '../../types/calendar'
import type { SportInfo } from '../../utils/sportContext'
import { ContextHero, RecentActivityList } from '../../components/portal/workspace'
import { SportCardImage } from '../../components/portal/SportCardImage'
import type { RecentActivityItem } from '../../components/portal/workspace'
import { QUERY_CONFIG } from '../../constants/api'

const ATHLETE_ACTIONS = [
  { to: getLink('portal.calendar'), label: 'View Schedule', subtext: 'Upcoming events' },
  { to: getLink('portal.athletes'), label: 'View Team', subtext: 'Team info' },
  { to: getLink('portal.announcements'), label: 'Announcements', subtext: 'Latest updates' },
  { to: getLink('portal.calendar'), label: 'Attendance', subtext: 'Check-in status' },
  { to: getLink('portal.photos'), label: 'Photos', subtext: 'Team galleries' },
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
 * Athlete dashboard workspace content: action cards, hero, recent activity, chart, feed.
 */
export default function AthleteDashboardContent() {
  const { context, isReady } = useUserContext()
  const [sport, setSport] = useState<SportInfo | null>(null)

  useEffect(() => {
    if (!isReady || !context?.orgId) return
    getPrimarySportForUser(context).then(setSport).catch(() => setSport(null))
  }, [context, isReady])

  const { data: upcomingEvents } = useQuery({
    queryKey: ['portal-athlete-upcoming-events', context?.orgId],
    queryFn: async () => {
      const { data } = await getUpcomingEventsForUser(context!, 5)
      return data ?? []
    },
    enabled: isReady && !!context?.orgId,
    staleTime: QUERY_CONFIG.STALE_TIME_MS,
  })

  const { data: announcements } = useQuery({
    queryKey: ['portal-athlete-announcements', context?.orgId],
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

  const events = (upcomingEvents ?? []) as CalendarEvent[]
  const nextGame = events.find((e) => e.type === 'game')
  const headline = nextGame
    ? 'Game Day This Saturday'
    : events.length > 0
      ? 'Next up'
      : 'No events scheduled'
  const subtext = nextGame
    ? `vs ${(nextGame as any).opponent ?? 'TBD'} at ${new Date(nextGame.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    : events[0]
      ? `${events[0].title} • ${new Date(events[0].start_time).toLocaleDateString('en-US', { weekday: 'long' })}`
      : 'Check back for schedule updates.'

  const activityItems: RecentActivityItem[] = []
  announcements?.slice(0, 3).forEach((a) => {
    activityItems.push({
      id: a.id,
      title: a.title,
      subtitle: a.content?.slice(0, 60),
      href: `/portal/announcements/${a.id}`,
      icon: Megaphone,
      timestamp: formatTimeAgo(new Date(a.created_at)),
    })
  })
  events.slice(0, 2).forEach((e) => {
    activityItems.push({
      id: e.id,
      title: e.title,
      subtitle: new Date(e.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short' }),
      href: `/portal/calendar/events/${e.id}`,
      icon: Calendar,
      timestamp: 'Upcoming',
    })
  })

  const eventsThisWeek = events.filter((e) => {
    const start = new Date(e.start_time)
    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return start >= now && start <= weekEnd
  }).length
  const nextEventDate = events[0]
    ? new Date(events[0].start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : null

  return (
    <div className="space-y-8">
      <section>
        <h1 className="sr-only">Athlete dashboard</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900/70">
          {ATHLETE_ACTIONS.map((action) => (
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
        sport={sport}
        primaryAction={
          events[0]
            ? { label: 'Add to calendar', href: getLink('portal.calendar') }
            : undefined
        }
        secondaryActions={
          events[0]
            ? [
                { label: 'View travel details', href: getLink('portal.travel'), icon: 'travel' },
              ]
            : undefined
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivityList
            title="Recent activity"
            viewAllHref={getLink('portal.calendar')}
            items={activityItems}
            emptyMessage="No recent activity. Check announcements and schedule."
          />
        </div>
        <div>
          <div className="space-y-4">
            <section className="rounded-xl bg-slate-50 p-5 dark:bg-slate-900/70">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Events</p>
                  <p className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">{eventsThisWeek}</p>
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
                            type="travel"
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
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Progress</p>
              <p className="mt-2 text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">—</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">performance notes</p>
              <Link
                to={getLink('portal.athletes')}
                className="mt-4 block text-sm font-bold uppercase tracking-wide text-[var(--org-link-color)] hover:underline"
              >
                My profile →
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
          <Link
            to={getLink('portal.videos')}
            className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-8 text-slate-500 transition-colors hover:bg-slate-100 sm:min-w-[240px] dark:bg-slate-900/70 dark:text-slate-400 dark:hover:bg-slate-900"
          >
            <span className="text-sm font-bold uppercase tracking-wide">Highlights</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
