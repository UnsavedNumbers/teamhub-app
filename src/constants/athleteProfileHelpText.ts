/**
 * Athlete Profile Help Text Library
 * 
 * Centralized help text for all athlete profile fields.
 * These are parent-friendly explanations to guide data entry.
 * 
 * IMPORTANT: All help text should be:
 * - Concise (1-2 sentences max)
 * - Parent-friendly (no jargon)
 * - Actionable (tell them what to do)
 * - Consistent in tone
 */

/**
 * Universal field help text
 */
export const UNIVERSAL_FIELD_HELP_TEXT = {
    height: 'Enter your athlete\'s height. You can use feet/inches or centimeters - we\'ll convert it automatically.',
    weight: 'Enter your athlete\'s weight. You can use pounds or kilograms - we\'ll convert it automatically.',
    shoe_size: 'Enter the shoe size your athlete typically wears. This helps with equipment ordering.',
    shoe_width: 'If shoes feel tight on the sides, consider wide. If the heel slips, consider narrow.',
    tshirt_size: 'Standard t-shirt size. YS = Youth Small, AS = Adult Small, etc.',
    shorts_size: 'Standard shorts size. Same sizing as t-shirts.',
    dominant_hand: 'Which hand does your athlete primarily use? This is relevant for many sports.',
    emergency_contact: 'Who should we contact in case of emergency when you\'re not available?',
} as const

/**
 * Medical field help text
 */
export const MEDICAL_FIELD_HELP_TEXT = {
    medical_notes: 'Include any medical conditions, medications, or important health information coaches should know about.',
    allergies: 'List any allergies (food, medication, environmental). This is critical for safety.',
    emergency_contact_name: 'Full name of emergency contact person.',
    emergency_contact_relationship: 'How is this person related to the athlete? (e.g., parent, grandparent, aunt)',
    emergency_contact_phone: 'Phone number where this person can be reached immediately.',
    emergency_contact_email: 'Email address for this emergency contact (optional).',
} as const

/**
 * Equipment sizing general help text
 */
export const EQUIPMENT_HELP_TEXT = {
    size_guide_general: 'If you\'re unsure about sizing, click "Size Guide" for sport-specific recommendations.',
    measure_at_home: 'You can measure at home using a soft measuring tape. See our guide for instructions.',
    between_sizes: 'If your athlete is between sizes, we recommend choosing the larger size for growing room.',
    current_size: 'Enter the size your athlete currently wears if you know it. Otherwise, leave blank and we\'ll help you measure.',
} as const

/**
 * Baseball help text
 */
export const BASEBALL_HELP_TEXT = {
    primary_position: 'The position this athlete plays most often.',
    secondary_positions: 'Other positions this athlete can play.',
    batting_hand: 'Which side of the plate the athlete bats from.',
    throwing_hand: 'Which hand the athlete throws with.',
    years_experience: 'How many years the athlete has played baseball.',
    glove_size_in: 'Glove size is measured in inches. Infield gloves are typically smaller than outfield gloves.',
    glove_type: 'Type of glove based on position.',
    bat_length_in: 'Bat length is usually marked on the bat. If unsure, leave blank.',
    bat_weight_oz: 'Bat weight is usually marked on the bat. If unsure, leave blank.',
    helmet_size: 'Measure around the head just above the ears and eyebrows.',
    cleat_size: 'Standard shoe sizing.',
    belt_size_in: 'Waist measurement in inches.',
    pants_inseam_in: 'Inseam measurement for baseball pants.',
    pants_waist_in: 'Waist measurement for baseball pants.',
    pants_fit: 'Preferred fit style for baseball pants.',
    catchers_gear_size: 'Size for chest protector, shin guards, and helmet (if catcher).',
} as const

/**
 * Basketball help text
 */
export const BASKETBALL_HELP_TEXT = {
    primary_position: 'Point Guard, Shooting Guard, Small Forward, Power Forward, or Center.',
    secondary_position: 'Additional position this athlete can play.',
    years_experience: 'How many years the athlete has played basketball.',
    wingspan_in: 'Fingertip to fingertip with arms extended (optional).',
    vertical_jump_in: 'Maximum vertical jump height (optional).',
    jersey_size: 'Basketball jersey size.',
    shorts_size: 'Basketball shorts size.',
    shorts_length_pref: 'Preferred shorts length.',
    shoe_size: 'Basketball shoe size (US sizing).',
    shoe_width: 'If shoes feel tight on the sides, consider wide. If heel slips, consider narrow.',
    compression_sleeve_size: 'Arm compression sleeve size (optional).',
    headband_size: 'Headband size (optional).',
} as const

/**
 * Soccer help text
 */
export const SOCCER_HELP_TEXT = {
    primary_position: 'Primary position on field.',
    secondary_position: 'Additional position.',
    dominant_foot: 'Preferred kicking foot.',
    years_experience: 'Years playing soccer.',
    club_team: 'Current club team (if applicable).',
    jersey_size: 'Jersey size.',
    shorts_size: 'Shorts size.',
    sock_size: 'Soccer sock size.',
    cleat_size: 'Soccer cleat size (US sizing).',
    shin_guard_size: 'Shin guards should cover from just above the ankle to just below the knee.',
    goalie_glove_size: 'Goalkeeper glove size (if goalkeeper).',
    warmup_jacket_size: 'Warmup jacket size.',
    warmup_pants_size: 'Warmup pants size.',
} as const

/**
 * Swimming help text
 */
export const SWIMMING_HELP_TEXT = {
    primary_strokes: 'Best competitive strokes.',
    secondary_strokes: 'Additional competitive strokes.',
    primary_distances: 'Preferred race distances (yards/meters).',
    personal_records: 'Best times by event (optional).',
    years_experience: 'Years swimming competitively.',
    club_team: 'Current club team (if applicable).',
    competition_suit_size: 'Tech suit or competition suit size.',
    practice_suit_size: 'Practice swimsuit size.',
    drag_suit_size: 'Drag suit size (if used).',
    jammer_size: 'Jammer/brief size (if applicable).',
    cap_size: 'Swim cap size.',
    cap_material_pref: 'Preferred cap material.',
    goggle_type_pref: 'Preferred goggle type.',
    warmup_parka_size: 'Warmup parka size.',
    team_tshirt_size: 'Team t-shirt size.',
    team_shorts_size: 'Team shorts size.',
    fins_size: 'Training fins size.',
    paddle_size: 'Hand paddle size.',
} as const

/**
 * Helper function to get help text by key
 */
export function getHelpText(category: string, key: string): string | undefined {
    const helpTextMap: Record<string, Record<string, string>> = {
        universal: UNIVERSAL_FIELD_HELP_TEXT,
        medical: MEDICAL_FIELD_HELP_TEXT,
        equipment: EQUIPMENT_HELP_TEXT,
        baseball: BASEBALL_HELP_TEXT,
        basketball: BASKETBALL_HELP_TEXT,
        soccer: SOCCER_HELP_TEXT,
        swimming: SWIMMING_HELP_TEXT,
    }

    return helpTextMap[category]?.[key]
}

/**
 * Helper function to get sport-specific help text
 */
export function getSportHelpText(sportCode: string, fieldKey: string): string | undefined {
    return getHelpText(sportCode, fieldKey)
}
