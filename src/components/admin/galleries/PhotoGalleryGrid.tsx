import { useMemo, useState } from 'react'
import { Button, Card, Checkbox, ConfirmDialog, Badge } from '@/components/platformAdmin'
import { getGalleryPhotoThumbnailUrl, type GalleryPhoto } from '@/data/services/galleryService'

interface PhotoGalleryGridProps {
  photos: GalleryPhoto[]
  coverPhotoId?: string | null
  onDelete?: (ids: string[]) => Promise<void> | void
  onSetCover?: (photoId: string) => Promise<void> | void
}

export function PhotoGalleryGrid({ photos, coverPhotoId, onDelete, onSetCover }: PhotoGalleryGridProps) {
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

  const renderPhoto = (photo: GalleryPhoto) => {
    const isSelected = selected.has(photo.id)
    const thumb = photo.thumbnail_url || getGalleryPhotoThumbnailUrl(photo.thumbnail_path, photo.storage_path)
    return (
      <div key={photo.id} className="pa-relative pa-overflow-hidden pa-rounded-lg pa-border pa-bg-surface hover:pa-shadow-sm">
        <img
          src={thumb}
          alt={photo.filename || 'Photo'}
          className="pa-w-full pa-h-40 pa-object-cover pa-cursor-pointer"
          onClick={() => setLightboxId(photo.id)}
        />
        <div className="pa-absolute pa-top-2 pa-left-2 pa-flex pa-gap-2 pa-items-center">
          <Checkbox checked={isSelected} onChange={() => toggleOne(photo.id)} />
          {coverPhotoId === photo.id && <Badge variant="info">Cover</Badge>}
        </div>
        <div className="pa-absolute pa-bottom-2 pa-right-2 pa-flex pa-gap-2">
          {onSetCover && (
            <Button size="small" variant="ghost" onClick={() => onSetCover(photo.id)}>
              Set cover
            </Button>
          )}
          {onDelete && (
            <Button size="small" variant="danger" onClick={() => { setSelected(new Set([photo.id])); setConfirmDelete(true) }}>
              Delete
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="pa-space-y-3">
      <div className="pa-flex pa-justify-between pa-items-center">
        <div className="pa-flex pa-gap-3 pa-items-center">
          <Checkbox checked={allSelected} onChange={toggleSelectAll} label="Select all" />
          <span className="pa-text-sm pa-text-muted">{selected.size} selected</span>
        </div>
        {selected.size > 0 && onDelete && (
          <Button variant="danger" size="small" onClick={() => setConfirmDelete(true)}>
            Delete selected ({selected.size})
          </Button>
        )}
      </div>

      {photos.length === 0 ? (
        <Card className="pa-card">
          <p className="pa-text-sm pa-text-muted">No photos yet.</p>
        </Card>
      ) : (
        <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-3 xl:pa-grid-cols-4 pa-gap-3">
          {photos.map(renderPhoto)}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          open={confirmDelete}
          title="Delete photos"
          description={`Are you sure you want to delete ${selected.size} photo(s)? This cannot be undone.`}
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
            alt="Full size"
            className="pa-max-h-[90vh] pa-max-w-[90vw] pa-object-contain pa-bg-white"
          />
        </div>
      )}
    </div>
  )
}
