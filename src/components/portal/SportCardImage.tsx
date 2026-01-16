/**
 * Sport Card Image Component
 *
 * Card/component image wrapper with sport-specific background.
 * Implements lazy loading, error handling, and maintains card styling.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { SportImageSkeleton } from './SportImageSkeleton'
import { 
    getRandomSportImagePath, 
    getSportGradientFallback, 
    getSportImageAlt 
} from '../../utils/sportImages'
import type { SportInfo } from '../../utils/sportContext'

interface SportCardImageProps {
    sport: SportInfo | null
    children?: ReactNode
    className?: string
    height?: string
}

export function SportCardImage({
    sport,
    children,
    className = '',
    height = 'h-48',
}: SportCardImageProps) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [selectedImagePath, setSelectedImagePath] = useState<string>('')
    const imgRef = useRef<HTMLImageElement>(null)

    // Select random image path (always use same image regardless of theme)
    useEffect(() => {
        const sportName = sport?.name || null
        const path = getRandomSportImagePath(sportName, 'card', false)
        setSelectedImagePath(path)
        setImageLoaded(false) // Reset loaded state when path changes
    }, [sport?.name])

    const sportName = sport?.name || null
    const sportColor = sport?.color || null

    // Fallback gradient
    const gradientFallback = getSportGradientFallback(sportColor)

    return (
        <div className={`relative rounded-xl overflow-hidden ${height} ${className}`}>
            {/* Background Image */}
            {!imageError && selectedImagePath ? (
                <>
                    <img
                        ref={imgRef}
                        src={selectedImagePath}
                        alt={getSportImageAlt(sportName, 'card')}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                            imageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        loading="lazy"
                    />
                    {!imageLoaded && (
                        <SportImageSkeleton type="card" className="absolute inset-0" />
                    )}
                </>
            ) : (
                <div
                    className="absolute inset-0 w-full h-full"
                    style={{ background: gradientFallback }}
                    aria-label={getSportImageAlt(sportName, 'card')}
                />
            )}

            {/* Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 pointer-events-none" />

            {/* Content Overlay */}
            {children && (
                <div className="relative z-10 h-full flex items-end">
                    <div className="w-full p-6">{children}</div>
                </div>
            )}
        </div>
    )
}
