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
    jersey_number: string | null
    medical_notes: string | null
    allergies: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    created_at: string
    updated_at: string
    deleted_at: string | null
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
    jersey_number?: string | null
    medical_notes?: string | null
    allergies?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
    family_id?: string | null  // Optional - for backward compatibility
    team_id?: string | null  // Optional - can assign to team during creation
    season_id?: string | null  // Optional - required if team_id provided
    guardians?: GuardianFormData[]  // Guardians to link during creation
}

// Legacy alias
export type CreateChildDTO = CreateAthleteDTO

export interface UpdateAthleteDTO {
    first_name?: string
    last_name?: string
    date_of_birth?: string
    gender?: Gender | null
    jersey_number?: string | null
    medical_notes?: string | null
    allergies?: string | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
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
    organization_id: string
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