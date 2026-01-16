/**
 * Sport Hero Component
 *
 * Large hero background with sport-specific imagery.
 * Implements lazy loading, error handling, and dark mode support.
 */

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { SportImageSkeleton } from './SportImageSkeleton'
import { getSportImagePath, getSportGradientFallback, getSportImageAlt } from '../../utils/sportImages'
import type { SportInfo } from '../../utils/sportContext'

interface SportHeroProps {
    sport: SportInfo | null
    children?: ReactNode
    className?: string
    height?: string
}

export function SportHero({ sport, children, className = '', height = '60vh' }: SportHeroProps) {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [darkMode, setDarkMode] = useState(false)
    const imgRef = useRef<HTMLImageElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

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

    // Get image paths
    const heroPath = getSportImagePath(sportName, 'hero', darkMode)
    const darkHeroPath = darkMode ? getSportImagePath(sportName, 'hero', true) : null

    // Try dark variant first, fallback to regular
    const imageSrc = darkMode && darkHeroPath ? darkHeroPath : heroPath

    // Fallback gradient
    const gradientFallback = getSportGradientFallback(sportColor)

    return (
        <div
            ref={containerRef}
            className={`relative w-full overflow-hidden ${className}`}
            style={{ height }}
        >
            {/* Background Image */}
            {!imageError ? (
                <>
                    <img
                        ref={imgRef}
                        src={imageSrc}
                        alt={getSportImageAlt(sportName, 'hero')}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                            imageLoaded ? 'opacity-100' : 'opacity-0'
                        } ${darkMode && !darkHeroPath ? 'dark:brightness-[0.7] dark:contrast-110' : ''}`}
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

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background-light dark:to-background-dark pointer-events-none" />

            {/* Content Overlay */}
            {children && (
                <div className="relative z-10 h-full flex items-end">
                    <div className="w-full">{children}</div>
                </div>
            )}
        </div>
    )
}
