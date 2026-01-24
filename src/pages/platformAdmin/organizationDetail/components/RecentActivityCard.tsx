/**
 * RecentActivityCard Component
 * 
 * Displays recent activity/event logs for the organization.
 */

import { useState, useEffect, useRef } from 'react'
import { Card, Badge, Button } from '../../../../components/platformAdmin'
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
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!organizationId) return

      setLoading(true)
      setError(null)

      try {
        const { data, error: fetchError } = await supabase
          .from('admin_event_logs')
          .select('*')
          .eq('org_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!isMountedRef.current) return

        if (fetchError) {
          // Handle 404 specifically - view might not exist or migration not run
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

  const getCategoryVariant = (category: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    switch (category) {
      case 'PAYMENT':
        return 'success'
      case 'ADMIN':
        return 'warning'
      case 'AUTH':
      case 'ORGANIZATION':
        return 'info'
      default:
        return 'neutral'
    }
  }

  return (
    <Card
      title="Recent Activity"
      actions={
        onViewAll && (
          <Button variant="ghost" size="dense" onClick={onViewAll}>
            View All
          </Button>
        )
      }
    >
      <DataState
        data={activities}
        loading={loading}
        error={error}
        emptyMessage="No recent activity"
        emptyIcon="history"
      >
        {(data) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-3)' }}>
            {data.map((activity) => (
              <div
                key={activity.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--pa-space-3)',
                  padding: 'var(--pa-space-2)',
                  borderRadius: 'var(--pa-radius-sm)',
                  background: 'var(--pa-n50)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pa-flex pa-items-center pa-gap-2 pa-mb-1">
                    <Badge variant={getCategoryVariant(activity.category)} size="small">
                      {activity.category}
                    </Badge>
                    <span className="pa-body-s pa-text-muted">{activity.event_type}</span>
                  </div>
                  {activity.actor_email && (
                    <div className="pa-body-s pa-text-muted">
                      by {activity.actor_name || activity.actor_email}
                    </div>
                  )}
                  <div className="pa-caption pa-text-muted" style={{ marginTop: '4px' }}>
                    {formatTimeAgo(activity.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataState>
    </Card>
  )
}
