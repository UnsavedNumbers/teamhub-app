import { useEffect, useState } from 'react'
import { createGalleryForEntity, mapEntityToGalleryType, type Gallery, type GalleryEntityType } from '@/data/services/galleryService'
import { useUserContext } from '@/hooks/useUserContext'
import { showError, showSuccess } from '@/utils/toast'
import { Button, Input } from '@/components/platformAdmin'

interface GalleryCreateModalProps {
  open: boolean
  onClose: () => void
  defaultEntityType?: GalleryEntityType
  defaultEntityId?: string
  entityLabel?: string
  onCreated?: (gallery: Gallery) => void
}

const entityOptions: { label: string; value: GalleryEntityType }[] = [
  { label: 'Team', value: 'team' },
  { label: 'Athlete', value: 'athlete' },
  { label: 'Event', value: 'event' },
  { label: 'Travel Plan', value: 'travel_plan' },
  { label: 'Season', value: 'season' },
  { label: 'Program', value: 'program' },
  { label: 'Organization', value: 'organization' },
]

export function GalleryCreateModal({
  open,
  onClose,
  defaultEntityId,
  defaultEntityType,
  entityLabel,
  onCreated,
}: GalleryCreateModalProps) {
  const { context } = useUserContext()
  const [entityType, setEntityType] = useState<GalleryEntityType | ''>(defaultEntityType || '')
  const [entityId, setEntityId] = useState(defaultEntityId || '')
  const [name, setName] = useState('New Gallery')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'team' | 'private'>('team')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setEntityType(defaultEntityType || '')
      setEntityId(defaultEntityId || '')
    }
  }, [open, defaultEntityId, defaultEntityType])

  useEffect(() => {
    if (entityType === 'organization' && !entityId && context?.orgId) {
      setEntityId(context.orgId)
    }
  }, [entityType, entityId, context?.orgId])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!context) return
    if (!entityType || !entityId) {
      showError('Select an entity and provide its id')
      return
    }
    setSaving(true)
    try {
      const galleryType = mapEntityToGalleryType(entityType)
      const { data, error } = await createGalleryForEntity(
        context,
        galleryType,
        entityId,
        name.trim() || 'Gallery',
        true,
        true,
        description.trim() || null,
        visibility
      )
      if (error || !data) throw error || new Error('Failed to create gallery')
      showSuccess('Gallery created')
      onCreated?.(data)
      onClose()
    } catch (err: any) {
      showError(err?.message || 'Failed to create gallery')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pa-fixed pa-inset-0 pa-bg-black/40 pa-z-50 pa-grid pa-place-items-center">
      <div className="pa-card pa-w-[520px] max-sm:pa-w-[95vw] pa-relative">
        <button className="pa-absolute pa-top-3 pa-right-3 pa-text-muted" onClick={onClose}>✕</button>
        <h3 className="pa-text-lg pa-font-semibold pa-mb-2">Create Gallery</h3>
        <p className="pa-text-sm pa-text-muted pa-mb-4">{entityLabel || 'Select an entity to attach this gallery to.'}</p>

        <form className="pa-space-y-3" onSubmit={handleSubmit}>
          <div className="pa-grid pa-grid-cols-2 pa-gap-3">
            <div>
              <label className="pa-label">Entity type</label>
              <select
                className="pa-input"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as GalleryEntityType)}
                disabled={!!defaultEntityType}
              >
                <option value="">Select</option>
                {entityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="pa-label">Entity ID</label>
              <Input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="UUID"
                disabled={!!defaultEntityId}
              />
            </div>
          </div>

          <div>
            <label className="pa-label">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
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

          <div className="pa-flex pa-justify-end pa-gap-2 pa-pt-2">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
