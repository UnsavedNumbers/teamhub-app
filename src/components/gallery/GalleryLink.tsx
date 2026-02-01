/**
 * Gallery Link Component
 * 
 * Displays a link to a gallery for a given entity (team, athlete, event, travel).
 * Automatically creates the gallery if it doesn't exist.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import {
  getGalleryByEntity,
  createGalleryForEntity,
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

export function GalleryLink({
  galleryType,
  entityId,
  entityName,
  className = '',
  variant = 'link',
}: GalleryLinkProps) {
  const { context, isReady } = useUserContext()
  const [galleryId, setGalleryId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady || !entityId) return

    const loadOrCreateGallery = async () => {
      setLoading(true)
      
      // Try to get existing gallery
      const { data: existingGallery } = await getGalleryByEntity(
        context,
        galleryType,
        entityId
      )

      if (existingGallery) {
        setGalleryId(existingGallery.id)
        setLoading(false)
        return
      }

      // Create gallery if it doesn't exist
      const galleryName = `${entityName} Gallery`
      const { data: newGallery } = await createGalleryForEntity(
        context,
        galleryType,
        entityId,
        galleryName,
        false, // allowContributions
        true   // requireApproval
      )

      if (newGallery) {
        setGalleryId(newGallery.id)
      }
      
      setLoading(false)
    }

    loadOrCreateGallery()
  }, [context, isReady, galleryType, entityId, entityName])

  if (loading || !galleryId) {
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
