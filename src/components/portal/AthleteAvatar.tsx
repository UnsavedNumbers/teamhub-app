/**
 * Athlete Avatar Component
 * 
 * Displays athlete photo if available, otherwise shows avatar with initials.
 * Handles image loading states and errors gracefully.
 */

import { useState, useEffect } from 'react'
import { getAthleteInitials } from '../../utils/athleteHelpers'
import type { Athlete } from '../../types/family'

interface AthleteAvatarProps {
    athlete: Athlete
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-base',
    lg: 'w-24 h-24 text-lg',
    xl: 'w-32 h-32 text-xl'
}

export default function AthleteAvatar({ athlete, size = 'md', className = '' }: AthleteAvatarProps) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)

    const photoUrl = athlete.photo_url
    const initials = getAthleteInitials(athlete.first_name, athlete.last_name)
    const sizeClass = sizeClasses[size]

    // Reset loading state when photoUrl changes
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
