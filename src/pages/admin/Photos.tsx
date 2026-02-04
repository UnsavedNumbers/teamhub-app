import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  PageHeader,
  StatCard,
  Button,
  Badge,
  Input,
  Select,
  InlineNotice,
  Modal,
} from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '../../i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
import { GalleryManagementSection } from '@/components/admin/galleries/GalleryManagementSection'
import { getGalleriesForUser, type Gallery } from '@/data/services/galleryService'
import { getMockGalleriesForOrg } from '@/data/fake/mockGalleries'
import { getLink } from '@/utils/routes'
import './Photos.css'

// Cache for galleries (5 minutes)
const CACHE_KEY = 'admin_photos_galleries'

interface CachedData {
  galleries: Gallery[]
  timestamp: number
}

function setCachedGalleries(galleries: Gallery[]) {
  try {
    const data: CachedData = {
      galleries,
      timestamp: Date.now(),
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // Ignore cache errors
  }
}

function clearCachedGalleries() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // Ignore
  }
}

export default function AdminPhotos() {
  const { context } = useUserContext()
  const navigate = useNavigate()
  const { t } = useI18n()

  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<'all' | Gallery['gallery_type']>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'az' | 'photos'>('recent')
  const [showManagement] = useState(false)
  const [showDemoModal, setShowDemoModal] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      console.log('[Photos] load() called, context:', context?.orgId, 'USE_FAKE_DATA:', USE_FAKE_DATA)
      
      if (!context?.orgId) {
        console.log('[Photos] No context.orgId, returning early')
        setLoading(false)
        return
      }

      // Demo mode: use mock data
      if (USE_FAKE_DATA) {
        console.log('[Photos] USE_FAKE_DATA is true, using mock data')
        const mockGalleries = getMockGalleriesForOrg(context.orgId)
        setGalleries(mockGalleries)
        setLoading(false)
        return
      }

      // Clear cache for debugging
      clearCachedGalleries()

      setLoading(true)
      console.log('[Photos] Loading galleries for org:', context.orgId)
      const { data, error } = await getGalleriesForUser(context, {})
      console.log('[Photos] Gallery result:', { data, error, count: data?.length })
      if (!mounted) return
      if (error) {
        console.error('[Photos] Error loading galleries:', error)
        setError(error.message)
      } else {
        console.log('[Photos] Loaded galleries:', data)
        setGalleries(data || [])
        setCachedGalleries(data || [])
      }
      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [context])

  const filtered = useMemo(() => {
    let result = galleries
    if (activeType !== 'all') {
      result = result.filter((g) => g.gallery_type === activeType)
    }
    if (search.trim()) {
      const term = search.toLowerCase()
      result = result.filter((g) => g.name.toLowerCase().includes(term))
    }
    if (sortBy === 'az') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'photos') {
      result = [...result].sort((a, b) => (b.photo_count || 0) - (a.photo_count || 0))
    } else {
      result = [...result].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      )
    }
    return result
  }, [galleries, activeType, search, sortBy])

  const totals = useMemo(() => {
    const totalPhotos = galleries.reduce((sum, g) => sum + (g.photo_count || 0), 0)
    const pending = galleries.reduce((sum, g) => sum + (g.pending_count || 0), 0)
    return {
      galleries: galleries.length,
      photos: totalPhotos,
      pending,
    }
  }, [galleries])

  const handleCardClick = useCallback(
    (id: string) => {
      navigate(getLink('admin.photos.detail', { id }))
    },
    [navigate],
  )

  const handleCreateGallery = () => {
    if (USE_FAKE_DATA) {
      setShowDemoModal(true)
      return
    }
    navigate(getLink('admin.photos.create'))
  }

  const getEntityLabel = (gallery: Gallery): string => {
    // This would ideally fetch entity names from related tables
    // For now, show entity type
    const typeLabel = t(`photos.galleryType.${gallery.gallery_type}`)
    return typeLabel
  }

  return (
    <div className="pa-root admin-photos-page">
      <div className="pa-container">
        <PageHeader
          title={t('photos.title')}
          description={t('photos.subtitle')}
        />

        {error && <InlineNotice tone="error" title={t('photos.errors.loadGalleries')} message={error} />}

        <div className="photos-header">
          <h1 className="photos-title">{t('photos.title')}</h1>
          <Button variant="primary" icon="add_a_photo" onClick={handleCreateGallery}>
            {t('photos.createGallery')}
          </Button>
        </div>

        <div className="filter-bar">
          <div className="filter-input">
            <span className="material-symbols-outlined search-icon">search</span>
            <Input
              placeholder={t('photos.filters.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <span className="filter-divider" />

          <div className="filter-chip">
            <div className="filter-chip-label">{t('photos.filters.byType')}</div>
            <Select
              value={activeType}
              onChange={(e) => setActiveType(e.target.value as any)}
              options={[
                { label: t('photos.filters.all'), value: 'all' },
                { label: t('photos.galleryType.event'), value: 'event' },
                { label: t('photos.galleryType.team'), value: 'team' },
                { label: t('photos.galleryType.athlete'), value: 'athlete' },
                { label: t('photos.galleryType.season'), value: 'season' },
                { label: t('photos.galleryType.organization'), value: 'organization' },
              ]}
            />
          </div>

          <div className="filter-chip">
            <div className="filter-chip-label">{t('common.sort')}</div>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              options={[
                { label: t('common.mostRecent'), value: 'recent' },
                { label: 'A → Z', value: 'az' },
                { label: t('photos.stats.photosCount', { count: '' }).replace('0', 'Most'), value: 'photos' },
              ]}
            />
          </div>
        </div>

        <div className="stats-grid">
          <StatCard label={t('photos.stats.totalGalleries')} value={totals.galleries} />
          <StatCard label={t('photos.stats.totalPhotos')} value={totals.photos} />
          <StatCard label={t('photos.pendingApproval.adminMessage', { count: totals.pending })} value={totals.pending} />
        </div>

        <div className="tabs-row">
          {[
            { key: 'all', label: t('photos.filters.all') },
            { key: 'event', label: t('photos.galleryType.event') },
            { key: 'team', label: t('photos.galleryType.team') },
            { key: 'athlete', label: t('photos.galleryType.athlete') },
            { key: 'season', label: t('photos.galleryType.season') },
            { key: 'organization', label: t('photos.galleryType.organization') },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={activeType === tab.key ? 'primary' : 'secondary'}
              size="compact"
              onClick={() => setActiveType(tab.key as any)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <Card className="pa-card pa-h-64 pa-animate-pulse" />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="pa-text-base pa-font-semibold">{t('photos.filters.noResults')}</p>
            <p className="pa-text-sm pa-text-muted">{t('photos.empty.message')}</p>
            <Button variant="primary" onClick={handleCreateGallery} className="pa-mt-4">
              {t('photos.createGallery')}
            </Button>
          </div>
        ) : (
          <div className="gallery-grid">
            {filtered.map((gallery) => (
              <Card
                key={gallery.id}
                className="gallery-card"
                onClick={() => handleCardClick(gallery.id)}
                noPadding
              >
                <div className="gallery-cover">
                  {gallery.cover_url ? (
                    <img src={gallery.cover_url} alt={gallery.name} />
                  ) : (
                    <div className="pa-flex pa-items-center pa-justify-center pa-w-full pa-h-full pa-text-muted pa-text-sm">
                      {t('photos.stats.emptyGallery')}
                    </div>
                  )}
                  <div className="gallery-badge">
                    <Badge variant="info">{getEntityLabel(gallery)}</Badge>
                  </div>
                </div>
                <div className="gallery-body">
                  <div className="gallery-title">{gallery.name}</div>
                  <div className="gallery-meta">
                    {t('common.modified')} {new Date(gallery.updated_at || gallery.created_at).toLocaleDateString()}
                  </div>
                  <div className="gallery-footer">
                    <div className="pa-flex pa-items-center pa-gap-2">
                      <span className="material-symbols-outlined pa-text-muted">image</span>
                      <span className="pa-text-sm pa-font-semibold">
                        {t('photos.stats.photosCount', { count: gallery.photo_count || 0 })}
                      </span>
                    </div>
                    <span className="material-symbols-outlined pa-text-muted">arrow_forward</span>
                  </div>
                </div>
              </Card>
            ))}

            <Card className="add-card" onClick={handleCreateGallery} noPadding>
              <div className="add-icon">
                <span className="material-symbols-outlined">add</span>
              </div>
              <div className="pa-text-base pa-font-semibold">{t('photos.createGallery')}</div>
              <div className="pa-text-sm pa-text-muted">
                {t('photos.subtitle')}
              </div>
            </Card>
          </div>
        )}

        {showManagement && <GalleryManagementSection title={t('photos.allGalleries')} allowCreate />}

        {/* Demo Mode Modal */}
        <Modal
          open={showDemoModal}
          onClose={() => setShowDemoModal(false)}
          title={t('photos.demoMode.title')}
        >
          <p className="pa-text-sm pa-text-muted pa-mb-4">
            {t('photos.demoMode.createBlocked')}
          </p>
          <div className="pa-flex pa-justify-end">
            <Button variant="primary" onClick={() => setShowDemoModal(false)}>
              {t('common.ok')}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  )
}

