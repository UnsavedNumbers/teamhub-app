export type GenderCategory = 'boys' | 'girls' | 'coed'
export type LevelType = 'age_based' | 'grade_based' | 'skill_based'
export type TeamGender = 'male' | 'female' | 'coed' // Deprecated on Team, but kept for migration/compatibility if needed
export type TeamSkillLevel = 'recreational' | 'competitive' | 'elite' // Deprecated on Team

export interface Sport {
    id: string
    org_id: string
    name: string
    icon: string | null
    color: string
    created_at: string
    updated_at: string
    deleted_at: string | null
}

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
    program_id: string | null // Should be derived from level, but keeping for direct reference if needed or as legacy
    level_id: string
    sport_id: string // Derived from program->sport usually, but good for quick filtering
    name: string
    max_roster_size: number | null
    is_active: boolean
    created_at: string
    updated_at: string

    // Deprecated fields - derived from Program/Level now
    age_group?: string | null
    gender?: TeamGender | null
    skill_level?: TeamSkillLevel | null
}

export interface Season {
    id: string
    org_id: string
    // team_id: string // REMOVED - Season is now org-scoped
    name: string
    start_date: string
    end_date: string
    is_active: boolean
    registration_open: boolean
    registration_deadline: string | null
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
}

export interface UpdateProgramDTO {
    name?: string
    description?: string
    gender_category?: GenderCategory
    // Deprecated
    age_min?: number
    age_max?: number
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
