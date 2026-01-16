/**
 * Sport Hero Component
 *
 * Large hero background with sport-specific imagery.
 * Implements lazy loading, error handling, and dark mode support.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { SportImageSkeleton } from './SportImageSkeleton'
import { 
    getRandomSportImagePath, 
    getDefaultImagePath, 
    getSportGradientFallback, 
    getSportImageAlt 
} from '../../utils/sportImages'
import type { SportInfo } from '../../utils/sportContext'

interface SportHeroProps {
    sport: SportInfo | null
    children?: ReactNode
    className?: string
    height?: string
    forceDefault?: boolean
}

export function SportHero({ 
    sport, 
    children, 
    className = '', 
    height = '60vh',
    forceDefault = false
}: SportHeroProps) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [selectedImagePath, setSelectedImagePath] = useState<string>('')
    const imgRef = useRef<HTMLImageElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Select random image path (or force default) - always use same image regardless of theme
    useEffect(() => {
        const sportName = sport?.name || null
        
        // If we are not forcing default and sport is not yet known, do NOT load any image.
        // This prevents a \"default then swap\" double-load.
        if (!forceDefault && !sportName) {
            setSelectedImagePath('')
            setImageLoaded(false)
            setImageError(false)
            return
        }

        const path = forceDefault
            ? getDefaultImagePath('hero', false)
            : getRandomSportImagePath(sportName, 'hero', false)

        setSelectedImagePath(path)
        setImageLoaded(false) // Reset loaded state when path changes
        setImageError(false)
    }, [sport?.name, forceDefault])

    // Lazy load with Intersection Observer
    useEffect(() => {
        if (!imgRef.current || imageLoaded || imageError) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && imgRef.current) {
                        // Start loading image
                        const img = new Image()
                        img.src = imgRef.current.src
                        img.onload = () => setImageLoaded(true)
                        img.onerror = () => setImageError(true)
                        observer.disconnect()
                    }
                })
            },
            { rootMargin: '50px' }
        )

        observer.observe(imgRef.current)

        return () => observer.disconnect()
    }, [imageLoaded, imageError])

    const sportName = sport?.name || null
    const sportColor = sport?.color || null

    // Fallback gradient
    const gradientFallback = getSportGradientFallback(sportColor)

    return (
        <div
            ref={containerRef}
            className={`relative w-full overflow-hidden ${className}`}
            style={{ height }}
        >
            {/* Background Image */}
            {!imageError && selectedImagePath ? (
                <>
                    <img
                        ref={imgRef}
                        src={selectedImagePath}
                        alt={getSportImageAlt(sportName, 'hero')}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                            imageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        loading="lazy"
                    />
                    {!imageLoaded && <SportImageSkeleton type="hero" className="absolute inset-0" />}
                </>
            ) : (
                <div
                    className="absolute inset-0 w-full h-full"
                    style={{ background: gradientFallback }}
                    aria-label={getSportImageAlt(sportName, 'hero')}
                />
            )}

            {/* Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70 pointer-events-none" />

            {/* Content Overlay */}
            {children && (
                <div className="relative z-10 h-full flex items-end">
                    <div className="w-full">{children}</div>
                </div>
            )}
        </div>
    )
}
