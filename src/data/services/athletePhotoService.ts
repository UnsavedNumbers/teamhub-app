/**
 * Athlete Photo Service
 *
 * Provides functions for uploading, deleting, and accessing athlete profile photos
 * stored in Supabase Storage. Uses private bucket with signed URLs for access.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import { supabase } from '../../lib/supabase'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Type-safe photo path. Paths must follow pattern: athlete/{athlete_id}/profile.{ext}
 */
export type PhotoPath = string & { __brand: 'PhotoPath' }

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
 * Validate photo path format
 * Path must match: athlete/{uuid}/profile.{jpg|jpeg|png|webp}
 */
export function isValidAthletePhotoPath(path: string): boolean {
    if (!path || typeof path !== 'string') return false
    
    const pathRegex = /^athlete\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/profile\.(jpg|jpeg|png|webp)$/i
    return pathRegex.test(path)
}

/**
 * Build a valid photo path from athlete ID and file extension
 * Never use user input directly - always construct paths server-side
 */
export function buildPhotoPath(athleteId: string, ext: string): PhotoPath | null {
    // Validate athlete ID is a valid UUID
    if (!isValidUUID(athleteId)) {
        console.error('[athletePhotoService] Invalid athlete ID format:', athleteId)
        return null
    }

    // Normalize extension (remove leading dot, lowercase)
    const normalizedExt = ext.replace(/^\./, '').toLowerCase()
    
    // Validate extension
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
    if (!allowedExts.includes(normalizedExt)) {
        console.error('[athletePhotoService] Invalid file extension:', ext)
        return null
    }

    const path = `athlete/${athleteId}/profile.${normalizedExt}` as PhotoPath
    
    // Double-check with validation function
    if (!isValidAthletePhotoPath(path)) {
        console.error('[athletePhotoService] Generated invalid path:', path)
        return null
    }

    return path
}

/**
 * Extract athlete ID from photo path
 */
export function extractAthleteIdFromPath(path: string): string | null {
    if (!isValidAthletePhotoPath(path)) return null
    
    const parts = path.split('/')
    if (parts.length >= 2 && isValidUUID(parts[1])) {
        return parts[1]
    }
    
    return null
}

// ============================================================================
// Photo Upload
// ============================================================================

/**
 * Upload athlete photo to storage
 * Path: athlete/{athlete_id}/profile.{ext}
 */
export async function uploadAthletePhoto(
    _context: UserContext,
    athleteId: string,
    file: File
): Promise<{ path: PhotoPath | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            path: null,
            error: new Error('Photo upload is not available in demo mode')
        }
    }

    try {
        // Validate athlete ID
        if (!athleteId || !isValidUUID(athleteId)) {
            return { path: null, error: new Error('Invalid athlete ID') }
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            return { 
                path: null, 
                error: new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.') 
            }
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            return { 
                path: null, 
                error: new Error('File size exceeds 5MB limit. Please upload a smaller image.') 
            }
        }

        // Optional: Validate image dimensions (max 2000x2000)
        // This would require reading the image, which we'll skip for now
        // Can be added later if needed

        // Determine file extension from MIME type or filename
        let fileExt = 'jpg'
        if (file.type === 'image/png') fileExt = 'png'
        else if (file.type === 'image/webp') fileExt = 'webp'
        else if (file.name) {
            const ext = file.name.split('.').pop()?.toLowerCase()
            if (ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                fileExt = ext === 'jpeg' ? 'jpg' : ext
            }
        }

        // Build path (server-side construction, never use user input)
        const photoPath = buildPhotoPath(athleteId, fileExt)
        if (!photoPath) {
            return { path: null, error: new Error('Failed to generate valid photo path') }
        }

        // Upload to storage with upsert (idempotent, handles concurrent edits)
        const { error: uploadError } = await supabase.storage
            .from('athlete-photos')
            .upload(photoPath, file, { upsert: true })

        if (uploadError) {
            // Check for network errors
            if (uploadError.message?.includes('network') || 
                uploadError.message?.includes('fetch') || 
                uploadError.message?.includes('timeout')) {
                return { 
                    path: null, 
                    error: new Error('Network error. Please check your internet connection and try again.') 
                }
            }

            // Check for storage quota errors
            if (uploadError.message?.includes('quota') || 
                uploadError.message?.includes('storage') ||
                uploadError.message?.includes('limit')) {
                return { 
                    path: null, 
                    error: new Error('Storage quota exceeded. Please contact your administrator.') 
                }
            }

            // Check for RLS/permission errors
            if (uploadError.message?.includes('row-level security') || 
                uploadError.message?.includes('RLS') || 
                uploadError.message?.includes('permission')) {
                return { 
                    path: null, 
                    error: new Error('Permission denied. You do not have permission to upload athlete photos.') 
                }
            }

            throw uploadError
        }

        return { path: photoPath, error: null }
    } catch (err) {
        console.error('[athletePhotoService] Error uploading photo:', err)
        return { 
            path: null, 
            error: err instanceof Error ? err : new Error('Unknown error uploading photo') 
        }
    }
}

// ============================================================================
// Photo Deletion
// ============================================================================

/**
 * Delete athlete photo from storage
 */
export async function deleteAthletePhoto(
    _context: UserContext,
    athleteId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: null }
    }

    try {
        // Validate athlete ID
        if (!athleteId || !isValidUUID(athleteId)) {
            return { error: new Error('Invalid athlete ID') }
        }

        // Note: photo_url column doesn't exist yet in database
        // Return success - no photo to delete
        // TODO: Re-enable when photo_url column is added
        return { error: null }

        // Validate path format
        if (!isValidAthletePhotoPath(photoPath)) {
            console.warn('[athletePhotoService] Invalid photo path format:', photoPath)
            return { error: null } // Don't fail if path is invalid
        }

        // Delete from storage
        const { error: deleteError } = await supabase.storage
            .from('athlete-photos')
            .remove([photoPath])

        if (deleteError) {
            // Log but don't throw - cleanup failures shouldn't block operations
            console.error('[athletePhotoService] Error deleting photo from storage:', deleteError)
            // Still return success - the database record will be updated anyway
        }

        return { error: null }
    } catch (err) {
        console.error('[athletePhotoService] Error deleting photo:', err)
        return { 
            error: err instanceof Error ? err : new Error('Unknown error deleting photo') 
        }
    }
}

/**
 * Cleanup athlete photo (helper for athlete deletion)
 * This is called from deleteAthlete in familyService
 */
export async function cleanupAthletePhoto(athleteId: string): Promise<void> {
    if (USE_FAKE_DATA) {
        return
    }

    try {
        // Note: photo_url column doesn't exist yet in database
        // Return early - no photo to cleanup
        // TODO: Re-enable when photo_url column is added
        return

        const photoPath = athlete.photo_url

        // Validate and delete
        if (isValidAthletePhotoPath(photoPath)) {
            const { error: deleteError } = await supabase.storage
                .from('athlete-photos')
                .remove([photoPath])

            if (deleteError) {
                console.error('[athletePhotoService] Error cleaning up photo:', deleteError)
            }
        }
    } catch (err) {
        console.error('[athletePhotoService] Error in cleanup:', err)
        // Don't throw - cleanup failures shouldn't block athlete deletion
    }
}

// ============================================================================
// Photo URL Generation
// ============================================================================

/**
 * Get signed URL for athlete photo
 * Validates path before generating URL
 */
export async function getAthletePhotoUrl(
    photoPath: string | null
): Promise<{ url: string | null; error: Error | null }> {
    if (!photoPath) {
        return { url: null, error: null }
    }

    // Validate path format before generating signed URL
    if (!isValidAthletePhotoPath(photoPath)) {
        console.warn('[athletePhotoService] Invalid photo path format:', photoPath)
        return { url: null, error: new Error('Invalid photo path format') }
    }

    try {
        // Generate signed URL with 60 second expiry
        const { data, error } = await supabase.storage
            .from('athlete-photos')
            .createSignedUrl(photoPath, 60)

        if (error) {
            console.error('[athletePhotoService] Error generating signed URL:', error)
            return { url: null, error: error instanceof Error ? error : new Error('Failed to generate signed URL') }
        }

        return { url: data?.signedUrl || null, error: null }
    } catch (err) {
        console.error('[athletePhotoService] Error in getAthletePhotoUrl:', err)
        return { 
            url: null, 
            error: err instanceof Error ? err : new Error('Unknown error generating signed URL') 
        }
    }
}
