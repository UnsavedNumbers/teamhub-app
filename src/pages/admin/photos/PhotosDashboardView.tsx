import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  StatCard,
  Button,
  InlineNotice,
} from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
import { 
  getGalleriesForUser, 
  checkStorageCap,
  getRecentGalleryActivity,
  type RecentActivityItem 
} from '@/data/services/galleryService'
import { getMockGalleriesForOrg } from '@/data/fake/mockGalleries'
import { getLink } from '@/utils/routes'
import './PhotosDashboardView.css'

function formatStorage(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  return gb.toFixed(2)
}

export function PhotosDashboardView() {
  const { context } = useUserContext()
  const navigate = useNavigate()
  const { t } = useI18n()

  const [galleries, setGalleries] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [storageInfo, setStorageInfo] = useState<{ currentUsage: number; limit: number } | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!context?.orgId) {
        setLoading(false)
        return
      }

      if (USE_FAKE_DATA) {
        const mockGalleries = getMockGalleriesForOrg(context.orgId)
        setGalleries(mockGalleries)
        setRecentActivity([])
        setStorageInfo({ currentUsage: 0, limit: 10 * 1024 * 1024 * 1024 })
        setLoading(false)
        return
      }

      setLoading(true)
      
      // Load galleries
      const { data: galleriesData, error: galleriesError } = await getGalleriesForUser(context, {})
      if (!mounted) return
      
      if (galleriesError) {
        setError(galleriesError.message)
      } else {
        setGalleries(galleriesData || [])
      }

      // Load recent activity
      const { data: activityData } = await getRecentGalleryActivity(context, 10)
      if (mounted) {
        setRecentActivity(activityData || [])
      }

      // Load storage info
      const { currentUsage, limit } = await checkStorageCap(context)
      if (mounted) {
        setStorageInfo({ 
          currentUsage: currentUsage || 0, 
          limit: limit || 0 
        })
      }

      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [context])

  const stats = useMemo(() => {
    const totalPhotos = galleries.reduce((sum, g) => sum + (g.photo_count || 0), 0)
    const pending = galleries.reduce((sum, g) => sum + (g.pending_count || 0), 0)
    const recentCount = recentActivity.length
    
    // Calculate photos added this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const photosThisWeek = recentActivity.filter(
      item => new Date(item.timestamp) >= weekAgo
    ).reduce((sum, item) => sum + (item.photo_count || 0), 0)

    return {
      totalGalleries: galleries.length,
      totalPhotos,
      pending,
      recentCount,
      photosThisWeek,
    }
  }, [galleries, recentActivity])

  const handleCreateGallery = () => {
    navigate(getLink('admin.photos.create'))
  }

  const handleBulkUpload = () => {
    navigate(getLink('admin.photos.create'))
  }

  const handleReviewPending = () => {
    navigate('/admin/photos/search?status=pending')
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Card className="oa-card oa-h-64 oa-animate-pulse" />
      </div>
    )
  }

  return (
    <div className="photos-dashboard">
      {error && (
        <InlineNotice 
          tone="error" 
          title={t('photos.errors.loadGalleries')} 
          message={error} 
        />
      )}

      {/* Overview Cards */}
      <div className="dashboard-stats-grid">
        <StatCard 
          label={t('photos.stats.totalPhotos')} 
          value={stats.totalPhotos} 
        />
        <StatCard 
          label={t('photos.dashboard.recentActivity')} 
          value={stats.recentCount}
        />
        <StatCard 
          label={t('photos.pendingApproval.adminMessage', { count: stats.pending })} 
          value={stats.pending} 
        />
        <StatCard 
          label={t('photos.dashboard.storageUsed')} 
          value={storageInfo ? `${formatStorage(storageInfo.currentUsage)} GB` : '0 GB'}
        />
      </div>

      {/* Quick Actions */}
      <div className="dashboard-quick-actions">
        <h2 className="dashboard-section-title">{t('photos.dashboard.quickActions')}</h2>
        <div className="quick-actions-grid">
          <Button 
            variant="primary" 
            icon="add_a_photo" 
            onClick={handleCreateGallery}
          >
            {t('photos.createGallery')}
          </Button>
          <Button 
            variant="secondary" 
            icon="upload" 
            onClick={handleBulkUpload}
          >
            {t('photos.dashboard.bulkUpload')}
          </Button>
          {stats.pending > 0 && (
            <Button 
              variant="secondary" 
              icon="pending_actions" 
              onClick={handleReviewPending}
            >
              {t('photos.dashboard.reviewPending')}
            </Button>
          )}
          <Button 
            variant="secondary" 
            icon="description" 
            onClick={() => {}}
            disabled
          >
            {t('photos.dashboard.generateReports')}
          </Button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="dashboard-activity">
        <h2 className="dashboard-section-title">{t('photos.dashboard.recentActivity')}</h2>
        {recentActivity.length === 0 ? (
          <Card className="oa-card">
            <p className="oa-text-sm oa-text-muted oa-text-center oa-py-8">
              {t('photos.dashboard.noRecentActivity')}
            </p>
          </Card>
        ) : (
          <div className="activity-feed">
            {recentActivity.map((item) => (
              <Card 
                key={`${item.gallery_id}-${item.timestamp}`}
                className="activity-item"
                onClick={() => navigate(getLink('admin.photos.detail', { id: item.gallery_id }))}
              >
                <div className="activity-thumbnail">
                  {item.gallery_cover_url ? (
                    <img 
                      src={item.gallery_cover_url} 
                      alt={item.gallery_name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="activity-placeholder">
                      <span className="material-symbols-outlined">image</span>
                    </div>
                  )}
                </div>
                <div className="activity-content">
                  <div className="activity-title">{item.gallery_name}</div>
                  <div className="activity-meta">
                    {item.photo_count && item.photo_count > 1 
                      ? t('photos.dashboard.photosAdded', { count: item.photo_count })
                      : t('photos.dashboard.photoAdded')
                    }
                    {' • '}
                    {new Date(item.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div className="activity-arrow">
                  <span className="material-symbols-outlined">arrow_forward</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
