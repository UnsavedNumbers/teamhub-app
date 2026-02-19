/**
 * Sport Card Image Component
 *
 * Card/component image wrapper with sport-specific background.
 * Implements lazy loading, error handling, and maintains card styling.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { SportImageSkeleton } from './SportImageSkeleton'
import { 
    getSportImagePath, 
    getSportGradientFallback, 
    getSportImageAlt 
} from '../../utils/sportImages'
import type { SportInfo } from '../../utils/sportContext'

interface SportCardImageProps {
    sport: SportInfo | null
    children?: ReactNode
    className?: string
    height?: string
    type?: 'card' | 'travel'
}

export function SportCardImage({
    sport,
    children,
    className = '',
    height = 'h-48',
    type = 'card',
}: SportCardImageProps) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [selectedImagePath, setSelectedImagePath] = useState<string>('')
    const imgRef = useRef<HTMLImageElement>(null)

    // Select fixed sport image path (always use same image regardless of theme)
    useEffect(() => {
        const sportName = sport?.name || null
        // If sport is not yet known, do NOT load a default image.
        // This prevents a \"default then swap\" double-load.
        if (!sportName) {
            setSelectedImagePath('')
            setImageLoaded(false)
            setImageError(false)
            return
        }

        const path = getSportImagePath(sportName, type, false)
        setSelectedImagePath(path)
        setImageLoaded(false) // Reset loaded state when path changes
        setImageError(false)
    }, [sport?.name, type])

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
                        alt={getSportImageAlt(sportName, type)}
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
                    aria-label={getSportImageAlt(sportName, type)}
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
