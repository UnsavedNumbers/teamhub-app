import { Link } from 'react-router-dom'
import {
  Calendar,
  Users,
  Megaphone,
  ClipboardCheck,
  Image,
  Trophy,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getLink } from '../../utils/routes'
import { useUserContext } from '../../hooks/useUserContext'
import { getUpcomingEventsForUser } from '../../data/services/eventsService'
import { getAnnouncements } from '../../data/services/messagesService'
import { getTeamsForParent } from '../../data/services/teamsService'
import { getPrimarySportForUser } from '../../utils/sportContext'
import type { Announcement } from '../../data/services/messagesService'
import type { CalendarEvent } from '../../types/calendar'
import type { SportInfo } from '../../utils/sportContext'
import { ActionCard, ContextHero, RecentActivityList, DataSnapshotChart } from '../../components/portal/workspace'
import type { RecentActivityItem } from '../../components/portal/workspace'
import { QUERY_CONFIG } from '../../constants/api'

const ATHLETE_ACTIONS = [
  { to: getLink('portal.calendar'), icon: Calendar, label: 'View Schedule', subtext: 'Upcoming events' },
  { to: getLink('portal.athletes'), icon: Users, label: 'View Team', subtext: 'Team info' },
  { to: getLink('portal.messages'), icon: Megaphone, label: 'Announcements', subtext: 'Latest updates' },
  { to: getLink('portal.calendar'), icon: ClipboardCheck, label: 'Attendance', subtext: 'Check-in status' },
  { to: getLink('portal.photos'), icon: Image, label: 'Photos', subtext: 'Team galleries' },
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
      href: `/portal/messages/${a.id}`,
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
        <h1 className="sr-only">Athlete dashboard</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {ATHLETE_ACTIONS.map((action) => (
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
          <DataSnapshotChart
            title="Attendance trend"
            data={chartData}
            valueLabel="Events"
          />
          <div className="mt-4 rounded-xl border-2 border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">Last 5</h3>
            <p className="mt-2 text-4xl font-black text-slate-900 dark:text-slate-100">—</p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">performance notes</p>
            <Link
              to={getLink('portal.athletes')}
              className="mt-4 block text-sm font-bold uppercase tracking-wide text-[var(--org-link-color)] hover:underline"
            >
              My profile →
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
          <Link
            to={getLink('portal.videos')}
            className="flex min-w-[240px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-slate-500 transition-all hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Trophy className="h-10 w-10" />
            <span className="mt-3 text-sm font-bold uppercase tracking-wide">Highlights</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
