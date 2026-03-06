import { useState, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import {
  DollarSign,
  AlertTriangle,
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  Calendar,
  CalendarX,
  Megaphone,
  MessageSquare,
  ShieldAlert,
  Settings,
  Trophy,
  Ticket,
  Mail,
  type LucideIcon,
} from 'lucide-react'

import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import type { TranslationKey } from '../../i18n'
import { getLink } from '../../utils/routes'
import { getTeams } from '../../data/services/teamsService'
import { getAthletes } from '../../data/services/familyService'
import { getUnpaidFeeAssignmentsForOrg } from '../../data/services/paymentsService'
import { getUpcomingEventsForUser } from '../../data/services/eventsService'
import { getSeasons } from '../../data/services/seasonsService'
import { getNotifications } from '../../data/services/userNotificationsService'
import type { NotificationRecord } from '../../types/notifications'
import { USE_FAKE_DATA } from '../../data/config'
import { getOrgDashboardKpis } from '../../services/reportingService'
import { STORAGE_KEYS } from '../../constants/storage'
import {
  AdminPageHeader,
  Button,
  Select,
} from '../../components/admin'
import PullToRefreshContainer from '../../components/common/mobile/PullToRefreshContainer'
import { cn } from '../../utils/cn'
import { DEMO_PAGE_IMAGES } from '../../utils/demoImagePlaceholders'
import '../../styles/orgAdmin.css'

// ─── Unsplash imagery (free, production-safe, sports-themed) ────────────
const REMOTE_IMG = {
  heroStadium: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1600&q=80',
  heroTrack: 'https://images.unsplash.com/photo-1461896836934-bd45ba8fcde5?auto=format&fit=crop&w=1600&q=80',
  heroBasketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=80',
  cardSchedule: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1800&q=90',
  cardPlayers: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1800&q=90',
  cardPayments: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1800&q=90',
  cardTraining: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1800&q=90',
  cardField: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1800&q=90',
  cardUniforms: 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?auto=format&fit=crop&w=1800&q=90',
}

const LOCAL_FAKE_IMG = DEMO_PAGE_IMAGES.adminDashboard

const IMG = USE_FAKE_DATA ? LOCAL_FAKE_IMG : REMOTE_IMG

// ─── Types ──────────────────────────────────────────────────────────────
type DashboardLayout = 'stadium' | 'editorial' | 'athlete'
type TFunc = (key: TranslationKey, params?: Record<string, string | number>) => string

interface DashboardStats {
  totalTeams: number
  totalPlayers: number
  activeSeasons: number
  outstandingPayments: number
  upcomingEvents: number
  pendingUniformOrders: number
}

interface RecentActivity {
  id: string
  type: string
  message: string
  timestamp: string
  icon?: LucideIcon
  actionState?: string
  actionStateTone?: 'default' | 'warning' | 'urgent' | 'success'
  href?: string
}

// ─── Org-admin notification helpers ────────────────────────────────────

function getOrgAdminNotificationIcon(action: NotificationRecord['action']): LucideIcon {
  switch (action) {
    // Payments
    case 'fee_payment_completed':
    case 'fee_payment_partial':
    case 'payout_processed':
      return DollarSign
    case 'fee_payment_failed':
    case 'fee_overdue':
    case 'payout_account_issue':
      return AlertTriangle
    case 'fee_assigned':
    case 'fee_created':
      return DollarSign
    // Athletes & roster
    case 'athlete_created':
    case 'guardian_attached':
      return UserPlus
    case 'athlete_removed':
    case 'guardian_detached':
    case 'athlete_removed_from_team':
      return UserMinus
    case 'athlete_added_to_team':
      return UserCheck
    // Teams / Programs
    case 'team_created':
    case 'team_updated':
    case 'team_archived':
    case 'program_created':
    case 'program_updated':
    case 'program_removed':
      return Trophy
    // Events
    case 'event_created':
    case 'event_updated':
    case 'event_rescheduled':
    case 'event_time_changed':
    case 'event_location_updated':
    case 'event_rsvp_required':
    case 'event_rsvp_updated':
    case 'event_attendance_updated':
    case 'travel_created':
    case 'travel_updated':
    case 'travel_dates_changed':
    case 'travel_location_changed':
      return Calendar
    case 'event_canceled':
    case 'travel_canceled':
    case 'event_weather_alert':
      return CalendarX
    // Announcements
    case 'announcement_created':
    case 'announcement_updated':
    case 'announcement_urgent':
      return Megaphone
    // Messages
    case 'message_sent':
    case 'message_pinned':
    case 'huddle_created':
    case 'user_mentioned':
      return MessageSquare
    case 'message_reported':
      return ShieldAlert
    // Invitations & Access
    case 'invite_sent':
    case 'invite_accepted':
    case 'invite_expired':
    case 'role_assigned':
    case 'role_removed':
    case 'access_revoked':
      return Mail
    // Uniforms
    case 'uniform_order_opened':
    case 'uniform_order_updated':
    case 'uniform_order_closed':
    case 'uniform_size_requested':
    case 'uniform_size_submitted':
    case 'uniform_missing_info':
      return Ticket
    // Roster counts
    case 'athlete_updated':
      return Users
    // System / Licenses
    case 'license_activated':
    case 'license_expiring':
    case 'license_expired':
    case 'license_upgraded':
    case 'feature_enabled':
    case 'feature_disabled':
    case 'system_generated_notice':
      return Settings
    default:
      return Settings
  }
}

function getOrgAdminActionState(
  notification: NotificationRecord,
): { label: string; tone: RecentActivity['actionStateTone'] } | null {
  const { action, presentation_type } = notification
  switch (action) {
    case 'fee_payment_failed':
      return { label: 'Payment failed', tone: 'urgent' }
    case 'fee_overdue':
      return { label: 'Overdue', tone: 'urgent' }
    case 'payout_account_issue':
      return { label: 'Payout issue', tone: 'urgent' }
    case 'fee_payment_completed':
      return { label: 'Paid', tone: 'success' }
    case 'payout_processed':
      return { label: 'Paid out', tone: 'success' }
    case 'event_canceled':
    case 'travel_canceled':
      return { label: 'Canceled', tone: 'warning' }
    case 'event_weather_alert':
      return { label: 'Weather alert', tone: 'urgent' }
    case 'announcement_urgent':
      return { label: 'Urgent', tone: 'urgent' }
    case 'message_reported':
      return { label: 'Reported', tone: 'urgent' }
    case 'invite_expired':
      return { label: 'Expired', tone: 'warning' }
    case 'access_revoked':
    case 'role_removed':
      return { label: 'Revoked', tone: 'warning' }
    case 'license_expiring':
      return { label: 'Expiring soon', tone: 'warning' }
    case 'license_expired':
      return { label: 'Expired', tone: 'urgent' }
    case 'invite_accepted':
    case 'role_assigned':
      return { label: 'Accepted', tone: 'success' }
    case 'team_created':
    case 'athlete_created':
    case 'program_created':
      return { label: 'New', tone: 'success' }
    default:
      if (presentation_type === 'urgent') return { label: 'Urgent', tone: 'urgent' }
      if (presentation_type === 'warning') return { label: 'Attention', tone: 'warning' }
      return null
  }
}

function resolveOrgAdminNotificationHref(notification: NotificationRecord): string {
  const paymentActions: NotificationRecord['action'][] = [
    'fee_created',
    'fee_assigned',
    'fee_updated',
    'fee_removed',
    'fee_payment_partial',
    'fee_payment_completed',
    'fee_payment_failed',
    'fee_overdue',
  ]

  if (paymentActions.includes(notification.action)) {
    if (notification.entity_id) {
      return getLink('admin.payments.detail', { id: notification.entity_id })
    }
    return getLink('admin.payments.list')
  }

  return notification.link_url ?? getLink('admin.notifications')
}

interface UpcomingEvent {
  id: string
  title: string
  start_time: string
  event_type?: string
}

interface VariantProps {
  stats: DashboardStats
  recentActivity: RecentActivity[]
  upcomingEvents: UpcomingEvent[]
  t: TFunc
  navigate: NavigateFunction
  orgName: string
}

// ─── Persistence ────────────────────────────────────────────────────────
const LAYOUT_STORAGE_KEY = STORAGE_KEYS.DRAFT_FORM_DATA + ':dashboard-layout'

function loadLayout(): DashboardLayout {
  try {
    const v = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (v === 'stadium' || v === 'editorial' || v === 'athlete') return v
  } catch { /* noop */ }
  return 'stadium'
}

function saveLayout(l: DashboardLayout) {
  try { localStorage.setItem(LAYOUT_STORAGE_KEY, l) } catch { /* noop */ }
}

// ─── Helpers ────────────────────────────────────────────────────────────
function getGreetingKey(): TranslationKey {
  const h = new Date().getHours()
  if (h < 12) return 'admin.dashboard.greetingMorning' as TranslationKey
  if (h < 17) return 'admin.dashboard.greetingAfternoon' as TranslationKey
  return 'admin.dashboard.greetingEvening' as TranslationKey
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return {
    month: d.toLocaleDateString(undefined, { month: 'short' }),
    day: d.getDate(),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    relative: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
  }
}

// ─── Shared activity row primitive ─────────────────────────────────────

const ACTIVITY_TONE_CLASSES: Record<
  NonNullable<RecentActivity['actionStateTone']>,
  string
> = {
  default: 'bg-slate-200/80 text-slate-700',
  warning: 'bg-amber-100 text-amber-800',
  urgent: 'bg-rose-100 text-rose-800',
  success: 'bg-emerald-100 text-emerald-800',
}

function ActivityRow({ item }: { item: RecentActivity }) {
  const Icon = item.icon
  const inner = (
    <div className="dash-activity-row" style={{ alignItems: 'flex-start', gap: 10, cursor: item.href ? 'pointer' : 'default' }}>
      {/* Icon circle — falls back to the existing dot style */}
      <div
        style={{
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--dash-activity-dot-bg, rgba(100,116,139,0.15))',
          marginTop: 2,
        }}
      >
        {Icon ? (
          <Icon style={{ width: 15, height: 15, color: 'var(--dash-activity-dot-color, #64748b)' }} />
        ) : (
          <div className="dash-activity-dot" />
        )}
      </div>
      <div className="dash-activity-body" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 8px' }}>
          <span className="dash-activity-msg">{item.message}</span>
          {item.actionState && item.actionStateTone && (
            <span
              className={`${ACTIVITY_TONE_CLASSES[item.actionStateTone]} dark:opacity-90`}
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {item.actionState}
            </span>
          )}
        </div>
        <span className="dash-activity-time">{fmtDate(item.timestamp).relative}</span>
      </div>
    </div>
  )

  if (item.href) {
    return (
      <a href={item.href} className="dash-activity-anchor" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        {inner}
      </a>
    )
  }
  return inner
}

// ─── Shared Primitives ─────────────────────────────────────────────────

/** Full-bleed image card with dark overlay + children on top */
function HeroImageCard({
  src, alt, children, style, className, onClick, height,
}: {
  src: string; alt: string; children: ReactNode; style?: CSSProperties
  className?: string; onClick?: () => void; height?: string | number
}) {
  return (
    <div
      className={cn('dash-hero-card', onClick && 'dash-clickable', className)}
      style={{ ...style, ...(height ? { minHeight: height } : {}) }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
    >
      <img src={src} alt={alt} className="dash-hero-img" loading="lazy" />
      <div className="dash-hero-overlay" />
      <div className="dash-hero-content">{children}</div>
    </div>
  )
}

/** Glass-morphism stat chip */
function GlassStat({ icon, value, label, color, onClick }: {
  icon: string; value: number | string; label: string; color?: string; onClick?: () => void
}) {
  return (
    <div
      className={cn('dash-glass-stat', onClick && 'dash-clickable')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter') onClick() } : undefined}
    >
      <span className="material-symbols-outlined dash-glass-icon" style={color ? { color } : {}} aria-hidden>{icon}</span>
      <span className="dash-glass-value">{value}</span>
      <span className="dash-glass-label">{label}</span>
    </div>
  )
}

/** Vertical stat tower (Athlete variant) */
function StatTower({ value, label, accent, onClick }: {
  value: number | string; label: string; accent: string; onClick?: () => void
}) {
  return (
    <div className={cn('dash-stat-tower', onClick && 'dash-clickable')} onClick={onClick}
      role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter') onClick() } : undefined}>
      <div className="dash-stat-tower-bar" style={{ background: accent }} />
      <span className="dash-stat-tower-val">{value}</span>
      <span className="dash-stat-tower-label">{label}</span>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="oa-root">
      <div className="oa-skeleton oa-mb-8" style={{ width: '40%', height: '40px' }} />
      <div className="oa-skeleton oa-mb-6" style={{ height: '340px', borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
        <div className="oa-skeleton" style={{ height: '200px', borderRadius: 16 }} />
        <div className="oa-skeleton" style={{ height: '200px', borderRadius: 16 }} />
        <div className="oa-skeleton" style={{ height: '200px', borderRadius: 16 }} />
      </div>
    </div>
  )
}

// ─── Quick-action configs ───────────────────────────────────────────────
function useQuickActions(navigate: NavigateFunction, t: TFunc) {
  return [
    { icon: 'qr_code_scanner', label: t('admin.dashboard.actionNewEvent'), onClick: () => navigate(getLink('admin.ticketingScanner')), img: IMG.cardSchedule },
    { icon: 'video_library', label: t('admin.dashboard.actionAddUser'), onClick: () => navigate(getLink('admin.videos.list')), img: IMG.cardPlayers },
    { icon: 'request_quote', label: t('admin.dashboard.actionAssignFee'), onClick: () => navigate(getLink('admin.payments.create')), img: IMG.cardPayments },
    { icon: 'add_circle', label: t('admin.dashboard.actionManageTeams'), onClick: () => navigate(getLink('admin.events.create')), img: IMG.cardTraining },
    { icon: 'photo_library', label: t('admin.dashboard.actionPhotos'), onClick: () => navigate(getLink('admin.photos.list')), img: IMG.cardField },
    { icon: 'campaign', label: t('admin.dashboard.actionAnnouncement'), onClick: () => navigate(getLink('admin.announcements')), img: IMG.cardUniforms },
  ]
}


// ═════════════════════════════════════════════════════════════════════════
// VARIANT 1 — "STADIUM"
//
// Nike.com homepage aesthetic: full-bleed hero with massive Oswald
// headline, floating glass-stat bar that overlaps the hero, asymmetric
// 7/5 bento grid below with image-backed action cards.
// ═════════════════════════════════════════════════════════════════════════

function StadiumDashboard({ stats, recentActivity, upcomingEvents, t, navigate, orgName }: VariantProps) {
  const actions = useQuickActions(navigate, t)

  return (
    <div className="dash-stadium">
      {/* ── HERO ─────────────────────────────────────── */}
      <HeroImageCard src={IMG.heroStadium} alt="" height={380} className="dash-stadium-hero">
        <div className="dash-stadium-hero-inner">
          <p className="dash-stadium-eyebrow">{orgName}</p>
          <h1 className="dash-stadium-headline">{t(getGreetingKey())}</h1>
          <p className="dash-stadium-sub">{t('admin.dashboard.heroTagline')}</p>
          <div className="dash-stadium-hero-actions">
            <Button variant="primary" onClick={() => navigate(getLink('admin.ticketingScanner'))}>
              <span className="material-symbols-outlined oa-icon-sm" aria-hidden>add</span>
              {t('admin.dashboard.actionNewEvent')}
            </Button>
            <Button variant="ghost" onClick={() => navigate(getLink('admin.events.create'))}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}>
              {t('admin.dashboard.actionManageTeams')}
            </Button>
          </div>
        </div>
      </HeroImageCard>

      {/* ── FLOATING STATS BAR ──────────────────────── */}
      <div className="dash-stadium-stats-bar">
        <GlassStat icon="groups" value={stats.totalTeams} label={t('admin.dashboard.totalTeams')} color="#3b82f6"
          onClick={() => navigate(getLink('admin.teams.list'))} />
        <GlassStat icon="person" value={stats.totalPlayers} label={t('admin.dashboard.totalAthletes')} color="#10b981"
          onClick={() => navigate(getLink('admin.athletes.list'))} />
        <GlassStat icon="calendar_today" value={stats.activeSeasons} label={t('admin.dashboard.activeSeasons')} color="#f59e0b" />
        <GlassStat icon="payments" value={`$${stats.outstandingPayments.toFixed(2)}`} label={t('admin.dashboard.unpaidFees')} color="#ef4444"
          onClick={() => navigate(getLink('admin.payments.list'))} />
        <GlassStat icon="event" value={stats.upcomingEvents} label={t('admin.dashboard.upcomingEvents')} color="#8b5cf6"
          onClick={() => navigate(getLink('admin.events.list'))} />
        <GlassStat icon="checkroom" value={stats.pendingUniformOrders} label={t('admin.dashboard.uniformOrders')} color="#ec4899"
          onClick={() => navigate(getLink('admin.uniforms.list'))} />
      </div>

      {/* ── BENTO GRID ──────────────────────────────── */}
      <div className="dash-stadium-bento">
        {/* LEFT — big actions column */}
        <div className="dash-stadium-bento-left">
          <h2 className="dash-section-title">{t('admin.dashboard.quickActions')}</h2>
          <div className="dash-stadium-actions">
            {actions.map(a => (
              <HeroImageCard key={a.icon} src={a.img} alt={a.label} onClick={a.onClick}
                className="dash-stadium-action-card">
                <span className="material-symbols-outlined dash-action-icon" aria-hidden>{a.icon}</span>
                <span className="dash-action-label">{a.label}</span>
              </HeroImageCard>
            ))}
          </div>
        </div>

        {/* RIGHT — events + activity stacked */}
        <div className="dash-stadium-bento-right">
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h2 className="dash-section-title" style={{ margin: 0 }}>{t('admin.dashboard.upcomingEventsTitle')}</h2>
              <Button variant="ghost" size="dense" onClick={() => navigate(getLink('admin.events.list'))}>
                {t('admin.dashboard.viewAll')}
              </Button>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="dash-empty">{t('admin.dashboard.noUpcomingEvents')}</p>
            ) : (
              <div className="dash-event-list">
                {upcomingEvents.slice(0, 5).map(evt => {
                  const d = fmtDate(evt.start_time)
                  return (
                    <div key={evt.id} className="dash-event-row dash-clickable" role="button" tabIndex={0}
                      onClick={() => navigate(getLink('admin.events.detail', { id: evt.id }))}
                      onKeyDown={e => { if (e.key === 'Enter') navigate(getLink('admin.events.detail', { id: evt.id })) }}>
                      <div className="dash-event-date">
                        <span className="dash-event-month">{d.month}</span>
                        <span className="dash-event-day">{d.day}</span>
                      </div>
                      <div className="dash-event-info">
                        <span className="dash-event-title">{evt.title}</span>
                        <span className="dash-event-time">{d.time}{evt.event_type ? ` · ${evt.event_type}` : ''}</span>
                      </div>
                      <span className="material-symbols-outlined dash-chevron" aria-hidden>chevron_right</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="dash-panel">
            <div className="dash-panel-header">
              <h2 className="dash-section-title" style={{ margin: 0 }}>{t('admin.dashboard.recentActivity')}</h2>
              <Button variant="ghost" size="dense" onClick={() => navigate(getLink('admin.notifications'))}>
                {t('admin.dashboard.viewAll')}
              </Button>
            </div>
            {recentActivity.length === 0 ? (
              <p className="dash-empty">{t('admin.dashboard.noRecentActivity')}</p>
            ) : (
              <div className="dash-activity-list">
                {recentActivity.map(a => (
                  <ActivityRow key={a.id} item={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


// ═════════════════════════════════════════════════════════════════════════
// VARIANT 2 — "EDITORIAL"
//
// Nike SNKRS / magazine layout: cinematic ultra-wide image strip,
// oversized stat numbers on a dark band, asymmetric 2-1 / 1-2 image
// mosaic cards, and an activity ticker bar.
// ═════════════════════════════════════════════════════════════════════════

function EditorialDashboard({ stats, recentActivity, upcomingEvents, t, navigate, orgName }: VariantProps) {
  const actions = useQuickActions(navigate, t)

  const statCols: { value: number | string; label: string; accent: string; onClick?: () => void }[] = [
    { value: stats.totalTeams, label: t('admin.dashboard.totalTeams'), accent: '#3b82f6', onClick: () => navigate(getLink('admin.teams.list')) },
    { value: stats.totalPlayers, label: t('admin.dashboard.totalAthletes'), accent: '#10b981', onClick: () => navigate(getLink('admin.athletes.list')) },
    { value: stats.activeSeasons, label: t('admin.dashboard.activeSeasons'), accent: '#f59e0b' },
    { value: `$${stats.outstandingPayments.toFixed(2)}`, label: t('admin.dashboard.unpaidFees'), accent: '#ef4444', onClick: () => navigate(getLink('admin.payments.list')) },
    { value: stats.upcomingEvents, label: t('admin.dashboard.upcomingEvents'), accent: '#8b5cf6', onClick: () => navigate(getLink('admin.events.list')) },
  ]

  return (
    <div className="dash-editorial">
      {/* ── CINEMATIC TOP + STATS ───────────────────── */}
      <div className="dash-editorial-hero-container">
        <div className="dash-editorial-cinema">
          <img src={IMG.heroTrack} alt="" className="dash-editorial-bg" loading="lazy" />
          <div className="dash-editorial-cinema-overlay" />
          <div className="dash-editorial-cinema-content">
            <span className="dash-editorial-tag">{orgName}</span>
            <h1 className="dash-editorial-headline">
              {t(getGreetingKey())}<span className="dash-editorial-dot">.</span>
            </h1>
            <p className="dash-editorial-lead">{t('admin.dashboard.editorialLead')}</p>
          </div>
        </div>

        {/* ── STATS DARK BAND ─────────────────────────── */}
        <div className="dash-editorial-stats-band">
          {statCols.map((s, i) => (
            <div key={i} className={cn('dash-editorial-stat', s.onClick && 'dash-clickable')}
              onClick={s.onClick} role={s.onClick ? 'button' : undefined} tabIndex={s.onClick ? 0 : undefined}
              onKeyDown={s.onClick ? e => { if (e.key === 'Enter') s.onClick!() } : undefined}>
              <span className="dash-editorial-stat-val" style={{ color: s.accent }}>{s.value}</span>
              <span className="dash-editorial-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MOSAIC ──────────────────────────────────── */}
      <div className="dash-editorial-mosaic">
        {/* Row 1: 2fr / 1fr */}
        <div className="dash-editorial-mosaic-row">
          <HeroImageCard src={actions[0].img} alt={actions[0].label} onClick={actions[0].onClick}
            className="dash-editorial-card dash-editorial-card--wide">
            <span className="material-symbols-outlined dash-editorial-card-icon" aria-hidden>{actions[0].icon}</span>
            <span className="dash-editorial-card-label">{actions[0].label}</span>
          </HeroImageCard>
          <HeroImageCard src={actions[1].img} alt={actions[1].label} onClick={actions[1].onClick}
            className="dash-editorial-card">
            <span className="material-symbols-outlined dash-editorial-card-icon" aria-hidden>{actions[1].icon}</span>
            <span className="dash-editorial-card-label">{actions[1].label}</span>
          </HeroImageCard>
        </div>

        {/* Row 2: 1fr / 2fr */}
        <div className="dash-editorial-mosaic-row">
          <HeroImageCard src={actions[2].img} alt={actions[2].label} onClick={actions[2].onClick}
            className="dash-editorial-card">
            <span className="material-symbols-outlined dash-editorial-card-icon" aria-hidden>{actions[2].icon}</span>
            <span className="dash-editorial-card-label">{actions[2].label}</span>
          </HeroImageCard>
          <HeroImageCard src={actions[3].img} alt={actions[3].label} onClick={actions[3].onClick}
            className="dash-editorial-card dash-editorial-card--wide">
            <span className="material-symbols-outlined dash-editorial-card-icon" aria-hidden>{actions[3].icon}</span>
            <span className="dash-editorial-card-label">{actions[3].label}</span>
          </HeroImageCard>
        </div>

        {/* Row 3: 1fr / 1fr / events sidebar */}
        <div className="dash-editorial-mosaic-row dash-editorial-mosaic-row--triple">
          <HeroImageCard src={actions[4].img} alt={actions[4].label} onClick={actions[4].onClick}
            className="dash-editorial-card">
            <span className="material-symbols-outlined dash-editorial-card-icon" aria-hidden>{actions[4].icon}</span>
            <span className="dash-editorial-card-label">{actions[4].label}</span>
          </HeroImageCard>
          <HeroImageCard src={actions[5].img} alt={actions[5].label} onClick={actions[5].onClick}
            className="dash-editorial-card">
            <span className="material-symbols-outlined dash-editorial-card-icon" aria-hidden>{actions[5].icon}</span>
            <span className="dash-editorial-card-label">{actions[5].label}</span>
          </HeroImageCard>
          <div className="dash-editorial-events-card">
            <h3 className="dash-section-title" style={{ margin: '0 0 16px' }}>{t('admin.dashboard.upcomingEventsTitle')}</h3>
            {upcomingEvents.length === 0 ? (
              <p className="dash-empty">{t('admin.dashboard.noUpcomingEvents')}</p>
            ) : upcomingEvents.slice(0, 4).map(evt => {
              const d = fmtDate(evt.start_time)
              return (
                <div key={evt.id} className="dash-event-row dash-clickable" role="button" tabIndex={0}
                  onClick={() => navigate(getLink('admin.events.detail', { id: evt.id }))}
                  onKeyDown={e => { if (e.key === 'Enter') navigate(getLink('admin.events.detail', { id: evt.id })) }}>
                  <div className="dash-event-date"><span className="dash-event-month">{d.month}</span><span className="dash-event-day">{d.day}</span></div>
                  <div className="dash-event-info"><span className="dash-event-title">{evt.title}</span><span className="dash-event-time">{d.time}</span></div>
                </div>
              )
            })}
            <Button variant="ghost" size="dense" onClick={() => navigate(getLink('admin.events.list'))} style={{ marginTop: 12 }}>
              {t('admin.dashboard.viewAll')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── RECENT ACTIVITY BAR ──────────────────────── */}
      {recentActivity.length > 0 && (
        <div className="dash-editorial-activity-bar">
          <div className="dash-panel-header" style={{ marginBottom: 20 }}>
            <h2 className="dash-section-title" style={{ margin: 0 }}>{t('admin.dashboard.recentActivity')}</h2>
            <Button variant="ghost" size="dense" onClick={() => navigate(getLink('admin.notifications'))}>
              {t('admin.dashboard.viewAll')}
            </Button>
          </div>
          <div className="dash-activity-list">
            {recentActivity.map(a => (
              <ActivityRow key={a.id} item={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ═════════════════════════════════════════════════════════════════════════
// VARIANT 3 — "ATHLETE"
//
// Nike Training Club aesthetic: split-screen hero (image left / data
// right), bold vertical stat towers with colored accent bars, card-based
// action grid with full-image backgrounds and hover-zoom, and a vertical
// timeline sidebar.
// ═════════════════════════════════════════════════════════════════════════

function AthleteDashboard({ stats, recentActivity, upcomingEvents, t, navigate, orgName }: VariantProps) {
  const actions = useQuickActions(navigate, t)

  return (
    <div className="dash-athlete">
      {/* ── SPLIT HERO ──────────────────────────────── */}
      <div className="dash-athlete-split">
        <div className="dash-athlete-split-img">
          <img src={IMG.heroBasketball} alt="" loading="lazy" />
          <div className="dash-athlete-split-gradient" />
        </div>
        <div className="dash-athlete-split-data">
          <span className="dash-athlete-eyebrow">{orgName}</span>
          <h1 className="dash-athlete-headline">{t(getGreetingKey())}</h1>
          <p className="dash-athlete-sub">{t('admin.dashboard.athleteTagline')}</p>

          {/* Stat towers */}
          <div className="dash-athlete-towers">
            <StatTower value={stats.totalTeams} label={t('admin.dashboard.totalTeams')} accent="#3b82f6"
              onClick={() => navigate(getLink('admin.teams.list'))} />
            <StatTower value={stats.totalPlayers} label={t('admin.dashboard.totalAthletes')} accent="#10b981"
              onClick={() => navigate(getLink('admin.athletes.list'))} />
            <StatTower value={stats.activeSeasons} label={t('admin.dashboard.activeSeasons')} accent="#f59e0b" />
            <StatTower value={`$${stats.outstandingPayments.toFixed(2)}`} label={t('admin.dashboard.unpaidFees')} accent="#ef4444"
              onClick={() => navigate(getLink('admin.payments.list'))} />
          </div>
        </div>
      </div>

      {/* ── ATTENTION BANNER ────────────────────────── */}
      {stats.outstandingPayments > 0 && (
        <div className="dash-athlete-alert dash-clickable" role="button" tabIndex={0}
          onClick={() => navigate(getLink('admin.payments.list'))}
          onKeyDown={e => { if (e.key === 'Enter') navigate(getLink('admin.payments.list')) }}>
          <span className="material-symbols-outlined dash-athlete-alert-icon" aria-hidden>warning</span>
          <div>
            <strong>{t('admin.dashboard.attentionUnpaidTitle')}</strong>
            <span className="dash-athlete-alert-sub">
              ${stats.outstandingPayments.toFixed(2)} {t('admin.dashboard.unpaidFees').toLowerCase()} — {t('admin.dashboard.attentionUnpaidAction')}
            </span>
          </div>
          <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
        </div>
      )}

      {/* ── ACTIONS GRID ─────────────────────────────── */}
      <h2 className="dash-section-title" style={{ marginTop: 40 }}>{t('admin.dashboard.quickActions')}</h2>
      <div className="dash-athlete-actions">
        {actions.map(a => (
          <div key={a.icon} className="dash-athlete-action-card dash-clickable" onClick={a.onClick}
            role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.onClick() } }}>
            <img src={a.img} alt="" className="dash-athlete-action-bg" loading="lazy" />
            <div className="dash-athlete-action-overlay" />
            <div className="dash-athlete-action-content">
              <span className="material-symbols-outlined dash-athlete-action-icon" aria-hidden>{a.icon}</span>
              <span className="dash-athlete-action-label">{a.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── BOTTOM TWO-COL ──────────────────────────── */}
      <div className="dash-athlete-bottom">
        {/* Timeline */}
        <div className="dash-panel dash-athlete-timeline">
          <div className="dash-panel-header">
            <h2 className="dash-section-title" style={{ margin: 0 }}>{t('admin.dashboard.upcomingEventsTitle')}</h2>
            <Button variant="ghost" size="dense" onClick={() => navigate(getLink('admin.events.list'))}>{t('admin.dashboard.viewAll')}</Button>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="dash-empty">{t('admin.dashboard.noUpcomingEvents')}</p>
          ) : (
            <div className="dash-athlete-tl">
              {upcomingEvents.slice(0, 6).map((evt, i) => {
                const d = fmtDate(evt.start_time)
                return (
                  <div key={evt.id} className="dash-athlete-tl-item dash-clickable" role="button" tabIndex={0}
                    onClick={() => navigate(getLink('admin.events.detail', { id: evt.id }))}
                    onKeyDown={e => { if (e.key === 'Enter') navigate(getLink('admin.events.detail', { id: evt.id })) }}
                    style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="dash-athlete-tl-line" />
                    <div className="dash-athlete-tl-dot" />
                    <div className="dash-athlete-tl-card">
                      <div className="dash-athlete-tl-date">{d.month} {d.day}</div>
                      <div className="dash-athlete-tl-title">{evt.title}</div>
                      <div className="dash-athlete-tl-meta">{d.time}{evt.event_type ? ` · ${evt.event_type}` : ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h2 className="dash-section-title" style={{ margin: 0 }}>{t('admin.dashboard.recentActivity')}</h2>
            <Button variant="ghost" size="dense" onClick={() => navigate(getLink('admin.notifications'))}>
              {t('admin.dashboard.viewAll')}
            </Button>
          </div>
          {recentActivity.length === 0 ? (
            <p className="dash-empty">{t('admin.dashboard.noRecentActivity')}</p>
          ) : (
            <div className="dash-activity-list">
              {recentActivity.map(a => (
                <ActivityRow key={a.id} item={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ═════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const [layout, setLayout] = useState<DashboardLayout>(() => loadLayout())
  const [stats, setStats] = useState<DashboardStats>({
    totalTeams: 0, totalPlayers: 0, activeSeasons: 0,
    outstandingPayments: 0, upcomingEvents: 0, pendingUniformOrders: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const { currentOrganization } = useOrganization()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const t = useT()

  const handleLayoutChange = useCallback((v: DashboardLayout) => { setLayout(v); saveLayout(v) }, [])

  const fetchDashboardData = useCallback(async () => {
    if (!isReady) { setLoading(false); return }
    try {
      const [teamsR, childrenR, unpaidR, eventsR, seasonsR, kpisR] = await Promise.all([
        getTeams(context, { activeOnly: false }),
        getAthletes(context),
        getUnpaidFeeAssignmentsForOrg(context),
        getUpcomingEventsForUser(context, 100),
        getSeasons(context, { activeOnly: true }),
        getOrgDashboardKpis(context.orgId),
      ])
      
      if (unpaidR.error) {
        console.error('[Dashboard] Unpaid fees error:', unpaidR.error)
      }
      console.log('[Dashboard] Unpaid fees count:', unpaidR.data.length, 'orgId:', context.orgId)
      if (unpaidR.data.length > 0) {
        console.log('[Dashboard] First unpaid row:', JSON.stringify(unpaidR.data[0]))
      }
      
      // Calculate total unpaid amount in dollars
      // Supabase uses balance_cents, fake data uses amount_due_cents/amount_paid_cents
      const totalUnpaidAmount = unpaidR.data.reduce((sum, assignment: any) => {
        if (assignment.balance_cents != null) {
          return sum + assignment.balance_cents
        }
        const amountDue = assignment.amount_due_cents || 0
        const amountPaid = assignment.amount_paid_cents || 0
        return sum + (amountDue - amountPaid)
      }, 0) / 100

      console.log('[Dashboard] Total unpaid amount:', totalUnpaidAmount)

      const fallbackStats: DashboardStats = {
        totalTeams: teamsR.data.length,
        totalPlayers: childrenR.data.length,
        activeSeasons: seasonsR.data.length,
        outstandingPayments: totalUnpaidAmount,
        upcomingEvents: eventsR.data.length,
        pendingUniformOrders: 0,
      }

      const unifiedStats: DashboardStats = kpisR.data
        ? {
            totalTeams: kpisR.data.totalTeams,
            totalPlayers: kpisR.data.totalAthletes,
            activeSeasons: kpisR.data.activeSeasons,
            outstandingPayments: kpisR.data.outstandingBalanceCents / 100,
            upcomingEvents: kpisR.data.upcomingEvents,
            pendingUniformOrders: kpisR.data.pendingUniformOrders,
          }
        : fallbackStats

      setStats(unifiedStats)
      setUpcomingEvents(
        eventsR.data.slice(0, 10).map((e: { id: string; title?: string; name?: string; start_time?: string; start_date?: string; event_type?: string }) => ({
          id: e.id, title: e.title || e.name || '', start_time: e.start_time || e.start_date || '', event_type: e.event_type,
        })),
      )

      // ── Recent activity: pull notifications for org_admin role ──
      const notificationsR = await getNotifications(context, { limit: 20 })
      const activities: RecentActivity[] = (notificationsR.data ?? []).map(
        (n: NotificationRecord) => {
          const state = getOrgAdminActionState(n)
          return {
            id: n.id,
            type: n.action,
            message: n.title || n.body || n.action,
            timestamp: n.created_at,
            icon: getOrgAdminNotificationIcon(n.action),
            actionState: state?.label,
            actionStateTone: state?.tone,
            href: resolveOrgAdminNotificationHref(n),
          }
        },
      )
      setRecentActivity(activities.slice(0, 10))
    } finally { setLoading(false) }
  }, [context, isReady, t])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  if (loading) return <DashboardSkeleton />

  const orgName = currentOrganization?.name || ''
  const layoutOptions = [
    { value: 'stadium', label: t('admin.dashboard.layoutStadium') },
    { value: 'editorial', label: t('admin.dashboard.layoutEditorial') },
    { value: 'athlete', label: t('admin.dashboard.layoutAthlete') },
  ]
  const props: VariantProps = { stats, recentActivity, upcomingEvents, t, navigate, orgName }

  return (
    <div className="oa-root" data-testid="dashboard">
      <PullToRefreshContainer onRefresh={fetchDashboardData}>
        <AdminPageHeader
          title={t('admin.dashboard.title')}
          subtitle={orgName || t('admin.dashboard.subtitle')}
          actions={
            <div className="oa-flex oa-items-center oa-gap-3" style={{ flexWrap: 'wrap' }}>
              <div className="oa-flex oa-flex-col oa-gap-1">
                <span className="oa-text-xs oa-font-semibold oa-uppercase oa-tracking-wide oa-text-muted">
                  {t('admin.dashboard.layoutLabel')}
                </span>
                <Select
                  options={layoutOptions}
                  value={layout}
                  onChange={e => handleLayoutChange(e.target.value as DashboardLayout)}
                  aria-label={t('admin.dashboard.layoutLabel')}
                  style={{ minWidth: 180 }}
                />
              </div>
            </div>
          }
        />
        {layout === 'stadium' && <StadiumDashboard {...props} />}
        {layout === 'editorial' && <EditorialDashboard {...props} />}
        {layout === 'athlete' && <AthleteDashboard {...props} />}
      </PullToRefreshContainer>
    </div>
  )
}
