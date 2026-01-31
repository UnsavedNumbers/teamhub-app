/**
 * Moderation Queue Component
 * 
 * Displays pending photos for moderation with approve/reject actions.
 */

import { useEffect, useState } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { supabase } from '../../lib/supabase'
import {
  getPhotosForGallery,
  moderatePhotos,
  getGalleryPhotoUrl,
  type GalleryPhoto,
} from '../../data/services/galleryService'
import Card from '../portal/Card'
import Button from '../portal/Button'
import Icon from '../portal/Icon'
import { showError, showSuccess } from '../../utils/toast'

interface ModerationQueueProps {
  galleryId: string
  onModerationComplete?: () => void
}

export function ModerationQueue({ galleryId, onModerationComplete }: ModerationQueueProps) {
  const { context, isReady } = useUserContext()
  const [pendingPhotos, setPendingPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [moderating, setModerating] = useState(false)

  useEffect(() => {
    if (!isReady || !galleryId) return

    const loadPendingPhotos = async () => {
      setLoading(true)
      const { data, error } = await getPhotosForGallery(context, {
        gallery_id: galleryId,
        status: 'pending',
      })

      if (error) {
        showError(`Failed to load pending photos: ${error.message}`)
        setLoading(false)
        return
      }

      setPendingPhotos(data || [])
      setLoading(false)
    }

    loadPendingPhotos()
  }, [context, isReady, galleryId])

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev)
      if (next.has(photoId)) {
        next.delete(photoId)
      } else {
        next.add(photoId)
      }
      return next
    })
  }

  const handleModerate = async (action: 'approve' | 'reject') => {
    if (selectedPhotos.size === 0) {
      showError('Please select at least one photo')
      return
    }

    setModerating(true)
    
    try {
      // Call Edge Function for moderation (which handles email notifications)
      const { error: functionError } = await supabase.functions.invoke(
        'moderate-photo-submission',
        {
          body: {
            photoIds: Array.from(selectedPhotos),
            action,
            galleryId,
          },
        }
      )

      if (functionError) {
        // Fallback to direct DB update if Edge Function fails
        const { error } = await moderatePhotos(context, Array.from(selectedPhotos), action)
        if (error) {
          throw error
        }
      }

      showSuccess(`${action === 'approve' ? 'Approved' : 'Rejected'} ${selectedPhotos.size} photo(s)`)
      setSelectedPhotos(new Set())
      
      // Reload pending photos
      const { data } = await getPhotosForGallery(context, {
        gallery_id: galleryId,
        status: 'pending',
      })
      setPendingPhotos(data || [])
      
      onModerationComplete?.()
    } catch (err) {
      showError(`Failed to ${action} photos: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setModerating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">Loading pending photos...</p>
        </div>
      </Card>
    )
  }

  if (pendingPhotos.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Icon name="check_circle" size="text-6xl" className="text-green-500 mb-4 mx-auto" />
          <p className="text-lg font-semibold mb-2">All caught up!</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No photos pending moderation.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk actions */}
      {selectedPhotos.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => handleModerate('approve')}
                disabled={moderating}
              >
                <Icon name="check" size="text-sm" className="mr-2" />
                Approve
              </Button>
              <Button
                variant="primary"
                onClick={() => handleModerate('reject')}
                disabled={moderating}
              >
                <Icon name="close" size="text-sm" className="mr-2" />
                Reject
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedPhotos(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {pendingPhotos.map((photo) => {
          const photoUrl = getGalleryPhotoUrl(photo.storage_path)
          const isSelected = selectedPhotos.has(photo.id)
          
          return (
            <Card
              key={photo.id}
              className={`cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => togglePhotoSelection(photo.id)}
            >
              <div className="relative aspect-square rounded-lg overflow-hidden mb-2 bg-slate-100 dark:bg-slate-800">
                <img
                  src={photoUrl}
                  alt={`Pending photo ${photo.id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <div className="bg-blue-500 text-white rounded-full p-2">
                      <Icon name="check" size="text-xl" />
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Uploaded {new Date(photo.created_at).toLocaleDateString()}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
