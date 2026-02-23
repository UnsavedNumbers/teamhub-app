/**
 * RecentActivityCard Component
 * 
 * Displays recent activity/event logs for the organization.
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../../lib/supabase'
import { DataState } from '../../../../components/platformAdmin/DataState'
import { safeDate } from '../../../../utils/safeAccessors'
import type { AdminEventLog } from '../../../../types/eventLog.types'

interface RecentActivityCardProps {
  organizationId: string
  onViewAll?: () => void
}

export function RecentActivityCard({ organizationId, onViewAll }: RecentActivityCardProps) {
  const [activities, setActivities] = useState<AdminEventLog[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!organizationId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('admin_event_logs')
          .select('*')
          .eq('org_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!isMountedRef.current) {
          return
        }

        if (fetchError) {
          if (fetchError.code === 'PGRST116' || fetchError.message.includes('404') || fetchError.message.includes('not found')) {
            setError('Event logs view not available. Please ensure database migrations are up to date.')
          } else {
            setError(fetchError.message)
          }
          setActivities([])
        } else {
          setActivities((data || []) as AdminEventLog[])
        }
      } catch (err) {
        if (!isMountedRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to load activity')
        setActivities([])
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchRecentActivity()
  }, [organizationId])

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return safeDate(dateString)
    } catch {
      return safeDate(dateString)
    }
  }

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'EVENT':
        return 'var(--pa-theme-action-primary)'
      case 'SYSTEM':
        return 'var(--pa-warning)'
      case 'ORGANIZATION':
        return 'var(--pa-success)'
      default:
        return 'var(--pa-n500)'
    }
  }

  return (
    <div style={{
      background: 'var(--pa-n0)',
      borderRadius: 'var(--pa-radius-m)',
      boxShadow: 'var(--pa-shadow-1)',
      padding: 'var(--pa-space-6)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--pa-space-5)',
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--pa-n600)',
          fontFamily: 'var(--pa-font-body)',
        }}>
          <span style={{
            width: '32px',
            height: '2px',
            background: 'var(--pa-theme-action-primary)',
            marginRight: 'var(--pa-space-3)',
            display: 'block',
          }} />
          Recent Activity
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            style={{
              padding: 0,
              background: 'transparent',
              border: 'none',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--pa-theme-action-primary)',
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'text-decoration 150ms ease',
              fontFamily: 'var(--pa-font-body)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            View All
          </button>
        )}
      </div>

      <DataState
        data={activities}
        loading={loading}
        error={error}
        emptyMessage="No recent activity"
        emptyIcon="history"
      >
        {(data) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {data.map((activity, index) => (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--pa-space-3)',
                  padding: 'var(--pa-space-3) 0',
                  borderBottom: index < data.length - 1 ? '1px solid var(--pa-n100)' : 'none',
                  transition: 'background-color 150ms ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pa-n50)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)', marginBottom: 'var(--pa-space-2)', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: 'var(--pa-space-1) var(--pa-space-2)',
                      borderRadius: 'var(--pa-radius-pill)',
                      background: getCategoryColor(activity.category) + '20',
                      color: getCategoryColor(activity.category),
                      fontFamily: 'var(--pa-font-body)',
                    }}>
                      {activity.category}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--pa-n900)', fontFamily: 'var(--pa-font-body)' }}>
                      {activity.event_type}
                    </span>
                  </div>
                  {activity.actor_email && (
                    <div style={{ fontSize: '12px', color: 'var(--pa-n500)', marginBottom: 'var(--pa-space-1)', fontFamily: 'var(--pa-font-body)' }}>
                      by {activity.actor_name || activity.actor_email}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--pa-n500)', fontFamily: 'var(--pa-font-body)' }}>
                    {formatTimeAgo(activity.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataState>
    </div>
  )
}
