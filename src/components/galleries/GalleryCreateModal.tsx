import { useState } from 'react'
import { createGalleryForEntity, mapEntityToGalleryType, type GalleryEntityType } from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { Button } from '../platformAdmin'
import { showError, showSuccess } from '@/utils/toast'

interface GalleryCreateModalProps {
  entityType: GalleryEntityType
  entityId: string
  open: boolean
  onClose: () => void
  onCreated: (galleryId: string) => void
}

export function GalleryCreateModal({ entityType, entityId, open, onClose, onCreated }: GalleryCreateModalProps) {
  const { context } = useUserContext()
  const [name, setName] = useState('New Gallery')
  const [visibility, setVisibility] = useState<'public' | 'team' | 'private'>('team')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!context) return
    setSaving(true)
    try {
      const galleryType = mapEntityToGalleryType(entityType)
      const { data, error } = await createGalleryForEntity(
        context,
        galleryType,
        entityId,
        name.trim() || 'Gallery',
        visibility !== 'private',
        true,
      )
      if (error || !data) throw error || new Error('Failed to create gallery')
      showSuccess('Gallery created')
      onCreated(data.id)
      onClose()
    } catch (err: any) {
      showError(err?.message || 'Failed to create gallery')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 40,
      }}
    >
      <div className="pa-card pa-shadow-lg" style={{ width: 'min(480px, 95%)', padding: '20px' }}>
        <div className="pa-flex pa-justify-between pa-items-center pa-mb-3">
          <h3 className="pa-text-lg pa-font-semibold">Create Gallery</h3>
          <button className="pa-link" onClick={onClose}>✕</button>
        </div>
        <form className="pa-space-y-3" onSubmit={handleSubmit}>
          <div>
            <label className="pa-label">Name</label>
            <input className="pa-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>
          <div>
            <label className="pa-label">Visibility</label>
            <select className="pa-input" value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
              <option value="public">Public</option>
              <option value="team">Team only</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div className="pa-flex pa-justify-end pa-gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" loading={saving} icon="add">Create</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
