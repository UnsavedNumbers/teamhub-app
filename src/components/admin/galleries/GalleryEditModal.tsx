import { useEffect, useState } from 'react'
import { Button, Input } from '@/components/platformAdmin'
import { generateGalleryCover, updateGallery, type Gallery, type GalleryPhoto } from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { showError, showSuccess } from '@/utils/toast'

interface GalleryEditModalProps {
  open: boolean
  gallery: Gallery | null
  photos?: GalleryPhoto[]
  onClose: () => void
  onSaved?: (gallery: Gallery) => void
  onDelete?: () => void
}

export function GalleryEditModal({ open, gallery, photos = [], onClose, onSaved, onDelete }: GalleryEditModalProps) {
  const { context } = useUserContext()
  const [name, setName] = useState(gallery?.name || '')
  const [description, setDescription] = useState(gallery?.description || '')
  const [visibility, setVisibility] = useState<'public' | 'team' | 'private'>(
    (gallery?.visibility as any) || 'team'
  )
  const [coverPhotoId, setCoverPhotoId] = useState<string | ''>(gallery?.cover_photo_id || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (gallery && open) {
      setName(gallery.name)
      setDescription(gallery.description || '')
      setVisibility((gallery.visibility as any) || 'team')
      setCoverPhotoId(gallery.cover_photo_id || '')
    }
  }, [gallery, open])

  if (!open || !gallery) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!context) return
    setSaving(true)
    try {
      const { data, error } = await updateGallery(context, gallery.id, {
        name: name.trim(),
        description: description.trim(),
        visibility,
        cover_photo_id: coverPhotoId || null,
      })
      if (error || !data) throw error || new Error('Failed to update gallery')
      
      // Check if cover changed and trigger regeneration
      const oldCover = gallery.cover_photo_id || ''
      const newCover = coverPhotoId || ''
      
      if (oldCover !== newCover) {
         if (newCover) {
             generateGalleryCover(gallery.id, newCover, true).catch(console.error)
             showSuccess('Gallery updated. Cover thumbnails processing.')
         } else {
             // Cover removed, fall back to auto-selection
             generateGalleryCover(gallery.id, undefined, true).catch(console.error)
             showSuccess('Gallery updated. Cover reset to automatic.')
         }
      } else {
         showSuccess('Gallery updated')
      }
      
      onSaved?.(data)
      onClose()
    } catch (err: any) {
      showError(err?.message || 'Failed to save gallery')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pa-fixed pa-inset-0 pa-bg-black/40 pa-z-50 pa-grid pa-place-items-center">
      <div className="pa-card pa-w-[540px] max-sm:pa-w-[95vw] pa-relative">
        <button className="pa-absolute pa-top-3 pa-right-3 pa-text-muted" onClick={onClose}>✕</button>
        <h3 className="pa-text-lg pa-font-semibold pa-mb-3">Edit Gallery</h3>
        <form className="pa-space-y-3" onSubmit={handleSave}>
          <div>
            <label className="pa-label">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
          </div>
          <div>
            <label className="pa-label">Description</label>
            <textarea
              className="pa-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="pa-label">Visibility</label>
            <select className="pa-input" value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
              <option value="public">Public</option>
              <option value="team">Team only</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div>
            <label className="pa-label">Cover photo</label>
            <select className="pa-input" value={coverPhotoId} onChange={(e) => setCoverPhotoId(e.target.value)}>
              <option value="">No cover</option>
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.filename || p.id}
                </option>
              ))}
            </select>
          </div>

          <div className="pa-flex pa-justify-between pa-items-center pa-pt-2">
            {onDelete && (
              <Button variant="danger" type="button" onClick={onDelete}>
                Delete gallery
              </Button>
            )}
            <div className="pa-flex pa-gap-2 pa-justify-end pa-flex-1">
              <Button variant="ghost" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={saving}>
                Save
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
