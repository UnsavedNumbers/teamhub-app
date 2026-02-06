import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card,
  Button,
  Input,
  Select,
  InlineNotice,
  Table,
  Checkbox,
} from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { USE_FAKE_DATA } from '@/data/config'
import { getGalleriesForUser, type Gallery, type GalleryType } from '@/data/services/galleryService'
import { getMockGalleriesForOrg } from '@/data/fake/mockGalleries'
import { getLink } from '@/utils/routes'
import { usePagination } from '@/hooks/usePagination'
import { useHideEmptyGalleries } from './useHideEmptyGalleries'
import './PhotosSearchView.css'

export function PhotosSearchView() {
  const { context } = useUserContext()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hideEmpty, setHideEmpty } = useHideEmptyGalleries()

  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [entityType, setEntityType] = useState<GalleryType | 'all'>(searchParams.get('type') as GalleryType || 'all')
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const [photoStatus, setPhotoStatus] = useState<'all' | 'has_photos' | 'empty' | 'pending'>('all')
  const [sizeRange, setSizeRange] = useState<'all' | '1-10' | '11-50' | '50+'>('all')

  const { page, rowsPerPage, setPage, setRowsPerPage, setTotalCount } = usePagination(0, 50)

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
        setLoading(false)
        return
      }

      setLoading(true)
      const { data, error: galleriesError } = await getGalleriesForUser(context, {})
      if (!mounted) return

      if (galleriesError) {
        setError(galleriesError.message)
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

  const filteredGalleries = useMemo(() => {
    let result = galleries

    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase()
      result = result.filter(g => 
        g.name.toLowerCase().includes(term) ||
        (g.description || '').toLowerCase().includes(term)
      )
    }

    // Entity type filter
    if (entityType !== 'all') {
      result = result.filter(g => g.gallery_type === entityType)
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      switch (dateRange) {
        case 'week':
          cutoff.setDate(now.getDate() - 7)
          break
        case 'month':
          cutoff.setMonth(now.getMonth() - 1)
          break
        case 'year':
          cutoff.setFullYear(now.getFullYear() - 1)
          break
      }
      result = result.filter(g => new Date(g.updated_at || g.created_at) >= cutoff)
    }

    // Photo status filter
    if (photoStatus === 'has_photos') {
      result = result.filter(g => (g.photo_count || 0) > 0)
    } else if (photoStatus === 'empty') {
      result = result.filter(g => (g.photo_count || 0) === 0)
    } else if (photoStatus === 'pending') {
      result = result.filter(g => (g.pending_count || 0) > 0)
    }

    // Size range filter
    if (sizeRange !== 'all') {
      switch (sizeRange) {
        case '1-10':
          result = result.filter(g => {
            const count = g.photo_count || 0
            return count >= 1 && count <= 10
          })
          break
        case '11-50':
          result = result.filter(g => {
            const count = g.photo_count || 0
            return count >= 11 && count <= 50
          })
          break
        case '50+':
          result = result.filter(g => (g.photo_count || 0) > 50)
          break
      }
    }

    // Hide empty filter
    if (hideEmpty) {
      result = result.filter(g => (g.photo_count || 0) > 0)
    }

    return result
  }, [galleries, search, entityType, dateRange, photoStatus, sizeRange, hideEmpty])

  useEffect(() => {
    setTotalCount(filteredGalleries.length)
  }, [filteredGalleries.length, setTotalCount])

  const paginatedGalleries = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    return filteredGalleries.slice(start, start + rowsPerPage)
  }, [filteredGalleries, page, rowsPerPage])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    setSearchParams(params)
  }, [searchParams, setSearchParams])

  const handleExport = useCallback(() => {
    const csv = [
      ['Name', 'Type', 'Photo Count', 'Last Modified'].join(','),
      ...filteredGalleries.map(g => [
        `"${g.name}"`,
        g.gallery_type,
        g.photo_count || 0,
        new Date(g.updated_at || g.created_at).toLocaleDateString(),
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `galleries-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredGalleries])

  if (loading) {
    return (
      <div className="search-loading">
        <Card className="pa-card pa-h-64 pa-animate-pulse" />
      </div>
    )
  }

  return (
    <div className="photos-search">
      {error && (
        <InlineNotice 
          tone="error" 
          title={t('photos.errors.loadGalleries')} 
          message={error} 
        />
      )}

      <div className="search-container">
        {/* Search Bar */}
        <div className="search-bar">
          <div className="search-input-wrapper">
            <span className="material-symbols-outlined search-icon">search</span>
            <Input
              placeholder={t('photos.search.searchPlaceholder')}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
          </div>
          <Button variant="secondary" onClick={handleExport}>
            {t('photos.search.exportResults')}
          </Button>
        </div>

        <div className="search-content">
          {/* Filter Sidebar */}
          <div className="search-sidebar">
            <h3>{t('photos.search.filters')}</h3>

            <div className="filter-group">
              <label className="filter-label">{t('photos.settings.hideEmptyByDefault')}</label>
              <Checkbox
                checked={hideEmpty}
                onChange={(e) => setHideEmpty(e.target.checked)}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">{t('photos.filters.byType')}</label>
              <Select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as any)}
                options={[
                  { label: t('photos.filters.all'), value: 'all' },
                  { label: t('photos.galleryType.event'), value: 'event' },
                  { label: t('photos.galleryType.team'), value: 'team' },
                  { label: t('photos.galleryType.athlete'), value: 'athlete' },
                  { label: t('photos.galleryType.season'), value: 'season' },
                  { label: t('photos.galleryType.organization'), value: 'org' },
                ]}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">{t('common.date')}</label>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                options={[
                  { label: t('common.all'), value: 'all' },
                  { label: t('common.lastWeek'), value: 'week' },
                  { label: t('common.lastMonth'), value: 'month' },
                  { label: t('common.lastYear'), value: 'year' },
                ]}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">{t('photos.search.filters')}</label>
              <Select
                value={photoStatus}
                onChange={(e) => setPhotoStatus(e.target.value as any)}
                options={[
                  { label: t('common.all'), value: 'all' },
                  { label: t('photos.browse.hasPhotos'), value: 'has_photos' },
                  { label: t('photos.browse.emptyGallery'), value: 'empty' },
                  { label: t('photos.pendingApproval.badge'), value: 'pending' },
                ]}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">{t('photos.stats.totalPhotos')}</label>
              <Select
                value={sizeRange}
                onChange={(e) => setSizeRange(e.target.value as any)}
                options={[
                  { label: t('common.all'), value: 'all' },
                  { label: '1-10', value: '1-10' },
                  { label: '11-50', value: '11-50' },
                  { label: '50+', value: '50+' },
                ]}
              />
            </div>
          </div>

          {/* Results */}
          <div className="search-results">
            <div className="results-header">
              <h3>{t('photos.search.results')} ({filteredGalleries.length})</h3>
            </div>

            {paginatedGalleries.length === 0 ? (
              <Card className="pa-card pa-p-8 pa-text-center">
                <p className="pa-text-muted">{t('photos.search.noResults')}</p>
              </Card>
            ) : (
              <Table
                data={paginatedGalleries.map(g => ({
                  id: g.id,
                  name: g.name,
                  photoCount: g.photo_count || 0,
                  lastModified: new Date(g.updated_at || g.created_at).toLocaleDateString(),
                  type: t(`photos.galleryType.${g.gallery_type}`),
                  coverUrl: g.cover_url,
                }))}
                columns={[
                  { key: 'name', label: t('common.name') },
                  { key: 'photoCount', label: t('photos.stats.totalPhotos') },
                  { key: 'lastModified', label: t('common.modified') },
                  { key: 'type', label: t('common.type') },
                ]}
                onRowClick={(row) => navigate(getLink('admin.photos.detail', { id: row.id }))}
                pagination={{
                  currentPage: page,
                  totalRows: filteredGalleries.length,
                  totalPages: Math.ceil(filteredGalleries.length / rowsPerPage),
                  rowsPerPage,
                  onPageChange: setPage,
                  onRowsPerPageChange: setRowsPerPage,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
