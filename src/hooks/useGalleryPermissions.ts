import { useMemo } from 'react'
import { useUserContext } from './useUserContext'
import type { GalleryEntityType } from '@/data/services/galleryService'

export interface GalleryPermissions {
  canView: boolean
  canCreate: boolean
  canUpload: boolean
  canDelete: boolean
}

/**
 * Very lightweight permission heuristic for gallery UI.
 * - org_admin: full access
 * - coach: can create/upload for team/event/travel/season/program
 * - parent: view-only by default
 */
export function useGalleryPermissions(entityType: GalleryEntityType): GalleryPermissions {
  const { context } = useUserContext()
  const roles = context?.roles || []

  return useMemo(() => {
    const isAdmin = roles.includes('org_admin')
    const isCoach = roles.includes('coach')

    if (isAdmin) {
      return { canView: true, canCreate: true, canUpload: true, canDelete: true }
    }

    if (isCoach) {
      const canCreate = ['event', 'travel_plan', 'team', 'season', 'program'].includes(entityType)
      const canUpload = true
      return { canView: true, canCreate, canUpload, canDelete: false }
    }

    // Parents and other roles: read-only
    return { canView: true, canCreate: false, canUpload: false, canDelete: false }
  }, [roles, entityType])
}
