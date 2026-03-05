/**
 * Fan Photos Service
 * 
 * Fan-specific wrapper for gallery service that respects fan visibility
 * and provides simplified interfaces for fan use cases
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'
import { getMockGalleriesForOrg } from '../fake/mockGalleries'
import { getFollowedOrgs as getFakeFollowedOrgs } from '../fake/fanFakeService'
import { fakeOrganizations } from '../fake/fakeOrganizations'
import { getGalleriesForUser, getGalleryById, getPhotosForGallery, type Gallery, type GalleryPhoto, type GetPhotosParams, type KeysetCursor } from './galleryService'
import type { UserContext } from '../fake/userContext'

export interface FanGallery extends Gallery {
    fans_can_see: boolean
    org_name?: string
    team_name?: string
}

export interface FanGalleryGroup {
    org_id: string
    org_name: string | null
    galleries: FanGallery[]
}

/**
 * Get galleries visible to fans
 * Returns only galleries where fans_can_see = true
 */
export async function getFanGalleries(
    options?: {
        org_ids?: string[]
        search?: string
        limit?: number
        cursor?: KeysetCursor
        order_direction?: 'asc' | 'desc'
    }
): Promise<{ data: FanGallery[]; grouped: FanGalleryGroup[]; error: Error | null }> {
    debug.data('FanPhotosService.getFanGalleries', 'Request', { options })
    debug.perf.start('fanPhotosService.getFanGalleries')

    try {
        if (USE_FAKE_DATA) {
            const context: UserContext = {
                userId: 'demo-fan',
                email: null,
                orgId: '',
                roles: [],
                isPlatformAdmin: false,
            }

            const followsResult = await getFakeFollowedOrgs()
            const followedOrgIds = Array.from(new Set((followsResult.data || []).map((follow) => follow.org_id)))
            const fallbackOrgIds = followedOrgIds.length > 0
                ? followedOrgIds
                : Array.from(new Set(fakeOrganizations.slice(0, 2).map((org) => org.id)))

            const orgIds = options?.org_ids && options.org_ids.length > 0
                ? options.org_ids
                : fallbackOrgIds.length > 0
                    ? fallbackOrgIds
                    : Array.from(new Set(getMockGalleriesForOrg().map((gallery) => gallery.org_id)))

            const { data: allGalleries, error } = await getGalleriesForUser(context, {
                org_ids: orgIds.length > 0 ? orgIds : undefined,
                search: options?.search,
                limit: options?.limit,
                cursor: options?.cursor,
                order_direction: options?.order_direction,
            })

            if (error) {
                return { data: [], grouped: [], error }
            }

            const fanGalleries = allGalleries.filter(
                (gallery: any) => gallery.fans_can_see === true && (gallery.photo_count || 0) > 0
            ) as FanGallery[]

            const groupMap = new Map<string, FanGalleryGroup>()
            fanGalleries.forEach((gallery) => {
                if (!groupMap.has(gallery.org_id)) {
                    groupMap.set(gallery.org_id, {
                        org_id: gallery.org_id,
                        org_name: gallery.org_name || null,
                        galleries: [],
                    })
                }
                groupMap.get(gallery.org_id)?.galleries.push(gallery)
            })

            return { data: fanGalleries, grouped: Array.from(groupMap.values()), error: null }
        }

        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) {
            return { data: [], grouped: [], error: userError || new Error('Authentication required') }
        }

        const userId = userData.user.id

        let orgIds: string[] = options?.org_ids || []

        if (orgIds.length === 0) {
            const [followsRes, ordersRes] = await Promise.all([
                supabase
                    .from('fan_org_follows')
                    .select('org_id')
                    .eq('user_id', userId),
                supabase
                    .from('ticket_orders')
                    .select('org_id')
                    .eq('purchaser_user_id', userId),
            ])

            const combined = new Set<string>()
            ; (followsRes.data || []).forEach((row: any) => row.org_id && combined.add(row.org_id))
            ; (ordersRes.data || []).forEach((row: any) => row.org_id && combined.add(row.org_id))
            orgIds = Array.from(combined)
        }

        // Temporary context for querying (fan users don't have org context)
        const context: UserContext = {
            userId: userId,
            email: null,
            orgId: '',
            roles: [],
            isPlatformAdmin: false,
        }

        // Get all galleries (RLS will filter admin-only ones)
        const { data: allGalleries, error } = await getGalleriesForUser(context, {
            org_ids: orgIds.length > 0 ? orgIds : undefined,
            search: options?.search,
            limit: options?.limit,
            cursor: options?.cursor,
            order_direction: options?.order_direction,
        })

        if (error) {
            return { data: [], grouped: [], error }
        }

        // Filter for fan visibility and galleries with at least one photo
        const fanGalleries = allGalleries.filter(
            (gallery: any) => gallery.fans_can_see === true && (gallery.photo_count || 0) > 0
        ) as FanGallery[]

        const grouped: FanGalleryGroup[] = []
        const groupMap = new Map<string, FanGalleryGroup>()
        fanGalleries.forEach((gallery) => {
            const orgId = gallery.org_id
            if (!groupMap.has(orgId)) {
                groupMap.set(orgId, {
                    org_id: orgId,
                    org_name: gallery.org_name || null,
                    galleries: [],
                })
            }
            groupMap.get(orgId)?.galleries.push(gallery)
        })
        grouped.push(...Array.from(groupMap.values()))

        debug.perf.end('fanPhotosService.getFanGalleries')
        debug.data('FanPhotosService.getFanGalleries', 'Response', { galleryCount: fanGalleries.length, groupCount: grouped.length })
        return {
            data: fanGalleries,
            grouped,
            error: null,
        }
    } catch (err) {
        debug.perf.end('fanPhotosService.getFanGalleries')
        debug.error('FanPhotosService.getFanGalleries', 'Failed to get fan galleries', { error: err })
        return {
            data: [],
            grouped: [],
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
            debug.perf.end('fanPhotosService.getFanGallery')
            debug.error('FanPhotosService.getFanGallery', 'Gallery not accessible to fans', { galleryId })
            return {
                data: null,
                error: new Error('Gallery not found or not accessible'),
            }
        }

        debug.perf.end('fanPhotosService.getFanGallery')
        debug.data('FanPhotosService.getFanGallery', 'Response', { galleryId, galleryName: fanGallery.name })
        return {
            data: fanGallery as FanGallery,
            error: null,
        }
    } catch (err) {
        debug.perf.end('fanPhotosService.getFanGallery')
        debug.error('FanPhotosService.getFanGallery', 'Failed to get gallery', { error: err, galleryId })
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
            debug.perf.end('fanPhotosService.getFanGalleryPhotos')
            debug.error('FanPhotosService.getFanGalleryPhotos', 'Gallery not accessible', { error: galleryError, galleryId })
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
    debug.data('FanPhotosService.getFanAthleteGalleries', 'Request', { athleteId })
    debug.perf.start('fanPhotosService.getFanAthleteGalleries')

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

        debug.perf.end('fanPhotosService.getFanAthleteGalleries')
        debug.data('FanPhotosService.getFanAthleteGalleries', 'Response', { athleteId, galleryCount: fanGalleries.length })
        return {
            data: fanGalleries,
            error: null,
        }
    } catch (err) {
        debug.perf.end('fanPhotosService.getFanAthleteGalleries')
        debug.error('FanPhotosService.getFanAthleteGalleries', 'Failed to get athlete galleries', { error: err, athleteId })
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Failed to get athlete galleries'),
        }
    }
}
