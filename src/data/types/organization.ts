export type GenderCategory = 'boys' | 'girls' | 'coed'
export type LevelType = 'age_based' | 'grade_based' | 'skill_based'
export type TeamGender = 'male' | 'female' | 'coed' // Deprecated on Team, but kept for migration/compatibility if needed
export type TeamSkillLevel = 'recreational' | 'competitive' | 'elite' // Deprecated on Team

export interface Sport {
    id: string
    org_id: string | null // NULL for system sports, set for organization-specific sports (legacy)
    name: string
    slug: string | null // URL-friendly identifier (e.g., "track-and-field", "field-hockey")
    icon: string | null
    color: string
    created_at: string
    updated_at: string
    deleted_at: string | null
    is_system?: boolean // True for system-wide predefined sports
}

export type RegistrationMode = 'individual_only' | 'team_only' | 'both'

export interface Program {
    id: string
    org_id: string
    sport_id: string
    name: string
    description: string | null
    gender_category: GenderCategory
    created_at: string
    updated_at: string
    deleted_at: string | null
    // Deprecated fields kept for backward compatibility during migration
    age_min?: number | null
    age_max?: number | null
    // Program enhancement fields
    is_public?: boolean | null
    activity_start_date?: string | null
    activity_end_date?: string | null
    registration_start_date?: string | null
    registration_end_date?: string | null
    program_code?: string | null
    sponsor?: string | null
    default_location_id?: string | null
    // Registration mode configuration
    registration_mode?: RegistrationMode | null
}

export interface Level {
    id: string
    org_id: string
    program_id: string
    name: string
    level_type: LevelType
    description: string | null
    // Eligibility defines
    age_min: number | null
    age_max: number | null
    grade_min: number | null
    grade_max: number | null
    skill_min: number | null
    skill_max: number | null
    created_at: string
    updated_at: string
    deleted_at: string | null
}

export interface Team {
    id: string
    org_id: string
    program_id?: string | null
    level_id: string | null
    sport_id?: string | null
    name: string
    max_roster_size?: number | null
    min_roster_size?: number | null
    is_active?: boolean
    created_at: string
    updated_at: string
    deleted_at?: string | null

    // Deprecated fields - derived from Program/Level now
    age_group?: string | null
    gender?: TeamGender | null
    skill_level?: TeamSkillLevel | null
}

export interface Season {
    id: string
    org_id: string
    team_id?: string | null
    name: string
    start_date: string
    end_date: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface TeamSeason {
    team_id: string
    season_id: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface CreateTeamDTO {
    org_id: string
    name: string
    level_id?: string | null
    sport_id?: string | null
    program_id?: string | null
    max_roster_size?: number | null
    is_active?: boolean
    visible_to_fans?: boolean
    season_id?: string
}

export interface UpdateTeamDTO {
    name?: string
    level_id?: string
    sport_id?: string | null
    program_id?: string | null
    max_roster_size?: number | null
    min_roster_size?: number | null
    is_active?: boolean
    visible_to_fans?: boolean
}

export interface CreateSeasonDTO {
    org_id: string
    name: string
    start_date: string
    end_date: string
    is_active?: boolean
    sport_id?: string | null
    program_id?: string | null
}

export interface UpdateSeasonDTO {
    name?: string
    start_date?: string
    end_date?: string
    is_active?: boolean
    sport_id?: string | null
    program_id?: string | null
}

// DTOs

export interface CreateSportDTO {
    org_id: string
    name: string
    icon?: string
    color?: string
}

export interface UpdateSportDTO {
    name?: string
    icon?: string
    color?: string
}

export interface CreateProgramDTO {
    org_id: string
    sport_id: string
    name: string
    gender_category: GenderCategory // Required now
    description?: string
    // Deprecated
    age_min?: number
    age_max?: number
    // Program enhancement fields
    is_public?: boolean
    activity_start_date?: string
    activity_end_date?: string
    registration_start_date?: string
    registration_end_date?: string
    program_code?: string
    sponsor?: string
    default_location_id?: string
    // Registration mode configuration
    registration_mode?: RegistrationMode
}

export interface UpdateProgramDTO {
    name?: string
    description?: string
    gender_category?: GenderCategory
    // Deprecated
    age_min?: number
    age_max?: number
    // Program enhancement fields
    is_public?: boolean
    activity_start_date?: string
    activity_end_date?: string
    registration_start_date?: string
    registration_end_date?: string
    program_code?: string
    sponsor?: string
    default_location_id?: string
    // Registration mode configuration
    registration_mode?: RegistrationMode
}

export interface CreateLevelDTO {
    org_id: string
    program_id: string
    name: string
    level_type: LevelType
    description?: string
    age_min?: number
    age_max?: number
    grade_min?: number
    grade_max?: number
    skill_min?: number
    skill_max?: number
}

export interface UpdateLevelDTO {
    name?: string
    description?: string
    level_type?: LevelType
    age_min?: number
    age_max?: number
    grade_min?: number
    grade_max?: number
    skill_min?: number
    skill_max?: number
}
