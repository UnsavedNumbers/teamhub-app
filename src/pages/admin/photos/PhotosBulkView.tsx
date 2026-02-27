import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Card,
  Button,
  InlineNotice,
  Checkbox,
  Select,
  Modal,
} from '@/components/platformAdmin'
import { useUserContext } from '@/hooks/useUserContext'
import { useI18n } from '@/i18n/useI18n'
import { getGalleriesForUser, deleteGallery, type Gallery, type GalleryType } from '@/data/services/galleryService'
import { showSuccess, showError } from '@/utils/toast'
import './PhotosBulkView.css'

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export function PhotosBulkView() {
  useDebugLifecycle('PhotosBulkView')
  
  const { context } = useUserContext()
  const { t } = useI18n()

  const [galleries, setGalleries] = useState<Gallery[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Selection filters
  const [selectFilter, setSelectFilter] = useState<'all' | 'empty' | 'by_type' | 'by_date'>('all')
  const [selectEntityType, setSelectEntityType] = useState<GalleryType | 'all'>('all')
  const [selectDateRange, setSelectDateRange] = useState<'all' | 'week' | 'month' | 'year'>('all')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!context?.orgId) {
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

  const selectableGalleries = useMemo(() => {
    let result = galleries.filter(g => !g.is_system_generated)

    if (selectFilter === 'empty') {
      result = result.filter(g => (g.photo_count || 0) === 0)
    } else if (selectFilter === 'by_type' && selectEntityType !== 'all') {
      result = result.filter(g => g.gallery_type === selectEntityType)
    } else if (selectFilter === 'by_date' && selectDateRange !== 'all') {
      const now = new Date()
      const cutoff = new Date()
      switch (selectDateRange) {
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
      result = result.filter(g => new Date(g.created_at) >= cutoff)
    }

    return result
  }, [galleries, selectFilter, selectEntityType, selectDateRange])

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === selectableGalleries.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableGalleries.map(g => g.id)))
    }
  }, [selectableGalleries, selectedIds.size])

  const handleSelectGallery = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleDeleteEmpty = useCallback(async () => {
    if (selectedIds.size === 0) return

    const emptyGalleries = selectableGalleries.filter(
      g => selectedIds.has(g.id) && (g.photo_count || 0) === 0 && !g.is_system_generated
    )

    if (emptyGalleries.length === 0) {
      showError(t('photos.bulk.deleteError'))
      return
    }

    setDeleting(true)
    setShowDeleteConfirm(false)

    let successCount = 0
    let errorCount = 0

    for (const gallery of emptyGalleries) {
      const { error } = await deleteGallery(context!, gallery.id)
      if (error) {
        errorCount++
        console.error(`Failed to delete gallery ${gallery.id}:`, error)
      } else {
        successCount++
      }
    }

    setDeleting(false)

    if (successCount > 0) {
      showSuccess(t('photos.bulk.deleteSuccess', { count: successCount }))
      setSelectedIds(new Set())
      // Reload galleries
      const { data } = await getGalleriesForUser(context!, {})
      if (data) {
        setGalleries(data)
      }
    }

    if (errorCount > 0) {
      showError(t('photos.bulk.deleteError'))
    }
  }, [selectedIds, selectableGalleries, context, t])

  if (loading) {
    return (
      <div className="bulk-loading">
        <Card className="oa-card oa-h-64 oa-animate-pulse" />
      </div>
    )
  }

  return (
    <div className="photos-bulk">
      {error && (
        <InlineNotice 
          tone="error" 
          title={t('photos.errors.loadGalleries')} 
          message={error} 
        />
      )}

      <div className="bulk-container">
        {/* Selection Tools */}
        <Card className="bulk-selection-card">
          <h3>{t('photos.bulk.selectGalleries')}</h3>
          <div className="selection-filters">
            <div className="filter-group">
              <label className="filter-label">{t('photos.bulk.selectGalleries')}</label>
              <Select
                value={selectFilter}
                onChange={(e) => {
                  setSelectFilter(e.target.value as any)
                  setSelectedIds(new Set())
                }}
                options={[
                  { label: t('common.all'), value: 'all' },
                  { label: t('photos.bulk.selectAllEmpty'), value: 'empty' },
                  { label: t('photos.bulk.selectByType'), value: 'by_type' },
                  { label: t('photos.bulk.selectByDate'), value: 'by_date' },
                ]}
              />
            </div>

            {selectFilter === 'by_type' && (
              <div className="filter-group">
                <label className="filter-label">{t('photos.filters.byType')}</label>
                <Select
                  value={selectEntityType}
                  onChange={(e) => {
                    setSelectEntityType(e.target.value as any)
                    setSelectedIds(new Set())
                  }}
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
            )}

            {selectFilter === 'by_date' && (
              <div className="filter-group">
                <label className="filter-label">{t('common.date')}</label>
                <Select
                  value={selectDateRange}
                  onChange={(e) => {
                    setSelectDateRange(e.target.value as any)
                    setSelectedIds(new Set())
                  }}
                  options={[
                    { label: t('common.all'), value: 'all' },
                    { label: t('common.lastWeek'), value: 'week' },
                    { label: t('common.lastMonth'), value: 'month' },
                    { label: t('common.lastYear'), value: 'year' },
                  ]}
                />
              </div>
            )}
          </div>

          <div className="selection-summary">
            <Checkbox
              checked={selectedIds.size === selectableGalleries.length && selectableGalleries.length > 0}
              onChange={handleSelectAll}
              label={t('common.selectAll')}
            />
            <span className="selected-count">
              {t('photos.bulk.selectedCount', { count: selectedIds.size })}
            </span>
          </div>
        </Card>

        {/* Actions */}
        <Card className="bulk-actions-card">
          <h3>{t('photos.bulk.actions')}</h3>
          <div className="actions-grid">
            <Button
              variant="danger"
              icon="delete"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0 || deleting}
              className="whitespace-nowrap"
            >
              {t('photos.bulk.deleteEmpty')}
            </Button>
            <Button
              variant="secondary"
              icon="merge_type"
              disabled
              title={t('photos.bulk.comingSoon')}
              className="whitespace-nowrap"
            >
              {t('photos.bulk.mergeGalleries')}
            </Button>
            <Button
              variant="secondary"
              icon="label"
              disabled
              title={t('photos.bulk.comingSoon')}
              className="whitespace-nowrap"
            >
              {t('photos.bulk.bulkTag')}
            </Button>
            <Button
              variant="secondary"
              icon="lock"
              disabled
              title={t('photos.bulk.comingSoon')}
              className="whitespace-nowrap"
            >
              {t('photos.bulk.batchPermissions')}
            </Button>
            <Button
              variant="secondary"
              icon="archive"
              disabled
              title={t('photos.bulk.comingSoon')}
              className="whitespace-nowrap"
            >
              {t('photos.bulk.archive')}
            </Button>
            <Button
              variant="secondary"
              icon="description"
              disabled
              title={t('photos.bulk.comingSoon')}
              className="whitespace-nowrap"
            >
              {t('photos.bulk.generateReport')}
            </Button>
          </div>
        </Card>

        {/* Gallery List */}
        <Card className="bulk-galleries-card">
          <h3>{t('photos.bulk.selectGalleries')}</h3>
          {selectableGalleries.length === 0 ? (
            <p className="oa-text-muted oa-text-center oa-py-8">
              {t('photos.browse.noGalleries')}
            </p>
          ) : (
            <div className="galleries-list">
              {selectableGalleries.map(gallery => (
                <div
                  key={gallery.id}
                  className={`gallery-item ${selectedIds.has(gallery.id) ? 'selected' : ''}`}
                  onClick={() => handleSelectGallery(gallery.id)}
                >
                  <Checkbox
                    checked={selectedIds.has(gallery.id)}
                    onChange={() => handleSelectGallery(gallery.id)}
                  />
                  <div className="gallery-item-content">
                    <div className="gallery-item-name">{gallery.name}</div>
                    <div className="gallery-item-meta">
                      {t(`photos.galleryType.${gallery.gallery_type}`)} • {gallery.photo_count || 0} {t('photos.photos')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title={t('photos.bulk.deleteEmpty')}
      >
        <p className="oa-text-sm oa-text-muted oa-mb-4">
          {t('photos.bulk.confirmDeleteEmpty', { count: selectedIds.size })}
        </p>
        <div className="oa-flex oa-justify-end oa-gap-2">
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={handleDeleteEmpty} disabled={deleting}>
            {deleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
