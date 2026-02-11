import { useState, useEffect, useCallback, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'

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
import { STORAGE_KEYS } from '../../constants/storage'
import {
  AdminPageHeader,
  Button,
  Select,
} from '../../components/admin'
import { cn } from '../../utils/cn'
import '../../styles/orgAdmin.css'

// ─── Unsplash imagery (free, production-safe, sports-themed) ────────────
const IMG = {
  heroStadium: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1600&q=80',
  heroTrack: 'https://images.unsplash.com/photo-1461896836934-bd45ba8fcde5?auto=format&fit=crop&w=1600&q=80',
  heroBasketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=80',
  cardSchedule: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80',
  cardPlayers: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=800&q=80',
  cardPayments: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80',
  cardTraining: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=800&q=80',
  cardField: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  cardUniforms: 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?auto=format&fit=crop&w=800&q=80',
}

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
    { icon: 'add_circle', label: t('admin.dashboard.actionNewEvent'), onClick: () => navigate(getLink('admin.events.create')), img: IMG.cardSchedule },
    { icon: 'person_add', label: t('admin.dashboard.actionAddUser'), onClick: () => navigate(getLink('admin.users.create')), img: IMG.cardPlayers },
    { icon: 'request_quote', label: t('admin.dashboard.actionAssignFee'), onClick: () => navigate(getLink('admin.payments.create')), img: IMG.cardPayments },
    { icon: 'group_add', label: t('admin.dashboard.actionManageTeams'), onClick: () => navigate(getLink('admin.teams.list')), img: IMG.cardTraining },
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
            <Button variant="primary" onClick={() => navigate(getLink('admin.events.create'))}>
              <span className="material-symbols-outlined oa-icon-sm" aria-hidden>add</span>
              {t('admin.dashboard.actionNewEvent')}
            </Button>
            <Button variant="ghost" onClick={() => navigate(getLink('admin.teams.list'))}
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
            <h2 className="dash-section-title">{t('admin.dashboard.recentActivity')}</h2>
            {recentActivity.length === 0 ? (
              <p className="dash-empty">{t('admin.dashboard.noRecentActivity')}</p>
            ) : (
              <div className="dash-activity-list">
                {recentActivity.map(a => (
                  <div key={a.id} className="dash-activity-row">
                    <div className="dash-activity-dot" />
                    <div className="dash-activity-body">
                      <span className="dash-activity-msg">{a.message}</span>
                      <span className="dash-activity-time">{fmtDate(a.timestamp).relative}</span>
                    </div>
                  </div>
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
          <h2 className="dash-section-title" style={{ margin: '0 0 20px' }}>{t('admin.dashboard.recentActivity')}</h2>
          <div className="dash-activity-list">
            {recentActivity.map(a => (
              <div key={a.id} className="dash-activity-row">
                <div className="dash-activity-dot" />
                <div className="dash-activity-body">
                  <span className="dash-activity-msg">{a.message}</span>
                  <span className="dash-activity-time">{fmtDate(a.timestamp).relative}</span>
                </div>
              </div>
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
          <h2 className="dash-section-title">{t('admin.dashboard.recentActivity')}</h2>
          {recentActivity.length === 0 ? (
            <p className="dash-empty">{t('admin.dashboard.noRecentActivity')}</p>
          ) : (
            <div className="dash-activity-list">
              {recentActivity.map(a => (
                <div key={a.id} className="dash-activity-row">
                  <div className="dash-activity-dot" />
                  <div className="dash-activity-body">
                    <span className="dash-activity-msg">{a.message}</span>
                    <span className="dash-activity-time">{fmtDate(a.timestamp).relative}</span>
                  </div>
                </div>
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
  const [layout, setLayout] = useState<DashboardLayout>(loadLayout)
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
      const [teamsR, childrenR, unpaidR, eventsR, seasonsR] = await Promise.all([
        getTeams(context, { activeOnly: false }),
        getAthletes(context),
        getUnpaidFeeAssignmentsForOrg(context),
        getUpcomingEventsForUser(context, 100),
        getSeasons(context, { activeOnly: true }),
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
      
      setStats({
        totalTeams: teamsR.data.length,
        totalPlayers: childrenR.data.length,
        activeSeasons: seasonsR.data.length,
        outstandingPayments: totalUnpaidAmount,
        upcomingEvents: eventsR.data.length,
        pendingUniformOrders: 0,
      })
      setUpcomingEvents(
        eventsR.data.slice(0, 10).map((e: { id: string; title?: string; name?: string; start_time?: string; start_date?: string; event_type?: string }) => ({
          id: e.id, title: e.title || e.name || '', start_time: e.start_time || e.start_date || '', event_type: e.event_type,
        })),
      )
      const activities: RecentActivity[] = unpaidR.data.slice(0, 5).map((a: { id: string; fee?: { title?: string }; created_at: string }) => ({
        id: a.id, type: 'fee_assignment',
        message: `${t('admin.dashboard.newFeeAssignment')}: ${a.fee?.title || t('admin.dashboard.fee')}`,
        timestamp: a.created_at,
      }))
      setRecentActivity(activities)
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
    <div className="oa-root">
      <AdminPageHeader
        title={t('admin.dashboard.title')}
        subtitle={orgName || t('admin.dashboard.subtitle')}
        actions={
          <div className="oa-flex oa-items-center oa-gap-3" style={{ flexWrap: 'wrap' }}>
            <Select
              options={layoutOptions}
              value={layout}
              onChange={e => handleLayoutChange(e.target.value as DashboardLayout)}
              aria-label={t('admin.dashboard.layoutLabel')}
              style={{ minWidth: 180 }}
            />
            <Button variant="secondary" onClick={fetchDashboardData} icon="refresh">
              {t('admin.dashboard.refresh')}
            </Button>
          </div>
        }
      />
      {layout === 'stadium' && <StadiumDashboard {...props} />}
      {layout === 'editorial' && <EditorialDashboard {...props} />}
      {layout === 'athlete' && <AthleteDashboard {...props} />}
    </div>
  )
}
