/**
 * Sport Field Catalog
 * 
 * Comprehensive catalog of all sport-specific fields for client-side reference.
 * This mirrors the database sport_field_definitions table but provides
 * type-safe access and IDE autocomplete.
 * 
 * IMPORTANT: This is a reference catalog. The database sport_field_definitions
 * table is the source of truth. Use this for type checking and IDE support only.
 */

import type { SportCode, FieldType, FieldGroup } from '../types/sports'

/**
 * Field definition structure
 */
export interface FieldCatalogEntry {
    key: string
    label: string
    type: FieldType
    group: FieldGroup
    enumValues?: readonly string[]
    unit?: string
    helpTextKey?: string  // Key for i18n lookup
    sortOrder: number
}

/**
 * Sport field catalog structure
 */
export interface SportFieldCatalog {
    profile: readonly FieldCatalogEntry[]
    equipment: readonly FieldCatalogEntry[]
}

/**
 * BASEBALL
 */
export const BASEBALL_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_position', label: 'Primary Position', type: 'enum', group: 'profile', enumValues: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'], helpTextKey: 'baseball.primary_position.help', sortOrder: 10 },
        { key: 'secondary_positions', label: 'Secondary Position(s)', type: 'multi_enum', group: 'profile', enumValues: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'], helpTextKey: 'baseball.secondary_positions.help', sortOrder: 20 },
        { key: 'batting_hand', label: 'Batting Hand', type: 'enum', group: 'profile', enumValues: ['left', 'right', 'switch'], helpTextKey: 'baseball.batting_hand.help', sortOrder: 30 },
        { key: 'throwing_hand', label: 'Throwing Hand', type: 'enum', group: 'profile', enumValues: ['left', 'right'], helpTextKey: 'baseball.throwing_hand.help', sortOrder: 40 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'baseball.years_experience.help', sortOrder: 50 },
    ],
    equipment: [
        { key: 'glove_size_in', label: 'Glove Size (inches)', type: 'text', group: 'equipment', unit: 'in', helpTextKey: 'baseball.glove_size_in.help', sortOrder: 100 },
        { key: 'glove_type', label: 'Glove Type', type: 'enum', group: 'equipment', enumValues: ['infield', 'outfield', 'pitcher', 'catcher', 'first_base'], helpTextKey: 'baseball.glove_type.help', sortOrder: 110 },
        { key: 'bat_length_in', label: 'Bat Length (inches)', type: 'text', group: 'equipment', unit: 'in', helpTextKey: 'baseball.bat_length_in.help', sortOrder: 120 },
        { key: 'bat_weight_oz', label: 'Bat Weight (ounces)', type: 'text', group: 'equipment', unit: 'oz', helpTextKey: 'baseball.bat_weight_oz.help', sortOrder: 130 },
        { key: 'helmet_size', label: 'Helmet Size', type: 'text', group: 'equipment', helpTextKey: 'baseball.helmet_size.help', sortOrder: 140 },
        { key: 'cleat_size', label: 'Cleat Size', type: 'text', group: 'equipment', helpTextKey: 'baseball.cleat_size.help', sortOrder: 150 },
        { key: 'belt_size_in', label: 'Belt Size (inches)', type: 'text', group: 'equipment', unit: 'in', helpTextKey: 'baseball.belt_size_in.help', sortOrder: 160 },
        { key: 'pants_inseam_in', label: 'Pants Inseam (inches)', type: 'text', group: 'equipment', unit: 'in', helpTextKey: 'baseball.pants_inseam_in.help', sortOrder: 170 },
        { key: 'pants_waist_in', label: 'Pants Waist (inches)', type: 'text', group: 'equipment', unit: 'in', helpTextKey: 'baseball.pants_waist_in.help', sortOrder: 180 },
        { key: 'pants_fit', label: 'Pants Fit Preference', type: 'enum', group: 'equipment', enumValues: ['relaxed', 'regular', 'tapered'], helpTextKey: 'baseball.pants_fit.help', sortOrder: 190 },
        { key: 'catchers_gear_size', label: "Catcher's Gear Size", type: 'text', group: 'equipment', helpTextKey: 'baseball.catchers_gear_size.help', sortOrder: 200 },
    ],
} as const

/**
 * BASKETBALL
 */
export const BASKETBALL_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_position', label: 'Primary Position', type: 'enum', group: 'profile', enumValues: ['PG', 'SG', 'SF', 'PF', 'C'], helpTextKey: 'basketball.primary_position.help', sortOrder: 10 },
        { key: 'secondary_position', label: 'Secondary Position', type: 'enum', group: 'profile', enumValues: ['PG', 'SG', 'SF', 'PF', 'C'], helpTextKey: 'basketball.secondary_position.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'basketball.years_experience.help', sortOrder: 30 },
        { key: 'wingspan_in', label: 'Wingspan (inches)', type: 'int', group: 'profile', unit: 'in', helpTextKey: 'basketball.wingspan_in.help', sortOrder: 40 },
        { key: 'vertical_jump_in', label: 'Vertical Jump (inches)', type: 'int', group: 'profile', unit: 'in', helpTextKey: 'basketball.vertical_jump_in.help', sortOrder: 50 },
    ],
    equipment: [
        { key: 'jersey_size', label: 'Jersey Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'basketball.jersey_size.help', sortOrder: 100 },
        { key: 'shorts_size', label: 'Shorts Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'basketball.shorts_size.help', sortOrder: 110 },
        { key: 'shorts_length_pref', label: 'Shorts Length Preference', type: 'enum', group: 'equipment', enumValues: ['short', 'medium', 'long'], helpTextKey: 'basketball.shorts_length_pref.help', sortOrder: 120 },
        { key: 'shoe_size', label: 'Shoe Size', type: 'text', group: 'equipment', helpTextKey: 'basketball.shoe_size.help', sortOrder: 130 },
        { key: 'shoe_width', label: 'Shoe Width', type: 'enum', group: 'equipment', enumValues: ['narrow', 'standard', 'wide'], helpTextKey: 'basketball.shoe_width.help', sortOrder: 140 },
        { key: 'compression_sleeve_size', label: 'Compression Sleeve Size', type: 'enum', group: 'equipment', enumValues: ['S', 'M', 'L', 'XL'], helpTextKey: 'basketball.compression_sleeve_size.help', sortOrder: 150 },
        { key: 'headband_size', label: 'Headband Size', type: 'enum', group: 'equipment', enumValues: ['OSFA', 'S/M', 'L/XL'], helpTextKey: 'basketball.headband_size.help', sortOrder: 160 },
    ],
} as const

/**
 * Complete sport field catalog mapping
 */
export const SPORT_FIELD_CATALOG: Record<SportCode, SportFieldCatalog> = {
    baseball: BASEBALL_FIELDS,
    basketball: BASKETBALL_FIELDS,
    // Note: Remaining sports will be added in subsequent constants files
    // to keep file size manageable. This demonstrates the pattern.
    cheerleading: { profile: [], equipment: [] },
    cross_country: { profile: [], equipment: [] },
    dance: { profile: [], equipment: [] },
    diving: { profile: [], equipment: [] },
    field_hockey: { profile: [], equipment: [] },
    flag_football: { profile: [], equipment: [] },
    football: { profile: [], equipment: [] },
    golf: { profile: [], equipment: [] },
    gymnastics: { profile: [], equipment: [] },
    ice_hockey: { profile: [], equipment: [] },
    lacrosse: { profile: [], equipment: [] },
    soccer: { profile: [], equipment: [] },
    softball: { profile: [], equipment: [] },
    swimming: { profile: [], equipment: [] },
    tennis: { profile: [], equipment: [] },
    track_field: { profile: [], equipment: [] },
    volleyball: { profile: [], equipment: [] },
    wrestling: { profile: [], equipment: [] },
} as const

/**
 * Helper function to get field catalog for a sport
 */
export function getSportFieldCatalog(sportCode: SportCode): SportFieldCatalog {
    return SPORT_FIELD_CATALOG[sportCode]
}

/**
 * Helper function to get all fields for a sport (profile + equipment)
 */
export function getAllFieldsForSport(sportCode: SportCode): readonly FieldCatalogEntry[] {
    const catalog = getSportFieldCatalog(sportCode)
    return [...catalog.profile, ...catalog.equipment]
}

/**
 * Helper function to get field by key
 */
export function getFieldByKey(sportCode: SportCode, fieldKey: string): FieldCatalogEntry | undefined {
    const allFields = getAllFieldsForSport(sportCode)
    return allFields.find(f => f.key === fieldKey)
}
