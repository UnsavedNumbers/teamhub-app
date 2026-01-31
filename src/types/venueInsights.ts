/**
 * Venue Insights Types
 * 
 * TypeScript types and type guards for venue insights data.
 * Extends database types with domain-specific models and validation.
 */

// Base type from database (fallback if table doesn't exist in generated types yet)
export type VenueInsightsRow = {
  id: string
  place_id: string
  place_details_json: unknown
  photos_json: unknown
  ai_summary: string | null
  ai_what_to_expect: string | null
  ai_generated_at: string | null
  ai_validation_status: string | null
  place_details_fetched_at: string | null
  last_place_details_call_at: string | null
  last_gemini_call_at: string | null
  fetch_in_progress: boolean | null
  place_id_valid: boolean | null
  created_at: string
  updated_at: string
}

// Photo reference structure (stored in photos_json)
export interface PhotoReference {
  reference: string
  width: number
  height: number
  attribution: string
}

// Place Details API response structure (stored in place_details_json)
// This matches the transformed format from Google Places API v1
export interface PlaceDetailsResponse {
  place_id: string
  name?: string
  formatted_address?: string
  photos?: Array<{
    photo_reference: string
    width: number
    height: number
    html_attributions?: string[]
  }>
  rating?: number
  user_ratings_total?: number
  types?: string[]
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
  website?: string
  international_phone_number?: string
  editorial_summary?: {
    overview?: string
  }
  area_summary?: {
    content_blocks: Array<{
      topic: string
      content: string
    }>
  }
  price_level?: number
  geometry?: {
    location?: {
      lat?: number
      lng?: number
    }
  }
  status?: string // API status: 'OK', 'NOT_FOUND', etc. (legacy field, not used in v1)
}

// Frontend domain model
export interface VenueInsights {
  id: string
  place_id: string
  place_details: PlaceDetailsResponse | null
  photos: PhotoReference[]
  ai_summary: string | null
  ai_what_to_expect: string | null
  ai_generated_at: string | null
  ai_validation_status: 'valid' | 'failed' | 'pending'
  place_details_fetched_at: string | null
  last_place_details_call_at: string | null
  last_gemini_call_at: string | null
  fetch_in_progress: boolean
  place_id_valid: boolean
  created_at: string
  updated_at: string
}

// Type guards
export function isPlaceDetailsResponse(data: unknown): data is PlaceDetailsResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'place_id' in data &&
    typeof (data as PlaceDetailsResponse).place_id === 'string'
  )
}

export function isPhotoReference(data: unknown): data is PhotoReference {
  return (
    typeof data === 'object' &&
    data !== null &&
    'reference' in data &&
    typeof (data as PhotoReference).reference === 'string' &&
    'width' in data &&
    typeof (data as PhotoReference).width === 'number' &&
    'height' in data &&
    typeof (data as PhotoReference).height === 'number'
  )
}

export function isPhotoReferenceArray(data: unknown): data is PhotoReference[] {
  return Array.isArray(data) && data.every(isPhotoReference)
}

// Mapper function to convert database row to domain model
export function mapVenueInsightsRow(row: VenueInsightsRow): VenueInsights {
  // Parse place_details_json
  let placeDetails: PlaceDetailsResponse | null = null
  if (row.place_details_json) {
    try {
      const parsed = typeof row.place_details_json === 'string'
        ? JSON.parse(row.place_details_json)
        : row.place_details_json
      if (isPlaceDetailsResponse(parsed)) {
        placeDetails = parsed
      }
    } catch {
      // Invalid JSON, leave as null
    }
  }

  // Parse photos_json
  let photos: PhotoReference[] = []
  if (row.photos_json) {
    try {
      const parsed = typeof row.photos_json === 'string'
        ? JSON.parse(row.photos_json)
        : row.photos_json
      if (isPhotoReferenceArray(parsed)) {
        photos = parsed
      } else if (Array.isArray(parsed)) {
        // Try to map if structure is slightly different
        photos = parsed
          .filter((p): p is PhotoReference => isPhotoReference(p))
          .map(p => ({
            reference: p.reference,
            width: p.width,
            height: p.height,
            attribution: p.attribution || '',
          }))
      }
    } catch {
      // Invalid JSON, leave as empty array
    }
  }

  return {
    id: row.id,
    place_id: row.place_id,
    place_details: placeDetails,
    photos,
    ai_summary: row.ai_summary,
    ai_what_to_expect: row.ai_what_to_expect,
    ai_generated_at: row.ai_generated_at,
    ai_validation_status: (row.ai_validation_status || 'pending') as 'valid' | 'failed' | 'pending',
    place_details_fetched_at: row.place_details_fetched_at,
    last_place_details_call_at: row.last_place_details_call_at,
    last_gemini_call_at: row.last_gemini_call_at,
    fetch_in_progress: row.fetch_in_progress ?? false,
    place_id_valid: row.place_id_valid ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
