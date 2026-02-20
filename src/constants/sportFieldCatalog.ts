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
 * SOCCER
 */
export const SOCCER_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_position', label: 'Primary Position', type: 'enum', group: 'profile', enumValues: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Winger'], helpTextKey: 'soccer.primary_position.help', sortOrder: 10 },
        { key: 'secondary_position', label: 'Secondary Position', type: 'enum', group: 'profile', enumValues: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Winger'], helpTextKey: 'soccer.secondary_position.help', sortOrder: 20 },
        { key: 'preferred_foot', label: 'Preferred Foot', type: 'enum', group: 'profile', enumValues: ['left', 'right', 'both'], helpTextKey: 'soccer.preferred_foot.help', sortOrder: 30 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'soccer.years_experience.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'jersey_size', label: 'Jersey Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'soccer.jersey_size.help', sortOrder: 100 },
        { key: 'shorts_size', label: 'Shorts Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'soccer.shorts_size.help', sortOrder: 110 },
        { key: 'sock_size', label: 'Sock Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL'], helpTextKey: 'soccer.sock_size.help', sortOrder: 120 },
        { key: 'cleat_size', label: 'Cleat Size', type: 'text', group: 'equipment', helpTextKey: 'soccer.cleat_size.help', sortOrder: 130 },
        { key: 'shin_guard_size', label: 'Shin Guard Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'soccer.shin_guard_size.help', sortOrder: 140 },
        { key: 'goalkeeper_glove_size', label: 'Goalkeeper Glove Size', type: 'text', group: 'equipment', helpTextKey: 'soccer.goalkeeper_glove_size.help', sortOrder: 150 },
    ],
} as const

/**
 * TENNIS
 */
export const TENNIS_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_hand', label: 'Playing Hand', type: 'enum', group: 'profile', enumValues: ['right', 'left'], helpTextKey: 'tennis.primary_hand.help', sortOrder: 10 },
        { key: 'playing_style', label: 'Playing Style', type: 'enum', group: 'profile', enumValues: ['baseline', 'all-court', 'serve-and-volley', 'counterpuncher'], helpTextKey: 'tennis.playing_style.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'tennis.years_experience.help', sortOrder: 30 },
    ],
    equipment: [
        { key: 'racket_grip_size', label: 'Racket Grip Size', type: 'text', group: 'equipment', helpTextKey: 'tennis.racket_grip_size.help', sortOrder: 100 },
        { key: 'shoe_size', label: 'Shoe Size', type: 'text', group: 'equipment', helpTextKey: 'tennis.shoe_size.help', sortOrder: 110 },
        { key: 'shoe_width', label: 'Shoe Width', type: 'enum', group: 'equipment', enumValues: ['narrow', 'standard', 'wide'], helpTextKey: 'tennis.shoe_width.help', sortOrder: 120 },
        { key: 'clothing_size', label: 'Clothing Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'tennis.clothing_size.help', sortOrder: 130 },
    ],
} as const

/**
 * FOOTBALL
 */
export const FOOTBALL_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_position', label: 'Primary Position', type: 'enum', group: 'profile', enumValues: ['QB', 'RB', 'WR', 'TE', 'OL', 'C', 'G', 'T', 'DL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P', 'LS'], helpTextKey: 'football.primary_position.help', sortOrder: 10 },
        { key: 'secondary_position', label: 'Secondary Position', type: 'enum', group: 'profile', enumValues: ['QB', 'RB', 'WR', 'TE', 'OL', 'C', 'G', 'T', 'DL', 'DE', 'DT', 'LB', 'CB', 'S', 'K', 'P', 'LS'], helpTextKey: 'football.secondary_position.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'football.years_experience.help', sortOrder: 30 },
        { key: 'throwing_hand', label: 'Throwing Hand', type: 'enum', group: 'profile', enumValues: ['left', 'right'], helpTextKey: 'football.throwing_hand.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'helmet_size', label: 'Helmet Size', type: 'text', group: 'equipment', helpTextKey: 'football.helmet_size.help', sortOrder: 100 },
        { key: 'shoulder_pad_size', label: 'Shoulder Pad Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], helpTextKey: 'football.shoulder_pad_size.help', sortOrder: 110 },
        { key: 'jersey_size', label: 'Jersey Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'football.jersey_size.help', sortOrder: 120 },
        { key: 'pants_size', label: 'Pants Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'football.pants_size.help', sortOrder: 130 },
        { key: 'cleat_size', label: 'Cleat Size', type: 'text', group: 'equipment', helpTextKey: 'football.cleat_size.help', sortOrder: 140 },
        { key: 'glove_size', label: 'Glove Size', type: 'text', group: 'equipment', helpTextKey: 'football.glove_size.help', sortOrder: 150 },
        { key: 'thigh_knee_pad_size', label: 'Thigh/Knee Pad Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL'], helpTextKey: 'football.thigh_knee_pad_size.help', sortOrder: 160 },
    ],
} as const

/**
 * SOFTBALL
 */
export const SOFTBALL_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_position', label: 'Primary Position', type: 'enum', group: 'profile', enumValues: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DP', 'Flex'], helpTextKey: 'softball.primary_position.help', sortOrder: 10 },
        { key: 'secondary_positions', label: 'Secondary Position(s)', type: 'multi_enum', group: 'profile', enumValues: ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DP', 'Flex'], helpTextKey: 'softball.secondary_positions.help', sortOrder: 20 },
        { key: 'batting_hand', label: 'Batting Hand', type: 'enum', group: 'profile', enumValues: ['left', 'right', 'switch'], helpTextKey: 'softball.batting_hand.help', sortOrder: 30 },
        { key: 'throwing_hand', label: 'Throwing Hand', type: 'enum', group: 'profile', enumValues: ['left', 'right'], helpTextKey: 'softball.throwing_hand.help', sortOrder: 40 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'softball.years_experience.help', sortOrder: 50 },
    ],
    equipment: [
        { key: 'glove_size_in', label: 'Glove Size (inches)', type: 'text', group: 'equipment', unit: 'in', helpTextKey: 'softball.glove_size_in.help', sortOrder: 100 },
        { key: 'glove_type', label: 'Glove Type', type: 'enum', group: 'equipment', enumValues: ['infield', 'outfield', 'pitcher', 'catcher', 'first_base'], helpTextKey: 'softball.glove_type.help', sortOrder: 110 },
        { key: 'bat_length_in', label: 'Bat Length (inches)', type: 'text', group: 'equipment', unit: 'in', helpTextKey: 'softball.bat_length_in.help', sortOrder: 120 },
        { key: 'bat_weight_oz', label: 'Bat Weight (ounces)', type: 'text', group: 'equipment', unit: 'oz', helpTextKey: 'softball.bat_weight_oz.help', sortOrder: 130 },
        { key: 'helmet_size', label: 'Helmet Size', type: 'text', group: 'equipment', helpTextKey: 'softball.helmet_size.help', sortOrder: 140 },
        { key: 'cleat_size', label: 'Cleat Size', type: 'text', group: 'equipment', helpTextKey: 'softball.cleat_size.help', sortOrder: 150 },
        { key: 'face_mask_size', label: 'Face Mask Size (catcher)', type: 'text', group: 'equipment', helpTextKey: 'softball.face_mask_size.help', sortOrder: 160 },
        { key: 'sliding_short_size', label: 'Sliding Short Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'softball.sliding_short_size.help', sortOrder: 170 },
    ],
} as const

/**
 * VOLLEYBALL
 */
export const VOLLEYBALL_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_position', label: 'Primary Position', type: 'enum', group: 'profile', enumValues: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite', 'Libero', 'Defensive Specialist'], helpTextKey: 'volleyball.primary_position.help', sortOrder: 10 },
        { key: 'secondary_position', label: 'Secondary Position', type: 'enum', group: 'profile', enumValues: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite', 'Libero', 'Defensive Specialist'], helpTextKey: 'volleyball.secondary_position.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'volleyball.years_experience.help', sortOrder: 30 },
        { key: 'approach_jump_reach_in', label: 'Approach Jump Reach (inches)', type: 'int', group: 'profile', unit: 'in', helpTextKey: 'volleyball.approach_jump_reach_in.help', sortOrder: 40 },
        { key: 'block_reach_in', label: 'Block Reach (inches)', type: 'int', group: 'profile', unit: 'in', helpTextKey: 'volleyball.block_reach_in.help', sortOrder: 50 },
    ],
    equipment: [
        { key: 'jersey_size', label: 'Jersey Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'volleyball.jersey_size.help', sortOrder: 100 },
        { key: 'shorts_size', label: 'Shorts Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'volleyball.shorts_size.help', sortOrder: 110 },
        { key: 'knee_pad_size', label: 'Knee Pad Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'volleyball.knee_pad_size.help', sortOrder: 120 },
        { key: 'shoe_size', label: 'Shoe Size', type: 'text', group: 'equipment', helpTextKey: 'volleyball.shoe_size.help', sortOrder: 130 },
        { key: 'shoe_width', label: 'Shoe Width', type: 'enum', group: 'equipment', enumValues: ['narrow', 'standard', 'wide'], helpTextKey: 'volleyball.shoe_width.help', sortOrder: 140 },
        { key: 'ankle_brace_size', label: 'Ankle Brace Size (if used)', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'volleyball.ankle_brace_size.help', sortOrder: 150 },
    ],
} as const

/**
 * LACROSSE
 */
export const LACROSSE_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_position', label: 'Primary Position', type: 'enum', group: 'profile', enumValues: ['Attack', 'Midfield', 'Defense', 'Goalie'], helpTextKey: 'lacrosse.primary_position.help', sortOrder: 10 },
        { key: 'secondary_position', label: 'Secondary Position', type: 'enum', group: 'profile', enumValues: ['Attack', 'Midfield', 'Defense', 'Goalie'], helpTextKey: 'lacrosse.secondary_position.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'lacrosse.years_experience.help', sortOrder: 30 },
        { key: 'shooting_hand', label: 'Shooting Hand', type: 'enum', group: 'profile', enumValues: ['left', 'right', 'both'], helpTextKey: 'lacrosse.shooting_hand.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'helmet_size', label: 'Helmet Size', type: 'text', group: 'equipment', helpTextKey: 'lacrosse.helmet_size.help', sortOrder: 100 },
        { key: 'shoulder_pad_size', label: 'Shoulder Pad Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'lacrosse.shoulder_pad_size.help', sortOrder: 110 },
        { key: 'arm_guard_size', label: 'Arm Guard Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'lacrosse.arm_guard_size.help', sortOrder: 120 },
        { key: 'glove_size', label: 'Glove Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'lacrosse.glove_size.help', sortOrder: 130 },
        { key: 'jersey_size', label: 'Jersey Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'lacrosse.jersey_size.help', sortOrder: 140 },
        { key: 'cleat_size', label: 'Cleat Size', type: 'text', group: 'equipment', helpTextKey: 'lacrosse.cleat_size.help', sortOrder: 150 },
        { key: 'stick_length_preference', label: 'Stick Length Preference', type: 'enum', group: 'equipment', enumValues: ['short', 'standard', 'long', 'attack', 'defense', 'goalie'], helpTextKey: 'lacrosse.stick_length_preference.help', sortOrder: 160 },
        { key: 'goalie_chest_protector_size', label: "Goalie Chest Protector Size", type: 'enum', group: 'equipment', enumValues: ['YS', 'AS', 'AM', 'AL', 'AXL'], helpTextKey: 'lacrosse.goalie_chest_protector_size.help', sortOrder: 170 },
    ],
} as const

/**
 * SWIMMING
 */
export const SWIMMING_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_strokes', label: 'Primary Stroke(s)', type: 'multi_enum', group: 'profile', enumValues: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'IM'], helpTextKey: 'swimming.primary_strokes.help', sortOrder: 10 },
        { key: 'secondary_strokes', label: 'Secondary Stroke(s)', type: 'multi_enum', group: 'profile', enumValues: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'IM'], helpTextKey: 'swimming.secondary_strokes.help', sortOrder: 20 },
        { key: 'preferred_distance', label: 'Preferred Distance', type: 'enum', group: 'profile', enumValues: ['sprint', 'middle', 'distance', 'varied'], helpTextKey: 'swimming.preferred_distance.help', sortOrder: 30 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'swimming.years_experience.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'suit_size', label: 'Suit Size', type: 'enum', group: 'equipment', enumValues: ['22', '24', '26', '28', '30', '32', '34', '36', '38', '40', 'custom'], helpTextKey: 'swimming.suit_size.help', sortOrder: 100 },
        { key: 'goggle_size', label: 'Goggle Size', type: 'enum', group: 'equipment', enumValues: ['junior', 'standard', 'large', 'prescription'], helpTextKey: 'swimming.goggle_size.help', sortOrder: 110 },
        { key: 'cap_size', label: 'Cap Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'swimming.cap_size.help', sortOrder: 120 },
        { key: 'fin_size', label: 'Fin Size (if used)', type: 'text', group: 'equipment', helpTextKey: 'swimming.fin_size.help', sortOrder: 130 },
        { key: 'pull_buoy_size', label: 'Pull Buoy Size', type: 'enum', group: 'equipment', enumValues: ['junior', 'standard', 'large'], helpTextKey: 'swimming.pull_buoy_size.help', sortOrder: 140 },
    ],
} as const

/**
 * TRACK & FIELD
 */
export const TRACK_FIELD_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_events', label: 'Primary Event(s)', type: 'multi_enum', group: 'profile', enumValues: ['100m', '200m', '400m', '800m', '1600m', '3200m', '100mH', '110mH', '300mH', '4x100', '4x400', 'Long Jump', 'High Jump', 'Triple Jump', 'Pole Vault', 'Shot Put', 'Discus', 'Javelin'], helpTextKey: 'track_field.primary_events.help', sortOrder: 10 },
        { key: 'secondary_events', label: 'Secondary Event(s)', type: 'multi_enum', group: 'profile', enumValues: ['100m', '200m', '400m', '800m', '1600m', '3200m', '100mH', '110mH', '300mH', '4x100', '4x400', 'Long Jump', 'High Jump', 'Triple Jump', 'Pole Vault', 'Shot Put', 'Discus', 'Javelin'], helpTextKey: 'track_field.secondary_events.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'track_field.years_experience.help', sortOrder: 30 },
        { key: 'throwing_hand', label: 'Throwing Hand (throws)', type: 'enum', group: 'profile', enumValues: ['left', 'right'], helpTextKey: 'track_field.throwing_hand.help', sortOrder: 40 },
        { key: 'approach_hand', label: 'Approach Hand (jumps)', type: 'enum', group: 'profile', enumValues: ['left', 'right'], helpTextKey: 'track_field.approach_hand.help', sortOrder: 50 },
    ],
    equipment: [
        { key: 'spike_size', label: 'Spike Size', type: 'text', group: 'equipment', helpTextKey: 'track_field.spike_size.help', sortOrder: 100 },
        { key: 'spike_type', label: 'Spike Type', type: 'enum', group: 'equipment', enumValues: ['sprint', 'distance', 'mid_distance', 'jump', 'throw', 'multi'], helpTextKey: 'track_field.spike_type.help', sortOrder: 110 },
        { key: 'singlet_size', label: 'Singlet Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'track_field.singlet_size.help', sortOrder: 120 },
        { key: 'racing_flats_size', label: 'Racing Flats Size', type: 'text', group: 'equipment', helpTextKey: 'track_field.racing_flats_size.help', sortOrder: 130 },
        { key: 'shot_put_weight_kg', label: 'Shot Put Weight (kg)', type: 'text', group: 'equipment', unit: 'kg', helpTextKey: 'track_field.shot_put_weight_kg.help', sortOrder: 140 },
        { key: 'discus_weight_kg', label: 'Discus Weight (kg)', type: 'text', group: 'equipment', unit: 'kg', helpTextKey: 'track_field.discus_weight_kg.help', sortOrder: 150 },
    ],
} as const

/**
 * GOLF
 */
export const GOLF_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'handicap_index', label: 'Handicap Index', type: 'numeric', group: 'profile', helpTextKey: 'golf.handicap_index.help', sortOrder: 10 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'golf.years_experience.help', sortOrder: 20 },
        { key: 'playing_hand', label: 'Playing Hand', type: 'enum', group: 'profile', enumValues: ['right', 'left'], helpTextKey: 'golf.playing_hand.help', sortOrder: 30 },
        { key: 'typical_driver_distance_yd', label: 'Typical Driver Distance (yards)', type: 'int', group: 'profile', unit: 'yd', helpTextKey: 'golf.typical_driver_distance_yd.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'glove_size', label: 'Glove Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], helpTextKey: 'golf.glove_size.help', sortOrder: 100 },
        { key: 'shoe_size', label: 'Shoe Size', type: 'text', group: 'equipment', helpTextKey: 'golf.shoe_size.help', sortOrder: 110 },
        { key: 'shoe_width', label: 'Shoe Width', type: 'enum', group: 'equipment', enumValues: ['narrow', 'standard', 'wide'], helpTextKey: 'golf.shoe_width.help', sortOrder: 120 },
        { key: 'shirt_size', label: 'Shirt/Polo Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'golf.shirt_size.help', sortOrder: 130 },
        { key: 'pants_size', label: 'Pants/Short Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'golf.pants_size.help', sortOrder: 140 },
        { key: 'club_set_length', label: 'Club Set (e.g. standard, +1 in)', type: 'text', group: 'equipment', helpTextKey: 'golf.club_set_length.help', sortOrder: 150 },
    ],
} as const

/**
 * GYMNASTICS
 */
export const GYMNASTICS_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_discipline', label: 'Primary Discipline', type: 'enum', group: 'profile', enumValues: ['Artistic', 'Rhythmic', 'Trampoline', 'Acrobatic', 'Tumbling'], helpTextKey: 'gymnastics.primary_discipline.help', sortOrder: 10 },
        { key: 'secondary_discipline', label: 'Secondary Discipline', type: 'enum', group: 'profile', enumValues: ['Artistic', 'Rhythmic', 'Trampoline', 'Acrobatic', 'Tumbling'], helpTextKey: 'gymnastics.secondary_discipline.help', sortOrder: 20 },
        { key: 'artistic_events', label: 'Artistic Events (if applicable)', type: 'multi_enum', group: 'profile', enumValues: ['Vault', 'Bars', 'Beam', 'Floor', 'Pommel Horse', 'Rings', 'Parallel Bars', 'High Bar'], helpTextKey: 'gymnastics.artistic_events.help', sortOrder: 30 },
        { key: 'level', label: 'Level', type: 'text', group: 'profile', helpTextKey: 'gymnastics.level.help', sortOrder: 40 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'gymnastics.years_experience.help', sortOrder: 50 },
    ],
    equipment: [
        { key: 'leotard_size', label: 'Leotard Size', type: 'enum', group: 'equipment', enumValues: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'child_2', 'child_4', 'child_6', 'child_8', 'child_10', 'child_12', 'child_14'], helpTextKey: 'gymnastics.leotard_size.help', sortOrder: 100 },
        { key: 'grip_size', label: 'Grip Size (bars)', type: 'text', group: 'equipment', helpTextKey: 'gymnastics.grip_size.help', sortOrder: 110 },
        { key: 'wrist_guard_size', label: 'Wrist Guard Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'gymnastics.wrist_guard_size.help', sortOrder: 120 },
        { key: 'shoe_size', label: 'Shoe Size (rhythmic/tumbling)', type: 'text', group: 'equipment', helpTextKey: 'gymnastics.shoe_size.help', sortOrder: 130 },
        { key: 'footie_size', label: 'Footie/Half Sole Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'gymnastics.footie_size.help', sortOrder: 140 },
    ],
} as const

/**
 * CHEERLEADING
 */
export const CHEERLEADING_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_role', label: 'Primary Role', type: 'enum', group: 'profile', enumValues: ['Flyer', 'Base', 'Back Spot', 'Front Spot', 'Tumbler', 'All-around'], helpTextKey: 'cheerleading.primary_role.help', sortOrder: 10 },
        { key: 'secondary_roles', label: 'Secondary Role(s)', type: 'multi_enum', group: 'profile', enumValues: ['Flyer', 'Base', 'Back Spot', 'Front Spot', 'Tumbler', 'All-around'], helpTextKey: 'cheerleading.secondary_roles.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'cheerleading.years_experience.help', sortOrder: 30 },
        { key: 'tumbling_level', label: 'Tumbling Level', type: 'enum', group: 'profile', enumValues: ['beginner', 'intermediate', 'advanced', 'elite', 'none'], helpTextKey: 'cheerleading.tumbling_level.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'uniform_size', label: 'Uniform Size', type: 'enum', group: 'equipment', enumValues: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'child_4', 'child_6', 'child_8', 'child_10', 'child_12', 'child_14', 'child_16'], helpTextKey: 'cheerleading.uniform_size.help', sortOrder: 100 },
        { key: 'shell_size', label: 'Shell Top Size', type: 'enum', group: 'equipment', enumValues: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'], helpTextKey: 'cheerleading.shell_size.help', sortOrder: 110 },
        { key: 'skirt_size', label: 'Skirt Size', type: 'enum', group: 'equipment', enumValues: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'], helpTextKey: 'cheerleading.skirt_size.help', sortOrder: 120 },
        { key: 'bow_size', label: 'Bow Size', type: 'enum', group: 'equipment', enumValues: ['small', 'medium', 'large', 'extra_large'], helpTextKey: 'cheerleading.bow_size.help', sortOrder: 130 },
        { key: 'sneaker_size', label: 'Sneaker Size', type: 'text', group: 'equipment', helpTextKey: 'cheerleading.sneaker_size.help', sortOrder: 140 },
        { key: 'sports_bra_size', label: 'Sports Bra Size (if applicable)', type: 'text', group: 'equipment', helpTextKey: 'cheerleading.sports_bra_size.help', sortOrder: 150 },
    ],
} as const

/**
 * DANCE
 */
export const DANCE_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_style', label: 'Primary Style', type: 'enum', group: 'profile', enumValues: ['Ballet', 'Jazz', 'Hip Hop', 'Tap', 'Contemporary', 'Lyrical', 'Modern', 'Pointe', 'Irish', 'Latin', 'Ballroom', 'Other'], helpTextKey: 'dance.primary_style.help', sortOrder: 10 },
        { key: 'secondary_styles', label: 'Secondary Style(s)', type: 'multi_enum', group: 'profile', enumValues: ['Ballet', 'Jazz', 'Hip Hop', 'Tap', 'Contemporary', 'Lyrical', 'Modern', 'Pointe', 'Irish', 'Latin', 'Ballroom', 'Other'], helpTextKey: 'dance.secondary_styles.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'dance.years_experience.help', sortOrder: 30 },
        { key: 'pointe_ready', label: 'Pointe Ready', type: 'bool', group: 'profile', helpTextKey: 'dance.pointe_ready.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'leotard_size', label: 'Leotard Size', type: 'enum', group: 'equipment', enumValues: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'child_2', 'child_4', 'child_6', 'child_8', 'child_10', 'child_12', 'child_14'], helpTextKey: 'dance.leotard_size.help', sortOrder: 100 },
        { key: 'tights_size', label: 'Tights Size', type: 'enum', group: 'equipment', enumValues: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'child_small', 'child_medium', 'child_large'], helpTextKey: 'dance.tights_size.help', sortOrder: 110 },
        { key: 'ballet_shoe_size', label: 'Ballet Shoe Size', type: 'text', group: 'equipment', helpTextKey: 'dance.ballet_shoe_size.help', sortOrder: 120 },
        { key: 'jazz_shoe_size', label: 'Jazz Shoe Size', type: 'text', group: 'equipment', helpTextKey: 'dance.jazz_shoe_size.help', sortOrder: 130 },
        { key: 'tap_shoe_size', label: 'Tap Shoe Size', type: 'text', group: 'equipment', helpTextKey: 'dance.tap_shoe_size.help', sortOrder: 140 },
        { key: 'pointe_shoe_size', label: 'Pointe Shoe Size (if applicable)', type: 'text', group: 'equipment', helpTextKey: 'dance.pointe_shoe_size.help', sortOrder: 150 },
        { key: 'hip_hop_shoe_size', label: 'Hip Hop / Sneaker Size', type: 'text', group: 'equipment', helpTextKey: 'dance.hip_hop_shoe_size.help', sortOrder: 160 },
    ],
} as const

/**
 * POMS
 */
export const POMS_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_role', label: 'Primary Role', type: 'enum', group: 'profile', enumValues: ['Captain', 'Squad Member', 'Featured Dancer'], helpTextKey: 'poms.primary_role.help', sortOrder: 10 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'poms.years_experience.help', sortOrder: 20 },
        { key: 'dance_background', label: 'Dance Background', type: 'enum', group: 'profile', enumValues: ['none', 'beginner', 'intermediate', 'advanced', 'competitive'], helpTextKey: 'poms.dance_background.help', sortOrder: 30 },
    ],
    equipment: [
        { key: 'uniform_size', label: 'Uniform Size', type: 'enum', group: 'equipment', enumValues: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'child_6', 'child_8', 'child_10', 'child_12', 'child_14', 'child_16'], helpTextKey: 'poms.uniform_size.help', sortOrder: 100 },
        { key: 'shell_size', label: 'Shell Top Size', type: 'enum', group: 'equipment', enumValues: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'], helpTextKey: 'poms.shell_size.help', sortOrder: 110 },
        { key: 'skirt_size', label: 'Skirt Size', type: 'enum', group: 'equipment', enumValues: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'], helpTextKey: 'poms.skirt_size.help', sortOrder: 120 },
        { key: 'pom_size_preference', label: 'Pom Size Preference', type: 'enum', group: 'equipment', enumValues: ['6in', '8in', '10in', '12in'], helpTextKey: 'poms.pom_size_preference.help', sortOrder: 130 },
        { key: 'sneaker_size', label: 'Sneaker Size', type: 'text', group: 'equipment', helpTextKey: 'poms.sneaker_size.help', sortOrder: 140 },
    ],
} as const

/**
 * DIVING
 */
export const DIVING_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_board', label: 'Primary Board', type: 'enum', group: 'profile', enumValues: ['1m', '3m', 'platform', 'all'], helpTextKey: 'diving.primary_board.help', sortOrder: 10 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'diving.years_experience.help', sortOrder: 20 },
        { key: 'dd_limit_approx', label: 'Approx. DD Limit (optional)', type: 'text', group: 'profile', helpTextKey: 'diving.dd_limit_approx.help', sortOrder: 30 },
    ],
    equipment: [
        { key: 'suit_size', label: 'Suit Size', type: 'enum', group: 'equipment', enumValues: ['22', '24', '26', '28', '30', '32', '34', '36', '38', '40', 'custom'], helpTextKey: 'diving.suit_size.help', sortOrder: 100 },
        { key: 'goggle_preference', label: 'Goggle Preference', type: 'enum', group: 'equipment', enumValues: ['none', 'practice_only', 'competition'], helpTextKey: 'diving.goggle_preference.help', sortOrder: 110 },
        { key: 'nose_clip', label: 'Nose Clip', type: 'bool', group: 'equipment', helpTextKey: 'diving.nose_clip.help', sortOrder: 120 },
    ],
} as const

/**
 * CROSS COUNTRY
 */
export const CROSS_COUNTRY_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_distance', label: 'Primary Distance', type: 'enum', group: 'profile', enumValues: ['5K', '5K_and_under', '5K_10K', '10K_plus', 'varied'], helpTextKey: 'cross_country.primary_distance.help', sortOrder: 10 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'cross_country.years_experience.help', sortOrder: 20 },
        { key: 'pace_group', label: 'Typical Pace Group (optional)', type: 'enum', group: 'profile', enumValues: ['elite', 'competitive', 'mid_pack', 'recreational'], helpTextKey: 'cross_country.pace_group.help', sortOrder: 30 },
    ],
    equipment: [
        { key: 'racing_shoe_size', label: 'Racing Shoe Size', type: 'text', group: 'equipment', helpTextKey: 'cross_country.racing_shoe_size.help', sortOrder: 100 },
        { key: 'training_shoe_size', label: 'Training Shoe Size', type: 'text', group: 'equipment', helpTextKey: 'cross_country.training_shoe_size.help', sortOrder: 110 },
        { key: 'singlet_size', label: 'Singlet Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'cross_country.singlet_size.help', sortOrder: 120 },
        { key: 'short_size', label: 'Short Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'cross_country.short_size.help', sortOrder: 130 },
        { key: 'spike_type', label: 'Spike Type', type: 'enum', group: 'equipment', enumValues: ['trail', 'cross_country', 'road_flat', 'none'], helpTextKey: 'cross_country.spike_type.help', sortOrder: 140 },
    ],
} as const

/**
 * FIELD HOCKEY
 */
export const FIELD_HOCKEY_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_position', label: 'Primary Position', type: 'enum', group: 'profile', enumValues: ['Forward', 'Midfielder', 'Defender', 'Goalie'], helpTextKey: 'field_hockey.primary_position.help', sortOrder: 10 },
        { key: 'secondary_position', label: 'Secondary Position', type: 'enum', group: 'profile', enumValues: ['Forward', 'Midfielder', 'Defender', 'Goalie'], helpTextKey: 'field_hockey.secondary_position.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'field_hockey.years_experience.help', sortOrder: 30 },
        { key: 'stick_hand', label: 'Stick Hand', type: 'enum', group: 'profile', enumValues: ['left', 'right'], helpTextKey: 'field_hockey.stick_hand.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'stick_length_in', label: 'Stick Length (inches)', type: 'text', group: 'equipment', unit: 'in', helpTextKey: 'field_hockey.stick_length_in.help', sortOrder: 100 },
        { key: 'jersey_size', label: 'Jersey Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'field_hockey.jersey_size.help', sortOrder: 110 },
        { key: 'skirt_size', label: 'Skort Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], helpTextKey: 'field_hockey.skirt_size.help', sortOrder: 120 },
        { key: 'cleat_size', label: 'Cleat Size', type: 'text', group: 'equipment', helpTextKey: 'field_hockey.cleat_size.help', sortOrder: 130 },
        { key: 'shin_guard_size', label: 'Shin Guard Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'field_hockey.shin_guard_size.help', sortOrder: 140 },
        { key: 'glove_size', label: 'Glove Size (goalie)', type: 'text', group: 'equipment', helpTextKey: 'field_hockey.glove_size.help', sortOrder: 150 },
        { key: 'leg_guard_size', label: 'Leg Guard Size (goalie)', type: 'enum', group: 'equipment', enumValues: ['small', 'medium', 'large', 'youth'], helpTextKey: 'field_hockey.leg_guard_size.help', sortOrder: 160 },
    ],
} as const

/**
 * FLAG FOOTBALL
 */
export const FLAG_FOOTBALL_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_position', label: 'Primary Position', type: 'enum', group: 'profile', enumValues: ['QB', 'RB', 'WR', 'TE', 'C', 'Blitzer', 'Safety', 'Corner', 'Rusher'], helpTextKey: 'flag_football.primary_position.help', sortOrder: 10 },
        { key: 'secondary_position', label: 'Secondary Position', type: 'enum', group: 'profile', enumValues: ['QB', 'RB', 'WR', 'TE', 'C', 'Blitzer', 'Safety', 'Corner', 'Rusher'], helpTextKey: 'flag_football.secondary_position.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'flag_football.years_experience.help', sortOrder: 30 },
        { key: 'throwing_hand', label: 'Throwing Hand', type: 'enum', group: 'profile', enumValues: ['left', 'right'], helpTextKey: 'flag_football.throwing_hand.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'jersey_size', label: 'Jersey Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'flag_football.jersey_size.help', sortOrder: 100 },
        { key: 'shorts_size', label: 'Shorts Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'flag_football.shorts_size.help', sortOrder: 110 },
        { key: 'cleat_size', label: 'Cleat Size', type: 'text', group: 'equipment', helpTextKey: 'flag_football.cleat_size.help', sortOrder: 120 },
        { key: 'glove_size', label: 'Glove Size (optional)', type: 'text', group: 'equipment', helpTextKey: 'flag_football.glove_size.help', sortOrder: 130 },
        { key: 'belt_size', label: 'Flag Belt Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'flag_football.belt_size.help', sortOrder: 140 },
    ],
} as const

/**
 * ICE HOCKEY
 */
export const ICE_HOCKEY_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_position', label: 'Primary Position', type: 'enum', group: 'profile', enumValues: ['Center', 'Left Wing', 'Right Wing', 'Defense', 'Goalie'], helpTextKey: 'ice_hockey.primary_position.help', sortOrder: 10 },
        { key: 'secondary_position', label: 'Secondary Position', type: 'enum', group: 'profile', enumValues: ['Center', 'Left Wing', 'Right Wing', 'Defense', 'Goalie'], helpTextKey: 'ice_hockey.secondary_position.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'ice_hockey.years_experience.help', sortOrder: 30 },
        { key: 'shooting_hand', label: 'Shooting Hand', type: 'enum', group: 'profile', enumValues: ['left', 'right'], helpTextKey: 'ice_hockey.shooting_hand.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'helmet_size', label: 'Helmet Size', type: 'text', group: 'equipment', helpTextKey: 'ice_hockey.helmet_size.help', sortOrder: 100 },
        { key: 'shoulder_pad_size', label: 'Shoulder Pad Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'youth_s', 'youth_m', 'youth_l'], helpTextKey: 'ice_hockey.shoulder_pad_size.help', sortOrder: 110 },
        { key: 'elbow_pad_size', label: 'Elbow Pad Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'ice_hockey.elbow_pad_size.help', sortOrder: 120 },
        { key: 'glove_size', label: 'Glove Size', type: 'enum', group: 'equipment', enumValues: ['10', '11', '12', '13', '14', '15', 'youth'], helpTextKey: 'ice_hockey.glove_size.help', sortOrder: 130 },
        { key: 'pant_size', label: 'Pant Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'youth_s', 'youth_m', 'youth_l'], helpTextKey: 'ice_hockey.pant_size.help', sortOrder: 140 },
        { key: 'skate_size', label: 'Skate Size', type: 'text', group: 'equipment', helpTextKey: 'ice_hockey.skate_size.help', sortOrder: 150 },
        { key: 'stick_length_preference', label: 'Stick Length', type: 'enum', group: 'equipment', enumValues: ['junior', 'intermediate', 'senior', 'senior_extended'], helpTextKey: 'ice_hockey.stick_length_preference.help', sortOrder: 160 },
        { key: 'jersey_size', label: 'Jersey Size', type: 'enum', group: 'equipment', enumValues: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL', 'AXXL'], helpTextKey: 'ice_hockey.jersey_size.help', sortOrder: 170 },
        { key: 'goalie_glove_blocker_size', label: 'Goalie Glove/Blocker Size', type: 'text', group: 'equipment', helpTextKey: 'ice_hockey.goalie_glove_blocker_size.help', sortOrder: 180 },
        { key: 'goalie_leg_pad_in', label: 'Goalie Leg Pad (inches)', type: 'text', group: 'equipment', unit: 'in', helpTextKey: 'ice_hockey.goalie_leg_pad_in.help', sortOrder: 190 },
    ],
} as const

/**
 * WRESTLING
 */
export const WRESTLING_FIELDS: SportFieldCatalog = {
    profile: [
        { key: 'primary_style', label: 'Primary Style', type: 'enum', group: 'profile', enumValues: ['Folkstyle', 'Freestyle', 'Greco-Roman', 'All'], helpTextKey: 'wrestling.primary_style.help', sortOrder: 10 },
        { key: 'weight_class_lb', label: 'Weight Class (lbs)', type: 'text', group: 'profile', unit: 'lb', helpTextKey: 'wrestling.weight_class_lb.help', sortOrder: 20 },
        { key: 'years_experience', label: 'Years of Experience', type: 'int', group: 'profile', helpTextKey: 'wrestling.years_experience.help', sortOrder: 30 },
        { key: 'stance', label: 'Stance', type: 'enum', group: 'profile', enumValues: ['neutral', 'right_lead', 'left_lead', 'switch'], helpTextKey: 'wrestling.stance.help', sortOrder: 40 },
    ],
    equipment: [
        { key: 'singlet_size', label: 'Singlet Size', type: 'enum', group: 'equipment', enumValues: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'child_4', 'child_6', 'child_8', 'child_10', 'child_12', 'child_14', 'child_16'], helpTextKey: 'wrestling.singlet_size.help', sortOrder: 100 },
        { key: 'headgear_size', label: 'Headgear Size', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL', 'youth', 'adult'], helpTextKey: 'wrestling.headgear_size.help', sortOrder: 110 },
        { key: 'wrestling_shoe_size', label: 'Wrestling Shoe Size', type: 'text', group: 'equipment', helpTextKey: 'wrestling.wrestling_shoe_size.help', sortOrder: 120 },
        { key: 'knee_pad_size', label: 'Knee Pad Size (if used)', type: 'enum', group: 'equipment', enumValues: ['XS', 'S', 'M', 'L', 'XL'], helpTextKey: 'wrestling.knee_pad_size.help', sortOrder: 130 },
        { key: 'mouthguard', label: 'Mouthguard', type: 'bool', group: 'equipment', helpTextKey: 'wrestling.mouthguard.help', sortOrder: 140 },
    ],
} as const

/**
 * Complete sport field catalog mapping
 */
export const SPORT_FIELD_CATALOG: Record<SportCode, SportFieldCatalog> = {
    baseball: BASEBALL_FIELDS,
    basketball: BASKETBALL_FIELDS,
    cheerleading: CHEERLEADING_FIELDS,
    cross_country: CROSS_COUNTRY_FIELDS,
    dance: DANCE_FIELDS,
    diving: DIVING_FIELDS,
    field_hockey: FIELD_HOCKEY_FIELDS,
    flag_football: FLAG_FOOTBALL_FIELDS,
    football: FOOTBALL_FIELDS,
    golf: GOLF_FIELDS,
    gymnastics: GYMNASTICS_FIELDS,
    ice_hockey: ICE_HOCKEY_FIELDS,
    lacrosse: LACROSSE_FIELDS,
    poms: POMS_FIELDS,
    soccer: SOCCER_FIELDS,
    softball: SOFTBALL_FIELDS,
    swimming: SWIMMING_FIELDS,
    tennis: TENNIS_FIELDS,
    track_field: TRACK_FIELD_FIELDS,
    volleyball: VOLLEYBALL_FIELDS,
    wrestling: WRESTLING_FIELDS,
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
