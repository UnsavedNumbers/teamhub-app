/**
 * Sport Card Image Component
 *
 * Card/component image wrapper with sport-specific background.
 * Implements lazy loading, error handling, and maintains card styling.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { SportImageSkeleton } from './SportImageSkeleton'
import { getSportImagePath, getSportGradientFallback, getSportImageAlt } from '../../utils/sportImages'
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
    const [darkMode, setDarkMode] = useState(false)
    const imgRef = useRef<HTMLImageElement>(null)

    // Detect dark mode
    useEffect(() => {
        const checkDarkMode = () => {
            setDarkMode(document.documentElement.classList.contains('dark'))
        }

        checkDarkMode()
        const observer = new MutationObserver(checkDarkMode)
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        })

        return () => observer.disconnect()
    }, [])

    const sportName = sport?.name || null
    const sportColor = sport?.color || null

    // Get image paths
    const cardPath = getSportImagePath(sportName, 'card', darkMode)
    const darkCardPath = darkMode ? getSportImagePath(sportName, 'card', true) : null

    // Try dark variant first, fallback to regular
    const imageSrc = darkMode && darkCardPath ? darkCardPath : cardPath

    // Fallback gradient
    const gradientFallback = getSportGradientFallback(sportColor)

    return (
        <div className={`relative rounded-xl overflow-hidden ${height} ${className}`}>
            {/* Background Image */}
            {!imageError ? (
                <>
                    <img
                        ref={imgRef}
                        src={imageSrc}
                        alt={getSportImageAlt(sportName, 'card')}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                            imageLoaded ? 'opacity-100' : 'opacity-0'
                        } ${darkMode && !darkCardPath ? 'dark:brightness-[0.7] dark:contrast-110' : ''}`}
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

            {/* Overlay Gradient for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

            {/* Content Overlay */}
            {children && (
                <div className="relative z-10 h-full flex items-end">
                    <div className="w-full p-6">{children}</div>
                </div>
            )}
        </div>
    )
}
