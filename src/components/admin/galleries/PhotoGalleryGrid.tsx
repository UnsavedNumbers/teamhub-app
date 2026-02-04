import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Checkbox, ConfirmDialog, Badge } from '@/components/platformAdmin'
import { getGalleryPhotoThumbnailUrl, type GalleryPhoto } from '@/data/services/galleryService'
import { useI18n } from '@/i18n/useI18n'
import { getLink } from '@/utils/routes'

interface PhotoGalleryGridProps {
  photos: GalleryPhoto[]
  coverPhotoId?: string | null
  showPendingBadge?: boolean
  onDelete?: (ids: string[]) => Promise<void> | void
  onSetCover?: (photoId: string) => Promise<void> | void
}

export function PhotoGalleryGrid({ 
  photos, 
  coverPhotoId, 
  showPendingBadge = false,
  onDelete, 
  onSetCover 
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

  const handlePhotoClick = (photo: GalleryPhoto) => {
    // Navigate to photo detail page
    if (photo.gallery_id) {
      navigate(getLink('admin.photos.photo', { 
        galleryId: photo.gallery_id, 
        photoId: photo.id 
      }))
    }
  }

  const renderPhoto = (photo: GalleryPhoto) => {
    const isSelected = selected.has(photo.id)
    const isPending = (photo.approval_status || photo.status) === 'pending'
    const thumb = photo.thumbnail_url || getGalleryPhotoThumbnailUrl(photo.thumbnail_path, photo.storage_path)
    
    return (
      <div key={photo.id} className="pa-relative pa-overflow-hidden pa-rounded-lg pa-border pa-bg-surface hover:pa-shadow-sm pa-group">
        <img
          src={thumb}
          alt={photo.filename || t('photos.viewPhoto')}
          className="pa-w-full pa-h-40 pa-object-cover pa-cursor-pointer"
          onClick={() => handlePhotoClick(photo)}
        />
        
        {/* Badges */}
        <div className="pa-absolute pa-top-2 pa-left-2 pa-flex pa-gap-2 pa-items-center">
          <Checkbox checked={isSelected} onChange={() => toggleOne(photo.id)} />
          {coverPhotoId === photo.id && (
            <Badge variant="info">{t('photos.coverPhoto')}</Badge>
          )}
          {showPendingBadge && isPending && (
            <Badge variant="warning">{t('photos.pendingApproval.badge')}</Badge>
          )}
        </div>
        
        {/* Actions (show on hover) */}
        <div className="pa-absolute pa-bottom-2 pa-right-2 pa-flex pa-gap-2 pa-opacity-0 group-hover:pa-opacity-100 pa-transition-opacity">
          {onSetCover && !isPending && (
            <Button size="small" variant="ghost" onClick={() => onSetCover(photo.id)}>
              {t('photos.setCoverPhoto')}
            </Button>
          )}
          {onDelete && (
            <Button 
              size="small" 
              variant="danger" 
              onClick={() => { 
                setSelected(new Set([photo.id])) 
                setConfirmDelete(true) 
              }}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>

        {/* Caption overlay */}
        {photo.caption && (
          <div className="pa-absolute pa-bottom-0 pa-left-0 pa-right-0 pa-bg-gradient-to-t pa-from-black/60 pa-p-2">
            <p className="pa-text-xs pa-text-white pa-truncate">{photo.caption}</p>
          </div>
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
        {selected.size > 0 && onDelete && (
          <Button variant="danger" size="small" onClick={() => setConfirmDelete(true)}>
            {t('photos.deletePhotos', { count: selected.size })}
          </Button>
        )}
      </div>

      {photos.length === 0 ? (
        <Card className="pa-card">
          <p className="pa-text-sm pa-text-muted">{t('photos.stats.emptyGallery')}</p>
        </Card>
      ) : (
        <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-3 xl:pa-grid-cols-4 pa-gap-3">
          {photos.map(renderPhoto)}
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

