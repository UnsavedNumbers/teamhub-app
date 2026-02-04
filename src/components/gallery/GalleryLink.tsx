/**
 * Gallery Link Component
 *
 * Displays a link to a gallery for a given entity.
 *
 * For auto-gallery entity types (athlete, team, event, travel, program),
 * the link only shows if the system-generated gallery exists (no creation).
 *
 * For org/season types, the component should not be used - use
 * GallerySection or GalleryManagementSection instead.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import {
  getGalleryByEntity,
  type GalleryType,
} from '../../data/services/galleryService'
import { getLink } from '../../utils/routes'
import Icon from '../portal/Icon'

interface GalleryLinkProps {
  galleryType: GalleryType
  entityId: string
  entityName: string
  className?: string
  variant?: 'button' | 'link'
}

// Auto-gallery entity types that have system-generated galleries
const AUTO_GALLERY_TYPES: Set<GalleryType> = new Set(['athlete', 'team', 'event', 'travel', 'program', 'season', 'org'])

export function GalleryLink({
  galleryType,
  entityId,
  className = '',
  variant = 'link',
}: GalleryLinkProps) {
  const { context, isReady } = useUserContext()
  const [galleryId, setGalleryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady || !entityId) return

    const loadGallery = async () => {
      setLoading(true)

      // Only try to get existing gallery - no creation for auto-gallery types
      const { data: existingGallery } = await getGalleryByEntity(
        context,
        galleryType,
        entityId
      )

      if (existingGallery) {
        setGalleryId(existingGallery.id)
      }

      setLoading(false)
    }

    loadGallery()
  }, [context, isReady, galleryType, entityId])

  // Don't render if loading, no gallery found, or for multi-gallery entity types
  if (loading || !galleryId || !AUTO_GALLERY_TYPES.has(galleryType)) {
    return null
  }

  if (variant === 'button') {
    return (
      <Link
        to={getLink('portal.photosGallery', { id: galleryId })}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${className}`}
      >
        <Icon name="photo_library" size="text-lg" />
        <span>View Gallery</span>
      </Link>
    )
  }

  return (
    <Link
      to={getLink('portal.photosGallery', { id: galleryId })}
      className={`inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline ${className}`}
    >
      <Icon name="photo_library" size="text-sm" />
      <span>View Gallery</span>
    </Link>
  )
}
