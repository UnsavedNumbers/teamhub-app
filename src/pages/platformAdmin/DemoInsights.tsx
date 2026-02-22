/**
 * Demo Insights Dashboard
 * 
 * Platform admin dashboard for viewing demo session analytics.
 * Shows engagement metrics, session duration, page views, and feature usage.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useT } from '@/i18n/useI18n'
import { supabase } from '@/lib/supabase'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import './DemoInsights.css'

interface DemoSession {
  id: string
  demo_code: string
  user_id: string
  demo_org_id: string
  started_at: string
  last_activity_at: string
  expires_at: string
  user_email?: string
  demo_org_name?: string
}

interface SessionMetrics {
  sessionId: string
  duration: number
  pages: Array<{ pageId: string; timeSpent: number; visitCount: number }>
  features: Array<{ featureId: string; clickCount: number }>
  actions: Array<{ action: string; count: number }>
  lastPage: string | null
}

const COLORS = ['#137fec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function DemoInsights() {
  const t = useT()
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  // Fetch demo sessions
  const {
    data: sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['demo-sessions', dateRange],
    queryFn: async () => {
      const cutoffDate = getCutoffDate(dateRange)
      const PAGE_SIZE = 500
      let query = supabase
        .from('demo_sessions')
        .select(`
          id,
          demo_code,
          user_id,
          demo_org_id,
          started_at,
          last_activity_at,
          expires_at,
          demo_organizations!demo_sessions_demo_org_id_fkey(name)
        `)
        .order('started_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (cutoffDate) {
        query = query.gte('started_at', cutoffDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((s: any) => ({
        id: s.id,
        demo_code: s.demo_code,
        user_id: s.user_id,
        demo_org_id: s.demo_org_id,
        started_at: s.started_at,
        last_activity_at: s.last_activity_at,
        expires_at: s.expires_at,
        demo_org_name: s.demo_organizations?.name || 'Unknown',
      })) as DemoSession[]
    },
  })

  // Fetch user emails for sessions
  const { data: sessionEmails } = useQuery({
    queryKey: ['demo-session-emails', sessions?.map(s => s.user_id)],
    queryFn: async () => {
      if (!sessions || sessions.length === 0) return {}
      const userIds = [...new Set(sessions.map(s => s.user_id))]
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, email')
        .in('id', userIds)

      const emailMap: Record<string, string> = {}
      data?.forEach((p: any) => {
        emailMap[p.id] = p.email || 'Unknown'
      })
      return emailMap
    },
    enabled: !!sessions && sessions.length > 0,
  })

  // Calculate session metrics (mock data for now - would integrate with PostHog API)
  const sessionMetrics = useMemo<Record<string, SessionMetrics>>(() => {
    if (!sessions) return {}
    const metrics: Record<string, SessionMetrics> = {}
    sessions.forEach((session) => {
      const start = new Date(session.started_at).getTime()
      const end = new Date(session.last_activity_at).getTime()
      const duration = Math.max(0, end - start) / 1000 / 60 // minutes

      // Mock metrics - in production, fetch from PostHog API
      metrics[session.id] = {
        sessionId: session.id,
        duration,
        pages: [
          { pageId: 'portal-dashboard', timeSpent: duration * 0.3, visitCount: 3 },
          { pageId: 'portal-calendar', timeSpent: duration * 0.2, visitCount: 2 },
          { pageId: 'portal-athletes', timeSpent: duration * 0.15, visitCount: 2 },
          { pageId: 'portal-payments', timeSpent: duration * 0.1, visitCount: 1 },
        ],
        features: [
          { featureId: 'guardian-dashboard', clickCount: 1 },
          { featureId: 'guardian-calendar', clickCount: 1 },
        ],
        actions: [
          { action: 'page_view', count: 8 },
          { action: 'guide_opened', count: 3 },
        ],
        lastPage: 'portal-payments',
      }
    })
    return metrics
  }, [sessions])

  // Aggregate metrics
  const aggregateMetrics = useMemo(() => {
    if (!sessions || sessions.length === 0) return null

    const totalSessions = sessions.length
    const totalDuration = sessions.reduce((sum, s) => {
      const start = new Date(s.started_at).getTime()
      const end = new Date(s.last_activity_at).getTime()
      return sum + Math.max(0, end - start) / 1000 / 60
    }, 0)
    const avgDuration = totalDuration / totalSessions

    // Aggregate page views
    const pageViews: Record<string, number> = {}
    Object.values(sessionMetrics).forEach((metrics: SessionMetrics) => {
      metrics.pages.forEach((page: { pageId: string; timeSpent: number; visitCount: number }) => {
        pageViews[page.pageId] = (pageViews[page.pageId] || 0) + page.visitCount
      })
    })

    // Aggregate feature clicks
    const featureClicks: Record<string, number> = {}
    Object.values(sessionMetrics).forEach((metrics: SessionMetrics) => {
      metrics.features.forEach((feature: { featureId: string; clickCount: number }) => {
        featureClicks[feature.featureId] = (featureClicks[feature.featureId] || 0) + feature.clickCount
      })
    })

    return {
      totalSessions,
      totalDuration,
      avgDuration,
      pageViews: Object.entries(pageViews)
        .map(([pageId, count]) => ({ pageId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      featureClicks: Object.entries(featureClicks)
        .map(([featureId, count]) => ({ featureId, count }))
        .sort((a, b) => b.count - a.count),
    }
  }, [sessions, sessionMetrics])

  if (sessionsLoading) {
    return (
      <div className="demo-insights-loading">
        <div className="demo-insights-spinner" />
        <p>{t('demo.insights.loading')}</p>
      </div>
    )
  }

  if (sessionsError) {
    return (
      <div className="demo-insights-error">
        <h2>{t('demo.insights.error')}</h2>
        <p>{sessionsError instanceof Error ? sessionsError.message : String(sessionsError)}</p>
        <button
          type="button"
          className="demo-insights-retry"
          onClick={() => refetchSessions()}
        >
          {t('common.retry')}
        </button>
      </div>
    )
  }


  return (
    <div className="demo-insights">
      <div className="demo-insights-header">
        <h1 className="demo-insights-title">{t('demo.insights.title')}</h1>
        <div className="demo-insights-controls">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="demo-insights-date-select"
          >
            <option value="7d">{t('demo.insights.dateRange.last7Days')}</option>
            <option value="30d">{t('demo.insights.dateRange.last30Days')}</option>
            <option value="90d">{t('demo.insights.dateRange.last90Days')}</option>
            <option value="all">{t('demo.insights.dateRange.allTime')}</option>
          </select>
        </div>
      </div>

      {aggregateMetrics && (
        <>
          {/* Summary Cards */}
          <div className="demo-insights-summary">
            <div className="demo-insights-card">
              <h3>{t('demo.insights.totalSessions')}</h3>
              <p className="demo-insights-stat">{aggregateMetrics.totalSessions}</p>
            </div>
            <div className="demo-insights-card">
              <h3>{t('demo.insights.avgDuration')}</h3>
              <p className="demo-insights-stat">
                {Math.round(aggregateMetrics.avgDuration)} min
              </p>
            </div>
            <div className="demo-insights-card">
              <h3>{t('demo.insights.totalTime')}</h3>
              <p className="demo-insights-stat">
                {Math.round(aggregateMetrics.totalDuration)} min
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="demo-insights-charts">
            {/* Top Pages */}
            <div className="demo-insights-chart-card">
              <h3>{t('demo.insights.mostVisitedPages')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aggregateMetrics.pageViews}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="pageId" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#137fec" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Feature Usage */}
            {aggregateMetrics.featureClicks.length > 0 && (
              <div className="demo-insights-chart-card">
                <h3>{t('demo.insights.featureUsage')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={aggregateMetrics.featureClicks}
                      dataKey="count"
                      nameKey="featureId"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {aggregateMetrics.featureClicks.map((_: { featureId: string; count: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Session List */}
          <div className="demo-insights-sessions">
            <h2>{t('demo.insights.sessions')}</h2>
            <div className="demo-insights-session-list">
              {sessions?.map((session) => {
                const metrics = sessionMetrics[session.id]
                const email = sessionEmails?.[session.user_id] || 'Unknown'
                return (
                  <div
                    key={session.id}
                    className={`demo-insights-session-item ${
                      selectedSession === session.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedSession(session.id)}
                  >
                    <div className="demo-insights-session-header">
                      <div>
                        <strong>{email}</strong>
                        <span className="demo-insights-session-org">{session.demo_org_name}</span>
                      </div>
                      <div className="demo-insights-session-meta">
                        <span>{formatDate(session.started_at)}</span>
                        <span>{Math.round(metrics?.duration || 0)} min</span>
                      </div>
                    </div>
                    {selectedSession === session.id && metrics && (
                      <div className="demo-insights-session-details">
                        <div>
                          <h4>{t('demo.insights.pagesVisited')}</h4>
                          <ul>
                            {metrics.pages.map((page: { pageId: string; timeSpent: number; visitCount: number }) => (
                              <li key={page.pageId}>
                                {page.pageId}: {Math.round(page.timeSpent)} min ({page.visitCount} visits)
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4>{t('demo.insights.lastPage')}</h4>
                          <p>{metrics.lastPage || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {(!sessions || sessions.length === 0) && (
        <div className="demo-insights-empty">
          <p>{t('demo.insights.noSessions')}</p>
        </div>
      )}
    </div>
  )
}

function getCutoffDate(range: '7d' | '30d' | '90d' | 'all'): Date | null {
  if (range === 'all') return null
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
