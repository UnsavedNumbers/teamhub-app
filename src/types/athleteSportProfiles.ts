/**
 * Athlete Sport Profile Types
 * 
 * Type definitions for sport-specific athlete profiles, field definitions,
 * org settings, and medical data.
 */

import type { SportCode, FieldType, FieldGroup } from './sports'

/**
 * Emergency contact information
 */
export interface EmergencyContact {
    name: string
    relationship: string
    phone: string
    email?: string
}

/**
 * Sport field definition from database
 * Drives UI rendering and validation
 */
export interface SportFieldDefinition {
    id: string
    sport_code: SportCode
    field_key: string
    field_label: string
    field_group: FieldGroup
    field_type: FieldType
    enum_values: string[] | null
    unit: string | null
    help_text: string | null
    is_optional: boolean
    is_enabled: boolean
    sort_order: number
    created_at: string
}

/**
 * Athlete sport profile from database
 * One row per athlete per sport per org
 */
export interface AthleteSportProfile {
    id: string
    org_id: string
    athlete_id: string
    sport_code: SportCode
    profile_data: Record<string, unknown>
    equipment_data: Record<string, unknown>
    completeness_score: number
    last_verified_at: string | null
    created_by: string | null
    updated_by: string | null
    created_at: string
    updated_at: string
}

/**
 * Field override settings for org customization
 */
export interface FieldOverride {
    is_required?: boolean
    is_enabled?: boolean
    custom_help_text?: string
}

/**
 * Org sport profile settings from database
 * Allows orgs to customize field requirements per sport
 */
export interface OrgSportProfileSettings {
    id: string
    org_id: string
    sport_code: SportCode
    overrides: Record<string, FieldOverride>
    version: number
    updated_by: string | null
    updated_at: string
    created_at: string
}

/**
 * Athlete medical private data from database
 * Separate table with stricter access control
 */
export interface AthleteMedicalPrivate {
    athlete_id: string
    org_id: string
    medical_notes: string | null
    allergies: string | null
    emergency_contact: EmergencyContact | null
    updated_by: string | null
    updated_at: string
    created_at: string
}

/**
 * Universal athlete fields (added to athletes table)
 */
export interface UniversalAthleteFields {
    height_cm: number | null
    weight_kg: number | null
    shoe_size_value: number | null
    shoe_size_system: 'us' | 'eu' | 'uk' | null
    shoe_width: 'narrow' | 'standard' | 'wide' | null
    tshirt_size: string | null
    shorts_size: string | null
    dominant_hand: 'left' | 'right' | 'ambidextrous' | null
    emergency_contact: EmergencyContact | null
}

/**
 * DTO for creating athlete sport profile
 */
export interface CreateAthleteSportProfileDTO {
    athlete_id: string
    sport_code: SportCode
    profile_data?: Record<string, unknown>
    equipment_data?: Record<string, unknown>
}

/**
 * DTO for updating athlete sport profile
 */
export interface UpdateAthleteSportProfileDTO {
    profile_data?: Record<string, unknown>
    equipment_data?: Record<string, unknown>
    last_verified_at?: string
}

/**
 * DTO for updating athlete universal fields
 */
export interface UpdateAthleteUniversalFieldsDTO {
    height_cm?: number | null
    weight_kg?: number | null
    shoe_size_value?: number | null
    shoe_size_system?: 'us' | 'eu' | 'uk' | null
    shoe_width?: 'narrow' | 'standard' | 'wide' | null
    tshirt_size?: string | null
    shorts_size?: string | null
    dominant_hand?: 'left' | 'right' | 'ambidextrous' | null
    emergency_contact?: EmergencyContact | null
}

/**
 * DTO for updating athlete medical data
 */
export interface UpdateAthleteMedicalDTO {
    medical_notes?: string | null
    allergies?: string | null
    emergency_contact?: EmergencyContact | null
}

/**
 * DTO for updating org sport settings
 */
export interface UpdateOrgSportSettingsDTO {
    overrides: Record<string, FieldOverride>
}

/**
 * Enriched field definition with org overrides applied
 */
export interface EnrichedFieldDefinition extends SportFieldDefinition {
    is_required: boolean // Computed from is_optional + org overrides
    effective_help_text: string | null // Custom help text if org provided, else default
    is_visible: boolean // Computed from is_enabled + org overrides
}

/**
 * Athlete profile with all sports
 */
export interface AthleteProfileComplete {
    athlete_id: string
    org_id: string
    universal_fields: UniversalAthleteFields
    medical_data: AthleteMedicalPrivate | null
    sport_profiles: AthleteSportProfile[]
}

/**
 * Field value validation result
 */
export interface FieldValidationResult {
    valid: boolean
    error?: string
}

/**
 * Completeness calculation result
 */
export interface CompletenessResult {
    total_fields: number
    completed_fields: number
    required_fields: number
    completed_required_fields: number
    score: number // 0-100
    missing_required_fields: string[]
}
