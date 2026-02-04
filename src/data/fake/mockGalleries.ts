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
        uploaded_by: 'demo-coach',
        file_path: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800',
        file_name: 'team-celebration.jpg',
        file_size: 245000,
        mime_type: 'image/jpeg',
        display_order: 1,
        is_cover: true,
        caption: 'Championship celebration!',
        approval_status: 'approved',
        approved_by: 'demo-coach',
        approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'mock-photo-2',
        gallery_id: 'mock-gallery-1',
        uploaded_by: 'demo-coach',
        file_path: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800',
        file_name: 'team-huddle.jpg',
        file_size: 198000,
        mime_type: 'image/jpeg',
        display_order: 2,
        is_cover: false,
        caption: 'Pre-game huddle',
        approval_status: 'approved',
        approved_by: 'demo-coach',
        approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'mock-photo-3',
        gallery_id: 'mock-gallery-1',
        uploaded_by: 'demo-parent',
        file_path: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800',
        file_name: 'players-action.jpg',
        file_size: 312000,
        mime_type: 'image/jpeg',
        display_order: 3,
        is_cover: false,
        caption: null,
        approval_status: 'pending',
        approved_by: null,
        approved_at: null,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Season Highlights Gallery
    {
        id: 'mock-photo-4',
        gallery_id: 'mock-gallery-2',
        uploaded_by: 'demo-coach',
        file_path: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800',
        file_name: 'soccer-action.jpg',
        file_size: 289000,
        mime_type: 'image/jpeg',
        display_order: 1,
        is_cover: true,
        caption: 'Best moments of the season',
        approval_status: 'approved',
        approved_by: 'demo-coach',
        approved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'mock-photo-5',
        gallery_id: 'mock-gallery-2',
        uploaded_by: 'demo-coach',
        file_path: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
        file_name: 'team-warmup.jpg',
        file_size: 267000,
        mime_type: 'image/jpeg',
        display_order: 2,
        is_cover: false,
        caption: 'Team warm-up session',
        approval_status: 'approved',
        approved_by: 'demo-coach',
        approved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Athlete Profile Gallery
    {
        id: 'mock-photo-6',
        gallery_id: 'mock-gallery-3',
        uploaded_by: 'demo-parent',
        file_path: 'https://images.unsplash.com/photo-1628779238951-be2c9f2a59f4?w=800',
        file_name: 'player-portrait.jpg',
        file_size: 201000,
        mime_type: 'image/jpeg',
        display_order: 1,
        is_cover: true,
        caption: 'Season portrait',
        approval_status: 'approved',
        approved_by: 'demo-coach',
        approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Tournament Event Gallery
    {
        id: 'mock-photo-7',
        gallery_id: 'mock-gallery-4',
        uploaded_by: 'demo-coach',
        file_path: 'https://images.unsplash.com/photo-1589487391730-58f20eb2c308?w=800',
        file_name: 'tournament-field.jpg',
        file_size: 334000,
        mime_type: 'image/jpeg',
        display_order: 1,
        is_cover: true,
        caption: 'State Tournament Day 1',
        approval_status: 'approved',
        approved_by: 'demo-coach',
        approved_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'mock-photo-8',
        gallery_id: 'mock-gallery-4',
        uploaded_by: 'demo-parent',
        file_path: 'https://images.unsplash.com/photo-1577223625816-7546f36abbc4?w=800',
        file_name: 'tournament-trophy.jpg',
        file_size: 278000,
        mime_type: 'image/jpeg',
        display_order: 2,
        is_cover: false,
        caption: 'Champions!',
        approval_status: 'approved',
        approved_by: 'demo-coach',
        approved_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Organization General Gallery
    {
        id: 'mock-photo-9',
        gallery_id: 'mock-gallery-5',
        uploaded_by: 'demo-org-admin',
        file_path: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800',
        file_name: 'facility-exterior.jpg',
        file_size: 412000,
        mime_type: 'image/jpeg',
        display_order: 1,
        is_cover: true,
        caption: 'Our home field',
        approval_status: 'approved',
        approved_by: 'demo-org-admin',
        approved_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'mock-photo-10',
        gallery_id: 'mock-gallery-5',
        uploaded_by: 'demo-org-admin',
        file_path: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
        file_name: 'equipment-room.jpg',
        file_size: 356000,
        mime_type: 'image/jpeg',
        display_order: 2,
        is_cover: false,
        caption: 'Equipment room',
        approval_status: 'approved',
        approved_by: 'demo-org-admin',
        approved_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
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
        title: 'U14 Boys Championship Run',
        description: 'Photos from our amazing championship season',
        entity_type: 'team',
        entity_id: 'team-1', // Reference to fake teams
        cover_photo_id: 'mock-photo-1',
        photo_count: 3,
        require_approval: true,
        created_by: 'demo-coach',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Season Gallery
    {
        id: 'mock-gallery-2',
        org_id: DEMO_ORG_A_ID,
        title: 'Spring 2024 Season Highlights',
        description: 'Best moments from the spring season',
        entity_type: 'season',
        entity_id: 'season-spring-2024',
        cover_photo_id: 'mock-photo-4',
        photo_count: 2,
        require_approval: false,
        created_by: 'demo-coach',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Athlete Gallery
    {
        id: 'mock-gallery-3',
        org_id: DEMO_ORG_A_ID,
        title: 'Emma Johnson - Season Photos',
        description: null,
        entity_type: 'athlete',
        entity_id: 'athlete-emma',
        cover_photo_id: 'mock-photo-6',
        photo_count: 1,
        require_approval: true,
        created_by: 'demo-parent',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Event Gallery
    {
        id: 'mock-gallery-4',
        org_id: DEMO_ORG_A_ID,
        title: 'State Tournament 2024',
        description: 'State championship tournament photos',
        entity_type: 'event',
        entity_id: 'event-tournament-1',
        cover_photo_id: 'mock-photo-7',
        photo_count: 2,
        require_approval: false,
        created_by: 'demo-coach',
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Organization Gallery
    {
        id: 'mock-gallery-5',
        org_id: DEMO_ORG_A_ID,
        title: 'Facility Photos',
        description: 'Our fields, equipment, and facilities',
        entity_type: 'organization',
        entity_id: DEMO_ORG_A_ID,
        cover_photo_id: 'mock-photo-9',
        photo_count: 2,
        require_approval: false,
        created_by: 'demo-org-admin',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    // Empty gallery
    {
        id: 'mock-gallery-6',
        org_id: DEMO_ORG_A_ID,
        title: 'End of Season Banquet',
        description: 'Photos from the awards banquet',
        entity_type: 'organization',
        entity_id: DEMO_ORG_A_ID,
        cover_photo_id: null,
        photo_count: 0,
        require_approval: true,
        created_by: 'demo-org-admin',
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
