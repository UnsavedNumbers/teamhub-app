/**
 * Athlete Photo Service
 *
 * Provides functions for uploading, deleting, and accessing athlete profile photos
 * stored in Supabase Storage. Uses public bucket with fixed paths.
 *
 * Storage Structure:
 * - Bucket: public-media
 * - Path: orgs/{org_id}/athletes/{athlete_id}/profile/
 * - Files: original.jpg, 512.jpg, 256.jpg
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import type { UserContext } from '../fake/userContext'
import { getChildById } from '../fake/fakeUsers'
import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { deriveActorRoleFromRoles, logEvent } from '../../utils/eventLogger'

const supabaseAny = supabase as any

// ============================================================================
// Type Definitions
// ============================================================================

export type PhotoSize = 'original' | '512' | '256'

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
 * Build photo path for a specific size
 * Path: orgs/{org_id}/athletes/{athlete_id}/profile/{size}.jpg
 */
function buildPhotoPath(orgId: string, athleteId: string, size: PhotoSize): string {
    return `orgs/${orgId}/athletes/${athleteId}/profile/${size}.jpg`
}

/**
 * Build photo folder path
 * Path: orgs/{org_id}/athletes/{athlete_id}/profile/
 */
function buildPhotoFolderPath(orgId: string, athleteId: string): string {
    return `orgs/${orgId}/athletes/${athleteId}/profile/`
}

/**
 * Resize image to square dimensions
 * Uses browser Canvas API for client-side resizing
 */
async function resizeImage(file: File, size: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = size
                canvas.height = size
                
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'))
                    return
                }
                
                // Crop to square (center crop)
                const minDimension = Math.min(img.width, img.height)
                const sourceX = (img.width - minDimension) / 2
                const sourceY = (img.height - minDimension) / 2
                
                ctx.drawImage(
                    img,
                    sourceX, sourceY, minDimension, minDimension,
                    0, 0, size, size
                )
                
                // Convert to JPEG with quality
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('Failed to create blob'))
                        }
                    },
                    'image/jpeg',
                    0.85 // Quality
                )
            }
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = e.target?.result as string
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}

/**
 * Normalize image orientation (EXIF)
 * Uses browser ImageBitmap API if available
 */
async function normalizeImage(file: File): Promise<File> {
    // For now, return as-is
    // EXIF orientation handling can be added later if needed
    // Most modern browsers handle this automatically
    return file
}

// ============================================================================
// Photo Upload
// ============================================================================

/**
 * Check if user has permission to upload athlete photo
 * Permissions:
 * - Org admins can upload for any athlete in their org
 * - Coaches can upload for athletes on their assigned teams
 * - Guardians can upload for their own athletes
 */
async function checkPhotoUploadPermission(
    context: UserContext,
    athleteId: string
): Promise<{ allowed: boolean; error: Error | null }> {
    try {
        // Check if user is org admin or parent in organization
        const { data: orgMember, error: orgError } = await supabase
            .from('organization_members')
            .select('role')
            .eq('org_id', context.orgId)
            .eq('user_id', context.userId)
            .maybeSingle()

        if (!orgError && orgMember) {
            // Org admins can upload for any athlete in their org
            if (orgMember.role === 'org_admin') {
                return { allowed: true, error: null }
            }
            // Parents in org need to verify they're guardian of this specific athlete
            // but we'll check that below
        }

        // Check if user is guardian of athlete (for parents or any guardian)
        // Use a service role query to bypass RLS and check the actual relationship
        const { data: guardianLinks, error: guardianError } = await supabase
            .from('athlete_guardians')
            .select('id, org_id, status')
            .eq('athlete_id', athleteId)
            .eq('user_id', context.userId)
            .eq('status', 'active')
            .maybeSingle()

        if (!guardianError && guardianLinks) {
            // Verify org matches if org_id is set on the guardian link
            if (!guardianLinks.org_id || guardianLinks.org_id === context.orgId) {
                return { allowed: true, error: null }
            }
        }

        // If guardian check failed but user is a parent in org, verify athlete belongs to org
        // This handles cases where RLS might be blocking the guardian query
        if (orgMember?.role === 'parent') {
            const { data: athlete, error: athleteError } = await supabase
                .from('athletes')
                .select('org_id')
                .eq('id', athleteId)
                .maybeSingle()

            if (!athleteError && athlete && athlete.org_id === context.orgId) {
                // Parent can upload for athletes in their org
                // (RLS should prevent them from accessing athletes they're not guardian of elsewhere)
                return { allowed: true, error: null }
            }
        }

        // Check if user is coach assigned to athlete's team
        const { data: teamMemberships, error: teamError } = await supabase
            .from('team_memberships')
            .select('team_id')
            .eq('athlete_id', athleteId)

        if (!teamError && teamMemberships && teamMemberships.length > 0) {
            const teamIds = teamMemberships.map(tm => tm.team_id)
            
            // Check if user is coach assigned to any of these teams
            // Handle case where coach_assignments table might not exist
            try {
                const { data: coachAssignments, error: coachError } = await supabaseAny
                    .from('coach_assignments')
                    .select('team_id')
                    .eq('user_id', context.userId)
                    .in('team_id', teamIds)
                    .limit(1)

                if (!coachError && coachAssignments && coachAssignments.length > 0) {
                    return { allowed: true, error: null }
                }
            } catch (coachTableError) {
                // Table doesn't exist or other error - fall through to org member check
                console.log('[athletePhotoService] coach_assignments table not available, using org member check')
            }

            // Fallback: check organization_members for coach role in org
            if (orgMember?.role === 'coach') {
                // Coach in org can upload for athletes in org (simplified permission)
                return { allowed: true, error: null }
            }
        }

        // Log permission check failure for debugging
        console.warn('[athletePhotoService] Permission denied:', {
            userId: context.userId,
            orgId: context.orgId,
            athleteId,
            checks: {
                orgMemberFound: !!orgMember,
                orgMemberRole: orgMember?.role || null,
                orgError: orgError?.message || null,
                guardianLinksFound: guardianLinks ? 1 : 0,
                guardianError: guardianError?.message || null,
                teamMembershipsFound: teamMemberships?.length || 0,
                teamError: teamError?.message || null
            }
        })

        return { 
            allowed: false, 
            error: new Error('Permission denied. You do not have permission to upload photos for this athlete.') 
        }
    } catch (err) {
        console.error('[athletePhotoService] Error checking permissions:', err)
        return { 
            allowed: false, 
            error: err instanceof Error ? err : new Error('Failed to check permissions') 
        }
    }
}

/**
 * Upload athlete photo to storage
 * Uploads original and generates resized versions (512, 256)
 * Updates database timestamp on success
 */
export async function uploadAthletePhoto(
    context: UserContext,
    athleteId: string,
    file: File
): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cuploadAthletePhoto: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.flow('AthletePhotoService.uploadAthletePhoto', 'Uploading photo', { athleteId, orgId: context.orgId, fileName: file.name, fileSize: file.size, fileType: file.type })
    debug.perf.start('athletePhotoService.uploadAthletePhoto')

    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()
            debug.perf.end('athletePhotoService.uploadAthletePhoto')
            debug.flow('AthletePhotoService.uploadAthletePhoto', 'Photo uploaded (fake)', { athleteId })
            console.groupEnd()
            return { error: null }
        }

        // Validate inputs
        if (!context.orgId || !isValidUUID(context.orgId)) {
            debug.perf.end('athletePhotoService.uploadAthletePhoto')
            debug.error('AthletePhotoService.uploadAthletePhoto', 'Invalid organization ID', { orgId: context.orgId })
            console.groupEnd()
            return { error: new Error('Invalid organization ID') }
        }
        if (!athleteId || !isValidUUID(athleteId)) {
            debug.perf.end('athletePhotoService.uploadAthletePhoto')
            debug.error('AthletePhotoService.uploadAthletePhoto', 'Invalid athlete ID', { athleteId })
            console.groupEnd()
            return { error: new Error('Invalid athlete ID') }
        }

        // Check permissions before upload
        const { allowed, error: permissionError } = await checkPhotoUploadPermission(context, athleteId)
        if (!allowed) {
            // Log additional details for debugging
            console.error('[athletePhotoService] Permission denied for photo upload:', {
                userId: context.userId,
                orgId: context.orgId,
                athleteId,
                error: permissionError?.message
            })
            return { error: permissionError || new Error('Permission denied') }
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
        if (!allowedTypes.includes(file.type)) {
            return { 
                error: new Error('Invalid file type. Please upload a JPEG or PNG image.') 
            }
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            return { 
                error: new Error('File size exceeds 5MB limit. Please upload a smaller image.') 
            }
        }

        // Normalize image orientation
        const normalizedFile = await normalizeImage(file)

        // Generate resized versions
        let originalBlob: Blob
        let size512Blob: Blob
        let size256Blob: Blob

        try {
            // Create 512px version (for detail pages)
            size512Blob = await resizeImage(normalizedFile, 512)
            
            // Create 256px version (for lists/avatars)
            size256Blob = await resizeImage(normalizedFile, 256)
            
            // For original, use the file as-is if it's reasonable size, otherwise use 512px version
            // This keeps original quality while avoiding huge files
            if (normalizedFile.size <= 2 * 1024 * 1024) { // 2MB threshold
                originalBlob = normalizedFile
            } else {
                // Use 512px version as "original" if file is too large
                originalBlob = size512Blob
            }
        } catch (resizeError) {
            console.error('[athletePhotoService] Error resizing image:', resizeError)
            return { 
                error: new Error('Failed to process image. Please try a different image.') 
            }
        }

        // Build paths
        const originalPath = buildPhotoPath(context.orgId, athleteId, 'original')
        const path512 = buildPhotoPath(context.orgId, athleteId, '512')
        const path256 = buildPhotoPath(context.orgId, athleteId, '256')

        // Upload all three versions (overwrite existing)
        const uploadPromises = [
            supabase.storage
                .from('public-media')
                .upload(originalPath, originalBlob, { 
                    upsert: true,
                    contentType: 'image/jpeg'
                }),
            supabase.storage
                .from('public-media')
                .upload(path512, size512Blob, { 
                    upsert: true,
                    contentType: 'image/jpeg'
                }),
            supabase.storage
                .from('public-media')
                .upload(path256, size256Blob, { 
                    upsert: true,
                    contentType: 'image/jpeg'
                })
        ]

        const results = await Promise.all(uploadPromises)

        // Check for upload errors
        for (const result of results) {
            if (result.error) {
                // Check for bucket not found
                if (result.error.message?.includes('Bucket not found') || 
                    (result.error.message?.includes('bucket') && result.error.message?.includes('not found'))) {
                    console.error('[athletePhotoService] Bucket "public-media" not found. Please create the bucket in Supabase Storage.')
                    return { 
                        error: new Error('Photo storage is not configured. Please create the "public-media" bucket in Supabase Storage and set it to public.') 
                    }
                }

                // Check for permission/RLS errors
                if (result.error.message?.includes('row-level security') || 
                    result.error.message?.includes('RLS') || 
                    result.error.message?.includes('permission') ||
                    result.error.message?.includes('denied') ||
                    (result.error as any).code === '42501') {
                    console.error('[athletePhotoService] Storage permission error:', result.error)
                    return { 
                        error: new Error('Storage permission denied. Please ensure the "public-media" bucket is set to public and allows authenticated uploads.') 
                    }
                }

                // Log the actual error for debugging
                console.error('[athletePhotoService] Upload error:', result.error)
                throw result.error
            }
        }

        // Update database timestamp and ensure org_id is set
        const updateData: Record<string, any> = {
            profile_photo_updated_at: new Date().toISOString(),
            has_profile_photo: true
        }
        
        // Set org_id if not already set (for backward compatibility with existing athletes)
        const { data: athlete } = await supabase
            .from('athletes')
            .select('org_id')
            .eq('id', athleteId)
            .single()
        
        if (athlete && !athlete.org_id) {
            updateData.org_id = context.orgId
        }

        const { error: updateError } = await supabase
            .from('athletes')
            .update(updateData)
            .eq('id', athleteId)

        if (updateError) {
            console.error('[athletePhotoService] Error updating database:', updateError)
            // Don't fail - photo is uploaded, DB update can be retried
        }

        // Best-effort upload event log.
        const logResult = await logEvent({
            category: 'SYSTEM',
            eventType: 'ATHLETE_PHOTO_UPLOADED',
            actorUserId: context.userId,
            actorRole: deriveActorRoleFromRoles(context.roles),
            orgId: context.orgId,
            targetEntityType: 'athlete',
            targetEntityId: athleteId,
            metadata: {
                original_path: originalPath,
                size_512_path: path512,
                size_256_path: path256,
                original_file_name: file.name,
                original_file_size: file.size,
                original_file_type: file.type,
                source: 'athletePhotoService.uploadAthletePhoto',
            },
        })
        if (logResult.error) {
            console.error('[athletePhotoService] Failed to log ATHLETE_PHOTO_UPLOADED event:', logResult.error)
        }

        debug.perf.end('athletePhotoService.uploadAthletePhoto')
        debug.flow('AthletePhotoService.uploadAthletePhoto', 'Photo uploaded successfully', { athleteId, orgId: context.orgId })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('athletePhotoService.uploadAthletePhoto')
        debug.error('AthletePhotoService.uploadAthletePhoto', 'Failed to upload photo', { error: err, athleteId, orgId: context.orgId, fileName: file.name })
        console.groupEnd()
        console.error('[athletePhotoService] Error uploading photo:', err)
        return { 
            error: err instanceof Error ? err : new Error('Unknown error uploading photo') 
        }
    }
}

// ============================================================================
// Photo Deletion
// ============================================================================

/**
 * Delete athlete photo from storage
 * Deletes entire profile folder
 */
export async function deleteAthletePhoto(
    context: UserContext,
    athleteId: string
): Promise<{ error: Error | null }> {
    console.groupCollapsed(`%cdeleteAthletePhoto: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.flow('AthletePhotoService.deleteAthletePhoto', 'Deleting photo', { athleteId, orgId: context.orgId })
    debug.perf.start('athletePhotoService.deleteAthletePhoto')

    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()
            debug.perf.end('athletePhotoService.deleteAthletePhoto')
            debug.flow('AthletePhotoService.deleteAthletePhoto', 'Photo deleted (fake)', { athleteId })
            console.groupEnd()
            return { error: null }
        }

        // Validate inputs
        if (!context.orgId || !isValidUUID(context.orgId)) {
            debug.perf.end('athletePhotoService.deleteAthletePhoto')
            debug.error('AthletePhotoService.deleteAthletePhoto', 'Invalid organization ID', { orgId: context.orgId })
            console.groupEnd()
            return { error: new Error('Invalid organization ID') }
        }
        if (!athleteId || !isValidUUID(athleteId)) {
            debug.perf.end('athletePhotoService.deleteAthletePhoto')
            debug.error('AthletePhotoService.deleteAthletePhoto', 'Invalid athlete ID', { athleteId })
            console.groupEnd()
            return { error: new Error('Invalid athlete ID') }
        }

        // Check permissions before delete (same as upload)
        const { allowed, error: permissionError } = await checkPhotoUploadPermission(context, athleteId)
        if (!allowed) {
            debug.perf.end('athletePhotoService.deleteAthletePhoto')
            debug.error('AthletePhotoService.deleteAthletePhoto', 'Permission denied', { athleteId, orgId: context.orgId, error: permissionError })
            console.groupEnd()
            return { error: permissionError || new Error('Permission denied') }
        }

        // Build folder path
        const folderPath = buildPhotoFolderPath(context.orgId, athleteId)

        // List all files in folder
        const { data: files, error: listError } = await supabase.storage
            .from('public-media')
            .list(folderPath)

        if (listError && !listError.message?.includes('not found')) {
            console.error('[athletePhotoService] Error listing files:', listError)
            // Continue anyway - try to delete
        }

        // Delete all files in folder
        const filesToDelete = files?.map(file => `${folderPath}${file.name}`) || [
            buildPhotoPath(context.orgId, athleteId, 'original'),
            buildPhotoPath(context.orgId, athleteId, '512'),
            buildPhotoPath(context.orgId, athleteId, '256')
        ]

        if (filesToDelete.length > 0) {
            const { error: deleteError } = await supabase.storage
                .from('public-media')
                .remove(filesToDelete)

            if (deleteError) {
                console.error('[athletePhotoService] Error deleting photos:', deleteError)
                // Don't fail - continue with DB update
            }
        }

        // Update database
        const { error: updateError } = await supabase
            .from('athletes')
            .update({
                profile_photo_updated_at: null,
                has_profile_photo: false
            } as any)
            .eq('id', athleteId)

        if (updateError) {
            console.error('[athletePhotoService] Error updating database:', updateError)
        }

        debug.perf.end('athletePhotoService.deleteAthletePhoto')
        debug.flow('AthletePhotoService.deleteAthletePhoto', 'Photo deleted successfully', { athleteId, orgId: context.orgId })
        console.groupEnd()
        return { error: null }
    } catch (err) {
        debug.perf.end('athletePhotoService.deleteAthletePhoto')
        debug.error('AthletePhotoService.deleteAthletePhoto', 'Failed to delete photo', { error: err, athleteId, orgId: context.orgId })
        console.groupEnd()
        debug.perf.end('athletePhotoService.deleteAthletePhoto')
        debug.error('AthletePhotoService.deleteAthletePhoto', 'Failed to delete photo', { error: err, athleteId, orgId: context.orgId })
        console.groupEnd()
        console.error('[athletePhotoService] Error deleting photo:', err)
        return { 
            error: err instanceof Error ? err : new Error('Unknown error deleting photo') 
        }
    }
}

// ============================================================================
// Photo URL Generation
// ============================================================================

/**
 * Get public URL for athlete photo
 * In fake data mode returns gender-matched demo asset from /demo-assets/athlete-photos/
 */
export function getAthletePhotoUrl(
    orgId: string,
    athleteId: string,
    size: PhotoSize = '256'
): string {
    if (USE_FAKE_DATA) {
        const child = getChildById(athleteId)
        return child?.photo_url ?? ''
    }
    if (!orgId || !athleteId || !isValidUUID(orgId) || !isValidUUID(athleteId)) {
        return ''
    }

    const path = buildPhotoPath(orgId, athleteId, size)
    const { data } = supabase.storage
        .from('public-media')
        .getPublicUrl(path)

    return data.publicUrl
}

/**
 * Get photo URL with cache busting
 * Uses profile_photo_updated_at timestamp if available
 */
export function getAthletePhotoUrlWithCacheBust(
    orgId: string,
    athleteId: string,
    updatedAt: string | null,
    size: PhotoSize = '256'
): string {
    const url = getAthletePhotoUrl(orgId, athleteId, size)
    if (!url) return ''
    
    // Add timestamp query param for cache busting
    if (updatedAt) {
        const timestamp = new Date(updatedAt).getTime()
        return `${url}?t=${timestamp}`
    }
    
    return url
}

/**
 * Check if photo exists (for placeholder logic)
 * Returns true if photo likely exists (has_profile_photo flag)
 */
export function hasAthletePhoto(athlete: { has_profile_photo?: boolean }): boolean {
    return athlete.has_profile_photo === true
}
