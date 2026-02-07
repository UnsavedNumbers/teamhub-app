/**
 * Mock Galleries Data Module
 *
 * Provides fake data for photo galleries in demo mode.
 * Galleries are linked to teams, athletes, events, seasons, and organizations.
 */

import { DEMO_ORG_A_ID } from '../config'
import type { Database } from '@/lib/database.types'

type Gallery = Database['public']['Tables']['galleries']['Row']
type GalleryPhoto = Database['public']['Tables']['gallery_photos']['Row']

// ============================================================================
// Mock Photos
// ============================================================================

/**
 * Mock photos using placeholder images
 */
export const MOCK_GALLERY_PHOTOS: GalleryPhoto[] = [
  // Team Championship Gallery
  {
    id: 'mock-photo-1',
    gallery_id: 'mock-gallery-1',
    album_id: null,
    storage_path: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800',
    thumbnail_path: null,
    filename: 'team-celebration.jpg',
    size_bytes: 245000,
    sort_order: 1,
    status: 'approved',
    uploaded_by_user_id: 'demo-coach',
    taken_at: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-photo-2',
    gallery_id: 'mock-gallery-1',
    album_id: null,
    storage_path: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800',
    thumbnail_path: null,
    filename: 'team-huddle.jpg',
    size_bytes: 198000,
    sort_order: 2,
    status: 'approved',
    uploaded_by_user_id: 'demo-coach',
    taken_at: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-photo-3',
    gallery_id: 'mock-gallery-1',
    album_id: null,
    storage_path: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800',
    thumbnail_path: null,
    filename: 'players-action.jpg',
    size_bytes: 312000,
    sort_order: 3,
    status: 'pending',
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
    storage_path: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800',
    thumbnail_path: null,
    filename: 'soccer-action.jpg',
    size_bytes: 289000,
    sort_order: 1,
    status: 'approved',
    uploaded_by_user_id: 'demo-coach',
    taken_at: null,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-photo-5',
    gallery_id: 'mock-gallery-2',
    album_id: null,
    storage_path: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    thumbnail_path: null,
    filename: 'team-warmup.jpg',
    size_bytes: 267000,
    sort_order: 2,
    status: 'approved',
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
    storage_path: 'https://images.unsplash.com/photo-1628779238951-be2c9f2a59f4?w=800',
    thumbnail_path: null,
    filename: 'player-portrait.jpg',
    size_bytes: 201000,
    sort_order: 1,
    status: 'approved',
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
    storage_path: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800',
    thumbnail_path: null,
    filename: 'tournament-field.jpg',
    size_bytes: 334000,
    sort_order: 1,
    status: 'approved',
    uploaded_by_user_id: 'demo-coach',
    taken_at: null,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-photo-8',
    gallery_id: 'mock-gallery-4',
    album_id: null,
    storage_path: 'https://images.unsplash.com/photo-1577223625816-7546f36abbc4?w=800',
    thumbnail_path: null,
    filename: 'tournament-trophy.jpg',
    size_bytes: 278000,
    sort_order: 2,
    status: 'approved',
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
    storage_path: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800',
    thumbnail_path: null,
    filename: 'facility-exterior.jpg',
    size_bytes: 412000,
    sort_order: 1,
    status: 'approved',
    uploaded_by_user_id: 'demo-org-admin',
    taken_at: null,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-photo-10',
    gallery_id: 'mock-gallery-5',
    album_id: null,
    storage_path: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
    thumbnail_path: null,
    filename: 'equipment-room.jpg',
    size_bytes: 356000,
    sort_order: 2,
    status: 'approved',
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
 * Get mock galleries for a specific organization
 */
export function getMockGalleriesForOrg(orgId: string): Gallery[] {
  return MOCK_GALLERIES.filter((g) => g.org_id === orgId)
}

/**
 * Get mock gallery by ID
 */
export function getMockGalleryById(galleryId: string): Gallery | undefined {
  return MOCK_GALLERIES.find((g) => g.id === galleryId)
}

/**
 * Get mock photos for a specific gallery
 */
export function getMockPhotosForGallery(galleryId: string): GalleryPhoto[] {
  return MOCK_GALLERY_PHOTOS.filter((p) => p.gallery_id === galleryId)
}

/**
 * Get all mock galleries (for demo mode)
 */
export function getAllMockGalleries(): Gallery[] {
  return MOCK_GALLERIES
}

/**
 * Get all mock photos (for demo mode)
 */
export function getAllMockPhotos(): GalleryPhoto[] {
  return MOCK_GALLERY_PHOTOS
}

