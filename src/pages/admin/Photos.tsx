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
} from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { GalleryManagementSection } from '@/components/admin/galleries/GalleryManagementSection'
import { getGalleriesForUser, type Gallery } from '@/data/services/galleryService'
import { getLink } from '@/utils/routes'
import './Photos.css'

export default function AdminPhotos() {
  const { context } = useUserContext()
  const navigate = useNavigate()

  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState<'all' | Gallery['gallery_type']>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'az' | 'photos'>('recent')
  const [showManagement, setShowManagement] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!context?.orgId) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await getGalleriesForUser(context, { org_id: context.orgId })
      if (!mounted) return
      if (error) {
        setError(error.message)
      } else {
        setGalleries(data || [])
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

  return (
    <div className="pa-root admin-photos-page">
      <div className="pa-container">
        <PageHeader
          title="Photos"
          description="Create and manage galleries across teams, athletes, events, travel, seasons, and programs."
        />

        {error && <InlineNotice tone="error" title="Unable to load galleries" message={error} />}

        <div className="photos-header">
          <h1 className="photos-title">Photos</h1>
          <Button variant="primary" icon="add_a_photo" onClick={() => setShowManagement(true)}>
            New Gallery
          </Button>
        </div>

        <div className="filter-bar">
          <div className="filter-input">
            <span className="material-symbols-outlined search-icon">search</span>
            <Input
              placeholder="Search galleries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <span className="filter-divider" />

          <div className="filter-chip">
            <div className="filter-chip-label">Entity Type</div>
            <Select
              value={activeType}
              onChange={(e) => setActiveType(e.target.value as any)}
              options={[
                { label: 'All Entities', value: 'all' },
                { label: 'Events', value: 'event' },
                { label: 'Teams', value: 'team' },
                { label: 'Athletes', value: 'athlete' },
                { label: 'Travel', value: 'travel' },
                { label: 'Programs', value: 'program' },
                { label: 'Seasons', value: 'season' },
                { label: 'Organization', value: 'org' },
              ]}
            />
          </div>

          <div className="filter-chip">
            <div className="filter-chip-label">Sort</div>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              options={[
                { label: 'Most recent', value: 'recent' },
                { label: 'A → Z', value: 'az' },
                { label: 'Most photos', value: 'photos' },
              ]}
            />
          </div>

          <div className="filter-actions">
            <Button
              variant="secondary"
              icon="tune"
              onClick={() => setShowManagement((prev) => !prev)}
              aria-pressed={showManagement}
            >
              Filters
            </Button>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard label="Galleries" value={totals.galleries} />
          <StatCard label="Photos" value={totals.photos} />
          <StatCard label="Pending approvals" value={totals.pending} />
        </div>

        <div className="tabs-row">
          {[
            { key: 'all', label: 'All' },
            { key: 'event', label: 'Events' },
            { key: 'team', label: 'Teams' },
            { key: 'athlete', label: 'Athletes' },
            { key: 'travel', label: 'Travel' },
            { key: 'program', label: 'Programs' },
            { key: 'season', label: 'Seasons' },
            { key: 'org', label: 'Organization' },
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
            <p className="pa-text-base pa-font-semibold">No galleries match your filters.</p>
            <p className="pa-text-sm pa-text-muted">Try adjusting filters or create a new gallery.</p>
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
                      No cover image
                    </div>
                  )}
                  <div className="gallery-badge">
                    <Badge variant="info">{gallery.gallery_type}</Badge>
                  </div>
                </div>
                <div className="gallery-body">
                  <div className="gallery-title">{gallery.name}</div>
                  <div className="gallery-meta">
                    Modified {new Date(gallery.updated_at || gallery.created_at).toLocaleDateString()}
                  </div>
                  <div className="gallery-footer">
                    <div className="pa-flex pa-items-center pa-gap-2">
                      <span className="material-symbols-outlined pa-text-muted">image</span>
                      <span className="pa-text-sm pa-font-semibold">
                        {gallery.photo_count || 0} photos
                      </span>
                    </div>
                    <span className="material-symbols-outlined pa-text-muted">arrow_forward</span>
                  </div>
                </div>
              </Card>
            ))}

            <Card className="add-card" onClick={() => setShowManagement(true)} noPadding>
              <div className="add-icon">
                <span className="material-symbols-outlined">add</span>
              </div>
              <div className="pa-text-base pa-font-semibold">Create new gallery</div>
              <div className="pa-text-sm pa-text-muted">
                Organize photos by team, event, season, or program.
              </div>
            </Card>
          </div>
        )}

        {showManagement && <GalleryManagementSection title="All galleries" allowCreate />}
      </div>
    </div>
  )
}
