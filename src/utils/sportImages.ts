/**
 * Sport Image Utilities
 *
 * Provides image path mapping and fallback logic for sport-specific imagery.
 * Implements multi-level fallback: sport-specific → default → CSS gradient.
 */

// Sport image utilities - SportInfo type used indirectly via sportContext

/**
 * System-wide predefined sports
 * Organizations must select from this list to ensure consistency
 */
export const SYSTEM_SPORTS = [
    'Soccer',
    'Basketball',
    'Baseball',
    'Softball',
    'Football',
    'Flag Football',
    'Volleyball',
    'Lacrosse',
    'Field Hockey',
    'Ice Hockey',
    'Wrestling',
    'Track & Field',
    'Gymnastics',
    'Cross Country',
    'Tennis',
    'Cheerleading',
    'Poms',
    'Dance',
    'Golf',
    'Swimming',
    'Diving',
] as const

export type SystemSport = typeof SYSTEM_SPORTS[number]

/**
 * Normalize sport name for consistent matching
 * Handles case, whitespace, and edge cases
 */
function normalizeSportName(sportName: string | null | undefined): string | null {
    if (!sportName || typeof sportName !== 'string') return null
    const trimmed = sportName.trim()
    if (!trimmed || trimmed.length > 100) return null
    return trimmed.toLowerCase()
}

/**
 * Extract folder name from image path
 * "/images/sports/track-field/hero-bg.webp" → "track-field"
 * Returns null if path format is invalid (Bug #1 prevention)
 */
function extractFolderFromPath(path: string): string | null {
    if (!path || typeof path !== 'string') return null
    try {
        const match = path.match(/\/images\/sports\/([^\/]+)\//)
        return match ? match[1] : null
    } catch (error) {
        console.error('Error extracting folder from path:', error)
        return null
    }
}

/**
 * Sport name aliases for common variations
 */
const SPORT_NAME_ALIASES: Record<string, string> = {
    'football (soccer)': 'soccer',
    'association football': 'soccer',
    'american football': 'football',
    'track': 'track & field',
    'track and field': 'track & field',
    'xc': 'cross country',
    'cross-country': 'cross country',
}

/**
 * Sport name to image path mapping
 * All images are WebP format for optimal performance
 * Keys are normalized (lowercase) for case-insensitive matching
 */
const SPORT_IMAGE_MAP: Record<string, { hero: string; card: string; travel?: string }> = {
    'soccer': {
        hero: '/images/sports/soccer/hero-bg.webp',
        card: '/images/sports/soccer/card-bg.webp',
        travel: '/images/sports/soccer/travel.png',
    },
    'basketball': {
        hero: '/images/sports/basketball/hero-bg.webp',
        card: '/images/sports/basketball/card-bg.webp',
        travel: '/images/sports/basketball/travel.png',
    },
    'baseball': {
        hero: '/images/sports/baseball/hero-bg.webp',
        card: '/images/sports/baseball/card-bg.webp',
        travel: '/images/sports/baseball/travel.png',
    },
    'softball': {
        hero: '/images/sports/softball/hero-bg.webp',
        card: '/images/sports/softball/card-bg.webp',
    },
    'football': {
        hero: '/images/sports/football/hero-bg.webp',
        card: '/images/sports/football/card-bg.webp',
        travel: '/images/sports/football/travel-football.png',
    },
    'flag football': {
        hero: '/images/sports/flag-football/hero-bg.webp',
        card: '/images/sports/flag-football/card-bg.webp',
    },
    'volleyball': {
        hero: '/images/sports/volleyball/hero-bg.webp',
        card: '/images/sports/volleyball/card-bg.webp',
    },
    'lacrosse': {
        hero: '/images/sports/lacrosse/hero-bg.webp',
        card: '/images/sports/lacrosse/card-bg.webp',
    },
    'field hockey': {
        hero: '/images/sports/field-hockey/hero-bg.webp',
        card: '/images/sports/field-hockey/card-bg.webp',
    },
    'ice hockey': {
        hero: '/images/sports/ice-hockey/hero-bg.webp',
        card: '/images/sports/ice-hockey/card-bg.webp',
    },
    'wrestling': {
        hero: '/images/sports/wrestling/hero-bg.webp',
        card: '/images/sports/wrestling/card-bg.webp',
    },
    'track & field': {
        hero: '/images/sports/track-field/hero-bg.webp',
        card: '/images/sports/track-field/card-bg.webp',
    },
    'gymnastics': {
        hero: '/images/sports/gymnastics/hero-bg.webp',
        card: '/images/sports/gymnastics/card-bg.webp',
    },
    'cross country': {
        hero: '/images/sports/cross-country/hero-bg.webp',
        card: '/images/sports/cross-country/card-bg.webp',
    },
    'tennis': {
        hero: '/images/sports/tennis/hero-bg.webp',
        card: '/images/sports/tennis/card-bg.webp',
    },
    'cheerleading': {
        hero: '/images/sports/cheerleading/hero-bg.webp',
        card: '/images/sports/cheerleading/card-bg.webp',
    },
    'poms': {
        hero: '/images/sports/poms/hero-bg.webp',
        card: '/images/sports/poms/card-bg.webp',
    },
    'dance': {
        hero: '/images/sports/dance/hero-bg.webp',
        card: '/images/sports/dance/card-bg.webp',
    },
    'golf': {
        hero: '/images/sports/golf/hero-bg.webp',
        card: '/images/sports/golf/card-bg.webp',
    },
    'swimming': {
        hero: '/images/sports/swimming/hero-bg.webp',
        card: '/images/sports/swimming/card-bg.webp',
    },
    'diving': {
        hero: '/images/sports/diving/hero-bg.webp',
        card: '/images/sports/diving/card-bg.webp',
    },
}

/**
 * Create reverse mapping: sport name (normalized) → folder name
 * Derived from SPORT_IMAGE_MAP to ensure 100% accuracy (Issue #1 solution)
 * Prevents normalization mismatches with filesystem
 */
const SPORT_NAME_TO_FOLDER_MAP: Record<string, string> = (() => {
    const map: Record<string, string> = {}
    try {
        Object.entries(SPORT_IMAGE_MAP).forEach(([sportName, paths]) => {
            const folder = extractFolderFromPath(paths.hero || paths.card)
            if (folder) {
                const normalized = normalizeSportName(sportName)
                if (normalized) {
                    map[normalized] = folder
                }
            }
        })
    } catch (error) {
        console.error('Error creating sport name to folder map:', error)
    }
    return map
})()

/**
 * Convert sport name to folder-safe name
 * Uses SPORT_NAME_TO_FOLDER_MAP for known sports, falls back to normalization
 * "Track & Field" → "track-field" (removes &, doesn't convert to 'and')
 * "Flag Football" → "flag-football"
 * "Cross Country" → "cross-country"
 * 
 * Bug #8 prevention: Pure function, no side effects, handles errors gracefully
 */
export function sportNameToFolderName(sportName: string): string {
    if (!sportName || typeof sportName !== 'string') {
        return 'default'
    }
    
    try {
        // Normalize and check aliases first (Issue #7 solution)
        let normalized = normalizeSportName(sportName)
        if (!normalized) {
            normalized = sportName.trim().toLowerCase()
        }
        
        // Check aliases
        if (SPORT_NAME_ALIASES[normalized]) {
            normalized = SPORT_NAME_ALIASES[normalized]
        }
        
        // Use mapping if available (most reliable - Issue #1 solution)
        if (SPORT_NAME_TO_FOLDER_MAP[normalized]) {
            return SPORT_NAME_TO_FOLDER_MAP[normalized]
        }
        
        // Fallback to normalization logic
        return normalized
            .replace(/\s+/g, '-')
            .replace(/&/g, '')  // Remove &, don't convert to 'and' (matches filesystem)
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'default'
    } catch (error) {
        console.error('Error converting sport name to folder name:', error)
        return 'default'
    }
}

/**
 * Default sport image paths (fallback)
 */
const DEFAULT_IMAGE_PATHS = {
    hero: '/images/sports/default/hero-bg.webp',
    card: '/images/sports/default/card-bg.webp',
    travel: '/images/sports/default/card-bg.webp', // Fallback to card bg for travel
}

/**
 * Filename for athlete cover images
 * Can be changed if image format changes (e.g., to .webp)
 * Issue #6 solution: Single constant for easy updates
 */
export const ATHLETE_COVER_FILENAME = 'athlete-cover.png'

/**
 * Default athlete cover image path
 */
export const DEFAULT_ATHLETE_COVER = `/images/sports/default/covers/${ATHLETE_COVER_FILENAME}`

/**
 * Get athlete cover image path based on sport and gender
 * Path format: /images/sports/[sport]/covers/[gender]/athlete-cover.png
 * Falls back to default if no sport or invalid gender
 * 
 * Applies sport name aliases before folder conversion for consistency (Issue #7)
 * Bug #1 prevention: Comprehensive null/undefined checks and type validation
 * Bug #8 prevention: Try-catch wrapper to prevent crashes from normalization errors
 * 
 * @param sportName - Sport name (can be null/undefined)
 * @param gender - Athlete gender ('male' | 'female' | 'other' | null)
 * @returns Image path string, always returns valid path (never throws)
 */
export function getAthleteCoverImagePath(
    sportName: string | null | undefined,
    gender: 'male' | 'female' | 'other' | null
): string {
    try {
        // Bug #1: Comprehensive type and null checks
        if (!sportName || typeof sportName !== 'string' || sportName.trim() === '') {
            return DEFAULT_ATHLETE_COVER
        }
        
        // If gender is not 'male' or 'female', use default
        if (gender !== 'male' && gender !== 'female') {
            return DEFAULT_ATHLETE_COVER
        }
        
        // Normalize sport name (applies aliases - Issue #7 solution)
        let normalized = normalizeSportName(sportName)
        if (!normalized) {
            return DEFAULT_ATHLETE_COVER
        }
        
        // Check aliases
        if (SPORT_NAME_ALIASES[normalized]) {
            normalized = SPORT_NAME_ALIASES[normalized]
        }
        
        // Convert sport name to folder name
        const sportFolder = sportNameToFolderName(normalized)
        
        // Build path: /images/sports/[sport]/covers/[gender]/athlete-cover.png
        return `/images/sports/${sportFolder}/covers/${gender}/${ATHLETE_COVER_FILENAME}`
    } catch (error) {
        // Bug #8: Catch any errors and fallback to default
        console.error('Error generating athlete cover path:', error)
        return DEFAULT_ATHLETE_COVER
    }
}

/**
 * Sport image variant configuration
 * Defines how many numbered variants exist for each sport
 * Example: Soccer card: 3 means card-bg.webp, card-bg2.webp, card-bg3.webp exist
 */
const SPORT_IMAGE_VARIANTS: Record<string, { hero: number; card: number; travel?: number }> = {
    'soccer': { hero: 1, card: 1, travel: 1 },
    'basketball': { hero: 1, card: 1, travel: 1 },
    'baseball': { hero: 1, card: 1, travel: 1 },
    'softball': { hero: 1, card: 1 },
    'football': { hero: 1, card: 1, travel: 1 },
    'flag football': { hero: 1, card: 1 },
    'volleyball': { hero: 1, card: 1 },
    'lacrosse': { hero: 1, card: 1 },
    'field hockey': { hero: 1, card: 1 },
    'ice hockey': { hero: 1, card: 1 },
    'wrestling': { hero: 1, card: 1 },
    'track & field': { hero: 1, card: 1 },
    'gymnastics': { hero: 1, card: 1 },
    'cross country': { hero: 1, card: 1 },
    'tennis': { hero: 1, card: 1 },
    'cheerleading': { hero: 1, card: 1 },
    'poms': { hero: 1, card: 1 },
    'dance': { hero: 1, card: 1 },
    'golf': { hero: 1, card: 1 },
    'swimming': { hero: 1, card: 1 },
    'diving': { hero: 1, card: 1 },
}

/**
 * Get a random sport image path with variant support
 * Randomly selects from available numbered variants (e.g., card-bg2.webp)
 */
export function getRandomSportImagePath(
    sportName: string | null | undefined,
    type: 'hero' | 'card' | 'travel',
    darkMode: boolean = false
): string {
    if (!sportName || typeof sportName !== 'string') {
        return DEFAULT_IMAGE_PATHS[type]
    }

    // Normalize and check aliases
    let normalized = normalizeSportName(sportName)
    if (!normalized) {
        return DEFAULT_IMAGE_PATHS[type]
    }

    // Check aliases first
    if (SPORT_NAME_ALIASES[normalized]) {
        normalized = SPORT_NAME_ALIASES[normalized]
    }

    const sportImages = SPORT_IMAGE_MAP[normalized]
    const variants = SPORT_IMAGE_VARIANTS[normalized]

    if (!sportImages) {
        return DEFAULT_IMAGE_PATHS[type]
    }

    const basePath = sportImages[type]
    
    // If travel image doesn't exist for this sport, fall back to card image
    if (type === 'travel' && !basePath) {
        return sportImages['card'] || DEFAULT_IMAGE_PATHS['card']
    }
    
    // If card or hero image doesn't exist, fall back to default
    if (!basePath) {
        return DEFAULT_IMAGE_PATHS[type]
    }

    // Determine random variant number
    const maxVariants = variants?.[type] || 1
    const variantNumber = Math.floor(Math.random() * maxVariants) + 1

    // If variant is 1, use base path without number suffix
    let imagePath = basePath
    if (variantNumber > 1) {
        // Insert number before file extension: hero-bg.webp -> hero-bg2.webp
        imagePath = basePath.replace(/\.(webp|png|jpg|jpeg)$/i, `${variantNumber}.$1`)
    }

    // Handle dark mode variants
    if (darkMode) {
        try {
            const darkPath = imagePath.replace(/\.(webp|png|jpg|jpeg)$/i, '-dark.$1')
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
    type: 'hero' | 'card' | 'travel',
    darkMode: boolean = false
): string {
    const basePath = DEFAULT_IMAGE_PATHS[type]

    if (darkMode) {
        try {
            return basePath.replace(/\.(webp|png|jpg|jpeg)$/i, '-dark.$1')
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
    type: 'hero' | 'card' | 'travel',
    darkMode: boolean = false
): string {
    if (!sportName || typeof sportName !== 'string') {
        return DEFAULT_IMAGE_PATHS[type]
    }

    // Normalize and check aliases
    let normalized = normalizeSportName(sportName)
    if (!normalized) {
        return DEFAULT_IMAGE_PATHS[type]
    }

    // Check aliases first
    if (SPORT_NAME_ALIASES[normalized]) {
        normalized = SPORT_NAME_ALIASES[normalized]
    }

    const sportImages = SPORT_IMAGE_MAP[normalized]

    if (!sportImages) {
        return DEFAULT_IMAGE_PATHS[type]
    }

    const basePath = sportImages[type]
    
    // If travel image doesn't exist for this sport, fall back to card image
    if (type === 'travel' && !basePath) {
        return sportImages['card'] || DEFAULT_IMAGE_PATHS['card']
    }

    if (!basePath) return ''

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
    type: 'hero' | 'card' | 'travel',
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
    const color = sportColor || 'var(--org-btn-primary-bg, #137fec)' // Default to primary blue
    return `linear-gradient(135deg, ${color} 0%, ${color}dd 50%, ${color}aa 100%)`
}

/**
 * Get responsive image srcset for hero images
 * Returns srcset string for multiple image sizes
 * 
 * Format: "/path/to/image-800w.webp 800w, /path/to/image-1200w.webp 1200w, /path/to/image-2400w.webp 2400w"
 * 
 * Note: This assumes responsive image variants exist. If they don't, browsers will fall back to the base image.
 * For now, we return the base path as a single srcset entry since responsive variants may not exist yet.
 */
export function getHeroImageSrcSet(
    sportName: string | null | undefined,
    darkMode: boolean = false
): string {
    const basePath = getSportImagePath(sportName, 'hero', darkMode)
    
    if (!basePath || basePath === DEFAULT_IMAGE_PATHS.hero) {
        // For default images, return single path
        return basePath
    }

    // Generate srcset with multiple sizes
    // Assumes variants exist: hero-bg-800w.webp, hero-bg-1200w.webp, hero-bg-2400w.webp
    // If variants don't exist, browser will use the base image
    const baseWithoutExt = basePath.replace(/\.(webp|png|jpg|jpeg)$/i, '')
    const ext = basePath.match(/\.(webp|png|jpg|jpeg)$/i)?.[1] || 'webp'
    
    // Build srcset with width descriptors
    const srcset = [
        `${baseWithoutExt}-800w.${ext} 800w`,
        `${baseWithoutExt}-1200w.${ext} 1200w`,
        `${baseWithoutExt}-2400w.${ext} 2400w`,
    ].join(', ')
    
    return srcset
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
export function getSportImageAlt(sportName: string | null | undefined, type: 'hero' | 'card' | 'travel'): string {
    const sport = sportName || 'sport'
    const typeLabel = type === 'hero' ? 'hero background' : type === 'travel' ? 'travel background' : 'card background'
    return `${sport} ${typeLabel} image`
}
