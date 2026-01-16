/**
 * Sport Image Utilities
 *
 * Provides image path mapping and fallback logic for sport-specific imagery.
 * Implements multi-level fallback: sport-specific → default → CSS gradient.
 */

import type { SportInfo } from './sportContext'

/**
 * Sport name to image path mapping
 */
const SPORT_IMAGE_MAP: Record<string, { hero: string; card: string }> = {
    Soccer: {
        hero: '/images/sports/soccer/hero-bg.jpg',
        card: '/images/sports/soccer/card-bg.jpg',
    },
    Basketball: {
        hero: '/images/sports/basketball/hero-bg.jpg',
        card: '/images/sports/basketball/card-bg.jpg',
    },
    Baseball: {
        hero: '/images/sports/baseball/hero-bg.jpg',
        card: '/images/sports/baseball/card-bg.jpg',
    },
    Volleyball: {
        hero: '/images/sports/volleyball/hero-bg.jpg',
        card: '/images/sports/volleyball/card-bg.jpg',
    },
}

/**
 * Default sport image paths (fallback)
 */
const DEFAULT_IMAGE_PATHS = {
    hero: '/images/sports/default/hero-bg.jpg',
    card: '/images/sports/default/card-bg.jpg',
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
    if (!sportName) {
        return DEFAULT_IMAGE_PATHS[type]
    }

    const normalizedName = sportName.trim()
    const sportImages = SPORT_IMAGE_MAP[normalizedName]

    if (!sportImages) {
        return DEFAULT_IMAGE_PATHS[type]
    }

    const basePath = sportImages[type]

    // For dark mode, try dark variant first
    if (darkMode) {
        const darkPath = basePath.replace(/\.(jpg|jpeg|png|webp)$/i, '-dark.$1')
        // Note: We'll check if dark variant exists in component, for now return base path
        // Component will handle fallback to CSS filter if dark image doesn't exist
        return darkPath
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
