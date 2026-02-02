/**
 * File types, sizes, dimensions, and storage paths
 */

// Accepted image types
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/gif',
] as const

// Accepted image extensions
export const ACCEPTED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.gif',
] as const

// Accepted document types
export const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
] as const

// Accepted document extensions
export const ACCEPTED_DOCUMENT_EXTENSIONS = [
  '.pdf',
] as const

// Image dimensions
export const IMAGE_DIMENSIONS = {
  AVATAR: { width: 200, height: 200 },
  THUMBNAIL: { width: 300, height: 300 },
  GALLERY_PREVIEW: { width: 600, height: 400 },
  GALLERY_FULL_MAX: { width: 2000, height: 2000 },
  SPORT_CARD: { width: 400, height: 300 },
  SPORT_HERO: { width: 1200, height: 600 },
} as const

// Storage buckets
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  GALLERY_PHOTOS: 'gallery-photos',
  GALLERY_THUMBNAILS: 'gallery-thumbnails',
  DOCUMENTS: 'documents',
  LOGOS: 'logos',
  UNIFORMS: 'uniforms',
  TRAVEL_DOCUMENTS: 'travel-documents',
  ATHLETE_ATTACHMENTS: 'athlete-attachments',
} as const

// Storage path templates
export const STORAGE_PATHS = {
  AVATAR: (orgId: string, userId: string) => `${orgId}/${userId}/avatar`,
  GALLERY_PHOTO: (orgId: string, galleryId: string, photoId: string) => 
    `${orgId}/galleries/${galleryId}/photos/${photoId}`,
  GALLERY_THUMBNAIL: (orgId: string, galleryId: string, photoId: string) =>
    `${orgId}/galleries/${galleryId}/thumbnails/${photoId}`,
  ORGANIZATION_LOGO: (orgId: string) => `${orgId}/logo`,
  TEAM_LOGO: (orgId: string, teamId: string) => `${orgId}/teams/${teamId}/logo`,
  UNIFORM_IMAGE: (orgId: string, uniformId: string) => `${orgId}/uniforms/${uniformId}`,
  TRAVEL_DOCUMENT: (orgId: string, planId: string) => `${orgId}/travel/${planId}`,
  ATHLETE_ATTACHMENT: (orgId: string, athleteId: string) => `${orgId}/athletes/${athleteId}/attachments`,
} as const

// File size limits (in bytes) - consolidated from various services
export const FILE_SIZE_LIMITS = {
  AVATAR_MAX: 5 * 1024 * 1024, // 5MB
  PHOTO_MAX: 5 * 1024 * 1024, // 5MB
  GALLERY_PHOTO_MAX: 10 * 1024 * 1024, // 10MB
  DOCUMENT_MAX: 10 * 1024 * 1024, // 10MB
  TRAVEL_DOCUMENT_MAX: 10 * 1024 * 1024, // 10MB
  UNIFORM_IMAGE_MAX: 5 * 1024 * 1024, // 5MB
  SPORT_FIELD_IMAGE_MAX: 5 * 1024 * 1024, // 5MB
  ATHLETE_ATTACHMENT_MAX: 5 * 1024 * 1024, // 5MB
} as const

// Photo normalization settings
export const PHOTO_NORMALIZATION = {
  MAX_QUALITY: 0.92,
  MAX_WIDTH: 1920,
  MAX_HEIGHT: 1080,
  THRESHOLD_BYTES: 2 * 1024 * 1024, // 2MB
} as const

// Video settings
export const VIDEO_SETTINGS = {
  MAX_DURATION_SECONDS: 300, // 5 minutes
  MAX_SIZE_BYTES: 500 * 1024 * 1024, // 500MB
  ACCEPTED_FORMATS: ['video/mp4', 'video/webm', 'video/quicktime'],
} as const
