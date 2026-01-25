/**
 * Athlete Avatar Component
 * 
 * Displays athlete photo if available, otherwise shows avatar with initials.
 * Handles image loading states and errors gracefully.
 * Supports storage paths with signed URL generation and proactive refresh.
 */

import { useState, useEffect, useRef } from 'react'
import { getAthleteInitials } from '../../utils/athleteHelpers'
import { getAthletePhotoUrl, isValidAthletePhotoPath } from '../../data/services/athletePhotoService'
import type { Athlete } from '../../types/family'

interface AthleteAvatarProps {
    athlete: Athlete
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

export default function AthleteAvatar({ athlete, className = '' }: AthleteAvatarProps) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [signedUrl, setSignedUrl] = useState<string | null>(null)
    
    const photoPath = athlete.photo_url
    const initials = getAthleteInitials(athlete.first_name, athlete.last_name)
    
    // Ref to track refresh interval for cleanup
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Check if photo_url is a storage path (starts with "athlete/")
    const isStoragePath = photoPath && isValidAthletePhotoPath(photoPath)

    // Generate signed URL for storage paths
    useEffect(() => {
        if (!isStoragePath) {
            setSignedUrl(null)
            return
        }

        // Function to refresh signed URL
        const refreshSignedUrl = async () => {
            const { url, error } = await getAthletePhotoUrl(photoPath)
            if (url && !error) {
                setSignedUrl(url)
                setImageError(false)
            } else {
                console.error('[AthleteAvatar] Error generating signed URL:', error)
                setImageError(true)
            }
        }

        // Refresh immediately on mount or when path changes
        refreshSignedUrl()

        // Set up proactive refresh every 50 seconds (before 60s expiry)
        refreshIntervalRef.current = setInterval(() => {
            refreshSignedUrl()
        }, 50000)

        // Cleanup interval on unmount or when path changes
        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current)
                refreshIntervalRef.current = null
            }
        }
    }, [photoPath, isStoragePath])

    // Reset loading state when signed URL or photo path changes
    useEffect(() => {
        if (signedUrl || (!isStoragePath && photoPath)) {
            setImageError(false)
            setImageLoaded(false)
        }
    }, [signedUrl, photoPath, isStoragePath])

    // Determine which URL to use for display
    const displayUrl = isStoragePath ? signedUrl : photoPath

    // If no photo URL or error loading, show avatar with initials
    if (!displayUrl || imageError) {
        return (
            <div
                className={`w-full h-full bg-[#137fec]/20 flex items-center justify-center text-[#137fec] font-black ${className}`}
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
                onError={() => setImageError(true)}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
            />
            {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center">
                    <div className="w-full h-full bg-[#137fec]/20 flex items-center justify-center">
                        <span className="text-[#137fec] font-black text-4xl">{initials}</span>
                    </div>
                </div>
            )}
            {/* Fallback avatar (hidden but ready) */}
            {imageError && (
                <div className="absolute inset-0 bg-[#137fec]/20 flex items-center justify-center text-[#137fec] font-black">
                    <span className="text-4xl">{initials}</span>
                </div>
            )}
        </div>
    )
}
