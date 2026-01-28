/**
 * Athlete Avatar Component
 * 
 * Displays athlete photo if available, otherwise shows avatar with initials.
 * Uses public URLs from public-media bucket (no signed URLs needed).
 */

import { useState, useEffect } from 'react'
import { getAthleteInitials } from '../../utils/athleteHelpers'
import { getAthletePhotoUrlWithCacheBust, hasAthletePhoto, type PhotoSize } from '../../data/services/athletePhotoService'
import type { Athlete } from '../../types/family'
import { useUserContext } from '../../hooks/useUserContext'

interface AthleteAvatarProps {
    athlete: Athlete
    size?: 'sm' | 'md' | 'lg' | 'xl'
    photoSize?: PhotoSize
    className?: string
}

export default function AthleteAvatar({ athlete, photoSize = '256', className = '' }: AthleteAvatarProps) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const { context } = useUserContext()
    
    const initials = getAthleteInitials(athlete.first_name, athlete.last_name)
    
    // Determine photo size based on component size prop
    const getPhotoSize = (): PhotoSize => {
        if (photoSize) return photoSize
        // Default based on component size
        return '256' // Default to 256px for avatars
    }

    // Get org_id from athlete or context
    const orgId = athlete.org_id || context.orgId

    // Get photo URL (public, no signed URL needed)
    const photoUrl = orgId && athlete.id && hasAthletePhoto({ has_profile_photo: athlete.has_profile_photo ?? undefined })
        ? getAthletePhotoUrlWithCacheBust(
            orgId,
            athlete.id,
            athlete.profile_photo_updated_at || null,
            getPhotoSize()
          )
        : null

    // Reset loading state when photo URL changes
    useEffect(() => {
        if (photoUrl) {
            setImageError(false)
            setImageLoaded(false)
        }
    }, [photoUrl])

    // If no photo URL or error loading, show avatar with initials
    if (!photoUrl || imageError) {
        return (
            <div
                className={`w-full h-full bg-[var(--org-btn-primary-bg)]/20 flex items-center justify-center text-[var(--org-link-color)] font-black ${className}`}
                aria-label={`${athlete.first_name} ${athlete.last_name}`}
            >
                <span className="text-4xl">{initials}</span>
            </div>
        )
    }

    // Show image with loading state
    return (
        <div className={`w-full h-full overflow-hidden relative ${className}`}>
            <img
                src={photoUrl}
                alt={`${athlete.first_name} ${athlete.last_name}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
            />
            {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center">
                    <div className="w-full h-full bg-[var(--org-btn-primary-bg)]/20 flex items-center justify-center">
                        <span className="text-[var(--org-link-color)] font-black text-4xl">{initials}</span>
                    </div>
                </div>
            )}
            {/* Fallback avatar (hidden but ready) */}
            {imageError && (
                <div className="absolute inset-0 bg-[var(--org-btn-primary-bg)]/20 flex items-center justify-center text-[var(--org-link-color)] font-black">
                    <span className="text-4xl">{initials}</span>
                </div>
            )}
        </div>
    )
}
