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
import { useDebounce } from '@/hooks/useDebounce'
import { USE_FAKE_DATA } from '@/data/config'
import { 
  getGalleriesForUser, 
  deleteGallery,
  getPhotosForGallery,
  type Gallery, 
  type GalleryPhoto,
  type GalleryType 
} from '@/data/services/galleryService'
import { getMockGalleriesForOrg, getMockPhotosForGallery } from '@/data/fake/mockGalleries'
import { getLink } from '@/utils/routes/helpers'
import { usePagination } from '@/hooks/usePagination'
import { useHideEmptyGalleries } from './useHideEmptyGalleries'
import { showError, showSuccess } from '@/utils/toast'
import { GalleryEditModal } from '@/components/admin/galleries/GalleryEditModal'
import './PhotosSearchView.css'

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export function PhotosSearchView() {
  useDebugLifecycle('PhotosSearchView')
  
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hideEmpty, setHideEmpty } = useHideEmptyGalleries()

  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [galleryToEdit, setGalleryToEdit] = useState<Gallery | null>(null)
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])

  // Filters with URL sync
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const debouncedSearch = useDebounce(search, 300)
  const [entityType, setEntityType] = useState<GalleryType | 'all'>(
    (searchParams.get('type') as GalleryType) || 'all'
  )
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month' | 'year'>(
    (searchParams.get('date') as any) || 'all'
  )
  const [photoStatus, setPhotoStatus] = useState<'all' | 'has_photos' | 'empty' | 'pending'>(
    (searchParams.get('status') as any) || 'all'
  )
  const [sizeRange, setSizeRange] = useState<'all' | '1-10' | '11-50' | '50+'>(
    (searchParams.get('size') as any) || 'all'
  )

  const { page, rowsPerPage, setPage, setRowsPerPage, setTotalCount } = usePagination(0, 50)

  // Load galleries from Supabase or fake data
  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!isReady || !context?.orgId) {
        setLoading(false)
        return
      }

      if (USE_FAKE_DATA) {
        const mockGalleries = getMockGalleriesForOrg(context.orgId)
        // Add photo counts for mock galleries
        const galleriesWithCounts = mockGalleries.map(g => {
          const photos = getMockPhotosForGallery(g.id)
          return {
            ...g,
            photo_count: photos.filter(p => p.status === 'approved').length,
            pending_count: photos.filter(p => p.status === 'pending').length,
            cover_url: photos.find(p => p.id === g.cover_photo_id)?.storage_path || null,
          }
        })
        setGalleries(galleriesWithCounts as Gallery[])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      const { data, error: galleriesError } = await getGalleriesForUser(context, {})
      if (!mounted) return

      if (galleriesError) {
        const errorMessage = galleriesError.message || t('photos.errors.loadGalleries')
        setError(errorMessage)
        showError(errorMessage)
      } else {
        setGalleries(data || [])
      }
      setLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [context, isReady, t])

  // Apply all filters
  const filteredGalleries = useMemo(() => {
    let result = galleries

    // Search filter (debounced)
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.toLowerCase()
      result = result.filter(g => 
        (g.name || '').toLowerCase().includes(term) ||
        (g.title || '').toLowerCase().includes(term) ||
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

    // Sort by most recent
    result = result.sort((a, b) => 
      new Date(b.updated_at || b.created_at).getTime() - 
      new Date(a.updated_at || a.created_at).getTime()
    )

    return result
  }, [galleries, debouncedSearch, entityType, dateRange, photoStatus, sizeRange, hideEmpty])

  // Update total count for pagination
  useEffect(() => {
    setTotalCount(filteredGalleries.length)
  }, [filteredGalleries.length, setTotalCount])

  // Paginate results
  const paginatedGalleries = useMemo(() => {
    const start = page * rowsPerPage
    return filteredGalleries.slice(start, start + rowsPerPage)
  }, [filteredGalleries, page, rowsPerPage])

  // Sync search to URL
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    setSearchParams(params, { replace: true })
    setPage(0) // Reset to first page on search
  }, [searchParams, setSearchParams, setPage])

  // Sync filter changes to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (entityType !== 'all') params.set('type', entityType)
    if (dateRange !== 'all') params.set('date', dateRange)
    if (photoStatus !== 'all') params.set('status', photoStatus)
    if (sizeRange !== 'all') params.set('size', sizeRange)
    setSearchParams(params, { replace: true })
  }, [entityType, dateRange, photoStatus, sizeRange, setSearchParams, search])

  // Export to CSV
  const handleExport = useCallback(() => {
    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.message'))
      return
    }

    setExporting(true)
    try {
      const csv = [
        ['Name', 'Type', 'Photo Count', 'Pending Count', 'Last Modified', 'Visibility'].join(','),
        ...filteredGalleries.map(g => [
          `"${(g.name || g.title || 'Untitled').replace(/"/g, '""')}"`,
          g.gallery_type,
          g.photo_count || 0,
          g.pending_count || 0,
          new Date(g.updated_at || g.created_at).toLocaleDateString(),
          g.visibility || 'team',
        ].join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `galleries-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showSuccess(t('photos.search.exportSuccess'))
    } catch (err) {
      showError(t('photos.search.exportError'))
    } finally {
      setExporting(false)
    }
  }, [filteredGalleries, t])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearch('')
    setEntityType('all')
    setDateRange('all')
    setPhotoStatus('all')
    setSizeRange('all')
    setHideEmpty(false)
    setSearchParams({}, { replace: true })
    setPage(0)
  }, [setHideEmpty, setSearchParams, setPage])

  // Navigate to gallery detail
  const handleViewGallery = useCallback((id: string) => {
    if (!id) {
      showError(t('photos.errors.loadGallery'))
      return
    }
    navigate(getLink('admin.photos.detail', { id }))
  }, [navigate, t])

  // Navigate to gallery edit
  const handleEditGallery = useCallback(async (id: string) => {
    if (!id) {
      showError(t('photos.errors.loadGallery'))
      return
    }

    if (USE_FAKE_DATA) {
      showError(t('photos.demoMode.editBlocked'))
      return
    }

    if (!context) {
      showError(t('photos.errors.loadGallery'))
      return
    }

    const gallery = galleries.find(g => g.id === id)
    if (!gallery) {
      showError(t('photos.errors.loadGallery'))
      return
    }

    setGalleryToEdit(gallery)
    setEditModalOpen(true)
    setGalleryPhotos([])

    const { data, error: photosError } = await getPhotosForGallery(context, { 
      gallery_id: id,
      order_by: 'created_at',
      order_direction: 'asc',
    })

    if (photosError) {
      showError(photosError.message || t('photos.errors.loadGallery'))
      return
    }

    setGalleryPhotos(data || [])
  }, [context, galleries, t])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return search !== '' || 
           entityType !== 'all' || 
           dateRange !== 'all' || 
           photoStatus !== 'all' || 
           sizeRange !== 'all' ||
           hideEmpty
  }, [search, entityType, dateRange, photoStatus, sizeRange, hideEmpty])

  if (loading) {
    return (
      <div className="photos-search">
        <div className="search-loading">
          <Card className="oa-card oa-h-64 oa-animate-pulse" />
        </div>
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
              disabled={loading}
            />
          </div>
          <div className="oa-flex oa-gap-2">
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                onClick={handleClearFilters}
                disabled={loading}
              >
                {t('photos.search.clearFilters')}
              </Button>
            )}
            <Button 
              variant="secondary" 
              onClick={handleExport}
              disabled={loading || exporting || filteredGalleries.length === 0}
              loading={exporting}
            >
              {t('photos.search.exportResults')}
            </Button>
          </div>
        </div>

        <div className="search-content">
          {/* Filter Sidebar */}
          <div className="search-sidebar">
            <h3>{t('photos.search.filters')}</h3>

            <div className="filter-group">
              <label className="filter-label">{t('photos.settings.hideEmptyByDefault')}</label>
              <Checkbox
                checked={hideEmpty}
                onChange={(e) => {
                  setHideEmpty(e.target.checked)
                  setPage(0)
                }}
                disabled={loading}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">{t('photos.filters.byType')}</label>
              <Select
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value as any)
                  setPage(0)
                }}
                disabled={loading}
                options={[
                  { label: t('photos.filters.all'), value: 'all' },
                  { label: t('photos.galleryType.event'), value: 'event' },
                  { label: t('photos.galleryType.team'), value: 'team' },
                  { label: t('photos.galleryType.athlete'), value: 'athlete' },
                  { label: t('photos.galleryType.season'), value: 'season' },
                  { label: t('photos.galleryType.program'), value: 'program' },
                  { label: t('photos.galleryType.travel'), value: 'travel' },
                  { label: t('photos.galleryType.organization'), value: 'org' },
                ]}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">{t('common.date')}</label>
              <Select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value as any)
                  setPage(0)
                }}
                disabled={loading}
                options={[
                  { label: t('common.all'), value: 'all' },
                  { label: t('common.lastWeek'), value: 'week' },
                  { label: t('common.lastMonth'), value: 'month' },
                  { label: t('common.lastYear'), value: 'year' },
                ]}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">{t('photos.search.filterByStatus')}</label>
              <Select
                value={photoStatus}
                onChange={(e) => {
                  setPhotoStatus(e.target.value as any)
                  setPage(0)
                }}
                disabled={loading}
                options={[
                  { label: t('common.all'), value: 'all' },
                  { label: t('photos.browse.hasPhotos'), value: 'has_photos' },
                  { label: t('photos.browse.emptyGallery'), value: 'empty' },
                  { label: t('photos.pendingApproval.badge'), value: 'pending' },
                ]}
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">{t('photos.search.filterBySize')}</label>
              <Select
                value={sizeRange}
                onChange={(e) => {
                  setSizeRange(e.target.value as any)
                  setPage(0)
                }}
                disabled={loading}
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
              <h3>
                {t('photos.search.results')} ({filteredGalleries.length})
              </h3>
            </div>

            {paginatedGalleries.length === 0 ? (
              <Card className="oa-card oa-p-8 oa-text-center">
                <span className="material-symbols-outlined oa-text-5xl oa-text-muted oa-mb-4">
                  photo_library
                </span>
                <p className="oa-text-lg oa-font-medium oa-mb-2">
                  {t('photos.search.noResults')}
                </p>
                {hasActiveFilters && (
                  <Button 
                    variant="secondary" 
                    onClick={handleClearFilters}
                    className="oa-mt-4"
                  >
                    {t('photos.search.clearFilters')}
                  </Button>
                )}
              </Card>
            ) : (
              <Table
                data={paginatedGalleries.map(g => ({
                  id: g.id,
                  name: g.name || g.title || 'Untitled',
                  photoCount: g.photo_count || 0,
                  pendingCount: g.pending_count || 0,
                  lastModified: new Date(g.updated_at || g.created_at).toLocaleDateString(),
                  type: t(`photos.galleryType.${g.gallery_type}`),
                  coverUrl: g.cover_url,
                  visibility: g.visibility || 'team',
                }))}
                columns={[
                  { id: 'name', label: t('common.name') },
                  { 
                    id: 'type', 
                    label: t('common.type'),
                    render: (row) => (
                      <span className="oa-text-sm oa-text-muted">{row.type}</span>
                    )
                  },
                  { 
                    id: 'photoCount', 
                    label: t('photos.stats.totalPhotos'),
                    render: (row) => (
                      <span className="oa-text-sm">
                        {row.photoCount}
                        {row.pendingCount > 0 && (
                          <span className="oa-ml-2 oa-text-xs oa-text-warning">
                            (+{row.pendingCount} {t('photos.pendingApproval.badge').toLowerCase()})
                          </span>
                        )}
                      </span>
                    )
                  },
                  { 
                    id: 'lastModified', 
                    label: t('common.modified'),
                    render: (row) => (
                      <span className="oa-text-sm oa-text-muted">{row.lastModified}</span>
                    )
                  },
                  {
                    id: 'visibility',
                    label: t('photos.browse.status'),
                    render: (row) => (
                      <span className={`table-status-badge ${row.visibility === 'public' ? 'public' : 'draft'}`}>
                        {row.visibility === 'public' ? t('photos.browse.publicStatus') : t('photos.browse.draftStatus')}
                      </span>
                    )
                  },
                  {
                    id: 'actions',
                    label: '',
                    render: (row) => (
                      <div className="oa-flex oa-gap-2 oa-justify-end" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="table-more-button"
                          onClick={() => handleViewGallery(row.id)}
                          title={t('photos.viewGallery')}
                          disabled={loading}
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <button 
                          className="table-more-button"
                          onClick={() => handleEditGallery(row.id)}
                          title={t('photos.editGallery')}
                          disabled={loading}
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </div>
                    )
                  },
                ]}
                onRowClick={(row) => handleViewGallery(row.id as string)}
                pagination={{
                  currentPage: page + 1,
                  totalRows: filteredGalleries.length,
                  totalPages: Math.ceil(filteredGalleries.length / rowsPerPage),
                  rowsPerPage,
                  onPageChange: (nextPage) => setPage(Math.max(0, nextPage - 1)),
                  onRowsPerPageChange: (newRowsPerPage) => {
                    setRowsPerPage(newRowsPerPage)
                    setPage(0)
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>

      {editModalOpen && galleryToEdit && (
        <GalleryEditModal
          open={editModalOpen}
          gallery={galleryToEdit}
          photos={galleryPhotos}
          onClose={() => setEditModalOpen(false)}
          onSaved={(updatedGallery) => {
            setGalleries(prev => prev.map(g => g.id === updatedGallery.id ? updatedGallery : g))
            setGalleryToEdit(updatedGallery)
            setEditModalOpen(false)
          }}
          onDelete={async () => {
            if (USE_FAKE_DATA) {
              showError(t('photos.demoMode.deleteBlocked'))
              return
            }
            if (!context || !galleryToEdit) return
            const confirm = window.confirm(t('photos.confirmDeletePhotos', { count: galleryPhotos.length }))
            if (!confirm) return
            const { error: deleteError } = await deleteGallery(context, galleryToEdit.id)
            if (deleteError) {
              showError(deleteError.message || t('photos.errors.deleteGallery'))
              return
            }
            showSuccess(t('photos.success.galleryDeleted'))
            setGalleries(prev => prev.filter(g => g.id !== galleryToEdit.id))
            setGalleryToEdit(null)
            setEditModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
