/**
 * Mock Galleries Data Module
 *
 * Provides fake data for photo galleries in demo mode.
 * Galleries are linked to teams, athletes, events, seasons, and organizations.
 */

import { DEMO_ORG_A_ID, DEMO_ORG_B_ID } from '../config'
import type { Database } from '@/lib/database.types'
import type { PhotoStatus } from '@/data/services/galleryService'

type Gallery = Database['public']['Tables']['galleries']['Row']
type GalleryPhoto = Database['public']['Tables']['gallery_photos']['Row']

// ============================================================================
// Mock Photos
// ============================================================================

/**
 * Helper: Get local photo asset URL
 * All demo photos are stored in /public/demo-assets/photos/
 */
function getPhotoAssetUrl(filename: string): string {
  return `/demo-assets/photos/${filename}`
}

/**
 * Mock photos using local assets stored in /public/demo-assets/photos/
 * Replace these filenames with actual images to customize demo content.
 */
export const MOCK_GALLERY_PHOTOS: GalleryPhoto[] = [
  // Team Championship Gallery
  {
    id: 'mock-photo-1',
    gallery_id: 'mock-gallery-1',
    album_id: null,
    storage_path: getPhotoAssetUrl('team-celebration.jpg'),
    thumbnail_path: null,
    thumbnail_sm_path: null,
    thumbnail_md_path: null,
    thumbnail_lg_path: null,
    filename: 'team-celebration.jpg',
    size_bytes: 245000,
    sort_order: 1,
    status: 'approved',
    blurhash: null,
    can_download: null,
    uploaded_by_user_id: 'demo-coach',
    taken_at: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-photo-2',
    gallery_id: 'mock-gallery-1',
    album_id: null,
    storage_path: getPhotoAssetUrl('team-warmup.jpg'),
    thumbnail_path: null,
    thumbnail_sm_path: null,
    thumbnail_md_path: null,
    thumbnail_lg_path: null,
    filename: 'team-warmup.jpg',
    size_bytes: 198000,
    sort_order: 2,
    status: 'approved',
    blurhash: null,
    can_download: null,
    uploaded_by_user_id: 'demo-coach',
    taken_at: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-photo-3',
    gallery_id: 'mock-gallery-1',
    album_id: null,
    storage_path: getPhotoAssetUrl('players-action.jpg'),
    thumbnail_path: null,
    thumbnail_sm_path: null,
    thumbnail_md_path: null,
    thumbnail_lg_path: null,
    filename: 'players-action.jpg',
    size_bytes: 312000,
    sort_order: 3,
    status: 'pending',
    blurhash: null,
    can_download: null,
    uploaded_by_user_id: 'demo-parent',
    taken_at: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Season Highlights Gallery
  {
    id: 'mock-photo-4',
    gallery_id: 'mock-gallery-2',
    album_id: null,
    storage_path: getPhotoAssetUrl('soccer-action.jpg'),
    thumbnail_path: null,
    thumbnail_sm_path: null,
    thumbnail_md_path: null,
    thumbnail_lg_path: null,
    filename: 'soccer-action.jpg',
    size_bytes: 289000,
    sort_order: 1,
    status: 'approved',
    blurhash: null,
    can_download: null,
    uploaded_by_user_id: 'demo-coach',
    taken_at: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-photo-5',
    gallery_id: 'mock-gallery-2',
    album_id: null,
    storage_path: getPhotoAssetUrl('team-warmup.jpg'),
    thumbnail_path: null,
    thumbnail_sm_path: null,
    thumbnail_md_path: null,
    thumbnail_lg_path: null,
    filename: 'team-warmup.jpg',
    size_bytes: 267000,
    sort_order: 2,
    status: 'approved',
    blurhash: null,
    can_download: null,
    uploaded_by_user_id: 'demo-coach',
    taken_at: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Athlete Profile Gallery
  {
    id: 'mock-photo-6',
    gallery_id: 'mock-gallery-3',
    album_id: null,
    storage_path: getPhotoAssetUrl('players-action.jpg'),
    thumbnail_path: null,
    thumbnail_sm_path: null,
    thumbnail_md_path: null,
    thumbnail_lg_path: null,
    filename: 'players-action.jpg',
    size_bytes: 201000,
    sort_order: 1,
    status: 'approved',
    blurhash: null,
    can_download: null,
    uploaded_by_user_id: 'demo-parent',
    taken_at: null,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Tournament Event Gallery
  {
    id: 'mock-photo-7',
    gallery_id: 'mock-gallery-4',
    album_id: null,
    storage_path: getPhotoAssetUrl('tournament-field.jpg'),
    thumbnail_path: null,
    thumbnail_sm_path: null,
    thumbnail_md_path: null,
    thumbnail_lg_path: null,
    filename: 'tournament-field.jpg',
    size_bytes: 334000,
    sort_order: 1,
    status: 'approved',
    blurhash: null,
    can_download: null,
    uploaded_by_user_id: 'demo-coach',
    taken_at: null,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-photo-8',
    gallery_id: 'mock-gallery-4',
    album_id: null,
    storage_path: getPhotoAssetUrl('tournament-trophy.jpg'),
    thumbnail_path: null,
    thumbnail_sm_path: null,
    thumbnail_md_path: null,
    thumbnail_lg_path: null,
    filename: 'tournament-trophy.jpg',
    size_bytes: 278000,
    sort_order: 2,
    status: 'approved',
    blurhash: null,
    can_download: null,
    uploaded_by_user_id: 'demo-parent',
    taken_at: null,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Organization General Gallery
  {
    id: 'mock-photo-9',
    gallery_id: 'mock-gallery-5',
    album_id: null,
    storage_path: getPhotoAssetUrl('facility-exterior.jpg'),
    thumbnail_path: null,
    thumbnail_sm_path: null,
    thumbnail_md_path: null,
    thumbnail_lg_path: null,
    filename: 'facility-exterior.jpg',
    size_bytes: 412000,
    sort_order: 1,
    status: 'approved',
    blurhash: null,
    can_download: null,
    uploaded_by_user_id: 'demo-org-admin',
    taken_at: null,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-photo-10',
    gallery_id: 'mock-gallery-5',
    album_id: null,
    storage_path: getPhotoAssetUrl('equipment-room.jpg'),
    thumbnail_path: null,
    thumbnail_sm_path: null,
    thumbnail_md_path: null,
    thumbnail_lg_path: null,
    filename: 'equipment-room.jpg',
    size_bytes: 356000,
    sort_order: 2,
    status: 'approved',
    blurhash: null,
    can_download: null,
    uploaded_by_user_id: 'demo-org-admin',
    taken_at: null,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ============================================================================
// Mock Galleries
// ============================================================================

/**
 * Mock galleries covering different entity types
 */
export const MOCK_GALLERIES: Gallery[] = [
  // Team Gallery
  {
    id: 'mock-gallery-1',
    org_id: DEMO_ORG_A_ID,
    name: 'U14 Boys Championship Run',
    description: 'Photos from our amazing championship season',
    gallery_type: 'team',
    entity_id: 'team-1',
    cover_photo_id: 'mock-photo-1',
    allow_contributions: true,
    can_download: null,
    require_approval: true,
    created_by_user_id: 'demo-coach',
    is_system_generated: false,
    visibility: 'team',
    fans_can_see: true,
    cover_generated_at: null,
    cover_generation_status: null,
    cover_thumbnails: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Season Gallery
  {
    id: 'mock-gallery-2',
    org_id: DEMO_ORG_A_ID,
    name: 'Spring 2024 Season Highlights',
    description: 'Best moments from the spring season',
    gallery_type: 'season',
    entity_id: 'season-spring-2024',
    cover_photo_id: 'mock-photo-4',
    allow_contributions: true,
    can_download: null,
    require_approval: false,
    created_by_user_id: 'demo-coach',
    is_system_generated: false,
    visibility: 'team',
    fans_can_see: true,
    cover_generated_at: null,
    cover_generation_status: null,
    cover_thumbnails: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Athlete Gallery
  {
    id: 'mock-gallery-3',
    org_id: DEMO_ORG_A_ID,
    name: 'Emma Johnson - Season Photos',
    description: null,
    gallery_type: 'athlete',
    entity_id: 'athlete-emma',
    cover_photo_id: 'mock-photo-6',
    allow_contributions: true,
    can_download: null,
    require_approval: true,
    created_by_user_id: 'demo-parent',
    is_system_generated: false,
    visibility: 'team',
    fans_can_see: false,
    cover_generated_at: null,
    cover_generation_status: null,
    cover_thumbnails: null,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Event Gallery
  {
    id: 'mock-gallery-4',
    org_id: DEMO_ORG_A_ID,
    name: 'State Tournament 2024',
    description: 'State championship tournament photos',
    gallery_type: 'event',
    entity_id: 'event-tournament-1',
    cover_photo_id: 'mock-photo-7',
    allow_contributions: true,
    can_download: null,
    require_approval: false,
    created_by_user_id: 'demo-coach',
    is_system_generated: false,
    visibility: 'team',
    fans_can_see: true,
    cover_generated_at: null,
    cover_generation_status: null,
    cover_thumbnails: null,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Organization Gallery
  {
    id: 'mock-gallery-5',
    org_id: DEMO_ORG_A_ID,
    name: 'Facility Photos',
    description: 'Our fields, equipment, and facilities',
    gallery_type: 'org',
    entity_id: DEMO_ORG_A_ID,
    cover_photo_id: 'mock-photo-9',
    allow_contributions: true,
    can_download: null,
    require_approval: false,
    created_by_user_id: 'demo-org-admin',
    is_system_generated: false,
    visibility: 'public',
    fans_can_see: true,
    cover_generated_at: null,
    cover_generation_status: null,
    cover_thumbnails: null,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Empty gallery
  {
    id: 'mock-gallery-6',
    org_id: DEMO_ORG_A_ID,
    name: 'End of Season Banquet',
    description: 'Photos from the awards banquet',
    gallery_type: 'org',
    entity_id: DEMO_ORG_A_ID,
    cover_photo_id: null,
    allow_contributions: true,
    can_download: null,
    require_approval: true,
    created_by_user_id: 'demo-org-admin',
    is_system_generated: false,
    visibility: 'team',
    fans_can_see: false,
    cover_generated_at: null,
    cover_generation_status: null,
    cover_thumbnails: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

/**
 * Curated fake galleries used across portal/admin pages.
 * Keep this list at exactly 3 entries for deterministic demo behavior.
 */
export const DEMO_GALLERY_IDS = ['mock-gallery-1', 'mock-gallery-3', 'mock-gallery-5'] as const
const DEMO_GALLERY_ID_SET = new Set<string>(DEMO_GALLERY_IDS)
const ORG_B_GALLERY_PREFIX = 'orgb-gallery-'
const ORG_B_PHOTO_PREFIX = 'orgb-photo-'

export type MockGalleryWithComputed = Gallery & {
  photo_count: number
  pending_count: number
  cover_url: string | null
}

function toOrgBGalleryId(baseGalleryId: string): string {
  return `${ORG_B_GALLERY_PREFIX}${baseGalleryId}`
}

function toOrgBPhotoId(basePhotoId: string): string {
  return `${ORG_B_PHOTO_PREFIX}${basePhotoId}`
}

function toOrgBEntityId(entityId: string | null, galleryType: Gallery['gallery_type']): string | null {
  if (!entityId) return entityId
  if (galleryType === 'org') return DEMO_ORG_B_ID
  return `orgb-${entityId}`
}

const ORG_B_MOCK_GALLERIES: Gallery[] = MOCK_GALLERIES.map((gallery) => ({
  ...gallery,
  id: toOrgBGalleryId(gallery.id),
  org_id: DEMO_ORG_B_ID,
  entity_id: toOrgBEntityId(gallery.entity_id, gallery.gallery_type),
  cover_photo_id: gallery.cover_photo_id ? toOrgBPhotoId(gallery.cover_photo_id) : null,
  name: `Lincoln HS - ${gallery.name}`,
}))

const ORG_B_MOCK_GALLERY_PHOTOS: GalleryPhoto[] = MOCK_GALLERY_PHOTOS.map((photo) => ({
  ...photo,
  id: toOrgBPhotoId(photo.id),
  gallery_id: toOrgBGalleryId(photo.gallery_id),
}))

const ORG_B_DEMO_GALLERY_ID_SET = new Set<string>(DEMO_GALLERY_IDS.map((id) => toOrgBGalleryId(id)))

function getAllMockGalleriesInternal(): Gallery[] {
  return [...MOCK_GALLERIES, ...ORG_B_MOCK_GALLERIES]
}

function getAllMockPhotosInternal(): GalleryPhoto[] {
  return [...MOCK_GALLERY_PHOTOS, ...ORG_B_MOCK_GALLERY_PHOTOS]
}

/**
 * Get mock galleries for a specific organization
 * Supports curated gallery sets for both primary demo organizations.
 */
export function getMockGalleriesForOrg(orgId?: string | null): MockGalleryWithComputed[] {
  const effectiveOrgId = orgId || DEMO_ORG_A_ID
  const allowedIds = effectiveOrgId === DEMO_ORG_B_ID ? ORG_B_DEMO_GALLERY_ID_SET : DEMO_GALLERY_ID_SET

  return getAllMockGalleriesInternal()
    .filter((g) => g.org_id === effectiveOrgId && allowedIds.has(g.id))
    .map((gallery) => {
      const photos = getMockPhotosForGallery(gallery.id)
      const pendingCount = photos.filter((photo) => photo.status === 'pending').length
      const coverPhoto = photos.find((photo) => photo.id === gallery.cover_photo_id) || photos[0] || null
      return {
        ...gallery,
        photo_count: photos.length,
        pending_count: pendingCount,
        cover_url: coverPhoto?.storage_path || null,
      }
    })
}

/**
 * Get mock gallery by ID
 */
export function getMockGalleryById(galleryId: string): Gallery | undefined {
  return getAllMockGalleriesInternal().find((g) => g.id === galleryId)
}

/**
 * Get mock photos for a specific gallery
 */
export function getMockPhotosForGallery(galleryId: string): GalleryPhoto[] {
  return getAllMockPhotosInternal().filter((p) => p.gallery_id === galleryId)
}

/**
 * Get all mock galleries (for demo mode)
 */
export function getAllMockGalleries(): Gallery[] {
  return getAllMockGalleriesInternal()
}

/**
 * Get all mock photos (for demo mode)
 */
export function getAllMockPhotos(): GalleryPhoto[] {
  return getAllMockPhotosInternal()
}

/**
 * Get mock recent gallery activity for dashboard
 */
export function getMockRecentActivity(limit: number = 10): Array<{
  type: 'photo_upload' | 'gallery_created' | 'gallery_updated'
  gallery_id: string
  gallery_name: string
  gallery_cover_url: string | null
  timestamp: string
  photo_count?: number
  status?: PhotoStatus
}> {
  const activity: Array<{
    type: 'photo_upload' | 'gallery_created' | 'gallery_updated'
    gallery_id: string
    gallery_name: string
    gallery_cover_url: string | null
    timestamp: string
    photo_count?: number
    status?: PhotoStatus
  }> = []

  // Generate activity from galleries that have photos
  for (const gallery of MOCK_GALLERIES) {
    const photos = getMockPhotosForGallery(gallery.id)
    if (photos.length === 0) continue

    // Group photos by upload date (simplified - use gallery updated_at)
    const recentPhotos = photos.filter(p => {
      const photoDate = new Date(p.created_at)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return photoDate >= weekAgo
    })

    if (recentPhotos.length > 0) {
      const coverPhoto = photos.find(p => p.id === gallery.cover_photo_id) || photos[0]
      activity.push({
        type: 'photo_upload',
        gallery_id: gallery.id,
        gallery_name: gallery.name,
        gallery_cover_url: coverPhoto?.storage_path || null,
        timestamp: gallery.updated_at,
        photo_count: recentPhotos.length,
        status: recentPhotos[recentPhotos.length - 1]?.status || 'approved',
      })
    }
  }

  // Sort by timestamp descending and limit
  return activity
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

/**
 * Calculate mock storage usage from all photos
 */
export function getMockStorageUsage(): { currentUsage: number; limit: number } {
  const totalBytes = MOCK_GALLERY_PHOTOS.reduce((sum, photo) => sum + (photo.size_bytes || 0), 0)
  // 10GB limit
  const limitBytes = 10 * 1024 * 1024 * 1024
  return {
    currentUsage: totalBytes,
    limit: limitBytes,
  }
}
