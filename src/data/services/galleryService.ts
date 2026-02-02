/**
 * Gallery Service
 *
 * Provides functions for querying galleries and photos.
 * Uses public-media bucket with direct public URLs (no signed URLs needed).
 *
 * Storage Structure:
 * - Bucket: public-media
 * - Path: orgs/{org_id}/galleries/{gallery_id}/{photo_id}.jpg
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import { supabase } from '../../lib/supabase'
const supabaseAny = supabase as any

// ============================================================================
// Type Definitions
// ============================================================================

export type GalleryType = 'org' | 'team' | 'athlete' | 'event' | 'travel' | 'program' | 'season'

// Friendly alias used by UI for clarity
export type GalleryEntityType =
  | 'organization'
  | 'team'
  | 'athlete'
  | 'event'
  | 'travel_plan'
  | 'program'
  | 'season'

export function mapEntityToGalleryType(entityType: GalleryEntityType): GalleryType {
  switch (entityType) {
    case 'organization':
      return 'org'
    case 'travel_plan':
      return 'travel'
    default:
      return entityType as GalleryType
  }
}

export type PhotoStatus = 'pending' | 'approved' | 'rejected'

export interface Gallery {
  id: string
  org_id: string
  gallery_type: GalleryType
  entity_id: string | null
  name: string
  description?: string | null
  visibility?: 'public' | 'team' | 'private'
  cover_photo_id?: string | null
  created_by_user_id?: string | null
  allow_contributions: boolean
  require_approval: boolean
  is_system_generated?: boolean
  created_at: string
  updated_at: string
  // Computed fields (from queries)
  photo_count?: number
  pending_count?: number
  cover_url?: string | null
}

export interface GalleryAlbum {
  id: string
  gallery_id: string
  name: string
  description: string | null
  created_at: string
}

export interface GalleryPhoto {
  id: string
  gallery_id: string
  album_id: string | null
  storage_path: string
  thumbnail_path: string | null
  url?: string
  thumbnail_url?: string | null
  filename?: string | null
  size_bytes?: number | null
  sort_order?: number | null
  status: PhotoStatus
  uploaded_by_user_id: string
  taken_at: string | null
  created_at: string
  updated_at: string
  // Computed fields
  tagged_athletes?: Array<{
    id: string
    first_name: string
    last_name: string
  }>
}

export interface GetGalleriesParams {
  gallery_type?: GalleryType
  entity_id?: string
  org_id?: string
}

export interface GetPhotosParams {
  gallery_id: string
  album_id?: string | null
  status?: PhotoStatus
  athlete_id?: string // Filter by tagged athlete
  limit?: number
  offset?: number
  order_by?: 'created_at' | 'taken_at'
  order_direction?: 'asc' | 'desc'
}

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
  if (FAKE_DATA_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
  }
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Build public URL for a gallery photo from storage_path
 */
export function getGalleryPhotoUrl(storagePath: string): string {
  if (!storagePath) return ''
  
  const { data } = supabase.storage
    .from('public-media')
    .getPublicUrl(storagePath)
  
  return data.publicUrl
}

/**
 * Build public URL for a gallery photo thumbnail
 */
export function getGalleryPhotoThumbnailUrl(thumbnailPath: string | null, fallbackPath: string): string {
  if (thumbnailPath) {
    return getGalleryPhotoUrl(thumbnailPath)
  }
  return getGalleryPhotoUrl(fallbackPath)
}

function mapPhotoRecord(photo: any): GalleryPhoto {
  const taggedAthletes =
    photo.gallery_photo_tags
      ?.map((tag: any) => tag.athlete)
      .filter((athlete: any) => athlete !== null) || []

  return {
    ...photo,
    url: getGalleryPhotoUrl(photo.storage_path),
    thumbnail_url: getGalleryPhotoThumbnailUrl(photo.thumbnail_path, photo.storage_path),
    tagged_athletes: taggedAthletes,
  } as GalleryPhoto
}

// ============================================================================
// Gallery Queries
// ============================================================================

/**
 * Get galleries for the current user
 * Returns galleries filtered by user's access (via RLS) with photo counts
 */
export async function getGalleriesForUser(
  context: UserContext,
  params: GetGalleriesParams = {}
): Promise<{ data: Gallery[]; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: [], error: null }
  }

  try {
    let query = supabase
      .from('galleries')
      .select('*, cover:cover_photo_id (thumbnail_path, storage_path)')
      .order('created_at', { ascending: false })

    // Filter by gallery type
    if (params.gallery_type) {
      query = query.eq('gallery_type', params.gallery_type)
    }

    // Filter by entity_id (team, athlete, event, travel)
    if (params.entity_id) {
      query = query.eq('entity_id', params.entity_id)
    }

    // Filter by org_id
    if (params.org_id) {
      query = query.eq('org_id', params.org_id)
    } else if (context.orgId) {
      query = query.eq('org_id', context.orgId)
    }

    const { data: galleries, error } = await query

    if (error) throw error

    const galleryList = (galleries || []).map((g: any) => ({
      ...g,
      cover_url: g.cover ? getGalleryPhotoThumbnailUrl(g.cover.thumbnail_path, g.cover.storage_path) : null,
    })) as Gallery[]

    // Get photo counts for all galleries
    if (galleryList.length > 0) {
      const galleryIds = galleryList.map((g) => g.id)
      const { data: counts, error: countsError } = await supabaseAny.rpc(
        'get_gallery_photo_counts',
        {
          p_gallery_ids: galleryIds,
        }
      )

      if (!countsError && counts) {
        const countsMap = new Map(
          (counts as Array<{ gallery_id: string; total_count: number; pending_count: number }>).map(
            (c) => [c.gallery_id, c]
          )
        )

        // Add counts to galleries
        galleryList.forEach((gallery) => {
          const count = countsMap.get(gallery.id)
          if (count) {
            gallery.photo_count = Number(count.total_count)
            gallery.pending_count = Number(count.pending_count)
          } else {
            gallery.photo_count = 0
            gallery.pending_count = 0
          }
        })
      }
    }

    return {
      data: galleryList,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting galleries:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Get a single gallery by ID
 */
export async function getGalleryById(
  _context: UserContext,
  galleryId: string
): Promise<{ data: Gallery | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: null, error: null }
  }

  try {
    if (!isValidUUID(galleryId)) {
      return { data: null, error: new Error('Invalid gallery ID') }
    }

    const { data, error } = await supabase
      .from('galleries')
      .select('*, cover:cover_photo_id (thumbnail_path, storage_path)')
      .eq('id', galleryId)
      .maybeSingle()

    if (error) throw error

    return {
      data: data ? { ...(data as any), cover_url: data.cover ? getGalleryPhotoThumbnailUrl(data.cover.thumbnail_path, data.cover.storage_path) : null } as Gallery : null,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting gallery:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Get gallery by entity (team, athlete, event, travel)
 * Useful for finding the gallery linked to a team/athlete/event/travel
 */
export async function getGalleryByEntity(
  _context: UserContext,
  galleryType: GalleryType,
  entityId: string
): Promise<{ data: Gallery | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: null, error: null }
  }

  try {
    if (!isValidUUID(entityId)) {
      return { data: null, error: new Error('Invalid entity ID') }
    }

    const { data, error } = await supabase
      .from('galleries')
      .select('*')
      .eq('gallery_type', galleryType)
      .eq('entity_id', entityId)
      .maybeSingle()

    if (error) throw error

    return {
      data: data as Gallery | null,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting gallery by entity:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Get the direct (system) gallery for an auto-gallery entity.
 * For athlete, team, event, travel_plan, program: returns the system-generated gallery.
 * These entities always have exactly one gallery after triggers + backfill.
 * Returns null if gallery not found (should not happen after migration).
 *
 * @deprecated For org/season, use getGalleriesForUser instead (they have multiple user-created galleries).
 */
export async function getEntityGallery(
  context: UserContext,
  entityType: GalleryEntityType,
  entityId: string
): Promise<{ data: Gallery | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: null, error: null }
  }

  try {
    if (!isValidUUID(entityId)) {
      return { data: null, error: new Error('Invalid entity ID') }
    }

    const galleryType = mapEntityToGalleryType(entityType)

    // Validate that this is an auto-gallery entity type
    const autoGalleryTypes: GalleryType[] = ['athlete', 'team', 'event', 'travel', 'program']
    if (!autoGalleryTypes.includes(galleryType)) {
      return {
        data: null,
        error: new Error(`${entityType} is not an auto-gallery entity type. Use getGalleriesForUser for org/season.`)
      }
    }

    const { data, error } = await supabase
      .from('galleries')
      .select('*, cover:cover_photo_id (thumbnail_path, storage_path)')
      .eq('gallery_type', galleryType)
      .eq('entity_id', entityId)
      .eq('is_system_generated', true)
      .maybeSingle()

    if (error) throw error

    return {
      data: data ? { ...(data as any), cover_url: data.cover ? getGalleryPhotoThumbnailUrl(data.cover.thumbnail_path, data.cover.storage_path) : null } as Gallery : null,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting entity gallery:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Related gallery interface for inheritance results
 */
export interface RelatedGallery {
  relationshipType: string
  galleryId: string
  galleryName: string
  photoCount: number
}

/**
 * Get related galleries for an entity based on its relationships.
 * Returns grouped galleries by relationship type (team, event, travel, season, program, athlete, org).
 * Uses the get_related_galleries RPC which respects RLS.
 */
export async function getRelatedGalleries(
  _context: UserContext,
  entityType: GalleryEntityType,
  entityId: string
): Promise<{ data: RelatedGallery[]; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: [], error: null }
  }

  try {
    if (!isValidUUID(entityId)) {
      return { data: [], error: new Error('Invalid entity ID') }
    }

    const { data, error } = await supabase.rpc('get_related_galleries', {
      p_entity_type: entityType,
      p_entity_id: entityId,
    })

    if (error) throw error

    // Transform the result to match our interface
    const relatedGalleries: RelatedGallery[] = (data || []).map((item: any) => ({
      relationshipType: item.relationship_type,
      galleryId: item.gallery_id,
      galleryName: item.gallery_name,
      photoCount: Number(item.photo_count || 0),
    }))

    return {
      data: relatedGalleries,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting related galleries:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Upload a photo directly to an entity's gallery.
 * Resolves the entity's gallery via getEntityGallery and uploads to it.
 * Only works for auto-gallery entity types (athlete, team, event, travel_plan, program).
 */
export async function uploadPhotoToEntityGallery(
  context: UserContext,
  entityType: GalleryEntityType,
  entityId: string,
  file: File,
  albumId?: string | null,
  status: PhotoStatus = 'approved'
): Promise<{ data: GalleryPhoto | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: null, error: null }
  }

  try {
    // Get the entity's gallery
    const galleryResult = await getEntityGallery(context, entityType, entityId)

    if (galleryResult.error) {
      return {
        data: null,
        error: galleryResult.error,
      }
    }

    if (!galleryResult.data) {
      return {
        data: null,
        error: new Error(`Gallery not found for ${entityType} ${entityId}. The entity may not exist or the gallery has not been created yet.`),
      }
    }

    // Upload to the gallery
    const uploadResult = await uploadPhotoToGallery(
      context,
      galleryResult.data.id,
      file,
      albumId,
      status
    )

    return uploadResult
  } catch (err) {
    console.error('[galleryService] Error uploading photo to entity gallery:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

// ============================================================================
// Photo Queries
// ============================================================================

/**
 * Get photos for a gallery
 * Returns photos with tagged athletes (if any)
 */
export async function getPhotosForGallery(
  _context: UserContext,
  params: GetPhotosParams
): Promise<{ data: GalleryPhoto[]; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: [], error: null }
  }

  try {
    if (!isValidUUID(params.gallery_id)) {
      return { data: [], error: new Error('Invalid gallery ID') }
    }

    // Build query with optional joins for tags
    let query = supabase
      .from('gallery_photos')
      .select(`
        *,
        gallery_photo_tags:gallery_photo_tags(
          athlete:athletes(
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq('gallery_id', params.gallery_id)

    // Filter by album
    if (params.album_id !== undefined) {
      if (params.album_id === null) {
        query = query.is('album_id', null)
      } else {
        query = query.eq('album_id', params.album_id)
      }
    }

    // Filter by status (RLS will also filter, but we can be explicit)
    if (params.status) {
      query = query.eq('status', params.status)
    }

    // Filter by tagged athlete
    if (params.athlete_id) {
      query = query.contains('gallery_photo_tags', [{ athlete_id: params.athlete_id }])
    }

    // Ordering
    const orderBy = params.order_by || 'sort_order'
    const orderDirection = params.order_direction || 'asc'
    if (orderBy === 'sort_order') {
      query = query.order('sort_order', { ascending: true, nullsLast: true }).order('created_at', { ascending: false })
    } else {
      query = query.order(orderBy, { ascending: orderDirection === 'asc' })
    }

    // Pagination
    if (params.limit) {
      query = query.limit(params.limit)
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 100) - 1)
    }

    const { data, error } = await query

    if (error) throw error

    const photos: GalleryPhoto[] = (data || []).map(mapPhotoRecord)

    return {
      data: photos,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting photos:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Get a single photo by ID
 */
export async function getPhotoById(
  _context: UserContext,
  photoId: string
): Promise<{ data: GalleryPhoto | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: null, error: null }
  }

  try {
    if (!isValidUUID(photoId)) {
      return { data: null, error: new Error('Invalid photo ID') }
    }

    const { data, error } = await supabase
      .from('gallery_photos')
      .select(`
        *,
        gallery_photo_tags:gallery_photo_tags(
          athlete:athletes(
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq('id', photoId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return { data: null, error: null }
    }

    // Transform tagged athletes
    const taggedAthletes = (data as any).gallery_photo_tags
      ?.map((tag: any) => tag.athlete)
      .filter((athlete: any) => athlete !== null) || []

    const photo: GalleryPhoto = {
      ...data,
      tagged_athletes: taggedAthletes,
    } as GalleryPhoto

    return {
      data: photo,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting photo:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Get pending photos count for moderation
 */
export async function getPendingPhotosCount(
  _context: UserContext,
  galleryId: string
): Promise<{ data: number; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: 0, error: null }
  }

  try {
    if (!isValidUUID(galleryId)) {
      return { data: 0, error: new Error('Invalid gallery ID') }
    }

    const { count, error } = await supabase
      .from('gallery_photos')
      .select('*', { count: 'exact', head: true })
      .eq('gallery_id', galleryId)
      .eq('status', 'pending')

    if (error) throw error

    return {
      data: count || 0,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting pending count:', err)
    return {
      data: 0,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

// ============================================================================
// Album Queries
// ============================================================================

/**
 * Get albums for a gallery
 */
export async function getAlbumsForGallery(
  _context: UserContext,
  galleryId: string
): Promise<{ data: GalleryAlbum[]; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: [], error: null }
  }

  try {
    if (!isValidUUID(galleryId)) {
      return { data: [], error: new Error('Invalid gallery ID') }
    }

    const { data, error } = await supabase
      .from('gallery_albums')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      data: (data || []) as GalleryAlbum[],
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting albums:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Create a gallery for an entity (team, athlete, event, travel)
 * Returns existing gallery if one already exists
 */
export async function createGalleryForEntity(
  context: UserContext,
  galleryType: GalleryType,
  entityId: string,
  name: string,
  allowContributions: boolean = false,
  requireApproval: boolean = true,
  description?: string | null,
  visibility: 'public' | 'team' | 'private' = 'team'
): Promise<{ data: Gallery | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: null, error: null }
  }

  try {
    if (!isValidUUID(entityId)) {
      return { data: null, error: new Error('Invalid entity ID') }
    }

    if (!context.orgId) {
      return { data: null, error: new Error('Organization context required') }
    }

    // Check if gallery already exists
    const existing = await getGalleryByEntity(context, galleryType, entityId)
    if (existing.data) {
      return existing
    }

    // Create new gallery
    const { data, error } = await supabase
      .from('galleries')
      .insert({
        org_id: context.orgId,
        gallery_type: galleryType,
        entity_id: entityId,
        name,
        description: description || null,
        visibility,
        allow_contributions: allowContributions,
        require_approval: requireApproval,
      })
      .select()
      .single()

    if (error) throw error

    return {
      data: data as Gallery,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error creating gallery:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Get or create a static gallery for an entity (org/team/athlete/season/program)
 * Returns the gallery id.
 */
export async function getOrCreateStaticGallery(
  context: UserContext,
  galleryType: GalleryType,
  entityId: string,
  name: string = 'Photos'
): Promise<{ id: string | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { id: null, error: null }
  }

  try {
    if (!context.orgId) return { id: null, error: new Error('Organization context required') }
    const { data, error } = await supabase.rpc('get_or_create_static_gallery', {
      p_org_id: context.orgId,
      p_entity_type: galleryType,
      p_entity_id: entityId,
      p_user_id: context.userId,
    })
    if (error) throw error
    return { id: data as string, error: null }
  } catch (err) {
    console.error('[galleryService] Error get_or_create_static_gallery:', err)
    return { id: null, error: err as Error }
  }
}

/**
 * Check if user can upload to gallery (calls RLS function)
 */
export async function checkCanUploadToGallery(
  context: UserContext,
  galleryId: string
): Promise<{ allowed: boolean; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { allowed: true, error: null }
  }

  try {
    const { data, error } = await supabase.rpc('can_upload_to_gallery', {
      gallery_id_param: galleryId,
      user_id_param: context.userId,
    })

    if (error) throw error

    return {
      allowed: data === true,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error checking upload permission:', err)
    return {
      allowed: false,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Check if user can moderate gallery (calls RLS function)
 */
export async function checkCanModerateGallery(
  context: UserContext,
  galleryId: string
): Promise<{ allowed: boolean; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { allowed: true, error: null }
  }

  try {
    const { data, error } = await supabase.rpc('can_moderate_gallery', {
      gallery_id_param: galleryId,
      user_id_param: context.userId,
    })

    if (error) throw error

    return {
      allowed: data === true,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error checking moderate permission:', err)
    return {
      allowed: false,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Check storage cap for organization
 * Reads limit from org_licenses / organizations.license_plan (starter 1GB, standard 5GB, pro 20GB).
 * Returns true if org has storage available, false if at/over limit.
 */
export async function checkStorageCap(
  context: UserContext
): Promise<{ allowed: boolean; error: Error | null; currentUsage?: number; limit?: number }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { allowed: true, error: null }
  }

  try {
    if (!context.orgId) {
      return { allowed: false, error: new Error('Organization context required') }
    }

    const [usageResult, limitResult] = await Promise.all([
      supabase
        .from('org_storage_usage')
        .select('bytes_used')
        .eq('org_id', context.orgId)
        .eq('bucket_id', 'public-media')
        .maybeSingle(),
      supabase.rpc('get_org_photo_storage_limit_bytes', {
        p_org_id: context.orgId,
      }),
    ])

    if (usageResult.error && usageResult.error.code !== 'PGRST116') {
      throw usageResult.error
    }

    const currentBytes = Number(usageResult.data?.bytes_used ?? 0)
    const limitBytes =
      typeof limitResult.data === 'number'
        ? limitResult.data
        : Number(limitResult.data ?? 0)

    if (limitResult.error) {
      console.warn('[galleryService] get_org_photo_storage_limit_bytes failed, allowing upload', limitResult.error)
      return {
        allowed: true,
        error: null,
        currentUsage: currentBytes,
      }
    }

    const allowed = limitBytes <= 0 || currentBytes < limitBytes

    return {
      allowed,
      error: allowed
        ? null
        : new Error(
            'Photo storage limit reached for your plan. Upgrade or delete existing photos to add more.'
          ),
      currentUsage: currentBytes,
      limit: limitBytes > 0 ? limitBytes : undefined,
    }
  } catch (err) {
    console.error('[galleryService] Error checking storage cap:', err)
    return {
      allowed: false,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Update org storage usage after upload/delete
 */
export async function updateStorageUsage(
  context: UserContext,
  bytesDelta: number
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { error: null }
  }

  try {
    if (!context.orgId) {
      return { error: new Error('Organization context required') }
    }

    // Use RPC or upsert to update storage usage
    // This should be done via Edge Function or database trigger for atomicity
    // For now, we'll use a simple upsert
    const { error } = await supabaseAny.rpc('update_org_storage_usage', {
      p_org_id: context.orgId,
      p_bucket_id: 'public-media',
      p_bytes_delta: bytesDelta,
    })

    // If RPC doesn't exist, fall back to manual update
    if (error && error.message?.includes('function') && error.message?.includes('does not exist')) {
      const { data: current } = await supabase
        .from('org_storage_usage')
        .select('bytes_used')
        .eq('org_id', context.orgId)
        .eq('bucket_id', 'public-media')
        .maybeSingle()

      const newBytes = Math.max(0, (current?.bytes_used || 0) + bytesDelta)

      const { error: upsertError } = await supabase
        .from('org_storage_usage')
        .upsert({
          org_id: context.orgId,
          bucket_id: 'public-media',
          bytes_used: newBytes,
          updated_at: new Date().toISOString(),
        })

      if (upsertError) throw upsertError
    } else if (error) {
      throw error
    }

    return { error: null }
  } catch (err) {
    console.error('[galleryService] Error updating storage usage:', err)
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Upload photo to gallery
 */
export async function uploadPhotoToGallery(
  context: UserContext,
  galleryId: string,
  file: File,
  albumId?: string | null,
  status: PhotoStatus = 'approved'
): Promise<{ data: GalleryPhoto | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: null, error: null }
  }

  try {
    if (!context.orgId) {
      return { data: null, error: new Error('Organization context required') }
    }

    // Check storage cap before upload
    const capCheck = await checkStorageCap(context)
    if (!capCheck.allowed) {
      return {
        data: null,
        error: new Error(
          capCheck.error?.message || 'Storage limit reached. Please upgrade your plan or delete existing photos.'
        ),
      }
    }

    // Generate photo ID and storage path
    const photoId = crypto.randomUUID()
    const fileExt = file.name.split('.').pop() || 'jpg'
    const storagePath = `orgs/${context.orgId}/galleries/${galleryId}/${photoId}.${fileExt}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('public-media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw uploadError
    }

    // Update storage usage
    await updateStorageUsage(context, file.size)

    // Insert gallery_photo record
    const { data, error: insertError } = await supabase
      .from('gallery_photos')
      .insert({
        gallery_id: galleryId,
        album_id: albumId || null,
        storage_path: storagePath,
        filename: file.name,
        size_bytes: file.size,
        sort_order: Date.now(),
        status,
        uploaded_by_user_id: context.userId,
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return {
      data: data as GalleryPhoto,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error uploading photo:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Moderate photos (approve or reject)
 */
export async function moderatePhotos(
  _context: UserContext,
  photoIds: string[],
  action: 'approve' | 'reject'
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { error: null }
  }

  try {
    const status = action === 'approve' ? 'approved' : 'rejected'
    
    const { error } = await supabase
      .from('gallery_photos')
      .update({ status })
      .in('id', photoIds)

    if (error) throw error

    return { error: null }
  } catch (err) {
    console.error('[galleryService] Error moderating photos:', err)
    return {
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

// ============================================================================
// Admin Management Helpers (org admins & coaches)
// ============================================================================

export interface UpdateGalleryInput {
  name?: string
  description?: string | null
  visibility?: 'public' | 'team' | 'private'
  cover_photo_id?: string | null
}

export async function updateGallery(
  context: UserContext,
  galleryId: string,
  payload: UpdateGalleryInput
): Promise<{ data: Gallery | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: null, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('galleries')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', galleryId)
      .select('*, cover:cover_photo_id (thumbnail_path, storage_path)')
      .maybeSingle()

    if (error) throw error

    return {
      data: data ? ({ ...(data as any), cover_url: data.cover ? getGalleryPhotoThumbnailUrl(data.cover.thumbnail_path, data.cover.storage_path) : null } as Gallery) : null,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error updating gallery:', err)
    return { data: null, error: err as Error }
  }
}

export async function setGalleryCover(
  context: UserContext,
  galleryId: string,
  photoId: string | null
): Promise<{ error: Error | null }> {
  const { error } = await updateGallery(context, galleryId, { cover_photo_id: photoId })
  return { error }
}

export async function deletePhotos(
  context: UserContext,
  galleryId: string,
  photoIds: string[]
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { error: null }
  }

  try {
    if (photoIds.length === 0) return { error: null }

    const { data: photos, error: fetchError } = await supabase
      .from('gallery_photos')
      .select('id, storage_path, thumbnail_path, size_bytes')
      .eq('gallery_id', galleryId)
      .in('id', photoIds)

    if (fetchError) throw fetchError

    const pathsToDelete: string[] = []
    let reclaimedBytes = 0
    ;(photos || []).forEach((p: any) => {
      if (p.storage_path) pathsToDelete.push(p.storage_path)
      if (p.thumbnail_path) pathsToDelete.push(p.thumbnail_path)
      reclaimedBytes += Number(p.size_bytes || 0)
    })

    if (pathsToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('public-media')
        .remove(pathsToDelete)
      if (storageError) console.warn('[galleryService] Storage delete warning:', storageError)
    }

    const { error: deleteRowsError } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('gallery_id', galleryId)
      .in('id', photoIds)

    if (deleteRowsError) throw deleteRowsError

    if (reclaimedBytes > 0) {
      await updateStorageUsage(context, -reclaimedBytes)
    }

    return { error: null }
  } catch (err) {
    console.error('[galleryService] Error deleting photos:', err)
    return { error: err as Error }
  }
}

export async function deleteGallery(
  context: UserContext,
  galleryId: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { error: null }
  }

  try {
    // Check if this is a system-generated gallery - block deletion
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('id, is_system_generated')
      .eq('id', galleryId)
      .maybeSingle()

    if (galleryError) throw galleryError

    if (gallery?.is_system_generated) {
      return {
        error: new Error('Cannot delete system-generated gallery. Galleries are automatically managed for athletes, teams, events, travel plans, and programs.'),
      }
    }

    const { data: photos, error: photosError } = await supabase
      .from('gallery_photos')
      .select('id, storage_path, thumbnail_path, size_bytes')
      .eq('gallery_id', galleryId)

    if (photosError) throw photosError

    const paths: string[] = []
    let reclaimedBytes = 0
    ;(photos || []).forEach((p: any) => {
      if (p.storage_path) paths.push(p.storage_path)
      if (p.thumbnail_path) paths.push(p.thumbnail_path)
      reclaimedBytes += Number(p.size_bytes || 0)
    })

    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from('public-media').remove(paths)
      if (storageError) console.warn('[galleryService] Storage delete warning:', storageError)
    }

    const { error: deletePhotosError } = await supabase
      .from('gallery_photos')
      .delete()
      .eq('gallery_id', galleryId)
    if (deletePhotosError) throw deletePhotosError

    const { error: deleteGalleryError } = await supabase
      .from('galleries')
      .delete()
      .eq('id', galleryId)
    if (deleteGalleryError) throw deleteGalleryError

    if (reclaimedBytes > 0) {
      await updateStorageUsage(context, -reclaimedBytes)
    }

    return { error: null }
  } catch (err) {
    console.error('[galleryService] Error deleting gallery:', err)
    return { error: err as Error }
  }
}

export async function reorderGalleryPhotos(
  _context: UserContext,
  galleryId: string,
  photoIds: string[]
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { error: null }
  }

  try {
    const updates = photoIds.map((id, index) => ({
      id,
      sort_order: index + 1,
      gallery_id: galleryId,
    }))

    const { error } = await supabase
      .from('gallery_photos')
      .upsert(updates, { onConflict: 'id' })

    if (error) throw error
    return { error: null }
  } catch (err) {
    console.error('[galleryService] Error reordering photos:', err)
    return { error: err as Error }
  }
}
