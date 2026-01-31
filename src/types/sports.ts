/**
 * Sport Types and Enums
 * 
 * Defines all sport codes, field types, and field groups for the
 * sport-specific athlete profile system.
 * 
 * IMPORTANT: Sport codes must match exactly with database sport_field_definitions table.
 */

/**
 * All supported sport codes (snake_case)
 * These must match the sport_code values in the sport_field_definitions table
 */
export type SportCode =
    | 'baseball'
    | 'basketball'
    | 'cheerleading'
    | 'cross_country'
    | 'dance'
    | 'diving'
    | 'field_hockey'
    | 'flag_football'
    | 'football'
    | 'golf'
    | 'gymnastics'
    | 'ice_hockey'
    | 'lacrosse'
    | 'soccer'
    | 'softball'
    | 'swimming'
    | 'tennis'
    | 'track_field'
    | 'volleyball'
    | 'wrestling'

/**
 * Array of all sport codes for iteration
 */
export const SPORT_CODES: readonly SportCode[] = [
    'baseball',
    'basketball',
    'cheerleading',
    'cross_country',
    'dance',
    'diving',
    'field_hockey',
    'flag_football',
    'football',
    'golf',
    'gymnastics',
    'ice_hockey',
    'lacrosse',
    'soccer',
    'softball',
    'swimming',
    'tennis',
    'track_field',
    'volleyball',
    'wrestling',
] as const

/**
 * Human-readable sport names
 */
export const SPORT_NAMES: Record<SportCode, string> = {
    baseball: 'Baseball',
    basketball: 'Basketball',
    cheerleading: 'Cheerleading',
    cross_country: 'Cross Country',
    dance: 'Dance',
    diving: 'Diving',
    field_hockey: 'Field Hockey',
    flag_football: 'Flag Football',
    football: 'Football',
    golf: 'Golf',
    gymnastics: 'Gymnastics',
    ice_hockey: 'Ice Hockey',
    lacrosse: 'Lacrosse',
    soccer: 'Soccer',
    softball: 'Softball',
    swimming: 'Swimming',
    tennis: 'Tennis',
    track_field: 'Track & Field',
    volleyball: 'Volleyball',
    wrestling: 'Wrestling',
} as const

/**
 * Field types supported in sport_field_definitions
 */
export type FieldType =
    | 'text'
    | 'int'
    | 'numeric'
    | 'bool'
    | 'enum'
    | 'multi_enum'
    | 'time'
    | 'object'

/**
 * Field groups (profile vs equipment)
 */
export type FieldGroup = 'profile' | 'equipment'

/**
 * Shoe sizing systems
 */
export type ShoeSizeSystem = 'us' | 'eu' | 'uk'

/**
 * Shoe width options
 */
export type ShoeWidth = 'narrow' | 'standard' | 'wide'

/**
 * Standard t-shirt sizes
 */
export type TShirtSize =
    | 'YS'
    | 'YM'
    | 'YL'
    | 'AS'
    | 'AM'
    | 'AL'
    | 'AXL'
    | 'AXXL'
    | 'AXXXL'

/**
 * Standard shorts sizes (same as t-shirt)
 */
export type ShortsSize = TShirtSize

/**
 * Dominant hand options
 */
export type DominantHand = 'left' | 'right' | 'ambidextrous'

/**
 * Helper function to check if a string is a valid sport code
 */
export function isValidSportCode(code: string): code is SportCode {
    return SPORT_CODES.includes(code as SportCode)
}

/**
 * Helper function to get sport name from code
 */
export function getSportName(code: SportCode): string {
    return SPORT_NAMES[code]
}

/**
 * Helper function to validate field type
 */
export function isValidFieldType(type: string): type is FieldType {
    return ['text', 'int', 'numeric', 'bool', 'enum', 'multi_enum', 'time', 'object'].includes(type)
}

/**
 * Helper function to validate field group
 */
export function isValidFieldGroup(group: string): group is FieldGroup {
    return group === 'profile' || group === 'equipment'
}
