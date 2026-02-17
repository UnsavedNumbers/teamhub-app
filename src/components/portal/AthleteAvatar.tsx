/**
 * Athlete Avatar Component
 * 
 * Displays athlete photo if available, otherwise shows avatar with initials.
 * Uses public URLs from public-media bucket (no signed URLs needed).
 */

import { useState, useEffect, useRef } from 'react'
import { getAthleteInitials } from '../../utils/athleteHelpers'
import { resizeImageUrl } from '../../utils/resizeImageUrl'
import { getAthletePhotoUrl, getAthletePhotoUrlWithCacheBust, hasAthletePhoto, type PhotoSize } from '../../data/services/athletePhotoService'
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
    const [resizedBlobUrl, setResizedBlobUrl] = useState<string | null>(null)
    const [fallbackResizing, setFallbackResizing] = useState(false)
    const resizingRef = useRef(false)
    const blobUrlRef = useRef<string | null>(null)
    const { context } = useUserContext()
    
    const initials = getAthleteInitials(athlete.first_name, athlete.last_name)
    
    const getPhotoSize = (): PhotoSize => {
        if (photoSize) return photoSize
        return '256'
    }

    const orgId = athlete.org_id || context.orgId
    const size = getPhotoSize()
    // Fallback resize uses hi-res size so images stay sharp on retina (resizeImageUrl caps at source size)
    const fallbackResizePx = size === '512' ? 1024 : 768

    // Prefer size-specific URL (256/512) so large demo images don't look dotty when scaled down
    const photoUrl = orgId && athlete.id && hasAthletePhoto({ has_profile_photo: athlete.has_profile_photo ?? undefined })
        ? getAthletePhotoUrlWithCacheBust(
            orgId,
            athlete.id,
            athlete.profile_photo_updated_at || null,
            size
          )
        : null
    const fallbackUrl = photoUrl && size !== 'original' && orgId && athlete.id
        ? getAthletePhotoUrl(orgId, athlete.id, 'original')
        : null

    useEffect(() => {
        if (photoUrl) {
            setImageError(false)
            setFallbackResizing(false)
            setResizedBlobUrl((prev) => {
                if (prev) {
                    URL.revokeObjectURL(prev)
                    blobUrlRef.current = null
                }
                return null
            })
            setImageLoaded(false)
        }
    }, [photoUrl])

    const displayUrl = resizedBlobUrl ?? photoUrl

    const handleError = () => {
        if (fallbackUrl && !resizingRef.current && !resizedBlobUrl) {
            resizingRef.current = true
            setFallbackResizing(true)
            resizeImageUrl(fallbackUrl, fallbackResizePx)
                .then((blobUrl) => {
                    blobUrlRef.current = blobUrl
                    setResizedBlobUrl(blobUrl)
                    setImageLoaded(true)
                })
                .catch(() => setImageError(true))
                .finally(() => {
                    resizingRef.current = false
                    setFallbackResizing(false)
                })
        } else {
            setImageError(true)
        }
    }

    useEffect(() => {
        return () => {
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = null
            }
        }
    }, [])

    if (!displayUrl || imageError || fallbackResizing) {
        return (
            <div
                className={`w-full h-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center text-white font-black ${className}`}
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
                src={displayUrl}
                alt={`${athlete.first_name} ${athlete.last_name}`}
                onLoad={() => setImageLoaded(true)}
                onError={handleError}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
            />
            {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center">
                    <div className="w-full h-full bg-slate-400 dark:bg-slate-600 flex items-center justify-center">
                        <span className="text-white font-black text-4xl">{initials}</span>
                    </div>
                </div>
            )}
            {imageError && (
                <div className="absolute inset-0 bg-slate-400 dark:bg-slate-600 flex items-center justify-center text-white font-black">
                    <span className="text-4xl">{initials}</span>
                </div>
            )}
        </div>
    )
}
