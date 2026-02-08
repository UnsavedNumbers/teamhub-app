import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Checkbox, ConfirmDialog, Badge } from '@/components/platformAdmin'
import { getGalleryPhotoThumbnailUrl, type GalleryPhoto } from '@/data/services/galleryService'
import { useI18n } from '@/i18n/useI18n'
import { getLink } from '@/utils/routes'

interface PhotoGalleryGridProps {
  photos: GalleryPhoto[]
  coverPhotoId?: string | null
  showPendingBadge?: boolean
  viewMode?: 'grid' | 'list'
  onDelete?: (ids: string[]) => Promise<void> | void
  onModerate?: (ids: string[], action: 'approve' | 'reject') => Promise<void> | void
  onPhotoClick?: (photo: GalleryPhoto, index: number) => void
  onBulkTag?: (photos: GalleryPhoto[]) => void
}

export function PhotoGalleryGrid({ 
  photos, 
  coverPhotoId, 
  showPendingBadge = false,
  viewMode = 'grid',
  onDelete, 
  onModerate,
  onPhotoClick,
  onBulkTag,
}: PhotoGalleryGridProps) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [lightboxId, setLightboxId] = useState<string | null>(null)

  const allSelected = useMemo(() => photos.length > 0 && selected.size === photos.length, [photos.length, selected.size])

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(photos.map((p) => p.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = async () => {
    if (selected.size === 0 || !onDelete) return
    await onDelete(Array.from(selected))
    setSelected(new Set())
    setConfirmDelete(false)
  }

  const handlePhotoClick = (photo: GalleryPhoto, index: number) => {
    if (onPhotoClick) {
      onPhotoClick(photo, index)
    } else if (photo.gallery_id) {
      // Fallback: navigate to photo detail page
      navigate(getLink('admin.photos.photo', { 
        galleryId: photo.gallery_id, 
        photoId: photo.id 
      }))
    }
  }

  const renderPhoto = (photo: GalleryPhoto, index: number) => {
    const isSelected = selected.has(photo.id)
    const isPending = (photo.approval_status || photo.status) === 'pending'
    const thumb = photo.thumbnail_url || getGalleryPhotoThumbnailUrl(photo.thumbnail_path, photo.storage_path)
    const taggedNames = photo.tagged_athletes
      ?.map((a) => a.first_name)
      .join(' • ') || ''
    
    return (
      <div key={photo.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Photo container */}
        <div 
          style={{ 
            position: 'relative', 
            aspectRatio: '1 / 1', 
            backgroundColor: 'var(--pa-surface)', 
            borderRadius: '16px', 
            overflow: 'hidden', 
            cursor: 'pointer' 
          }}
        >
          <img
            src={thumb}
            alt={photo.filename || t('photos.viewPhoto')}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.7s' }}
            onClick={() => handlePhotoClick(photo, index)}
          />
          
          {/* Badges - Left corner */}
          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '8px', padding: coverPhotoId === photo.id || (showPendingBadge && isPending) ? '4px 6px' : '0' }}>
            {coverPhotoId === photo.id && (
              <Badge variant="info" style={{ background: '#FFF' }}>{t('photos.coverPhoto')}</Badge>
            )}
            {showPendingBadge && isPending && (
              <Badge variant="warning">{t('photos.pendingApproval.badge')}</Badge>
            )}
          </div>
          
          {/* Checkbox - Right corner - overlayed on photo */}
          <div 
            style={{ 
              position: 'absolute', 
              top: '11px', 
              right: '8px',
              zIndex: 10
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox checked={isSelected} onChange={() => toggleOne(photo.id)} />
          </div>

          {/* Caption overlay */}
          {photo.caption && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', padding: '8px' }}>
              <p style={{ fontSize: '12px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.caption}</p>
            </div>
          )}
        </div>
        
        {/* Approve/Reject buttons below pending photos */}
        {isPending && onModerate && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              size="small" 
              variant="secondary" 
              onClick={() => onModerate([photo.id], 'approve')}
              style={{ flex: 1 }}
            >
              {t('photos.approve')}
            </Button>
            <Button 
              size="small" 
              variant="ghost" 
              onClick={() => onModerate([photo.id], 'reject')}
              style={{ flex: 1 }}
            >
              {t('photos.reject')}
            </Button>
          </div>
        )}
        
        {/* Tagged athletes display */}
        {taggedNames && (
          <p style={{ 
            fontSize: '11px', 
            color: 'var(--pa-text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em', 
            fontWeight: 600,
            paddingLeft: '4px'
          }}>
            {taggedNames}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="pa-space-y-3">
      <div className="pa-flex pa-justify-between pa-items-center">
        <div className="pa-flex pa-gap-3 pa-items-center">
          <Checkbox checked={allSelected} onChange={toggleSelectAll} label={t('common.selectAll')} />
          <span className="pa-text-sm pa-text-muted">
            {selected.size > 0 ? t('common.selectedCount', { count: selected.size }) : ''}
          </span>
        </div>
        <div className="pa-flex pa-gap-2">
          {selected.size > 0 && onDelete && (
            <Button variant="danger" size="small" onClick={() => setConfirmDelete(true)}>
              {t('photos.deletePhotos', { count: selected.size })}
            </Button>
          )}

          {selected.size > 0 && onModerate && (
            <>
              <Button variant="secondary" size="small" onClick={() => onModerate(Array.from(selected), 'approve')}>
                {t('photos.approve')}
              </Button>
              <Button variant="ghost" size="small" onClick={() => onModerate(Array.from(selected), 'reject')}>
                {t('photos.reject')}
              </Button>
            </>
          )}
          {selected.size > 0 && onBulkTag && (
            <Button variant="secondary" size="small" onClick={() => {
              const selectedPhotos = photos.filter((p) => selected.has(p.id))
              onBulkTag(selectedPhotos)
              setSelected(new Set())
            }}>
              {t('gallery.tagging.title')}
            </Button>
          )}
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="oa-card">
          <p className="pa-text-sm pa-text-muted">{t('photos.stats.emptyGallery')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="pa-grid pa-grid-4">
          {photos.map((photo, index) => renderPhoto(photo, index))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {photos.map((photo, index) => {
            const isSelected = selected.has(photo.id)
            const isPending = (photo.approval_status || photo.status) === 'pending'
            const thumb = photo.thumbnail_url || getGalleryPhotoThumbnailUrl(photo.thumbnail_path, photo.storage_path)
            const taggedNames = photo.tagged_athletes
              ?.map((a) => a.first_name)
              .join(' • ') || ''
            
            return (
              <div 
                key={photo.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px', 
                  padding: '12px', 
                  background: 'var(--pa-surface)', 
                  borderRadius: '12px',
                  border: '1px solid var(--pa-border-subtle)'
                }}
              >
                <Checkbox checked={isSelected} onChange={() => toggleOne(photo.id)} />
                <img 
                  src={thumb} 
                  alt={photo.filename || t('photos.viewPhoto')} 
                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={() => handlePhotoClick(photo, index)}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {photo.filename || t('photos.viewPhoto')}
                  </p>
                  {photo.caption && (
                    <p style={{ fontSize: '14px', color: 'var(--pa-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {photo.caption}
                    </p>
                  )}
                  {taggedNames && (
                    <p style={{ 
                      fontSize: '11px', 
                      color: 'var(--pa-text-muted)', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.1em', 
                      fontWeight: 600,
                      marginTop: '4px'
                    }}>
                      {taggedNames}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {coverPhotoId === photo.id && (
                    <Badge variant="info">{t('photos.coverPhoto')}</Badge>
                  )}
                  {showPendingBadge && isPending && (
                    <Badge variant="warning">{t('photos.pendingApproval.badge')}</Badge>
                  )}
                </div>
                {isPending && onModerate && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="small" variant="secondary" onClick={() => onModerate([photo.id], 'approve')}>
                      {t('photos.approve')}
                    </Button>
                    <Button size="small" variant="ghost" onClick={() => onModerate([photo.id], 'reject')}>
                      {t('photos.reject')}
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          open={confirmDelete}
          title={t('photos.deletePhotos', { count: selected.size })}
          description={t('photos.confirmDeletePhotos', { count: selected.size })}
          variant="danger"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}

      {lightboxId && (
        <div
          className="pa-fixed pa-inset-0 pa-bg-black/75 pa-flex pa-items-center pa-justify-center pa-z-50"
          onClick={() => setLightboxId(null)}
        >
          <img
            src={
              photos.find((p) => p.id === lightboxId)?.url ||
              photos.find((p) => p.id === lightboxId)?.thumbnail_url ||
              ''
            }
            alt={t('photos.viewPhoto')}
            className="pa-max-h-[90vh] pa-max-w-[90vw] pa-object-contain pa-bg-white"
          />
        </div>
      )}
    </div>
  )
}
