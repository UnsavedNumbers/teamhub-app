/**
 * Fan Photos Service
 * 
 * Fan-specific wrapper for gallery service that respects fan visibility
 * and provides simplified interfaces for fan use cases
 */

import { getGalleriesForUser, getGalleryById, getPhotosForGallery, type Gallery, type GalleryPhoto, type GetPhotosParams } from './galleryService'
import type { UserContext } from '../fake/userContext'

export interface FanGallery extends Gallery {
    fans_can_see: boolean
    org_name?: string
    team_name?: string
}

/**
 * Get galleries visible to fans
 * Returns only galleries where fans_can_see = true
 */
export async function getFanGalleries(
    org_ids?: string[]
): Promise<{ data: FanGallery[]; error: Error | null }> {
    try {
        // Temporary context for querying (fan users don't have org context)
        const context: UserContext = {
            userId: '', // Will be populated by RLS
            email: null,
            orgId: '',
            roles: [],
            isPlatformAdmin: false,
        }

        // Get all galleries (RLS will filter admin-only ones)
        const { data: allGalleries, error } = await getGalleriesForUser(context, {
            org_id: org_ids?.[0], // For now, filter by first org if provided
        })

        if (error) {
            return { data: [], error }
        }

        // Filter for fan visibility and galleries with at least one photo
        const fanGalleries = allGalleries.filter(
            (gallery: any) => gallery.fans_can_see === true && (gallery.photo_count || 0) > 0
        ) as FanGallery[]

        return {
            data: fanGalleries,
            error: null,
        }
    } catch (err) {
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Failed to get fan galleries'),
        }
    }
}

/**
 * Get a specific gallery if it's visible to fans
 */
export async function getFanGallery(
    galleryId: string
): Promise<{ data: FanGallery | null; error: Error | null }> {
    try {
        const context: UserContext = {
            userId: '',
            email: null,
            orgId: '',
            roles: [],
            isPlatformAdmin: false,
        }

        const { data: gallery, error } = await getGalleryById(context, galleryId)

        if (error) {
            return { data: null, error }
        }

        // Check fan visibility
        const fanGallery = gallery as any
        if (!fanGallery || fanGallery.fans_can_see !== true) {
            return {
                data: null,
                error: new Error('Gallery not found or not accessible'),
            }
        }

        return {
            data: fanGallery as FanGallery,
            error: null,
        }
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Failed to get gallery'),
        }
    }
}

/**
 * Get photos for a fan-visible gallery
 */
export async function getFanGalleryPhotos(
    galleryId: string,
    params?: Omit<GetPhotosParams, 'gallery_id'>
): Promise<{ data: GalleryPhoto[]; error: Error | null }> {
    try {
        // First check if gallery is fan-visible
        const { data: gallery, error: galleryError } = await getFanGallery(galleryId)

        if (galleryError || !gallery) {
            return {
                data: [],
                error: galleryError || new Error('Gallery not accessible'),
            }
        }

        const context: UserContext = {
            userId: '',
            email: null,
            orgId: '',
            roles: [],
            isPlatformAdmin: false,
        }

        // Get photos (only approved photos visible to fans)
        const { data: photos, error } = await getPhotosForGallery(context, {
            gallery_id: galleryId,
            status: 'approved', // Fans only see approved photos
            ...params,
        })

        if (error) {
            return { data: [], error }
        }

        return {
            data: photos,
            error: null,
        }
    } catch (err) {
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Failed to get gallery photos'),
        }
    }
}

/**
 * Get galleries for a specific athlete (fan view)
 * Returns athlete galleries that are fan-visible
 */
export async function getFanAthleteGalleries(
    athleteId: string
): Promise<{ data: FanGallery[]; error: Error | null }> {
    try {
        const context: UserContext = {
            userId: '',
            email: null,
            orgId: '',
            roles: [],
            isPlatformAdmin: false,
        }

        const { data: galleries, error } = await getGalleriesForUser(context, {
            gallery_type: 'athlete',
            entity_id: athleteId,
        })

        if (error) {
            return { data: [], error }
        }

        // Filter for fan visibility
        const fanGalleries = galleries.filter(
            (gallery: any) => gallery.fans_can_see === true
        ) as FanGallery[]

        return {
            data: fanGalleries,
            error: null,
        }
    } catch (err) {
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Failed to get athlete galleries'),
        }
    }
}
