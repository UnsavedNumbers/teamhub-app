export interface Family {
    id: string
    name: string
    created_by_user_id: string
    org_id: string
    created_at: string
    updated_at: string
    deleted_at: string | null
}

export type Gender = 'male' | 'female' | 'other'

export interface Athlete {
    id: string
    family_id: string | null  // Nullable - families are now derived from guardians
    first_name: string
    last_name: string
    date_of_birth: string
    gender: Gender | null
    preferred_name: string | null  // Name the athlete prefers to go by (nickname, etc.)
    jersey_number: string | null
    medical_notes: string | null  // @deprecated - Use athlete_medical_private table instead
    allergies: string | null  // @deprecated - Use athlete_medical_private table instead
    emergency_contact_name: string | null  // @deprecated - Migrated to emergency_contact JSONB
    emergency_contact_phone: string | null  // @deprecated - Migrated to emergency_contact JSONB
    phone: string | null  // Athlete phone number
    email: string | null  // Athlete email address
    photo_url: string | null  // @deprecated - Use profile_photo_updated_at and has_profile_photo instead
    profile_photo_updated_at: string | null  // Timestamp when profile photo was last updated
    has_profile_photo: boolean | null  // Whether athlete has a profile photo
    org_id?: string  // Organization ID (for photo URL generation)

    // Universal Profile Fields (added 2026-01-31)
    height_cm: number | null  // Height in centimeters (normalized)
    weight_kg: number | null  // Weight in kilograms (normalized)
    shoe_size_value: number | null  // Numeric shoe size
    shoe_size_system: 'us' | 'eu' | 'uk' | null  // Shoe sizing system
    shoe_width: 'narrow' | 'standard' | 'wide' | null  // Shoe width
    tshirt_size: string | null  // T-shirt size (YS, YM, YL, AS, AM, AL, AXL, AXXL, AXXXL)
    shorts_size: string | null  // Shorts size (same enum as tshirt_size)
    dominant_hand: 'left' | 'right' | 'ambidextrous' | null  // Dominant hand
    emergency_contact: {
        name: string
        relationship: string
        phone: string
        email?: string
    } | null  // Emergency contact (replaces deprecated emergency_contact_name/phone)

    created_at: string
    updated_at: string
    deleted_at: string | null
    has_active_guardian?: boolean  // True if athlete has at least one active guardian with valid auth account
    sports?: Array<{
        sport_id: string
        sport_name: string
        sport_type: 'plays' | 'interested'
    }>
}

// Legacy alias for backward compatibility
export type Child = Athlete

export type FamilyRole = 'owner' | 'guardian' | 'view_only'

export interface FamilyMember {
    id: string
    family_id: string
    user_id: string
    role: FamilyRole
    permissions: string[]
    created_at: string
    updated_at: string
    deleted_at: string | null
}

// For UI display, often joined with other tables
export interface FamilyWithDetails extends Family {
    children: Child[]
    members: FamilyMember[]
    guardians?: Guardian[]  // Guardians derived from athlete_guardians
    is_derived?: boolean  // True if family is computed from guardian relationships
    // Count of enrolled programs or other stats could go here
}

export interface AthleteWithDetails extends Athlete {
    family?: Family | DerivedFamily
    guardians?: Guardian[]
    // active_registrations usually joined from another table
}

// Legacy alias
export type ChildWithDetails = AthleteWithDetails

export interface CreateFamilyDTO {
    name: string
    org_id: string
    // Initial members or children might be handled separately or transactionally
}

export interface UpdateFamilyDTO {
    name?: string
}

export interface CreateAthleteDTO {
    first_name: string
    last_name: string
    date_of_birth: string
    gender?: Gender | null
    preferred_name?: string | null
    jersey_number?: string | null
    medical_notes?: string | null
    allergies?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
    phone?: string | null  // Athlete phone number
    email?: string | null  // Athlete email address
    family_id?: string | null  // Optional - for backward compatibility
    team_id?: string | null  // Optional - can assign to team during creation
    season_id?: string | null  // Optional - required if team_id provided
    guardians?: GuardianFormData[]  // Guardians to link during creation
    sports?: Array<{
        sport_id: string
        sport_type: 'plays' | 'interested'
    }>
}

// Legacy alias
export type CreateChildDTO = CreateAthleteDTO

export interface UpdateAthleteDTO {
    first_name?: string
    last_name?: string
    date_of_birth?: string
    gender?: Gender | null
    preferred_name?: string | null
    jersey_number?: string | null
    medical_notes?: string | null
    allergies?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
    phone?: string | null  // Athlete phone number
    email?: string | null  // Athlete email address
    photo_url?: string | null
}

// Legacy alias
export type UpdateChildDTO = UpdateAthleteDTO
// ============================================================================
// Guardian Types
// ============================================================================

export type GuardianStatus = 'active' | 'pending' | 'removed'
export type RelationshipType = 'parent' | 'guardian' | 'other'

export interface AthleteGuardian {
    id: string
    athlete_id: string
    user_id: string
    org_id: string
    status: GuardianStatus
    relationship_type?: RelationshipType
    created_at: string
    updated_at: string
}

export interface Guardian {
    id: string
    user_id: string
    email: string
    display_name: string | null
    phone: string | null
    relationship_type: RelationshipType
    status: GuardianStatus
    linked_athletes?: Athlete[]  // Athletes this guardian is linked to
}

export interface GuardianFormData {
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    relationship_type: RelationshipType
}

export interface GuardianMatch {
    exists: boolean
    user: {
        id: string
        email: string
        display_name: string | null
        phone: string | null
    } | null
    linkedAthletes: Array<{
        id: string
        first_name: string
        last_name: string
        birthdate: string
    }>
    suggestion: 'link' | 'create_invite' | 'already_linked'
}

// ============================================================================
// Guardian Invite Types
// ============================================================================

export type GuardianInviteStatus = 'pending' | 'accepted' | 'cancelled' | 'expired'

export interface PendingGuardianInvite {
    id: string
    email: string
    status: GuardianInviteStatus
    expires_at: string
    created_at: string | null
    token: string
}

// ============================================================================
// Derived Family Types
// ============================================================================

export interface DerivedFamily {
    athlete_ids: string[]
    guardian_ids: string[]
    athletes: Athlete[]
    guardians: Guardian[]
    is_derived: true
    has_guardians: boolean
}

export interface OrphanedAthlete {
    athlete_id: string
    first_name: string
    last_name: string
    birthdate: string | null
    created_at: string
}

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Type-safe form data interface for athlete forms
 * Ensures all fields including phone and email are included
 */
export interface AthleteFormData {
    first_name: string
    last_name: string
    date_of_birth: string
    gender: Gender | ''
    preferred_name: string
    jersey_number: string
    medical_notes: string
    allergies: string
    emergency_contact_name: string
    emergency_contact_phone: string
    phone: string  // Athlete phone number
    email: string  // Athlete email address
}