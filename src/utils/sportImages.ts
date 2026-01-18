/**
 * Sport Image Utilities
 *
 * Provides image path mapping and fallback logic for sport-specific imagery.
 * Implements multi-level fallback: sport-specific → default → CSS gradient.
 */

// Sport image utilities - SportInfo type used indirectly via sportContext

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
 * Sport image variant configuration
 * Defines how many numbered variants exist for each sport
 * Example: Soccer card: 3 means card-bg.webp, card-bg2.webp, card-bg3.webp exist
 */
const SPORT_IMAGE_VARIANTS: Record<string, { hero: number; card: number }> = {
    Soccer: { hero: 1, card: 1 },
    Basketball: { hero: 1, card: 1 },
    Baseball: { hero: 1, card: 1 },
    Volleyball: { hero: 1, card: 1 },
    Football: { hero: 1, card: 1 },
}

/**
 * Get a random sport image path with variant support
 * Randomly selects from available numbered variants (e.g., card-bg2.webp)
 */
export function getRandomSportImagePath(
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
    const variants = SPORT_IMAGE_VARIANTS[normalizedName]

    if (!sportImages) {
        return DEFAULT_IMAGE_PATHS[type]
    }

    const basePath = sportImages[type]

    // Determine random variant number
    const maxVariants = variants?.[type] || 1
    const variantNumber = Math.floor(Math.random() * maxVariants) + 1

    // If variant is 1, use base path without number suffix
    let imagePath = basePath
    if (variantNumber > 1) {
        // Insert number before file extension: hero-bg.webp -> hero-bg2.webp
        imagePath = basePath.replace(/\.webp$/i, `${variantNumber}.webp`)
    }

    // Handle dark mode variants
    if (darkMode) {
        try {
            const darkPath = imagePath.replace(/\.webp$/i, '-dark.webp')
            return darkPath
        } catch (err) {
            return imagePath
        }
    }

    return imagePath
}

/**
 * Get default image path (no sport-specific selection)
 * Used for Dashboard to always show default images
 */
export function getDefaultImagePath(
    type: 'hero' | 'card',
    darkMode: boolean = false
): string {
    const basePath = DEFAULT_IMAGE_PATHS[type]

    if (darkMode) {
        try {
            return basePath.replace(/\.webp$/i, '-dark.webp')
        } catch (err) {
            return basePath
        }
    }

    return basePath
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

    // TODO: Generate srcset for different sizes when responsive images are added
    // Mobile: 800x533, Tablet: 1200x800, Desktop: 2400x1600
    // For now, return single image path (responsive images can be added later)
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
