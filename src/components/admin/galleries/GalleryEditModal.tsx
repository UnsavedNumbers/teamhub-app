import { useEffect, useState } from 'react'
import { Button, Input } from '@/components/platformAdmin'
import { FanVisibilityToggle } from '../FanVisibilityToggle'
import { generateGalleryCover, updateGallery, type Gallery, type GalleryPhoto } from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { showError, showSuccess } from '@/utils/toast'
import { mapFanVisibilityToGalleryVisibility, mapGalleryVisibilityToFanVisibility } from '@/utils/fanVisibilityHelpers'

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
  const [visibleToFans, setVisibleToFans] = useState(false)
  const [visibilityExplicitlyChanged, setVisibilityExplicitlyChanged] = useState(false)
  const [coverPhotoId, setCoverPhotoId] = useState<string | ''>(gallery?.cover_photo_id || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (gallery && open) {
      setName(gallery.name)
      setDescription(gallery.description || '')
      setVisibleToFans(mapGalleryVisibilityToFanVisibility(gallery.visibility as any))
      setVisibilityExplicitlyChanged(false) // Reset when opening modal
      setCoverPhotoId(gallery.cover_photo_id || '')
    }
  }, [gallery, open])

  if (!open || !gallery) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!context) return
    setSaving(true)
    try {
      // Only update visibility if it was explicitly changed by the user
      // Otherwise preserve the original visibility setting
      const updates: Parameters<typeof updateGallery>[2] = {
        name: name.trim(),
        description: description.trim(),
        cover_photo_id: coverPhotoId || null,
      }

      if (visibilityExplicitlyChanged) {
        updates.visibility = mapFanVisibilityToGalleryVisibility(visibleToFans)
      }

      const { data, error } = await updateGallery(context, gallery.id, updates)
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div 
        className="oa-card relative w-full max-w-[540px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Gallery</h3>
          <button 
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-2xl leading-none w-8 h-8 flex items-center justify-center" 
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSave}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Description</label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional"
            />
          </div>
          <div>
            <FanVisibilityToggle
              checked={visibleToFans}
              onChange={(newValue) => {
                setVisibleToFans(newValue)
                setVisibilityExplicitlyChanged(true)
              }}
              entityType="gallery"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Cover photo</label>
            <select 
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
              value={coverPhotoId} 
              onChange={(e) => setCoverPhotoId(e.target.value)}
            >
              <option value="">No cover</option>
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.filename || p.id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            {onDelete && (
              <Button variant="danger" type="button" onClick={onDelete}>
                Delete Gallery
              </Button>
            )}
            <div className="flex gap-2 justify-end flex-1">
              <Button variant="ghost" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={saving}>
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
