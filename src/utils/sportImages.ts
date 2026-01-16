/**
 * Sport Image Utilities
 *
 * Provides image path mapping and fallback logic for sport-specific imagery.
 * Implements multi-level fallback: sport-specific → default → CSS gradient.
 */

import type { SportInfo } from './sportContext'

/**
 * Sport name to image path mapping
 * All images are WebP format for optimal performance
 */
const SPORT_IMAGE_MAP: Record<string, { hero: string; card: string }> = {
    Soccer: {
        hero: '/images/sports/soccer/hero-bg.webp',
        card: '/images/sports/soccer/card-bg.webp',
    },
    Basketball: {
        hero: '/images/sports/basketball/hero-bg.webp',
        card: '/images/sports/basketball/card-bg.webp',
    },
    Baseball: {
        hero: '/images/sports/baseball/hero-bg.webp',
        card: '/images/sports/baseball/card-bg.webp',
    },
    Volleyball: {
        hero: '/images/sports/volleyball/hero-bg.webp',
        card: '/images/sports/volleyball/card-bg.webp',
    },
    Football: {
        hero: '/images/sports/football/hero-bg.webp',
        card: '/images/sports/football/card-bg.webp',
    },
}

/**
 * Default sport image paths (fallback)
 */
const DEFAULT_IMAGE_PATHS = {
    hero: '/images/sports/default/hero-bg.webp',
    card: '/images/sports/default/card-bg.webp',
}

/**
 * Get image path for a sport and image type
 * Returns the sport-specific path, or default if sport not found
 */
export function getSportImagePath(
    sportName: string | null | undefined,
    type: 'hero' | 'card',
    darkMode: boolean = false
): string {
    if (!sportName || typeof sportName !== 'string') {
        return DEFAULT_IMAGE_PATHS[type]
    }

    const normalizedName = sportName.trim()
    if (!normalizedName) {
        return DEFAULT_IMAGE_PATHS[type]
    }

    const sportImages = SPORT_IMAGE_MAP[normalizedName]

    if (!sportImages) {
        return DEFAULT_IMAGE_PATHS[type]
    }

    const basePath = sportImages[type]

    // For dark mode, try dark variant first
    if (darkMode) {
        try {
            const darkPath = basePath.replace(/\.(jpg|jpeg|png|webp)$/i, '-dark.$1')
            // Note: We'll check if dark variant exists in component, for now return base path
            // Component will handle fallback to CSS filter if dark image doesn't exist
            return darkPath
        } catch (err) {
            return basePath
        }
    }

    return basePath
}

/**
 * Get image paths with fallback chain
 * Returns array of paths to try in order: [sport-specific, default]
 */
export function getImagePathsWithFallback(
    sportName: string | null | undefined,
    type: 'hero' | 'card',
    darkMode: boolean = false
): string[] {
    const sportPath = getSportImagePath(sportName, type, darkMode)
    const defaultPath = DEFAULT_IMAGE_PATHS[type]

    // If sport path is already default, don't duplicate
    if (sportPath === defaultPath) {
        return [defaultPath]
    }

    return [sportPath, defaultPath]
}

/**
 * Get CSS gradient fallback for a sport
 * Uses the sport's color from the database
 */
export function getSportGradientFallback(sportColor: string | null | undefined): string {
    const color = sportColor || '#137fec' // Default to primary blue
    return `linear-gradient(135deg, ${color} 0%, ${color}dd 50%, ${color}aa 100%)`
}

/**
 * Get responsive image srcset for hero images
 * Returns srcset string for multiple image sizes
 */
export function getHeroImageSrcSet(
    sportName: string | null | undefined,
    darkMode: boolean = false
): string {
    const basePath = getSportImagePath(sportName, 'hero', darkMode)
    const baseName = basePath.replace(/\.(jpg|jpeg|png|webp)$/i, '')

    // Generate srcset for different sizes
    // Mobile: 800x533, Tablet: 1200x800, Desktop: 2400x1600
    const sizes = [
        { width: 800, path: `${baseName}-mobile.jpg` },
        { width: 1200, path: `${baseName}-tablet.jpg` },
        { width: 2400, path: `${baseName}-desktop.jpg` },
    ]

    // For now, return single image path (responsive images can be added later)
    // When responsive images are implemented, return: "path1 800w, path2 1200w, path3 2400w"
    return basePath
}

/**
 * Check if an image path is a default/fallback path
 */
export function isDefaultImagePath(path: string): boolean {
    return path.includes('/default/')
}

/**
 * Get alt text for sport image
 */
export function getSportImageAlt(sportName: string | null | undefined, type: 'hero' | 'card'): string {
    const sport = sportName || 'sport'
    const typeLabel = type === 'hero' ? 'hero background' : 'card background'
    return `${sport} ${typeLabel} image`
}
