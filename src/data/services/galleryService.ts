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

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID } from '../config'
import type { UserContext } from '../fake/userContext'
import { supabase } from '../../lib/supabase'
import { deriveActorRoleFromRoles, logEvent } from '../../utils/eventLogger'
import { debug } from '../../lib/debug'
import {
  getMockGalleriesForOrg,
  getMockGalleryById,
  getMockPhotosForGallery,
  getAllMockPhotos,
} from '../fake/mockGalleries'
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

export interface KeysetCursor {
  created_at: string
  id: string
}

export interface Gallery {
  id: string
  org_id: string
  gallery_type: GalleryType
  entity_id: string | null
  name: string
  title?: string
  description?: string | null
  visibility?: 'public' | 'team' | 'private' | null
  cover_photo_id?: string | null
  created_by_user_id?: string | null
  allow_contributions: boolean
  require_approval: boolean
  fans_can_see: boolean
  is_system_generated: boolean
  cover_generated_at: string | null
  cover_generation_status: string | null
  cover_thumbnails: any | null
  created_at: string
  updated_at: string
  can_download?: boolean
  // Computed fields (from queries)
  photo_count?: number
  pending_count?: number
  cover_url?: string | null
  org_name?: string | null
  org_slug?: string | null
  entity_name?: string | null
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
  thumbnail_sm_path?: string | null
  thumbnail_md_path?: string | null
  thumbnail_lg_path?: string | null
  blurhash?: string | null
  url?: string
  thumbnail_url?: string | null
  filename?: string | null
  size_bytes?: number | null
  sort_order?: number | null
  status: PhotoStatus
  approval_status?: PhotoStatus
  can_download?: boolean
  uploaded_by_user_id: string
  uploaded_by?: string | null
  caption?: string | null
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
  org_ids?: string[]
  search?: string
  limit?: number
  offset?: number
  cursor?: KeysetCursor
  order_direction?: 'asc' | 'desc'
}

export interface GetPhotosParams {
  gallery_id: string
  album_id?: string | null
  status?: PhotoStatus
  athlete_id?: string | string[] // Filter by tagged athletes (comma-separated for multiple)
  limit?: number
  offset?: number
  order_by?: 'created_at' | 'taken_at' | 'sort_order'
  order_direction?: 'asc' | 'desc'
  search?: string
  from?: string
  to?: string
  cursor?: KeysetCursor
}

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
  if (FAKE_DATA_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
  }
}

type FakeAutoGalleryType = Extract<GalleryType, 'athlete' | 'team' | 'event' | 'travel' | 'program' | 'season' | 'org'>

const FAKE_GALLERY_BASE_PATH = '/demo-assets/photos'
const FAKE_GALLERY_BASE_TIME = Date.UTC(2026, 0, 15, 12, 0, 0)

const DEMO_LOCAL_GALLERY_FILENAMES: readonly string[] = [
  'baseball-pitcher-and-ball-in-hand-player-ready-t-2026-01-09-09-18-02-utc.jpg',
  'baseball-support-and-team-together-in-a-match-ga-2026-01-09-09-38-16-utc.jpg',
  'basketball-kid-is-dribbling-and-guarding-a-ball-du-2026-01-09-10-26-50-utc.jpg',
  'boy-sitting-on-bench-with-little-league-baseball-t-2026-01-11-08-01-42-utc.jpg',
  'cheerleader-exercise-line-and-students-in-cheerle-2026-01-09-09-35-49-utc.jpg',
  'cheerleader-sports-and-women-with-hands-raised-on-2026-01-09-10-10-05-utc.jpg',
  'cheerleader-team-sports-and-hands-with-pompom-for-2026-01-09-10-22-08-utc.jpg',
  'cheerleader-woman-jump-and-sports-outdoor-on-blue-2026-01-09-11-05-25-utc.jpg',
  'close-up-of-kids-with-blurred-faces-playing-basket-2026-01-09-10-26-46-utc.jpg',
  'close-up-view-of-dollar-banknotes-in-baseball-glov-2026-01-06-00-43-18-utc.jpg',
  'cropped-view-of-little-children-in-sportswear-hold-2026-01-09-12-15-40-utc.jpg',
  'equipment-room.jpg',
  'facility-exterior.jpg',
  'female-basketball-coach-motivating-her-team-during-2026-01-08-08-10-44-utc.jpg',
  'female-football-sports-and-team-playing-match-on-2026-01-09-11-06-38-utc.jpg',
  'female-players-playing-volleyball-in-the-court-2026-01-09-08-34-05-utc.jpg',
  'players-action.jpg',
  'soccer-action.jpg',
  'team-celebration.jpg',
  'team-warmup.jpg',
  'tournament-field.jpg',
  'tournament-trophy.jpg',
] as const

const FAKE_AUTO_GALLERY_FILES: Record<FakeAutoGalleryType, readonly string[]> = {
  athlete: ['players-action.jpg', 'soccer-action.jpg', 'team-celebration.jpg'],
  team: ['team-warmup.jpg', 'players-action.jpg', 'team-celebration.jpg'],
  event: ['tournament-field.jpg', 'tournament-trophy.jpg', 'team-celebration.jpg'],
  travel: ['tournament-field.jpg', 'team-warmup.jpg', 'facility-exterior.jpg'],
  program: ['soccer-action.jpg', 'team-warmup.jpg', 'players-action.jpg'],
  season: ['team-celebration.jpg', 'soccer-action.jpg', 'team-warmup.jpg'],
  org: ['facility-exterior.jpg', 'equipment-room.jpg', 'team-celebration.jpg'],
}

const FAKE_GALLERY_NAME_BY_TYPE: Record<FakeAutoGalleryType, string> = {
  athlete: 'Athlete Photos',
  team: 'Team Photos',
  event: 'Event Photos',
  travel: 'Travel Photos',
  program: 'Program Photos',
  season: 'Season Photos',
  org: 'Organization Photos',
}

/**
 * In fake mode, entity galleries should resolve to real mock galleries that already exist.
 * This prevents links to synthetic IDs that can drift from curated gallery pages.
 */
const FAKE_CANONICAL_GALLERY_ID_BY_TYPE: Record<FakeAutoGalleryType, string> = {
  athlete: 'mock-gallery-3',
  team: 'mock-gallery-1',
  event: 'mock-gallery-1',
  travel: 'mock-gallery-1',
  program: 'mock-gallery-1',
  season: 'mock-gallery-1',
  org: 'mock-gallery-5',
}

function parseGeneratedFakeGalleryId(galleryId: string): { galleryType: FakeAutoGalleryType; entityId: string } | null {
  const match = /^mock-gallery-(athlete|team|event|travel|program|season|org)-(.+)$/.exec(galleryId)
  if (!match) return null
  return {
    galleryType: match[1] as FakeAutoGalleryType,
    entityId: match[2],
  }
}

function hashGallerySeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

function rotateFilenames(seed: string): string[] {
  const source = [...DEMO_LOCAL_GALLERY_FILENAMES]
  if (source.length === 0) return source
  const offset = hashGallerySeed(seed) % source.length
  return source.slice(offset).concat(source.slice(0, offset))
}

function buildStockedFakePhotos(
  galleryId: string,
  preferredFiles: readonly string[] = [],
): GalleryPhoto[] {
  const preferred = preferredFiles.filter((file) => DEMO_LOCAL_GALLERY_FILENAMES.includes(file))
  const preferredUnique = Array.from(new Set(preferred))
  const rotated = rotateFilenames(galleryId).filter((file) => !preferredUnique.includes(file))
  const files = [...preferredUnique, ...rotated]

  return files.map((filename, i) => {
    const id = `mock-photo-${galleryId}-${i}`
    const created = new Date(FAKE_GALLERY_BASE_TIME - (files.length - i) * 24 * 60 * 60 * 1000).toISOString()
    const path = `${FAKE_GALLERY_BASE_PATH}/${filename}`
    return {
      id,
      gallery_id: galleryId,
      album_id: null,
      storage_path: path,
      thumbnail_path: null,
      thumbnail_sm_path: null,
      thumbnail_md_path: null,
      thumbnail_lg_path: null,
      filename,
      size_bytes: 200000,
      sort_order: i + 1,
      status: 'approved' as PhotoStatus,
      approval_status: 'approved' as PhotoStatus,
      blurhash: null,
      can_download: undefined,
      uploaded_by_user_id: 'demo',
      taken_at: null,
      created_at: created,
      updated_at: created,
      thumbnail_url: path,
      url: path,
    } as GalleryPhoto
  })
}

function getFakeAutoGalleryPhotos(galleryId: string, galleryType: FakeAutoGalleryType): GalleryPhoto[] {
  const files = FAKE_AUTO_GALLERY_FILES[galleryType] || FAKE_AUTO_GALLERY_FILES.org
  return buildStockedFakePhotos(galleryId, files)
}

function mapGalleryTypeToFakeAutoType(galleryType: GalleryType): FakeAutoGalleryType {
  if (galleryType === 'travel') return 'travel'
  if (galleryType === 'athlete') return 'athlete'
  if (galleryType === 'team') return 'team'
  if (galleryType === 'event') return 'event'
  if (galleryType === 'program') return 'program'
  if (galleryType === 'season') return 'season'
  return 'org'
}

function resolveFakeEntityGallery(
  orgId: string,
  galleryType: FakeAutoGalleryType,
  entityId: string,
): Gallery | null {
  const mockGalleries = getMockGalleriesForOrg(orgId).map(buildFakeGallery)
  const exact = mockGalleries.find(
    (gallery) => gallery.gallery_type === galleryType && gallery.entity_id === entityId,
  )
  if (exact) return exact

  const canonicalId = FAKE_CANONICAL_GALLERY_ID_BY_TYPE[galleryType]
  const canonical =
    mockGalleries.find((gallery) => gallery.id === canonicalId) ||
    (() => {
      const fallback = getMockGalleryById(canonicalId)
      return fallback ? buildFakeGallery(fallback) : null
    })()

  if (!canonical) return null

  return {
    ...canonical,
    gallery_type: galleryType,
    entity_id: entityId,
    name: FAKE_GALLERY_NAME_BY_TYPE[galleryType],
  }
}

function mapMockPhotoToGalleryPhoto(photo: any): GalleryPhoto {
  const thumbnailPath = photo.thumbnail_md_path || photo.thumbnail_path || null
  return {
    ...photo,
    status: photo.status as PhotoStatus,
    approval_status: (photo.approval_status || photo.status) as PhotoStatus,
    can_download: photo.can_download ?? undefined,
    url: getGalleryPhotoUrl(photo.storage_path),
    thumbnail_url: getGalleryPhotoThumbnailUrl(thumbnailPath, photo.storage_path),
    thumbnail_path: thumbnailPath,
  } as GalleryPhoto
}

function getFakePhotosForGalleryId(galleryId: string): GalleryPhoto[] {
  const generated = parseGeneratedFakeGalleryId(galleryId)
  if (generated) {
    const canonicalId = FAKE_CANONICAL_GALLERY_ID_BY_TYPE[generated.galleryType]
    if (canonicalId && canonicalId !== galleryId) return getFakePhotosForGalleryId(canonicalId)
    return getFakeAutoGalleryPhotos(galleryId, generated.galleryType)
  }

  const basePhotos = getMockPhotosForGallery(galleryId).map(mapMockPhotoToGalleryPhoto)
  const preferredFiles = basePhotos
    .map((photo) => photo.filename || photo.storage_path.split('/').pop() || '')
    .filter((filename) => filename !== '')
  const stockedPhotos = buildStockedFakePhotos(galleryId, preferredFiles)

  if (basePhotos.length === 0) return stockedPhotos

  const baseByFilename = new Map<string, GalleryPhoto>()
  basePhotos.forEach((photo) => {
    const filename = photo.filename || photo.storage_path.split('/').pop() || ''
    if (!filename || baseByFilename.has(filename)) return
    baseByFilename.set(filename, photo)
  })

  return stockedPhotos.map((photo) => {
    const filename = photo.filename || ''
    const base = filename ? baseByFilename.get(filename) : undefined
    if (!base) return photo

    return {
      ...photo,
      id: base.id,
      status: base.status,
      approval_status: (base.approval_status || base.status) as PhotoStatus,
      can_download: base.can_download,
      uploaded_by_user_id: base.uploaded_by_user_id || photo.uploaded_by_user_id,
      caption: base.caption ?? photo.caption,
      taken_at: base.taken_at ?? photo.taken_at,
      created_at: base.created_at ?? photo.created_at,
      updated_at: base.updated_at ?? photo.updated_at,
      sort_order: base.sort_order ?? photo.sort_order,
    } as GalleryPhoto
  })
}

function buildFakeGallery(mockGallery: any): Gallery {
  const photos = getFakePhotosForGalleryId(mockGallery.id)
  const coverPhoto =
    photos.find((photo) => photo.id === mockGallery.cover_photo_id) ??
    photos[0] ??
    null
  const pendingCount = photos.filter((photo) => photo.status === 'pending').length

  return {
    ...(mockGallery as Gallery),
    can_download: mockGallery.can_download ?? undefined,
    cover_url: coverPhoto ? getGalleryPhotoThumbnailUrl(coverPhoto.thumbnail_path || null, coverPhoto.storage_path) : null,
    photo_count: photos.length,
    pending_count: pendingCount,
  } as Gallery
}

function getFakeGalleriesForParams(context: UserContext, params: GetGalleriesParams): Gallery[] {
  const requestedOrgIds =
    params.org_ids && params.org_ids.length > 0
      ? Array.from(new Set(params.org_ids))
      : [params.org_id || context.orgId || DEMO_ORG_A_ID]

  let galleries = requestedOrgIds.flatMap((orgId) => getMockGalleriesForOrg(orgId).map(buildFakeGallery))

  if (params.gallery_type) {
    galleries = galleries.filter((gallery) => gallery.gallery_type === params.gallery_type)
  }

  if (params.entity_id && params.entity_id !== '') {
    galleries = galleries.filter((gallery) => gallery.entity_id === params.entity_id)
  }

  if (params.search && params.search.trim() !== '') {
    const term = params.search.trim().toLowerCase()
    galleries = galleries.filter((gallery) => {
      const name = gallery.name.toLowerCase()
      const description = (gallery.description || '').toLowerCase()
      const entityName = (gallery.entity_name || '').toLowerCase()
      return name.includes(term) || description.includes(term) || entityName.includes(term)
    })
  }

  const orderDirection = params.order_direction || 'desc'
  const ascending = orderDirection === 'asc'
  galleries = [...galleries].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime()
    const timeB = new Date(b.created_at).getTime()
    if (timeA !== timeB) return ascending ? timeA - timeB : timeB - timeA
    return ascending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
  })

  if (params.cursor) {
    const cursorTime = new Date(params.cursor.created_at).getTime()
    const cursorId = params.cursor.id
    galleries = galleries.filter((gallery) => {
      const galleryTime = new Date(gallery.created_at).getTime()
      if (ascending) {
        return galleryTime > cursorTime || (galleryTime === cursorTime && gallery.id > cursorId)
      }
      return galleryTime < cursorTime || (galleryTime === cursorTime && gallery.id < cursorId)
    })
  }

  const offset = params.offset ?? 0
  if (offset > 0) {
    galleries = galleries.slice(offset)
  }

  if (params.limit) {
    galleries = galleries.slice(0, params.limit)
  }

  return galleries
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Trigger gallery cover generation
 */
export async function generateGalleryCover(
  galleryId: string,
  sourcePhotoId?: string,
  forceRegenerate: boolean = false
): Promise<{ error: Error | null }> {
  console.groupCollapsed(`%cgenerateGalleryCover: ${galleryId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.generateGalleryCover', 'Generating gallery cover', { galleryId, sourcePhotoId, forceRegenerate })
  debug.perf.start('galleryService.generateGalleryCover')

  try {
    const { error } = await supabase.functions.invoke('generate-gallery-cover', {
      body: { gallery_id: galleryId, source_photo_id: sourcePhotoId, force_regenerate: forceRegenerate }
    })

    if (error) {
      debug.perf.end('galleryService.generateGalleryCover')
      debug.error('GalleryService.generateGalleryCover', 'Triggered generation failed', { error, galleryId })
      console.groupEnd()
      console.error('[galleryService] Triggered generation failed:', error);
      // We don't throw here to avoid failing the parent operation (like upload)
      return { error: null }
    }
    debug.perf.end('galleryService.generateGalleryCover')
    debug.flow('GalleryService.generateGalleryCover', 'Gallery cover generation triggered', { galleryId })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('galleryService.generateGalleryCover')
    debug.error('GalleryService.generateGalleryCover', 'Exception invoking generate-gallery-cover', { error: err, galleryId })
    console.groupEnd()
    console.error('[galleryService] Error invoking generate-gallery-cover:', err)
    return { error: err as Error }
  }
}

/**
 * Build public URL for a gallery photo from storage_path
 */
export function getGalleryPhotoUrl(storagePath: string): string {
  if (!storagePath) return ''
  if (storagePath.startsWith('/')) return storagePath

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

  const resolvedThumbnailPath = photo.thumbnail_md_path || photo.thumbnail_path || null

  return {
    ...photo,
    thumbnail_path: resolvedThumbnailPath,
    url: getGalleryPhotoUrl(photo.storage_path),
    thumbnail_url: getGalleryPhotoThumbnailUrl(resolvedThumbnailPath, photo.storage_path),
    tagged_athletes: taggedAthletes,
  } as GalleryPhoto
}

async function attachEntityNames(galleries: Gallery[]): Promise<Gallery[]> {
  if (galleries.length === 0) return galleries

  const teamIds: string[] = []
  const eventIds: string[] = []
  const seasonIds: string[] = []
  const programIds: string[] = []
  const athleteIds: string[] = []
  const travelIds: string[] = []

  galleries.forEach((gallery) => {
    if (!gallery.entity_id) return
    switch (gallery.gallery_type) {
      case 'team':
        teamIds.push(gallery.entity_id)
        break
      case 'event':
        eventIds.push(gallery.entity_id)
        break
      case 'season':
        seasonIds.push(gallery.entity_id)
        break
      case 'program':
        programIds.push(gallery.entity_id)
        break
      case 'athlete':
        athleteIds.push(gallery.entity_id)
        break
      case 'travel':
        travelIds.push(gallery.entity_id)
        break
      default:
        break
    }
  })

  const [teamsRes, eventsRes, seasonsRes, programsRes, athletesRes, travelRes] = await Promise.all([
    teamIds.length > 0
      ? supabase.from('teams').select('id, name').in('id', teamIds)
      : Promise.resolve({ data: [] }),
    eventIds.length > 0
      ? supabase.from('events').select('id, title').in('id', eventIds)
      : Promise.resolve({ data: [] }),
    seasonIds.length > 0
      ? supabase.from('seasons').select('id, name').in('id', seasonIds)
      : Promise.resolve({ data: [] }),
    programIds.length > 0
      ? supabase.from('programs').select('id, name').in('id', programIds)
      : Promise.resolve({ data: [] }),
    athleteIds.length > 0
      ? supabase.from('athletes').select('id, first_name, last_name').in('id', athleteIds)
      : Promise.resolve({ data: [] }),
    travelIds.length > 0
      ? supabase.from('travel_plans').select('id, title').in('id', travelIds)
      : Promise.resolve({ data: [] }),
  ])

  const teamMap = new Map((teamsRes.data || []).map((t: any) => [t.id, t.name]))
  const eventMap = new Map((eventsRes.data || []).map((e: any) => [e.id, e.title]))
  const seasonMap = new Map((seasonsRes.data || []).map((s: any) => [s.id, s.name]))
  const programMap = new Map((programsRes.data || []).map((p: any) => [p.id, p.name]))
  const athleteMap = new Map(
    (athletesRes.data || []).map((a: any) => [
      a.id,
      [a.first_name, a.last_name].filter(Boolean).join(' ').trim(),
    ])
  )
  const travelMap = new Map((travelRes.data || []).map((t: any) => [t.id, t.title]))

  galleries.forEach((gallery) => {
    if (!gallery.entity_id) return
    switch (gallery.gallery_type) {
      case 'team':
        gallery.entity_name = teamMap.get(gallery.entity_id) || null
        break
      case 'event':
        gallery.entity_name = eventMap.get(gallery.entity_id) || null
        break
      case 'season':
        gallery.entity_name = seasonMap.get(gallery.entity_id) || null
        break
      case 'program':
        gallery.entity_name = programMap.get(gallery.entity_id) || null
        break
      case 'athlete':
        gallery.entity_name = athleteMap.get(gallery.entity_id) || null
        break
      case 'travel':
        gallery.entity_name = travelMap.get(gallery.entity_id) || null
        break
      default:
        break
    }
  })

  return galleries
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
  console.groupCollapsed(`%cgetGalleriesForUser: ${context.userId}`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.getGalleriesForUser', 'Request', { context: { userId: context.userId, orgId: context.orgId }, params })
  debug.perf.start('galleryService.getGalleriesForUser')

  try {
    if (USE_FAKE_DATA) {
      await simulateDelay()
      const fakeGalleries = getFakeGalleriesForParams(context, params)
      debug.perf.end('galleryService.getGalleriesForUser')
      debug.data('GalleryService.getGalleriesForUser', 'Response (fake)', { galleryCount: fakeGalleries.length })
      console.groupEnd()
      return { data: fakeGalleries, error: null }
    }
    const orderDirection = params.order_direction || 'desc'
    const ascending = orderDirection === 'asc'

    let query = supabase
      .from('galleries')
      .select('*, cover:cover_photo_id (thumbnail_path, storage_path), org:organizations(id, name, slug)')
      .order('created_at', { ascending })
      .order('id', { ascending })

    // Filter by gallery type
    if (params.gallery_type) {
      query = query.eq('gallery_type', params.gallery_type)
    }

    // Filter by entity_id (team, athlete, event, travel)
    if (params.entity_id && params.entity_id !== '') {
      query = query.eq('entity_id', params.entity_id)
    }

    // Filter by org_id or org_ids
    if (params.org_ids && params.org_ids.length > 0) {
      query = query.in('org_id', params.org_ids)
    } else if (params.org_id) {
      query = query.eq('org_id', params.org_id)
    } else if (context.orgId && context.orgId !== '') {
      query = query.eq('org_id', context.orgId)
    }

    // Search by name/description
    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim()
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
    }

    // Keyset pagination (created_at, id)
    if (params.cursor) {
      const op = ascending ? 'gt' : 'lt'
      const createdAt = encodeURIComponent(params.cursor.created_at)
      const cursorId = encodeURIComponent(params.cursor.id)
      query = query.or(`created_at.${op}.${createdAt},and(created_at.eq.${createdAt},id.${op}.${cursorId})`)
    }

    // Pagination (offset-based)
    if (params.limit) {
      query = query.limit(params.limit)
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 1000) - 1)
    }

    const { data: galleries, error } = await query

    if (error) throw error

    const galleryList = (galleries || []).map((g: any) => {
      const coverUrl = g.cover ? getGalleryPhotoThumbnailUrl(g.cover.thumbnail_path, g.cover.storage_path) : null
      return {
        ...g,
        cover_url: coverUrl,
        org_name: g.org?.name ?? null,
        org_slug: g.org?.slug ?? null,
      }
    }) as Gallery[]

    // Get photo counts for all galleries using direct query (RPC function may not exist)
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
      } else if (countsError) {
        // Fallback: count photos individually if RPC fails
        console.warn('[galleryService] get_gallery_photo_counts RPC failed, using fallback:', countsError)
        for (const gallery of galleryList) {
          const { count: totalCount } = await supabase
            .from('gallery_photos')
            .select('*', { count: 'exact', head: true })
            .eq('gallery_id', gallery.id)
          const { count: pendingCount } = await supabase
            .from('gallery_photos')
            .select('*', { count: 'exact', head: true })
            .eq('gallery_id', gallery.id)
            .eq('status', 'pending')
          gallery.photo_count = totalCount || 0
          gallery.pending_count = pendingCount || 0
        }
      }

      // For galleries without a cover photo, fetch the first photo as a fallback cover
      const galleriesWithoutCover = galleryList.filter(g => !g.cover_url && (g.photo_count ?? 0) > 0)
      if (galleriesWithoutCover.length > 0) {
        const galleryIdsNeedingCover = galleriesWithoutCover.map(g => g.id)

        // Get first photo for each gallery that needs a cover
        const { data: firstPhotos } = await supabase
          .from('gallery_photos')
          .select('gallery_id, thumbnail_path, storage_path')
          .in('gallery_id', galleryIdsNeedingCover)
          .order('created_at', { ascending: true })

        if (firstPhotos) {
          // Build a map of gallery_id -> first photo (only keep first per gallery)
          const firstPhotoMap = new Map<string, { thumbnail_path: string | null; storage_path: string }>()
          for (const photo of firstPhotos) {
            if (!firstPhotoMap.has(photo.gallery_id)) {
              firstPhotoMap.set(photo.gallery_id, photo)
            }
          }

          // Set cover_url for galleries using their first photo
          galleryList.forEach((gallery) => {
            if (!gallery.cover_url) {
              const firstPhoto = firstPhotoMap.get(gallery.id)
              if (firstPhoto) {
                gallery.cover_url = getGalleryPhotoThumbnailUrl(firstPhoto.thumbnail_path, firstPhoto.storage_path)
                console.log('[galleryService] Using first photo as cover for', gallery.name, ':', gallery.cover_url)
              }
            }
          })
        }
      }
    }

    const withEntities = await attachEntityNames(galleryList)

    debug.perf.end('galleryService.getGalleriesForUser')
    debug.data('GalleryService.getGalleriesForUser', 'Response', { galleryCount: withEntities.length })
    console.groupEnd()
    return {
      data: withEntities,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.getGalleriesForUser')
    debug.error('GalleryService.getGalleriesForUser', 'Failed to fetch galleries', { error: err, context: { userId: context.userId, orgId: context.orgId }, params })
    console.groupEnd()
    console.error('[galleryService] Error getting galleries:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Recent activity item interface
 */
export interface RecentActivityItem {
  type: 'photo_upload' | 'gallery_created' | 'gallery_updated'
  gallery_id: string
  gallery_name: string
  gallery_cover_url: string | null
  timestamp: string
  photo_count?: number
  /** Status of the most recent photo in this activity (from gallery_photos.status) */
  status?: PhotoStatus
}

/**
 * Get recent gallery activity for an organization
 * Returns recent photo uploads and gallery updates
 */
export async function getRecentGalleryActivity(
  context: UserContext,
  limit: number = 10
): Promise<{ data: RecentActivityItem[]; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: [], error: null }
  }

  try {
    if (!context.orgId) {
      debug.perf.end('galleryService.getRecentGalleryActivity')
      debug.error('GalleryService.getRecentGalleryActivity', 'Organization context required', { limit })
      console.groupEnd()
      return { data: [], error: new Error('Organization context required') }
    }

    // Get recent photo uploads (last 10 photos) with gallery info
    const { data: recentPhotos, error: photosError } = await supabase
      .from('gallery_photos')
      .select(`
        id,
        gallery_id,
        status,
        created_at,
        gallery:galleries!gallery_photos_gallery_id_fkey!inner(
          id,
          name,
          org_id,
          cover_photo_id,
          cover:cover_photo_id(thumbnail_path, storage_path)
        )
      `)
      .eq('gallery.org_id', context.orgId)
      .order('created_at', { ascending: false })
      .limit(limit * 2) // Get more to account for grouping

    if (photosError) throw photosError

    const activityItems: RecentActivityItem[] = []

    if (recentPhotos) {
      // Group by gallery and get most recent per gallery
      const galleryMap = new Map<string, RecentActivityItem>()
      
      for (const photo of recentPhotos as any[]) {
        const gallery = photo.gallery
        if (!gallery) continue

        const galleryId = gallery.id
        if (!galleryMap.has(galleryId)) {
          const coverUrl = gallery.cover 
            ? getGalleryPhotoThumbnailUrl(gallery.cover.thumbnail_path, gallery.cover.storage_path)
            : null

          galleryMap.set(galleryId, {
            type: 'photo_upload',
            gallery_id: galleryId,
            gallery_name: gallery.name,
            gallery_cover_url: coverUrl,
            timestamp: photo.created_at,
            photo_count: 1,
            status: photo.status as PhotoStatus | undefined,
          })
        } else {
          const item = galleryMap.get(galleryId)!
          item.photo_count = (item.photo_count || 0) + 1
          // Keep the most recent timestamp and status
          if (new Date(photo.created_at) > new Date(item.timestamp)) {
            item.timestamp = photo.created_at
            item.status = photo.status as PhotoStatus | undefined
          }
        }
      }

      activityItems.push(...Array.from(galleryMap.values()))
    }

    // Sort by timestamp descending and limit
    activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return {
      data: activityItems.slice(0, limit),
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting recent activity:', err)
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
  console.groupCollapsed(`%cgetGalleryById: ${galleryId}`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.getGalleryById', 'Request', { galleryId })
  debug.perf.start('galleryService.getGalleryById')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    const generated = parseGeneratedFakeGalleryId(galleryId)
    if (generated) {
      const fakeAthleteGallery = resolveFakeEntityGallery(
        _context.orgId || DEMO_ORG_A_ID,
        generated.galleryType,
        generated.entityId,
      )
      debug.perf.end('galleryService.getGalleryById')
      debug.data('GalleryService.getGalleryById', 'Response (fake)', { galleryId, hasData: !!fakeAthleteGallery })
      console.groupEnd()
      return { data: fakeAthleteGallery, error: null }
    }

    const mockGallery = getMockGalleryById(galleryId)
    debug.perf.end('galleryService.getGalleryById')
    debug.data('GalleryService.getGalleryById', 'Response (fake)', { galleryId, hasData: !!mockGallery })
    console.groupEnd()
    return { data: mockGallery ? buildFakeGallery(mockGallery) : null, error: null }
  }

  try {
    if (!isValidUUID(galleryId)) {
      return { data: null, error: new Error('Invalid gallery ID') }
    }

    const { data, error } = await supabase
      .from('galleries')
      .select('*, cover:cover_photo_id (thumbnail_path, storage_path), org:organizations(id, name, slug)')
      .eq('id', galleryId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return { data: null, error: null }
    }

    const gallery = {
      ...(data as any),
      cover_url: data.cover ? getGalleryPhotoThumbnailUrl(data.cover.thumbnail_path, data.cover.storage_path) : null,
      org_name: (data as any).org?.name ?? null,
      org_slug: (data as any).org?.slug ?? null,
    } as Gallery

    const [withEntity] = await attachEntityNames([gallery])

    debug.perf.end('galleryService.getGalleryById')
    debug.data('GalleryService.getGalleryById', 'Response', { galleryId, hasData: true })
    console.groupEnd()
    return {
      data: withEntity || gallery,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.getGalleryById')
    debug.error('GalleryService.getGalleryById', 'Failed to get gallery', { error: err, galleryId })
    console.groupEnd()
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
  console.groupCollapsed(`%cgetGalleryByEntity: ${galleryType}/${entityId}`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.getGalleryByEntity', 'Request', { galleryType, entityId })
  debug.perf.start('galleryService.getGalleryByEntity')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    const effectiveOrgId = _context.orgId || DEMO_ORG_A_ID
    const fakeGallery = resolveFakeEntityGallery(
      effectiveOrgId,
      mapGalleryTypeToFakeAutoType(galleryType),
      entityId,
    )
    debug.perf.end('galleryService.getGalleryByEntity')
    debug.data('GalleryService.getGalleryByEntity', 'Response (fake)', { galleryType, entityId, hasData: !!fakeGallery })
    console.groupEnd()
    return { data: fakeGallery, error: null }
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

    debug.perf.end('galleryService.getGalleryByEntity')
    debug.data('GalleryService.getGalleryByEntity', 'Response', { galleryType, entityId, hasData: !!data })
    console.groupEnd()
    return {
      data: data as Gallery | null,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.getGalleryByEntity')
    debug.error('GalleryService.getGalleryByEntity', 'Failed to get gallery by entity', { error: err, galleryType, entityId })
    console.groupEnd()
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
  _context: UserContext,
  entityType: GalleryEntityType,
  entityId: string
): Promise<{ data: Gallery | null; error: Error | null }> {
  console.groupCollapsed(`%cgetEntityGallery: ${entityType}/${entityId}`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.getEntityGallery', 'Request', { entityType, entityId })
  debug.perf.start('galleryService.getEntityGallery')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    const effectiveOrgId = _context.orgId || DEMO_ORG_A_ID
    const galleryType = mapEntityToGalleryType(entityType) as FakeAutoGalleryType
    const fakeGallery = resolveFakeEntityGallery(effectiveOrgId, galleryType, entityId)

    debug.perf.end('galleryService.getEntityGallery')
    debug.data('GalleryService.getEntityGallery', 'Response (fake)', { entityType, entityId, hasData: !!fakeGallery })
    console.groupEnd()
    return { data: fakeGallery, error: null }
  }

  try {
    if (!isValidUUID(entityId)) {
      return { data: null, error: new Error('Invalid entity ID') }
    }

    const galleryType = mapEntityToGalleryType(entityType)

    // Validate that this is an auto-gallery entity type
    const autoGalleryTypes: GalleryType[] = ['athlete', 'team', 'event', 'travel', 'program', 'season', 'org']
    if (!autoGalleryTypes.includes(galleryType)) {
      return {
        data: null,
        error: new Error(`${entityType} is not an auto-gallery entity type.`)
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

    debug.perf.end('galleryService.getEntityGallery')
    debug.data('GalleryService.getEntityGallery', 'Response', { entityType, entityId, hasData: !!data })
    console.groupEnd()
    return {
      data: data ? { ...(data as any), cover_url: data.cover ? getGalleryPhotoThumbnailUrl(data.cover.thumbnail_path, data.cover.storage_path) : null } as Gallery : null,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.getEntityGallery')
    debug.error('GalleryService.getEntityGallery', 'Failed to get entity gallery', { error: err, entityType, entityId })
    console.groupEnd()
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
  console.groupCollapsed(`%cgetRelatedGalleries: ${entityType}/${entityId}`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.getRelatedGalleries', 'Request', { entityType, entityId })
  debug.perf.start('galleryService.getRelatedGalleries')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.getRelatedGalleries')
    debug.data('GalleryService.getRelatedGalleries', 'Response (fake)', { entityType, entityId, count: 0 })
    console.groupEnd()
    return { data: [], error: null }
  }

  try {
    if (!isValidUUID(entityId)) {
      debug.perf.end('galleryService.getRelatedGalleries')
      debug.error('GalleryService.getRelatedGalleries', 'Invalid entity ID', { entityType, entityId })
      console.groupEnd()
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

    debug.perf.end('galleryService.getRelatedGalleries')
    debug.data('GalleryService.getRelatedGalleries', 'Response', { entityType, entityId, count: relatedGalleries.length })
    console.groupEnd()
    return {
      data: relatedGalleries,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.getRelatedGalleries')
    debug.error('GalleryService.getRelatedGalleries', 'Failed to get related galleries', { error: err, entityType, entityId })
    console.groupEnd()
    console.error('[galleryService] Error getting related galleries:', err)
    return {
      data: [],
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Ensure an entity gallery exists for auto-gallery entities.
 * Creates the system-generated gallery if it doesn't exist.
 * Uses the elevated ensure_entity_gallery RPC which bypasses RLS.
 *
 * @param context User context
 * @param entityType Entity type (athlete, team, event, travel_plan, program)
 * @param entityId Entity ID
 * @param name Optional custom gallery name
 * @param orgId Optional org ID override - if provided, will be used instead of context.orgId
 * @returns Gallery data or null
 */
export async function ensureEntityGallery(
  context: UserContext,
  entityType: GalleryEntityType,
  entityId: string,
  name?: string | null,
  orgId?: string | null
): Promise<{ data: Gallery | null; error: Error | null }> {
  console.groupCollapsed(`%censureEntityGallery: ${entityType}/${entityId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.ensureEntityGallery', 'Ensuring entity gallery exists', { entityType, entityId, name })
  debug.perf.start('galleryService.ensureEntityGallery')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    const effectiveOrgId = orgId ?? context.orgId ?? DEMO_ORG_A_ID
    const galleryType = mapEntityToGalleryType(entityType) as FakeAutoGalleryType
    const gallery = resolveFakeEntityGallery(effectiveOrgId, galleryType, entityId)

    debug.perf.end('galleryService.ensureEntityGallery')
    debug.flow('GalleryService.ensureEntityGallery', 'Entity gallery ensured (fake)', { entityType, entityId })
    console.groupEnd()
    return { data: gallery, error: null }
  }

  try {
    if (!isValidUUID(entityId)) {
      return { data: null, error: new Error('Invalid entity ID') }
    }

    const galleryType = mapEntityToGalleryType(entityType)

    // Validate that this is an auto-gallery entity type
    const autoGalleryTypes: GalleryType[] = ['athlete', 'team', 'event', 'travel', 'program', 'season', 'org']
    if (!autoGalleryTypes.includes(galleryType)) {
      return {
        data: null,
        error: new Error(`${entityType} is not an auto-gallery entity type.`)
      }
    }

    // Use provided orgId if available, otherwise fall back to context.orgId
    const effectiveOrgId = orgId || context.orgId

    // Call the elevated RPC to ensure gallery exists
    const { data: galleryId, error: rpcError } = await supabase.rpc('ensure_entity_gallery', {
      p_entity_type: galleryType,
      p_entity_id: entityId,
      p_org_id: effectiveOrgId,
      p_user_id: context.userId,
      p_name: name || undefined,
    })

    if (rpcError) throw rpcError

    if (!galleryId) {
      debug.perf.end('galleryService.ensureEntityGallery')
      debug.error('GalleryService.ensureEntityGallery', 'RPC returned no gallery ID', { entityType, entityId })
      console.groupEnd()
      return {
        data: null,
        error: new Error('Failed to ensure gallery exists'),
      }
    }

    // Now fetch the full gallery data
    const { data: gallery, error: fetchError } = await supabase
      .from('galleries')
      .select('*, cover:cover_photo_id (thumbnail_path, storage_path)')
      .eq('id', galleryId)
      .maybeSingle()

    if (fetchError) throw fetchError

    return {
      data: gallery ? { ...(gallery as any), cover_url: gallery.cover ? getGalleryPhotoThumbnailUrl(gallery.cover.thumbnail_path, gallery.cover.storage_path) : null } as Gallery : null,
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error ensuring entity gallery:', err)
    return {
      data: null,
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
  console.groupCollapsed(`%cuploadPhotoToEntityGallery: ${entityType}/${entityId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.uploadPhotoToEntityGallery', 'Uploading photo to entity gallery', { entityType, entityId, fileName: file.name, albumId, status })
  debug.perf.start('galleryService.uploadPhotoToEntityGallery')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.uploadPhotoToEntityGallery')
    debug.flow('GalleryService.uploadPhotoToEntityGallery', 'Photo uploaded (fake)', { entityType, entityId })
    console.groupEnd()
    return { data: null, error: null }
  }

  try {
    // Get the entity's gallery
    const galleryResult = await ensureEntityGallery(context, entityType, entityId)

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

    if (uploadResult.error) {
      debug.perf.end('galleryService.uploadPhotoToEntityGallery')
      debug.error('GalleryService.uploadPhotoToEntityGallery', 'Upload failed', { error: uploadResult.error, entityType, entityId })
      console.groupEnd()
    } else {
      debug.perf.end('galleryService.uploadPhotoToEntityGallery')
      debug.flow('GalleryService.uploadPhotoToEntityGallery', 'Photo uploaded successfully', { entityType, entityId, photoId: uploadResult.data?.id })
      console.groupEnd()
    }
    return uploadResult
  } catch (err) {
    debug.perf.end('galleryService.uploadPhotoToEntityGallery')
    debug.error('GalleryService.uploadPhotoToEntityGallery', 'Exception uploading photo', { error: err, entityType, entityId })
    console.groupEnd()
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
    let photos = getFakePhotosForGalleryId(params.gallery_id)

    if (params.album_id !== undefined) {
      if (params.album_id === null) {
        photos = photos.filter((photo) => photo.album_id === null)
      } else {
        photos = photos.filter((photo) => photo.album_id === params.album_id)
      }
    }

    if (params.status) {
      photos = photos.filter((photo) => photo.status === params.status)
    }

    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim().toLowerCase()
      photos = photos.filter((photo) => {
        const caption = (photo.caption || '').toLowerCase()
        const filename = (photo.filename || '').toLowerCase()
        return caption.includes(term) || filename.includes(term)
      })
    }

    if (params.from) {
      const fromDate = new Date(params.from).getTime()
      photos = photos.filter((photo) => new Date(photo.created_at).getTime() >= fromDate)
    }

    if (params.to) {
      const toDate = new Date(params.to).getTime()
      photos = photos.filter((photo) => new Date(photo.created_at).getTime() <= toDate)
    }

    const orderBy = params.order_by || 'sort_order'
    const orderDirection = params.order_direction || (orderBy === 'sort_order' ? 'asc' : 'desc')
    const ascending = orderDirection === 'asc'
    photos = [...photos].sort((a, b) => {
      if (orderBy === 'sort_order') {
        const sortA = a.sort_order ?? 0
        const sortB = b.sort_order ?? 0
        if (sortA !== sortB) return ascending ? sortA - sortB : sortB - sortA
      } else if (orderBy === 'taken_at') {
        const takenA = new Date(a.taken_at || a.created_at).getTime()
        const takenB = new Date(b.taken_at || b.created_at).getTime()
        if (takenA !== takenB) return ascending ? takenA - takenB : takenB - takenA
      } else {
        const createdA = new Date(a.created_at).getTime()
        const createdB = new Date(b.created_at).getTime()
        if (createdA !== createdB) return ascending ? createdA - createdB : createdB - createdA
      }
      return ascending ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
    })

    if (params.cursor) {
      const cursorTime = new Date(params.cursor.created_at).getTime()
      const cursorId = params.cursor.id
      photos = photos.filter((photo) => {
        const photoTime = new Date(photo.created_at).getTime()
        if (ascending) {
          return photoTime > cursorTime || (photoTime === cursorTime && photo.id > cursorId)
        }
        return photoTime < cursorTime || (photoTime === cursorTime && photo.id < cursorId)
      })
    }

    const offset = params.offset ?? 0
    if (offset > 0) {
      photos = photos.slice(offset)
    }

    if (params.limit) {
      photos = photos.slice(0, params.limit)
    }

    return { data: photos, error: null }
  }

  try {
    debug.perf.start('galleryService.getPhotosForGallery')
    if (!isValidUUID(params.gallery_id)) {
      debug.perf.end('galleryService.getPhotosForGallery')
      debug.error('GalleryService.getPhotosForGallery', 'Invalid gallery ID', { params })
      console.groupEnd()
      return { data: [], error: new Error('Invalid gallery ID') }
    }

    // Build query with optional joins for tags
    let query = supabase
      .from('gallery_photos')
      .select(`
        *,
        gallery_photo_tags (
          athlete:athletes (
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

    // Search by caption or filename
    if (params.search && params.search.trim() !== '') {
      const term = params.search.trim()
      query = query.or(`caption.ilike.%${term}%,filename.ilike.%${term}%`)
    }

    // Date range (created_at)
    if (params.from) {
      query = query.gte('created_at', params.from)
    }
    if (params.to) {
      query = query.lte('created_at', params.to)
    }

    // Ordering
    const requestedOrderBy = params.order_by || 'sort_order'
    const orderDirection = params.order_direction || (requestedOrderBy === 'sort_order' ? 'asc' : 'desc')
    const useCursor = !!params.cursor
    const orderBy = useCursor ? 'created_at' : requestedOrderBy
    const ascending = useCursor ? params.order_direction === 'asc' : orderDirection === 'asc'

    if (orderBy === 'sort_order') {
      query = query.order('sort_order', { ascending: true }).order('created_at', { ascending: false }).order('id', { ascending: false })
    } else {
      query = query.order(orderBy, { ascending }).order('id', { ascending })
    }

    // Keyset pagination (created_at, id)
    if (params.cursor) {
      const op = ascending ? 'gt' : 'lt'
      const createdAt = encodeURIComponent(params.cursor.created_at)
      const cursorId = encodeURIComponent(params.cursor.id)
      query = query.or(`created_at.${op}.${createdAt},and(created_at.eq.${createdAt},id.${op}.${cursorId})`)
    }

    // Pagination (offset-based)
    if (params.limit) {
      query = query.limit(params.limit)
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 100) - 1)
    }

    const { data, error } = await query

    if (error) throw error

    let photos: GalleryPhoto[] = (data || []).map(mapPhotoRecord)

    // Filter by tagged athletes (client-side filter)
    if (params.athlete_id) {
      const athleteIds = typeof params.athlete_id === 'string'
        ? params.athlete_id.split(',').map(id => id.trim())
        : params.athlete_id
      photos = photos.filter((photo) =>
        photo.tagged_athletes?.some((athlete) => athleteIds.includes(athlete.id))
      )
    }

    debug.perf.end('galleryService.getPhotosForGallery')
    debug.data('GalleryService.getPhotosForGallery', 'Response', { galleryId: params.gallery_id, photoCount: photos.length })
    console.groupEnd()
    return {
      data: photos,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.getPhotosForGallery')
    debug.error('GalleryService.getPhotosForGallery', 'Failed to get photos', { error: err, params })
    console.groupEnd()
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
  console.groupCollapsed(`%cgetPhotoById: ${photoId}`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.getPhotoById', 'Request', { photoId })
  debug.perf.start('galleryService.getPhotoById')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    const mockPhoto = getAllMockPhotos().find((photo) => photo.id === photoId)
    debug.perf.end('galleryService.getPhotoById')
    debug.data('GalleryService.getPhotoById', 'Response (fake)', { photoId, hasData: !!mockPhoto })
    console.groupEnd()
    return { data: mockPhoto ? mapMockPhotoToGalleryPhoto(mockPhoto) : null, error: null }
  }

  try {
    if (!isValidUUID(photoId)) {
      return { data: null, error: new Error('Invalid photo ID') }
    }

    const { data, error } = await supabase
      .from('gallery_photos')
      .select(`
        *,
        gallery_photo_tags (
          athlete:athletes (
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
      debug.perf.end('galleryService.getPhotoById')
      debug.data('GalleryService.getPhotoById', 'Response (not found)', { photoId })
      console.groupEnd()
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

    debug.perf.end('galleryService.getPhotoById')
    debug.data('GalleryService.getPhotoById', 'Response', { photoId, hasData: true, taggedAthleteCount: taggedAthletes.length })
    console.groupEnd()
    return {
      data: photo,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.getPhotoById')
    debug.error('GalleryService.getPhotoById', 'Failed to get photo', { error: err, photoId })
    console.groupEnd()
    console.error('[galleryService] Error getting photo:', err)
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Result of getGalleryPhotoCounts: exact counts by status for a gallery.
 */
export interface GalleryPhotoCounts {
  total: number
  pending: number
  approved: number
  rejected: number
}

/**
 * Get exact photo counts for a gallery (total and by status).
 * Uses count queries so counts are correct regardless of pagination.
 */
export async function getGalleryPhotoCounts(
  _context: UserContext,
  galleryId: string
): Promise<{ data: GalleryPhotoCounts; error: Error | null }> {
  console.groupCollapsed(`%cgetGalleryPhotoCounts: ${galleryId}`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.getGalleryPhotoCounts', 'Request', { galleryId })
  debug.perf.start('galleryService.getGalleryPhotoCounts')

  const empty: GalleryPhotoCounts = { total: 0, pending: 0, approved: 0, rejected: 0 }
  if (USE_FAKE_DATA) {
    await simulateDelay()
    const photos = getFakePhotosForGalleryId(galleryId)
    const counts: GalleryPhotoCounts = {
      total: photos.length,
      pending: photos.filter((photo) => photo.status === 'pending').length,
      approved: photos.filter((photo) => photo.status === 'approved').length,
      rejected: photos.filter((photo) => photo.status === 'rejected').length,
    }
    debug.perf.end('galleryService.getGalleryPhotoCounts')
    debug.data('GalleryService.getGalleryPhotoCounts', 'Response (fake)', { galleryId, counts })
    console.groupEnd()
    return { data: counts, error: null }
  }

  try {
    if (!isValidUUID(galleryId)) {
      return { data: empty, error: new Error('Invalid gallery ID') }
    }

    const toNum = (c: number | null | undefined): number =>
      typeof c === 'number' && Number.isFinite(c) ? c : 0

    const base = () =>
      supabase
        .from('gallery_photos')
        .select('id', { count: 'exact' })
        .eq('gallery_id', galleryId)
        .limit(0)

    const [totalRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
      base().then((r) => ({ count: r.count, error: r.error })),
      base().eq('status', 'pending').then((r) => ({ count: r.count, error: r.error })),
      base().eq('status', 'approved').then((r) => ({ count: r.count, error: r.error })),
      base().eq('status', 'rejected').then((r) => ({ count: r.count, error: r.error })),
    ])

    if (totalRes.error) throw totalRes.error
    if (pendingRes.error) throw pendingRes.error
    if (approvedRes.error) throw approvedRes.error
    if (rejectedRes.error) throw rejectedRes.error

    return {
      data: {
        total: toNum(totalRes.count),
        pending: toNum(pendingRes.count),
        approved: toNum(approvedRes.count),
        rejected: toNum(rejectedRes.count),
      },
      error: null,
    }
  } catch (err) {
    console.error('[galleryService] Error getting gallery photo counts:', err)
    return {
      data: empty,
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
  const { data, error } = await getGalleryPhotoCounts(_context, galleryId)
  if (error) return { data: 0, error }
  return { data: data.pending, error: null }
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

export async function createGalleryAlbum(
  _context: UserContext,
  galleryId: string,
  name: string,
  description?: string | null
): Promise<{ data: GalleryAlbum | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: null, error: null }
  }

  try {
    if (!isValidUUID(galleryId)) {
      return { data: null, error: new Error('Invalid gallery ID') }
    }

    const trimmed = name.trim()
    if (!trimmed) {
      return { data: null, error: new Error('Album name is required') }
    }

    const { data, error } = await supabase
      .from('gallery_albums')
      .insert({
        gallery_id: galleryId,
        name: trimmed,
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (error) throw error

    return { data: data as GalleryAlbum, error: null }
  } catch (err) {
    console.error('[galleryService] Error creating album:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateGalleryAlbum(
  _context: UserContext,
  albumId: string,
  updates: { name?: string; description?: string | null }
): Promise<{ data: GalleryAlbum | null; error: Error | null }> {
  console.groupCollapsed(`%cupdateGalleryAlbum: ${albumId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.updateGalleryAlbum', 'Updating gallery album', { albumId, updates: Object.keys(updates) })
  debug.perf.start('galleryService.updateGalleryAlbum')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.updateGalleryAlbum')
    debug.flow('GalleryService.updateGalleryAlbum', 'Album updated (fake)', { albumId })
    console.groupEnd()
    return { data: null, error: null }
  }

  try {
    if (!isValidUUID(albumId)) {
      return { data: null, error: new Error('Invalid album ID') }
    }

    const payload: { name?: string; description?: string | null } = {}
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim()
      if (!trimmed) {
        return { data: null, error: new Error('Album name is required') }
      }
      payload.name = trimmed
    }
    if (updates.description !== undefined) {
      payload.description = updates.description?.trim() || null
    }

    const { data, error } = await supabase
      .from('gallery_albums')
      .update(payload)
      .eq('id', albumId)
      .select()
      .single()

    if (error) throw error

    debug.perf.end('galleryService.updateGalleryAlbum')
    debug.flow('GalleryService.updateGalleryAlbum', 'Album updated successfully', { albumId })
    console.groupEnd()
    return { data: data as GalleryAlbum, error: null }
  } catch (err) {
    debug.perf.end('galleryService.updateGalleryAlbum')
    debug.error('GalleryService.updateGalleryAlbum', 'Failed to update album', { error: err, albumId })
    console.groupEnd()
    console.error('[galleryService] Error updating album:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function deleteGalleryAlbum(
  _context: UserContext,
  albumId: string
): Promise<{ error: Error | null }> {
  console.groupCollapsed(`%cdeleteGalleryAlbum: ${albumId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.deleteGalleryAlbum', 'Deleting gallery album', { albumId })
  debug.perf.start('galleryService.deleteGalleryAlbum')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.deleteGalleryAlbum')
    debug.flow('GalleryService.deleteGalleryAlbum', 'Album deleted (fake)', { albumId })
    console.groupEnd()
    return { error: null }
  }

  try {
    if (!isValidUUID(albumId)) {
      debug.perf.end('galleryService.deleteGalleryAlbum')
      debug.error('GalleryService.deleteGalleryAlbum', 'Invalid album ID', { albumId })
      console.groupEnd()
      return { error: new Error('Invalid album ID') }
    }

    const { error } = await supabase
      .from('gallery_albums')
      .delete()
      .eq('id', albumId)

    if (error) throw error

    debug.perf.end('galleryService.deleteGalleryAlbum')
    debug.flow('GalleryService.deleteGalleryAlbum', 'Album deleted successfully', { albumId })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('galleryService.deleteGalleryAlbum')
    debug.error('GalleryService.deleteGalleryAlbum', 'Failed to delete album', { error: err, albumId })
    console.groupEnd()
    console.error('[galleryService] Error deleting album:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function getPhotoBookmarks(
  context: UserContext,
  photoIds: string[]
): Promise<{ data: string[]; error: Error | null }> {
  console.groupCollapsed(`%cgetPhotoBookmarks: ${photoIds.length} photos`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.getPhotoBookmarks', 'Request', { userId: context.userId, photoCount: photoIds.length })
  debug.perf.start('galleryService.getPhotoBookmarks')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.getPhotoBookmarks')
    debug.data('GalleryService.getPhotoBookmarks', 'Response (fake)', { bookmarkCount: 0 })
    console.groupEnd()
    return { data: [], error: null }
  }

  try {
    if (!context.userId) {
      return { data: [], error: new Error('User context required') }
    }
    if (!photoIds || photoIds.length === 0) {
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('gallery_photo_bookmarks')
      .select('photo_id')
      .eq('user_id', context.userId)
      .in('photo_id', photoIds)

    if (error) throw error

    const bookmarks = (data || []).map((row: any) => row.photo_id as string)
    debug.perf.end('galleryService.getPhotoBookmarks')
    debug.data('GalleryService.getPhotoBookmarks', 'Response', { bookmarkCount: bookmarks.length })
    console.groupEnd()
    return {
      data: bookmarks,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.getPhotoBookmarks')
    debug.error('GalleryService.getPhotoBookmarks', 'Failed to get photo bookmarks', { error: err })
    console.groupEnd()
    console.error('[galleryService] Error fetching photo bookmarks:', err)
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function addPhotoBookmark(
  context: UserContext,
  photoId: string
): Promise<{ error: Error | null }> {
  console.groupCollapsed(`%caddPhotoBookmark: ${photoId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.addPhotoBookmark', 'Adding photo bookmark', { photoId, userId: context.userId })
  debug.perf.start('galleryService.addPhotoBookmark')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.addPhotoBookmark')
    debug.flow('GalleryService.addPhotoBookmark', 'Bookmark added (fake)', { photoId })
    console.groupEnd()
    return { error: null }
  }

  try {
    if (!context.userId) {
      return { error: new Error('User context required') }
    }
    if (!isValidUUID(photoId)) {
      return { error: new Error('Invalid photo ID') }
    }

    const { error } = await supabase
      .from('gallery_photo_bookmarks')
      .insert({ photo_id: photoId, user_id: context.userId })

    if (error) throw error

    debug.perf.end('galleryService.addPhotoBookmark')
    debug.flow('GalleryService.addPhotoBookmark', 'Bookmark added successfully', { photoId })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('galleryService.addPhotoBookmark')
    debug.error('GalleryService.addPhotoBookmark', 'Failed to add bookmark', { error: err, photoId })
    console.groupEnd()
    console.error('[galleryService] Error adding photo bookmark:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function removePhotoBookmark(
  context: UserContext,
  photoId: string
): Promise<{ error: Error | null }> {
  console.groupCollapsed(`%cremovePhotoBookmark: ${photoId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.removePhotoBookmark', 'Removing photo bookmark', { photoId, userId: context.userId })
  debug.perf.start('galleryService.removePhotoBookmark')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.removePhotoBookmark')
    debug.flow('GalleryService.removePhotoBookmark', 'Bookmark removed (fake)', { photoId })
    console.groupEnd()
    return { error: null }
  }

  try {
    if (!context.userId) {
      return { error: new Error('User context required') }
    }
    if (!isValidUUID(photoId)) {
      return { error: new Error('Invalid photo ID') }
    }

    const { error } = await supabase
      .from('gallery_photo_bookmarks')
      .delete()
      .eq('photo_id', photoId)
      .eq('user_id', context.userId)

    if (error) throw error

    debug.perf.end('galleryService.removePhotoBookmark')
    debug.flow('GalleryService.removePhotoBookmark', 'Bookmark removed successfully', { photoId })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('galleryService.removePhotoBookmark')
    debug.error('GalleryService.removePhotoBookmark', 'Failed to remove bookmark', { error: err, photoId })
    console.groupEnd()
    console.error('[galleryService] Error removing photo bookmark:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
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
  visibility: 'public' | 'team' | 'private' = 'team',
  isSystemGenerated: boolean = false
): Promise<{ data: Gallery | null; error: Error | null }> {
  console.groupCollapsed(`%ccreateGalleryForEntity: ${galleryType}/${entityId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.createGalleryForEntity', 'Creating gallery for entity', { galleryType, entityId, name })
  debug.perf.start('galleryService.createGalleryForEntity')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.createGalleryForEntity')
    debug.flow('GalleryService.createGalleryForEntity', 'Gallery created (fake)', { galleryType, entityId })
    console.groupEnd()
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
        fans_can_see: visibility === 'public',
        allow_contributions: allowContributions,
        require_approval: requireApproval,
        is_system_generated: isSystemGenerated,
        created_by_user_id: context.userId,
      })
      .select()
      .single()

    if (error) throw error

    debug.perf.end('galleryService.createGalleryForEntity')
    debug.flow('GalleryService.createGalleryForEntity', 'Gallery created successfully', { galleryType, entityId, galleryId: data?.id })
    console.groupEnd()
    return {
      data: data as Gallery,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.createGalleryForEntity')
    debug.error('GalleryService.createGalleryForEntity', 'Failed to create gallery', { error: err, galleryType, entityId })
    console.groupEnd()
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
  _name: string = 'Photos'
): Promise<{ id: string | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    const effectiveOrgId = context.orgId || DEMO_ORG_A_ID
    const fakeGallery = resolveFakeEntityGallery(
      effectiveOrgId,
      mapGalleryTypeToFakeAutoType(galleryType),
      entityId,
    )
    return { id: fakeGallery?.id ?? null, error: null }
  }

  try {
    if (!context.orgId) {
      debug.perf.end('galleryService.getOrCreateStaticGallery')
      debug.error('GalleryService.getOrCreateStaticGallery', 'Organization context required', { galleryType, entityId })
      console.groupEnd()
      return { id: null, error: new Error('Organization context required') }
    }
    const { data, error } = await supabase.rpc('get_or_create_static_gallery', {
      p_org_id: context.orgId,
      p_entity_type: galleryType,
      p_entity_id: entityId,
      p_user_id: context.userId,
    })
    if (error) throw error
    debug.perf.end('galleryService.getOrCreateStaticGallery')
    debug.flow('GalleryService.getOrCreateStaticGallery', 'Static gallery retrieved successfully', { galleryType, entityId, galleryId: data })
    console.groupEnd()
    return { id: data as string, error: null }
  } catch (err) {
    debug.perf.end('galleryService.getOrCreateStaticGallery')
    debug.error('GalleryService.getOrCreateStaticGallery', 'Failed to get or create static gallery', { error: err, galleryType, entityId })
    console.groupEnd()
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
  console.groupCollapsed(`%ccheckCanUploadToGallery: ${galleryId}`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.checkCanUploadToGallery', 'Request', { galleryId, userId: context.userId })
  debug.perf.start('galleryService.checkCanUploadToGallery')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.checkCanUploadToGallery')
    debug.data('GalleryService.checkCanUploadToGallery', 'Response (fake)', { galleryId, allowed: true })
    console.groupEnd()
    return { allowed: true, error: null }
  }

  try {
    const { data, error } = await supabase.rpc('can_upload_to_gallery', {
      gallery_id_param: galleryId,
      user_id_param: context.userId,
    })

    if (error) throw error

    debug.perf.end('galleryService.checkCanUploadToGallery')
    debug.data('GalleryService.checkCanUploadToGallery', 'Response', { galleryId, allowed: data === true })
    console.groupEnd()
    return {
      allowed: data === true,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.checkCanUploadToGallery')
    debug.error('GalleryService.checkCanUploadToGallery', 'Failed to check upload permission', { error: err, galleryId })
    console.groupEnd()
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
  console.groupCollapsed(`%ccheckCanModerateGallery: ${galleryId}`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.checkCanModerateGallery', 'Request', { galleryId, userId: context.userId })
  debug.perf.start('galleryService.checkCanModerateGallery')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.checkCanModerateGallery')
    debug.data('GalleryService.checkCanModerateGallery', 'Response (fake)', { galleryId, allowed: true })
    console.groupEnd()
    return { allowed: true, error: null }
  }

  try {
    const { data, error } = await supabase.rpc('can_moderate_gallery', {
      gallery_id_param: galleryId,
      user_id_param: context.userId,
    })

    if (error) throw error

    debug.perf.end('galleryService.checkCanModerateGallery')
    debug.data('GalleryService.checkCanModerateGallery', 'Response', { galleryId, allowed: data === true })
    console.groupEnd()
    return {
      allowed: data === true,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.checkCanModerateGallery')
    debug.error('GalleryService.checkCanModerateGallery', 'Failed to check moderate permission', { error: err, galleryId })
    console.groupEnd()
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
  console.groupCollapsed(`%ccheckStorageCap: ${context.orgId}`, 'color: #666; font-weight: bold;');
  debug.data('GalleryService.checkStorageCap', 'Request', { orgId: context.orgId })
  debug.perf.start('galleryService.checkStorageCap')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.checkStorageCap')
    debug.data('GalleryService.checkStorageCap', 'Response (fake)', { allowed: true })
    console.groupEnd()
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
      debug.perf.end('galleryService.checkStorageCap')
      debug.error('GalleryService.checkStorageCap', 'Failed to get storage limit, allowing upload', { error: limitResult.error, orgId: context.orgId })
      console.groupEnd()
      console.warn('[galleryService] get_org_photo_storage_limit_bytes failed, allowing upload', limitResult.error)
      return {
        allowed: true,
        error: null,
        currentUsage: currentBytes,
      }
    }

    const allowed = limitBytes <= 0 || currentBytes < limitBytes

    debug.perf.end('galleryService.checkStorageCap')
    debug.data('GalleryService.checkStorageCap', 'Response', { allowed, currentUsage: currentBytes, limit: limitBytes > 0 ? limitBytes : undefined })
    console.groupEnd()
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
    debug.perf.end('galleryService.checkStorageCap')
    debug.error('GalleryService.checkStorageCap', 'Failed to check storage cap', { error: err, orgId: context.orgId })
    console.groupEnd()
    console.error('[galleryService] Error checking storage cap:', err)
    return {
      allowed: false,
      error: err instanceof Error ? err : new Error('Unknown error'),
    }
  }
}

/**
 * Detect if the error means the RPC function does not exist (404 / PGRST204).
 */
function isRpcNotFoundError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const code = (error as { code?: string }).code
  const msg = (error as { message?: string }).message ?? ''
  return (
    code === 'PGRST204' ||
    (msg.includes('function') && msg.includes('does not exist')) ||
    msg.includes('404') ||
    msg.includes('Could not find the function')
  )
}

/**
 * Update org storage usage after upload/delete.
 * Tries RPC first; if the RPC does not exist (e.g. migration not run), falls back to direct upsert.
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
      debug.perf.end('galleryService.updateStorageUsage')
      debug.error('GalleryService.updateStorageUsage', 'Organization context required', { bytesDelta })
      console.groupEnd()
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

    if (isRpcNotFoundError(error as { code?: string; message?: string })) {
      const { data: current } = await supabase
        .from('org_storage_usage')
        .select('bytes_used')
        .eq('org_id', context.orgId)
        .eq('bucket_id', 'public-media')
        .maybeSingle()

      const newBytes = Math.max(0, (current?.bytes_used ?? 0) + bytesDelta)

      const { error: upsertError } = await supabase
        .from('org_storage_usage')
        .upsert(
          {
            org_id: context.orgId,
            bucket_id: 'public-media',
            bytes_used: newBytes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'org_id' }
        )

      if (upsertError) throw upsertError
    } else if (error) {
      throw error
    }

    debug.perf.end('galleryService.updateStorageUsage')
    debug.flow('GalleryService.updateStorageUsage', 'Storage usage updated successfully', { orgId: context.orgId, bytesDelta })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('galleryService.updateStorageUsage')
    debug.error('GalleryService.updateStorageUsage', 'Failed to update storage usage', { error: err, orgId: context.orgId, bytesDelta })
    console.groupEnd()
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
  console.groupCollapsed(`%cuploadPhotoToGallery: ${galleryId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.uploadPhotoToGallery', 'Uploading photo to gallery', { galleryId, fileName: file.name, fileSize: file.size, albumId, status })
  debug.perf.start('galleryService.uploadPhotoToGallery')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.uploadPhotoToGallery')
    debug.flow('GalleryService.uploadPhotoToGallery', 'Photo uploaded (fake)', { galleryId })
    console.groupEnd()
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
        cacheControl: '86400',
        upsert: false,
      })

    if (uploadError) {
      debug.perf.end('galleryService.uploadPhotoToGallery')
      debug.error('GalleryService.uploadPhotoToGallery', 'Storage upload failed', { error: uploadError, galleryId, storagePath })
      console.groupEnd()
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

    // Best-effort audit log for upload actions.
    const uploadedPhoto = data as GalleryPhoto
    const logResult = await logEvent({
      category: 'SYSTEM',
      eventType: 'PHOTO_UPLOADED',
      actorUserId: context.userId,
      actorRole: deriveActorRoleFromRoles(context.roles),
      orgId: context.orgId,
      targetEntityType: 'gallery_photo',
      targetEntityId: uploadedPhoto.id,
      metadata: {
        gallery_id: galleryId,
        album_id: albumId || null,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        status,
        storage_path: storagePath,
        source: 'galleryService.uploadPhotoToGallery',
      },
    })
    if (logResult.error) {
      console.error('[galleryService] Failed to log PHOTO_UPLOADED event:', logResult.error)
    }

    // Trigger thumbnail generation (non-blocking)
    try {
      const { error: thumbError } = await supabase.functions.invoke('generate-photo-thumbnails', {
        body: { photo_id: uploadedPhoto.id },
      })
      if (thumbError) {
        console.error('[galleryService] Thumbnail generation failed:', thumbError)
      }
    } catch (thumbErr) {
      console.error('[galleryService] Error invoking generate-photo-thumbnails:', thumbErr)
    }

    // Trigger cover generation if this is the first photo or gallery has no cover
    try {
      const { data: gallery } = await supabase.from('galleries').select('cover_photo_id').eq('id', galleryId).maybeSingle();
      if (gallery && !gallery.cover_photo_id) {
        generateGalleryCover(galleryId, uploadedPhoto.id).catch(console.error);
      }
    } catch (e) {
      console.warn('Failed to check/trigger cover generation', e);
    }

    debug.perf.end('galleryService.uploadPhotoToGallery')
    debug.flow('GalleryService.uploadPhotoToGallery', 'Photo uploaded successfully', { galleryId, photoId: uploadedPhoto.id })
    console.groupEnd()
    return {
      data: data as GalleryPhoto,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.uploadPhotoToGallery')
    debug.error('GalleryService.uploadPhotoToGallery', 'Exception uploading photo', { error: err, galleryId })
    console.groupEnd()
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

    debug.perf.end('galleryService.moderatePhotos')
    debug.flow('GalleryService.moderatePhotos', 'Photos moderated successfully', { action, photoCount: photoIds.length })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('galleryService.moderatePhotos')
    debug.error('GalleryService.moderatePhotos', 'Failed to moderate photos', { error: err, action, photoCount: photoIds.length })
    console.groupEnd()
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
  _context: UserContext,
  galleryId: string,
  payload: UpdateGalleryInput
): Promise<{ data: Gallery | null; error: Error | null }> {
  console.groupCollapsed(`%cupdateGallery: ${galleryId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.updateGallery', 'Updating gallery', { galleryId, updates: Object.keys(payload) })
  debug.perf.start('galleryService.updateGallery')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.updateGallery')
    debug.flow('GalleryService.updateGallery', 'Gallery updated (fake)', { galleryId })
    console.groupEnd()
    return { data: null, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('galleries')
      .update({
        ...payload,
        fans_can_see: payload.visibility ? payload.visibility === 'public' : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', galleryId)
      .select('*, cover:cover_photo_id (thumbnail_path, storage_path)')
      .maybeSingle()

    if (error) throw error

    debug.perf.end('galleryService.updateGallery')
    debug.flow('GalleryService.updateGallery', 'Gallery updated successfully', { galleryId })
    console.groupEnd()
    return {
      data: data ? ({ ...(data as any), cover_url: data.cover ? getGalleryPhotoThumbnailUrl(data.cover.thumbnail_path, data.cover.storage_path) : null } as Gallery) : null,
      error: null,
    }
  } catch (err) {
    debug.perf.end('galleryService.updateGallery')
    debug.error('GalleryService.updateGallery', 'Failed to update gallery', { error: err, galleryId })
    console.groupEnd()
    console.error('[galleryService] Error updating gallery:', err)
    return { data: null, error: err as Error }
  }
}

export async function setGalleryCover(
  context: UserContext,
  galleryId: string,
  photoId: string | null
): Promise<{ error: Error | null }> {
  console.groupCollapsed(`%csetGalleryCover: ${galleryId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.setGalleryCover', 'Setting gallery cover', { galleryId, photoId })
  debug.perf.start('galleryService.setGalleryCover')

  const { error } = await updateGallery(context, galleryId, { cover_photo_id: photoId })

  if (!error) {
    // Trigger generation
    generateGalleryCover(galleryId, photoId || undefined, true).catch(console.error)
    debug.perf.end('galleryService.setGalleryCover')
    debug.flow('GalleryService.setGalleryCover', 'Gallery cover set successfully', { galleryId, photoId })
    console.groupEnd()
  } else {
    debug.perf.end('galleryService.setGalleryCover')
    debug.error('GalleryService.setGalleryCover', 'Failed to set cover', { error, galleryId, photoId })
    console.groupEnd()
  }

  return { error }
}

export async function deletePhotos(
  context: UserContext,
  galleryId: string,
  photoIds: string[]
): Promise<{ error: Error | null }> {
  console.groupCollapsed(`%cdeletePhotos: ${galleryId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.deletePhotos', 'Deleting photos', { galleryId, photoCount: photoIds.length })
  debug.perf.start('galleryService.deletePhotos')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.deletePhotos')
    debug.flow('GalleryService.deletePhotos', 'Photos deleted (fake)', { galleryId, photoCount: photoIds.length })
    console.groupEnd()
    return { error: null }
  }

  try {
    if (photoIds.length === 0) return { error: null }

    const { data: photos, error: fetchError } = await supabase
      .from('gallery_photos')
      .select('id, storage_path, thumbnail_path, thumbnail_sm_path, thumbnail_md_path, thumbnail_lg_path, size_bytes')
      .eq('gallery_id', galleryId)
      .in('id', photoIds)

    if (fetchError) throw fetchError

    const pathsToDelete: string[] = []
    let reclaimedBytes = 0
      ; (photos || []).forEach((p: any) => {
        if (p.storage_path) pathsToDelete.push(p.storage_path)
        if (p.thumbnail_path) pathsToDelete.push(p.thumbnail_path)
        if (p.thumbnail_sm_path) pathsToDelete.push(p.thumbnail_sm_path)
        if (p.thumbnail_md_path) pathsToDelete.push(p.thumbnail_md_path)
        if (p.thumbnail_lg_path) pathsToDelete.push(p.thumbnail_lg_path)
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

    if (reclaimedBytes > 0) {
      await updateStorageUsage(context, -reclaimedBytes)
    }

    // Trigger regeneration if cover photo is missing (ON DELETE SET NULL in DB will handle the column, but we need to generate new thumbs)
    try {
      const { data: gallery } = await supabase
        .from('galleries')
        .select('cover_photo_id')
        .eq('id', galleryId)
        .maybeSingle();

      if (gallery && !gallery.cover_photo_id) {
        // Pick next available
        generateGalleryCover(galleryId).catch(console.error);
      }
    } catch (e) {
      console.warn('Failed to check/trigger cover regeneration after delete', e);
    }

    debug.perf.end('galleryService.deletePhotos')
    debug.flow('GalleryService.deletePhotos', 'Photos deleted successfully', { galleryId, photoCount: photoIds.length, reclaimedBytes })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('galleryService.deletePhotos')
    debug.error('GalleryService.deletePhotos', 'Failed to delete photos', { error: err, galleryId, photoCount: photoIds.length })
    console.groupEnd()
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
      debug.perf.end('galleryService.deleteGallery')
      debug.error('GalleryService.deleteGallery', 'Cannot delete system-generated gallery', { galleryId })
      console.groupEnd()
      return {
        error: new Error('Cannot delete system-generated gallery. Galleries are automatically managed for athletes, teams, events, travel plans, and programs.'),
      }
    }

    const { data: photos, error: photosError } = await supabase
      .from('gallery_photos')
      .select('id, storage_path, thumbnail_path, thumbnail_sm_path, thumbnail_md_path, thumbnail_lg_path, size_bytes')
      .eq('gallery_id', galleryId)

    if (photosError) throw photosError

    const paths: string[] = []
    let reclaimedBytes = 0
      ; (photos || []).forEach((p: any) => {
        if (p.storage_path) paths.push(p.storage_path)
        if (p.thumbnail_path) paths.push(p.thumbnail_path)
        if (p.thumbnail_sm_path) paths.push(p.thumbnail_sm_path)
        if (p.thumbnail_md_path) paths.push(p.thumbnail_md_path)
        if (p.thumbnail_lg_path) paths.push(p.thumbnail_lg_path)
        reclaimedBytes += Number(p.size_bytes || 0)
      })

    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage.from(import.meta.env.VITE_SUPABASE_PUBLIC_MEDIA_BUCKET).remove(paths)
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

    debug.perf.end('galleryService.deleteGallery')
    debug.flow('GalleryService.deleteGallery', 'Gallery deleted successfully', { galleryId, reclaimedBytes })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('galleryService.deleteGallery')
    debug.error('GalleryService.deleteGallery', 'Failed to delete gallery', { error: err, galleryId })
    console.groupEnd()
    console.error('[galleryService] Error deleting gallery:', err)
    return { error: err as Error }
  }
}

export async function reorderGalleryPhotos(
  _context: UserContext,
  galleryId: string,
  photoIds: string[]
): Promise<{ error: Error | null }> {
  console.groupCollapsed(`%creorderGalleryPhotos: ${galleryId}`, 'color: #666; font-weight: bold;');
  debug.flow('GalleryService.reorderGalleryPhotos', 'Reordering gallery photos', { galleryId, photoCount: photoIds.length })
  debug.perf.start('galleryService.reorderGalleryPhotos')

  if (USE_FAKE_DATA) {
    await simulateDelay()
    debug.perf.end('galleryService.reorderGalleryPhotos')
    debug.flow('GalleryService.reorderGalleryPhotos', 'Photos reordered (fake)', { galleryId })
    console.groupEnd()
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
      .upsert(updates as any, { onConflict: 'id' })

    if (error) throw error
    return { error: null }
  } catch (err) {
    console.error('[galleryService] Error reordering photos:', err)
    return { error: err as Error }
  }
}
