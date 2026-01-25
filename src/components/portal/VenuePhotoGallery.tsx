/**
 * Venue Photo Gallery Component
 * 
 * Displays a horizontal scrollable carousel of venue photos.
 * Shows placeholder if no photos available.
 */

import { useState } from 'react'
import Icon from './Icon'

interface VenuePhotoGalleryProps {
  photos: string[]
  venueName?: string | null
  className?: string
}

export default function VenuePhotoGallery({
  photos,
  venueName,
  className = '',
}: VenuePhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  if (!photos || photos.length === 0) {
    return (
      <div className={`flex items-center justify-center h-48 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}>
        <div className="text-center">
          <Icon name="location_on" className="text-slate-400 text-4xl mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {venueName || 'No photos available'}
          </p>
        </div>
      </div>
    )
  }

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index))
  }

  const validPhotos = photos.filter((_, index) => !imageErrors.has(index))

  if (validPhotos.length === 0) {
    return (
      <div className={`flex items-center justify-center h-48 bg-slate-100 dark:bg-slate-800 rounded-lg ${className}`}>
        <div className="text-center">
          <Icon name="location_on" className="text-slate-400 text-4xl mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {venueName || 'Photos unavailable'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`overflow-x-auto ${className}`}>
        <div className="flex gap-4 pb-2">
          {photos.slice(0, 5).map((photoUrl, index) => {
            if (imageErrors.has(index)) {
              return null
            }

            return (
              <div
                key={index}
                className="flex-shrink-0 w-48 h-32 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedPhoto(photoUrl)}
              >
                <img
                  src={photoUrl}
                  alt={`Venue photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(index)}
                  loading="lazy"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Lightbox modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 text-white hover:text-slate-300 z-10"
              aria-label="Close"
            >
              <Icon name="close" className="text-2xl" />
            </button>
            <img
              src={selectedPhoto}
              alt="Venue photo"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}
